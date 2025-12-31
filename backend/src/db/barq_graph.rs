use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;

#[derive(Clone)]
pub struct BarqGraphClient {
    base_url: String,
    client: reqwest::Client,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HelperEntity {
    pub id: String,
    pub labels: Vec<String>,
    pub properties: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphRelationship {
    pub from: String,
    pub to: String,
    pub rel_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContextGraph {
    pub nodes: Vec<HelperEntity>,
    pub relationships: Vec<GraphRelationship>,
}

impl BarqGraphClient {
    pub fn new() -> Self {
        let base_url = env::var("GRAPH_DB_URL").unwrap_or_else(|_| "http://localhost:7687".to_string());
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    pub async fn create_node(&self, id: &str, label: &str, props: &HashMap<String, String>) -> Result<(), reqwest::Error> {
        println!("DEBUG: Creating node {} ({}) with props {:?} at {}", id, label, props, self.base_url);
        Ok(())
    }

    pub async fn create_relationship(&self, from: &str, to: &str, rel_type: &str, props: &HashMap<String, String>) -> Result<(), reqwest::Error> {
        println!("DEBUG: Creating rel {}->{} ({}) props {:?} at {}", from, to, rel_type, props, self.base_url);
        Ok(())
    }
    
    pub async fn traverse(&self, start_id: &str, depth: usize) -> Result<ContextGraph, reqwest::Error> {
         println!("DEBUG: Traversing from {} depth {} at {}", start_id, depth, self.base_url);
         Ok(ContextGraph {
             nodes: vec![],
             relationships: vec![],
         })
    }
}
