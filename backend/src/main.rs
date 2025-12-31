use actix_web::{web, App, HttpServer};
use brainvault_backend::api::handlers::{knowledge, agents};
use brainvault_backend::core::search_engine::{HybridSearchEngine, SearchWeights};
use brainvault_backend::core::graph_manager::KnowledgeGraphManager;
use brainvault_backend::core::rbac::{RBAC, Role, Permission};
use brainvault_backend::core::agent_orchestrator::{AgentOrchestrator, AgentProfile, AgentType};
use brainvault_backend::db::barq_vector::BarqVectorClient;
use brainvault_backend::db::barq_graph::BarqGraphClient;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting BrainVault API on 0.0.0.0:8080");

    // Initialize dependencies
    let vector_client = BarqVectorClient::new();
    let graph_client = BarqGraphClient::new();
    
    let search_engine = HybridSearchEngine::new(
        vector_client, 
        SearchWeights { vector_weight: 0.7, bm25_weight: 0.3 }
    );
    
    let graph_manager = KnowledgeGraphManager::new(graph_client);
    
    // Initialize RBAC with default admin
    let mut rbac = RBAC::new();
    rbac.add_permission(Permission {
        user_id: "admin".to_string(),
        role: Role::Admin,
        accessible_entities: vec![],
        accessible_collections: vec![],
    });
    // Add a default viewer for testing
    rbac.add_permission(Permission {
        user_id: "viewer".to_string(),
        role: Role::Viewer,
        accessible_entities: vec![], // Will need to be populated to see anything
        accessible_collections: vec![],
    });

    // Initialize Agent Orchestrator
    let orchestrator = AgentOrchestrator::new();
    // Register a default agent
    orchestrator.register_agent(AgentProfile {
        id: "default_agent".to_string(),
        name: "Default Agent".to_string(),
        agent_type: AgentType::Manager,
        capabilities: vec!["general".to_string()],
    }).await;

    // Wrap in Data (Arc)
    let search_data = web::Data::new(search_engine);
    let graph_data = web::Data::new(graph_manager);
    let rbac_data = web::Data::new(rbac);
    let orch_data = web::Data::new(orchestrator);

    HttpServer::new(move || {
        App::new()
            .app_data(search_data.clone())
            .app_data(graph_data.clone())
            .app_data(rbac_data.clone())
            .app_data(orch_data.clone())
            .service(knowledge::ingest_knowledge)
            .service(knowledge::hybrid_search)
            .service(knowledge::get_context)
            .service(agents::submit_task)
            .service(agents::get_task_status)
            .service(agents::register_agent)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
