use brainvault_backend::core::graph_manager::{KnowledgeGraphManager, Entity, Relationship};
use brainvault_backend::db::barq_graph::BarqGraphClient;
use std::collections::HashMap;

#[tokio::test]
async fn test_graph_manager_operations() {
    let client = BarqGraphClient::new();
    let manager = KnowledgeGraphManager::new(client);
    
    let entity = Entity {
        id: "e1".to_string(),
        node_type: "Department".to_string(),
        properties: HashMap::new(),
    };
    
    assert!(manager.add_entity(entity).await.is_ok());
    
    let rel = Relationship {
        from_id: "e1".to_string(),
        to_id: "e2".to_string(),
        rel_type: "manages".to_string(),
        properties: HashMap::new(),
    };
    
    assert!(manager.add_relationship(rel).await.is_ok());
    
    let context = manager.find_related_context("e1", 2).await;
    assert!(context.is_ok());
}
