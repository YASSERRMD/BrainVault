use crate::db::barq_graph::BarqGraphClient;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct KnowledgeGraphManager {
    graph_db: BarqGraphClient,
    entities: Arc<RwLock<HashMap<String, Entity>>>,
    relationships: Arc<RwLock<Vec<Relationship>>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Entity {
    pub id: String,
    pub label: String,
    pub properties: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Relationship {
    pub from_id: String,
    pub to_id: String,
    pub rel_type: String,
    #[serde(default)]
    pub properties: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ContextGraph {
    pub entities: Vec<Entity>,
    pub relationships: Vec<Relationship>,
}

impl KnowledgeGraphManager {
    pub fn new(graph_db: BarqGraphClient) -> Self {
        let data_path = std::env::var("DATA_PATH").unwrap_or_else(|_| "/data".to_string());
        
        let mut entity_map = HashMap::new();
        let mut rel_list = Vec::new();

        let ents_file = format!("{}/graph_entities.json", data_path);
        let rels_file = format!("{}/graph_relationships.json", data_path);

        if let Ok(content) = std::fs::read_to_string(&ents_file) {
            if let Ok(loaded) = serde_json::from_str::<HashMap<String, Entity>>(&content) {
                entity_map = loaded;
            }
        }
        if let Ok(content) = std::fs::read_to_string(&rels_file) {
            if let Ok(loaded) = serde_json::from_str::<Vec<Relationship>>(&content) {
                rel_list = loaded;
            }
        }

        Self { 
            graph_db,
            entities: Arc::new(RwLock::new(entity_map)),
            relationships: Arc::new(RwLock::new(rel_list)),
        }
    }

    pub async fn save_state(&self) {
        let data_path = std::env::var("DATA_PATH").unwrap_or_else(|_| "/data".to_string());
        let ents_file = format!("{}/graph_entities.json", data_path);
        let rels_file = format!("{}/graph_relationships.json", data_path);

        let ents = self.entities.read().await;
        if let Ok(content) = serde_json::to_string(&*ents) {
            let _ = std::fs::write(ents_file, content);
        }

        let rels = self.relationships.read().await;
        if let Ok(content) = serde_json::to_string(&*rels) {
            let _ = std::fs::write(rels_file, content);
        }
    }

    pub async fn add_entity(&self, entity: Entity) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Try to create in Barq GraphDB using ID as key
        match self.graph_db.create_node(&entity.id, &entity.label, None).await {
            Ok(node_id) => {
                println!("INFO: Created graph node {} with id {}", entity.id, node_id);
            },
            Err(e) => {
                println!("WARN: Graph node creation failed: {}. Storing locally.", e);
            }
        }
        
        // Store locally as backup
        {
            let mut entities = self.entities.write().await;
            entities.insert(entity.id.clone(), entity);
        }
        self.save_state().await;
        Ok(())
    }
    
    pub async fn add_relationship(&self, rel: Relationship) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Try to get node IDs from Barq by their names (slugs)
        let from_id = self.graph_db.get_node_id_by_name(&rel.from_id).await;
        let to_id = self.graph_db.get_node_id_by_name(&rel.to_id).await;
        
        if let (Some(from), Some(to)) = (from_id, to_id) {
            match self.graph_db.create_edge(from, to, &rel.rel_type).await {
                Ok(_) => println!("INFO: Created edge {} -> {}", from, to),
                Err(e) => println!("WARN: Edge creation failed: {}", e),
            }
        }
        
        // Store locally
        {
            let mut rels = self.relationships.write().await;
            rels.push(rel);
        }
        self.save_state().await;
        Ok(())
    }
    
    pub async fn find_related_context(&self, entity_id: &str, _depth: usize) -> Result<ContextGraph, Box<dyn std::error::Error + Send + Sync>> {
        let entities = self.entities.read().await;
        let relationships = self.relationships.read().await;
        
        // Filter relationships that involve this entity
        let related_rels: Vec<Relationship> = relationships
            .iter()
            .filter(|r| r.from_id == entity_id || r.to_id == entity_id)
            .cloned()
            .collect();
        
        // Get related entity IDs
        let related_entity_ids: std::collections::HashSet<String> = related_rels
            .iter()
            .flat_map(|r| vec![r.from_id.clone(), r.to_id.clone()])
            .collect();
        
        // Get those entities
        let related_entities: Vec<Entity> = entities
            .values()
            .filter(|e| related_entity_ids.contains(&e.id))
            .cloned()
            .collect();
        
        Ok(ContextGraph {
            entities: related_entities,
            relationships: related_rels,
        })
    }

    pub async fn get_stats(&self) -> (usize, usize) {
        // Try to get from Barq first
        if let Ok(stats) = self.graph_db.get_stats().await {
            return (stats.node_count, stats.edge_count);
        }
        
        // Fallback to local counts
        let entities = self.entities.read().await;
        let relationships = self.relationships.read().await;
        (entities.len(), relationships.len())
    }

    pub async fn get_graph_data(&self) -> ContextGraph {
        let entities = self.entities.read().await;
        let relationships = self.relationships.read().await;
        
        ContextGraph {
            entities: entities.values().cloned().collect(),
            relationships: relationships.clone(),
        }
    }

    pub async fn check_health(&self) -> bool {
        self.graph_db.health().await.unwrap_or(false)
    }

    pub async fn find_nodes_by_text(&self, query: &str) -> Vec<Entity> {
        let query = query.to_lowercase();
        let entities = self.entities.read().await;
        
        entities.values()
            .filter(|e| {
                e.id.to_lowercase().contains(&query) || 
                e.label.to_lowercase().contains(&query) ||
                e.properties.get("name").map(|n| n.to_lowercase().contains(&query)).unwrap_or(false)
            })
            .cloned()
            .collect()
    }
}
