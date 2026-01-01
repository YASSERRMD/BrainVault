use actix_web::{web, App, HttpServer};
use brainvault_backend::api::handlers::{knowledge, agents, security};
use brainvault_backend::core::audit_manager::AuditManager;
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
        accessible_entities: vec!["doc-001".to_string(), "quantum-comp".to_string()], 
        accessible_collections: vec![],
    });

    // Initialize Agent Orchestrator with tools
    // We wrap search_engine and graph_manager in Arc for orchestrator
    // Since web::Data wraps them too, but we need Arc inside orchestrator.
    // Note: HybridSearchEngine is already holding clients which are ref-counted, but strictly speaking HybridSearchEngine itself is struct.
    // We created `let search_engine = ...`.
    // We moved it into `search_data`? No, `web::Data::new` takes ownership.
    // We need to clone it before giving to Data if we want to give to Orchestrator too?
    // Or wrap in Arc first.
    
    let search_arc = std::sync::Arc::new(search_engine);
    let graph_arc = std::sync::Arc::new(graph_manager);
    
    let orchestrator = AgentOrchestrator::new(Some(search_arc.clone()), Some(graph_arc.clone()));
    
    // Register a default agent
    orchestrator.register_agent(AgentProfile {
        id: "default_agent".to_string(),
        name: "Default Agent".to_string(),
        agent_type: AgentType::Manager,
        capabilities: vec!["general".to_string()],
    }).await;
    
    // Spawn Agent Loop
    let orch_for_loop = orchestrator.clone();
    tokio::spawn(async move {
        orch_for_loop.run_agent_loop().await;
    });

    // Wrap in Data (Arc)
    // Note: We used to pass 'search_engine' variable directly. Now we have 'search_arc'.
    // web::Data::from(search_arc) works if we want to share the Arc.
    let search_data = web::Data::from(search_arc);
    let graph_data = web::Data::from(graph_arc);
    let rbac_data = web::Data::new(rbac);
    let orch_data = web::Data::new(orchestrator);

    // Initialize Audit Manager
    let audit_manager = AuditManager::new();
    let audit_data = web::Data::new(audit_manager);

    HttpServer::new(move || {
        let cors = actix_cors::Cors::permissive(); // For dev phase only

        App::new()
            .wrap(cors)
            .app_data(search_data.clone())
            .app_data(graph_data.clone())
            .app_data(rbac_data.clone())
            .app_data(orch_data.clone())
            .app_data(audit_data.clone())
            .service(knowledge::health_check)
            .service(knowledge::ingest_knowledge)
            .service(knowledge::hybrid_search)
            .service(knowledge::get_context)
            .service(knowledge::seed_test_data)
            .service(knowledge::chat_with_knowledge)
            .service(knowledge::get_knowledge_stats)
            .service(knowledge::get_graph_data)
            .service(knowledge::get_document)
            .service(knowledge::list_all_documents)
            .service(agents::submit_task)
            .service(agents::get_task_status)
            .service(agents::get_stats)
            .service(agents::get_all_tasks)
            .service(agents::register_agent)
            .service(security::get_security_logs)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
