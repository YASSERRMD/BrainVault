use crate::db::barq_graph::{BarqGraphClient, ContextGraph};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub struct KnowledgeGraphManager {
    graph_db: BarqGraphClient,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Entity {
    pub id: String,
    pub node_type: String,    // "Organization", "Department", "Policy", "Document"
    pub properties: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Relationship {
    pub from_id: String,
    pub to_id: String,
    pub rel_type: String,     // "manages", "references", "depends_on", "implements"
    pub properties: HashMap<String, String>,
}

impl KnowledgeGraphManager {
    pub fn new(graph_db: BarqGraphClient) -> Self {
        Self { graph_db }
    }

    pub async fn add_entity(&self, entity: Entity) -> Result<(), Box<dyn std::error::Error>> {
        self.graph_db.create_node(&entity.id, &entity.node_type, &entity.properties).await?;
        Ok(())
    }
    
    pub async fn add_relationship(&self, rel: Relationship) -> Result<(), Box<dyn std::error::Error>> {
        self.graph_db.create_relationship(&rel.from_id, &rel.to_id, &rel.rel_type, &rel.properties).await?;
        Ok(())
    }
    
    pub async fn find_related_context(&self, entity_id: &str, depth: usize) -> Result<ContextGraph, Box<dyn std::error::Error>> {
        let result = self.graph_db.traverse(entity_id, depth).await?;
        Ok(result)
    }
}
