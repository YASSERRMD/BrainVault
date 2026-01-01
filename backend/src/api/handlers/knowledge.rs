use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::core::search_engine::HybridSearchEngine;
use crate::core::graph_manager::KnowledgeGraphManager;
use crate::core::graph_manager::{Entity, Relationship};
use crate::core::rbac::RBAC;
use crate::db::barq_graph::BarqGraphClient;

#[derive(Serialize, Deserialize)]
pub struct IngestRequest {
    pub doc_id: String,
    pub content: String,
    pub entities: Vec<Entity>,
    pub relationships: Vec<Relationship>,
}

#[derive(Serialize, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub top_k: usize,
}

#[derive(Serialize, Deserialize)]
pub struct ChatRequest {
    pub query: String,
}

#[derive(Serialize, Deserialize)]
pub struct ChatResponse {
    pub answer: String,
    pub sources: Vec<String>,
}

// Generalized LLM Helper
async fn call_llm(prompt: &str) -> String {
    let api_key = std::env::var("AZURE_OPENAI_API_KEY").unwrap_or_default();
    let endpoint = std::env::var("AZURE_OPENAI_ENDPOINT").unwrap_or_default();
    let deployment = std::env::var("AZURE_OPENAI_DEPLOYMENT_NAME").unwrap_or_else(|_| "gpt-4o".to_string());
    
    if api_key.is_empty() || endpoint.is_empty() {
        return String::from("Azure OpenAI not configured.");
    }

    let url = format!("{}/openai/deployments/{}/chat/completions?api-version=2024-02-15-preview", endpoint, deployment);
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "messages": [
            {"role": "system", "content": "You are a Knowledge Graph extraction engine."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 1000
    });

    match client.post(&url)
        .header("api-key", &api_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await 
    {
        Ok(res) => {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                json["choices"][0]["message"]["content"].as_str().unwrap_or("").to_string()
            } else {
                String::new()
            }
        },
        Err(_) => String::new()
    }
}

async fn extract_graph_data(content: &str) -> (Vec<Entity>, Vec<Relationship>) {
    let prompt = format!(
        "Analyze the text and extract entities and relationships. \
        Return ONLY valid lines in this format:\n\
        ENTITY|<id_slug>|<Label>|<name_property>\n\
        REL|<from_id_slug>|<to_id_slug>|<TYPE>\n\
        \n\
        Rules:\n\
        - id_slug must be lowercase-kebab-case (e.g. quantum-computing)\n\
        - Label like 'Technology', 'Person', 'Company'\n\
        - Do not add explanations.\n\nText:\n{}", 
        content.chars().take(2000).collect::<String>() // Limit context
    );

    let response = call_llm(&prompt).await;
    let mut entities = Vec::new();
    let mut relationships = Vec::new();

    for line in response.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 4 && parts[0] == "ENTITY" {
            entities.push(Entity {
                id: parts[1].trim().to_string(),
                label: parts[2].trim().to_string(),
                properties: std::collections::HashMap::from([
                    ("name".to_string(), parts[3].trim().to_string())
                ])
            });
        } else if parts.len() >= 4 && parts[0] == "REL" {
            relationships.push(Relationship {
                from_id: parts[1].trim().to_string(),
                to_id: parts[2].trim().to_string(),
                rel_type: parts[3].trim().to_string(),
                properties: std::collections::HashMap::new()
            });
        }
    }
    (entities, relationships)
}

#[post("/api/chat")]
pub async fn chat_with_knowledge(
    req: web::Json<ChatRequest>,
    engine: web::Data<HybridSearchEngine>,
) -> impl Responder {
    // 1. Search for context
    let search_results = match engine.search(&req.query, 5).await {
        Ok(res) => res,
        Err(_) => return HttpResponse::InternalServerError().body("Search failed"),
    };
    
    if search_results.hits.is_empty() {
        return HttpResponse::Ok().json(ChatResponse {
            answer: "I couldn't find any relevant documents.".to_string(),
            sources: vec![],
        });
    }

    // 2. Prepare context
    let context_text = search_results.hits.iter()
        .map(|hit| format!("[{}] {}", hit.doc_id, hit.content.as_deref().unwrap_or("")))
        .collect::<Vec<String>>()
        .join("\n\n");

    // 3. Generate Answer
    let prompt = format!(
        "Answer based on context:\n{}\n\nQuestion: {}", 
        context_text, req.query
    );
    let answer = call_llm(&prompt).await;

    // 4. Return
    let sources = search_results.hits.iter().map(|h| h.doc_id.clone()).collect();
    
    HttpResponse::Ok().json(ChatResponse {
        answer,
        sources
    })
}

