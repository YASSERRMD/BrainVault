use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::core::search_engine::HybridSearchEngine;
use crate::core::graph_manager::{KnowledgeGraphManager, Entity, Relationship};
use crate::core::rbac::RBAC;

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
