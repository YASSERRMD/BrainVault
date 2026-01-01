use serde::{Deserialize, Serialize};
use std::env;
use std::collections::HashMap;
use reqwest::Client;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: u64,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub embedding: Option<Vec<f32>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_id: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rule_tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub from: u64,
    pub to: u64,
    pub edge_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridQueryRequest {
    pub query_embedding: Vec<f32>,
    pub start: u64,
    pub max_hops: u32,
    pub k: usize,
    pub alpha: f32,
    pub beta: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridResult {
    pub id: u64,
    pub score: f32,
    pub vector_distance: f32,
    pub graph_distance: u32,
    pub path: Vec<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HybridQueryResponse {
    pub results: Vec<HybridResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsResponse {
    pub node_count: usize,
    pub edge_count: usize,
    #[serde(default)]
    pub vector_count: usize,
    #[serde(default)]
    pub decision_count: usize,
}

#[derive(Clone)]
pub struct BarqGraphClient {
    base_url: String,
    client: Client,
    id_counter: std::sync::Arc<tokio::sync::RwLock<u64>>,
    label_to_id: std::sync::Arc<tokio::sync::RwLock<HashMap<String, u64>>>,
}

impl BarqGraphClient {
    pub fn new() -> Self {
        let base_url = env::var("GRAPH_DB_URL").unwrap_or_else(|_| "http://barq-graph:8080".to_string());
        Self {
            base_url,
            client: Client::new(),
            id_counter: std::sync::Arc::new(tokio::sync::RwLock::new(1)),
            label_to_id: std::sync::Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    async fn get_next_id(&self) -> u64 {
        let mut counter = self.id_counter.write().await;
        let id = *counter;
        *counter += 1;
        id
    }

    pub async fn health(&self) -> Result<bool, String> {
        let url = format!("{}/health", self.base_url);
        match self.client.get(&url).send().await {
            Ok(resp) => Ok(resp.status().is_success()),
            Err(e) => Err(format!("Health check failed: {}", e)),
        }
    }

    pub async fn get_stats(&self) -> Result<StatsResponse, String> {
        let url = format!("{}/stats", self.base_url);
        let resp = self.client.get(&url)
            .send()
            .await
            .map_err(|e| format!("Stats request failed: {}", e))?;

        if resp.status().is_success() {
            resp.json::<StatsResponse>()
                .await
                .map_err(|e| format!("Stats parse failed: {}", e))
        } else {
            Err(format!("Stats failed: {}", resp.status()))
        }
    }

    pub async fn create_node(&self, label: &str, embedding: Option<Vec<f32>>) -> Result<u64, String> {
        let id = self.get_next_id().await;
        let url = format!("{}/nodes", self.base_url);
        
        let node = GraphNode {
            id,
            label: label.to_string(),
            embedding,
            agent_id: None,
            rule_tags: None,
        };

        let resp = self.client.post(&url)
            .json(&node)
            .send()
            .await
            .map_err(|e| format!("Create node failed: {}", e))?;

        if resp.status().is_success() {
            // Cache the mapping
            let mut map = self.label_to_id.write().await;
            map.insert(label.to_string(), id);
            Ok(id)
        } else {
            Err(format!("Create node failed: {}", resp.status()))
        }
    }

    pub async fn create_edge(&self, from: u64, to: u64, edge_type: &str) -> Result<(), String> {
        let url = format!("{}/edges", self.base_url);
        
        let edge = GraphEdge {
            from,
            to,
            edge_type: edge_type.to_string(),
        };

        let resp = self.client.post(&url)
            .json(&edge)
            .send()
            .await
            .map_err(|e| format!("Create edge failed: {}", e))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            Err(format!("Create edge failed: {}", resp.status()))
        }
    }

    pub async fn hybrid_query(&self, query_embedding: Vec<f32>, start_id: u64, max_hops: u32, k: usize) -> Result<Vec<HybridResult>, String> {
        let url = format!("{}/query/hybrid", self.base_url);
        
        let request = HybridQueryRequest {
            query_embedding,
            start: start_id,
            max_hops,
            k,
            alpha: 0.5,
            beta: 0.5,
        };

        let resp = self.client.post(&url)
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Hybrid query failed: {}", e))?;

        if resp.status().is_success() {
            let response: HybridQueryResponse = resp.json()
                .await
                .map_err(|e| format!("Parse hybrid results failed: {}", e))?;
            Ok(response.results)
        } else {
            Err(format!("Hybrid query failed: {}", resp.status()))
        }
    }

    pub async fn get_node_id_by_label(&self, label: &str) -> Option<u64> {
        let map = self.label_to_id.read().await;
        map.get(label).copied()
    }
}