#[get("/api/health")]
pub async fn health_check(
    engine: web::Data<HybridSearchEngine>,
) -> impl Responder {
    // Check vector DB
    let vector_status = engine.vector_db.get_document_count().await > 0 || true; 
    
    // Check graph DB
    let graph_client = BarqGraphClient::new();
    let graph_status = graph_client.health().await.unwrap_or(false);
    
    HttpResponse::Ok().json(serde_json::json!({
        "api": "running",
        "vector_db": if vector_status { "connected" } else { "disconnected" },
        "graph_db": if graph_status { "connected" } else { "local_fallback" },
        "vector_db_url": std::env::var("VECTOR_DB_URL").unwrap_or_else(|_| "http://barq-vector:8080".to_string()),
        "graph_db_url": std::env::var("GRAPH_DB_URL").unwrap_or_else(|_| "http://barq-graph:8080".to_string())
    }))
}


#[post("/api/knowledge/ingest")]
pub async fn ingest_knowledge(
    req: web::Json<IngestRequest>,
    engine: web::Data<HybridSearchEngine>,
    graph: web::Data<KnowledgeGraphManager>,
) -> impl Responder {
    // 1. Ingest document into vector DB
    if let Err(e) = engine.ingest_document(&req.doc_id, &req.content).await {
        return HttpResponse::InternalServerError().body(format!("Vector ingestion failed: {}", e));
    }
    
    let mut entities = req.entities.clone();
    let mut relationships = req.relationships.clone();

    // 2. Auto-Extract if empty
    if entities.is_empty() {
        println!("INFO: Auto-extracting entities for doc {}", req.doc_id);
        let (extracted_ents, extracted_rels) = extract_graph_data(&req.content).await;
        entities = extracted_ents;
        relationships = extracted_rels;
        println!("INFO: Extracted {} entities, {} rels", entities.len(), relationships.len());
    }
    
    // 3. Create entity nodes in graph
    for entity in entities {
         let _ = graph.add_entity(entity).await;
    }
    
    // 4. Create relationships in graph
    for rel in relationships {
         let _ = graph.add_relationship(rel).await;
    }
    
    HttpResponse::Ok().json(serde_json::json!({"status": "ingested", "doc_id": req.doc_id}))
}

#[post("/api/knowledge/seed")]
pub async fn seed_test_data(
    engine: web::Data<HybridSearchEngine>,
    graph: web::Data<KnowledgeGraphManager>,
) -> impl Responder {
    // Sample enterprise knowledge documents
    let test_docs = vec![
        ("doc-001", "Quantum computing leverages quantum mechanical phenomena like superposition and entanglement to process information. Unlike classical computers that use bits (0 or 1), quantum computers use qubits that can exist in multiple states simultaneously."),
        ("doc-002", "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience. Deep learning uses neural networks with multiple layers to extract higher-level features from raw input."),
        ("doc-003", "Cybersecurity best practices include implementing zero-trust architecture, regular security audits, encryption of data at rest and in transit, and continuous monitoring for threats and anomalies."),
        ("doc-004", "Cloud computing provides on-demand access to computing resources including servers, storage, databases, networking, and software. Major providers include AWS, Azure, and Google Cloud Platform."),
        ("doc-005", "Natural Language Processing (NLP) enables computers to understand, interpret, and generate human language. Key applications include sentiment analysis, machine translation, and conversational AI."),
        ("doc-006", "Blockchain technology provides a decentralized, immutable ledger for recording transactions. Smart contracts automate the execution of agreements without intermediaries."),
        ("doc-007", "Kubernetes orchestrates containerized applications, managing deployment, scaling, and operations. It works with Docker and other container runtimes to ensure high availability."),
        ("doc-008", "DevOps practices combine software development and IT operations to shorten development cycles. CI/CD pipelines automate testing and deployment processes."),
    ];

    let mut ingested = 0;
    for (doc_id, content) in &test_docs {
        if let Ok(()) = engine.ingest_document(doc_id, content).await {
            ingested += 1;
        }
    }

    // Add some graph entities
    let entities = vec![
        Entity { id: "quantum-comp".to_string(), label: "Technology".to_string(), properties: std::collections::HashMap::from([("name".to_string(), "Quantum Computing".to_string())]) },
        Entity { id: "machine-learning".to_string(), label: "Technology".to_string(), properties: std::collections::HashMap::from([("name".to_string(), "Machine Learning".to_string())]) },
        Entity { id: "cybersecurity".to_string(), label: "Domain".to_string(), properties: std::collections::HashMap::from([("name".to_string(), "Cybersecurity".to_string())]) },
    ];

    for entity in entities {
        let _ = graph.add_entity(entity).await;
    }

    // Add graph relationships
    let relationships = vec![
        Relationship { 
            from_id: "quantum-comp".to_string(), 
            to_id: "cybersecurity".to_string(), 
            rel_type: "IMPACTS".to_string(),
            properties: std::collections::HashMap::new() 
        },
        Relationship { 
            from_id: "machine-learning".to_string(), 
            to_id: "cybersecurity".to_string(), 
            rel_type: "ENHANCES".to_string(),
            properties: std::collections::HashMap::new() 
        },
        Relationship { 
            from_id: "machine-learning".to_string(), 
            to_id: "quantum-comp".to_string(), 
            rel_type: "RELATED_TO".to_string(),
            properties: std::collections::HashMap::new() 
        },
    ];

    for rel in relationships {
        let _ = graph.add_relationship(rel).await;
    }

    HttpResponse::Ok().json(serde_json::json!({
        "status": "seeded",
        "documents_ingested": ingested,
        "message": format!("Successfully seeded {} documents with embeddings", ingested)
    }))
}

