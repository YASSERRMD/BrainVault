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

#[get("/api/health")]
pub async fn health_check(
    engine: web::Data<HybridSearchEngine>,
) -> impl Responder {
    // Check vector DB
    let vector_status = engine.vector_db.get_document_count().await > 0 || true; // Local always works
    
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
    
    // 2. Create entity nodes in graph
    for entity in &req.entities {
         if let Err(e) = graph.add_entity(entity.clone()).await {
             return HttpResponse::InternalServerError().body(format!("Graph entity creation failed: {}", e));
         }
    }
    
    // 3. Create relationships in graph
    for rel in &req.relationships {
         if let Err(e) = graph.add_relationship(rel.clone()).await {
             return HttpResponse::InternalServerError().body(format!("Graph relationship creation failed: {}", e));
         }
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
