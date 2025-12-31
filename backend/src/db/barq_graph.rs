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

    pub async fn create_node(&self, _id: &str, _label: &str, _props: &HashMap<String, String>) -> Result<(), reqwest::Error> {
        // TODO: call API
        Ok(())
    }

    pub async fn create_relationship(&self, _from: &str, _to: &str, _rel_type: &str, _props: &HashMap<String, String>) -> Result<(), reqwest::Error> {
        // TODO: call API
        Ok(())
    }
    
    pub async fn traverse(&self, _start_id: &str, _depth: usize) -> Result<ContextGraph, reqwest::Error> {
         // TODO: call API
         Ok(ContextGraph {
             nodes: vec![],
             relationships: vec![],
         })
    }
}