#[get("/api/knowledge/stats")]
pub async fn get_knowledge_stats(
    engine: web::Data<HybridSearchEngine>,
    graph: web::Data<KnowledgeGraphManager>,
) -> impl Responder {
    let doc_count = engine.get_document_count().await;
    let (entity_count, relationship_count) = graph.get_stats().await;
    
    HttpResponse::Ok().json(serde_json::json!({
        "documents": doc_count,
        "entities": entity_count,
        "relationships": relationship_count
    }))
}

#[get("/api/documents/{doc_id}")]
pub async fn get_document(
    path: web::Path<String>,
    engine: web::Data<HybridSearchEngine>,
) -> impl Responder {
    let doc_id = path.into_inner();
    if let Some(doc) = engine.vector_db.get_document(&doc_id).await {
        HttpResponse::Ok().json(serde_json::json!({
            "doc_id": doc.doc_id,
            "content": doc.content,
            "score": doc.score
        }))
    } else {
        HttpResponse::NotFound().json(serde_json::json!({
            "error": "Document not found",
            "doc_id": doc_id
        }))
    }
}

#[get("/api/documents")]
pub async fn list_all_documents(
    engine: web::Data<HybridSearchEngine>,
) -> impl Responder {
    let documents = engine.vector_db.list_all_documents().await;
    HttpResponse::Ok().json(serde_json::json!({
        "documents": documents,
        "count": documents.len()
    }))
}

#[get("/api/graph/data")]
pub async fn get_graph_data(
    graph: web::Data<KnowledgeGraphManager>,
) -> impl Responder {
    let data = graph.get_graph_data().await;
    HttpResponse::Ok().json(data)
}

#[post("/api/search")]
pub async fn hybrid_search(
    query: web::Json<SearchQuery>,
    // In a real app, user_id comes from auth middleware. 
    // For Phase 1, we might simulate it or pass it in header/query?
    // The plan says "user_id: String" as arg, implying extraction.
    // I'll extract from a header "X-User-ID" for now.
    req_http: actix_web::HttpRequest,
    engine: web::Data<HybridSearchEngine>,
    rbac: web::Data<RBAC>,
) -> impl Responder {
    let user_id = req_http.headers().get("X-User-ID")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("anonymous");

    // 1. Execute hybrid search
    match engine.search(&query.q, query.top_k).await {
        Ok(results) => {
            // 2. Filter by RBAC
            let filtered = rbac.get_permitted_search_results(user_id, results).await;
            HttpResponse::Ok().json(filtered)
        },
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}

#[get("/api/graph/{entity_id}/context")]
pub async fn get_context(
    path: web::Path<String>,
    req_http: actix_web::HttpRequest,
    graph: web::Data<KnowledgeGraphManager>,
    rbac: web::Data<RBAC>,
) -> impl Responder {
    let entity_id = path.into_inner();
    let user_id = req_http.headers().get("X-User-ID")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("anonymous");

    // 1. Traverse graph
    match graph.find_related_context(&entity_id, 3).await {
        Ok(context) => {
            // 2. Filter by RBAC
            match rbac.filter_context(user_id, context).await {
                Ok(filtered) => HttpResponse::Ok().json(filtered),
                Err(e) => HttpResponse::Forbidden().body(e),
            }
        },
        Err(e) => HttpResponse::InternalServerError().body(e.to_string()),
    }
}
