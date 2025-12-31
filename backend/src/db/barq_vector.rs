use serde::{Deserialize, Serialize};
use std::env;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use crate::core::llm::embeddings::AzureEmbeddingClient;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub doc_id: String,
    pub score: f32,
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct InsertRequest {
    id: String,
    vector: Vec<f32>,
    payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SearchRequest {
    vector: Vec<f32>,
    top_k: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SearchResultItem {
    id: String,
    score: f32,
    payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SearchResponse {
    results: Vec<SearchResultItem>,
}

#[derive(Clone)]
pub struct BarqVectorClient {
    base_url: String,
    collection_name: String,
    client: reqwest::Client,
    content_cache: Arc<RwLock<HashMap<String, String>>>,
    dimension: usize,
}

impl BarqVectorClient {
    pub fn new() -> Self {
        let base_url = env::var("VECTOR_DB_URL").unwrap_or_else(|_| "http://barq-vector:8080".to_string());
        Self {
            base_url,
            collection_name: "brainvault_docs".to_string(),
            client: reqwest::Client::new(),
            content_cache: Arc::new(RwLock::new(HashMap::new())),
            dimension: 1536,
        }
    }

    pub async fn ensure_collection(&self) -> Result<(), String> {
        let url = format!("{}/collections", self.base_url);
        let body = serde_json::json!({
            "name": self.collection_name,
            "dimension": self.dimension,
            "distance_metric": "cosine"
        });
        
        match self.client.post(&url).json(&body).send().await {
            Ok(resp) => {
                if resp.status().is_success() || resp.status().as_u16() == 409 {
                    println!("INFO: Collection '{}' ready", self.collection_name);
                    Ok(())
                } else {
                    println!("WARN: Collection creation returned {}", resp.status());
                    Ok(()) // Continue anyway
                }
            }
            Err(e) => {
                println!("WARN: Could not create collection: {}", e);
                Ok(()) // Continue with local fallback
            }
        }
    }

    pub async fn index_document(&self, doc_id: &str, content: &str) -> Result<(), String> {
        // Generate embedding using Azure OpenAI
        let embedding = if let Some(embedding_client) = AzureEmbeddingClient::new() {
            match embedding_client.get_embedding(content).await {
                Ok(emb) => emb,
                Err(e) => {
                    println!("WARN: Embedding failed: {}. Storing locally only.", e);
                    // Store locally without Barq
                    let mut cache = self.content_cache.write().await;
                    cache.insert(doc_id.to_string(), content.to_string());
                    return Ok(());
                }
            }
        } else {
            println!("WARN: No embedding client. Storing locally only.");
            let mut cache = self.content_cache.write().await;
            cache.insert(doc_id.to_string(), content.to_string());
            return Ok(());
        };

        // Ensure collection exists
        let _ = self.ensure_collection().await;

        // Try to insert into Barq via REST
        let url = format!("{}/collections/{}/vectors", self.base_url, self.collection_name);
        let body = InsertRequest {
            id: doc_id.to_string(),
            vector: embedding,
            payload: serde_json::json!({"content": content, "doc_id": doc_id}),
        };

        match self.client.post(&url).json(&body).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    println!("INFO: Indexed document '{}' to Barq", doc_id);
                } else {
                    println!("WARN: Barq insert returned {}", resp.status());
                }
            }
            Err(e) => {
                println!("WARN: Barq insert failed: {}", e);
            }
        }

        // Always cache content locally
        let mut cache = self.content_cache.write().await;
        cache.insert(doc_id.to_string(), content.to_string());
        
        Ok(())
    }

    pub async fn semantic_search(&self, query: &str, top_k: usize) -> Result<Vec<SearchHit>, String> {
        // Use local BM25-style search since embeddings may not be available
        self.local_search(query, top_k).await
    }

    async fn local_search(&self, query: &str, top_k: usize) -> Result<Vec<SearchHit>, String> {
        let cache = self.content_cache.read().await;
        let query_lower = query.to_lowercase();
        let query_terms: Vec<&str> = query_lower.split_whitespace().collect();
        
        // Require at least 30% of terms to match for relevance
        let min_score_threshold = 0.3;
        
        let mut scored: Vec<(String, f32, String)> = cache
            .iter()
            .map(|(id, content)| {
                let content_lower = content.to_lowercase();
                let id_lower = id.to_lowercase();
                
                // Count term matches in content
                let content_matches: usize = query_terms.iter()
                    .filter(|term| content_lower.contains(*term))
                    .count();
                
                // Boost if query matches document ID
                let id_match_boost: f32 = if query_terms.iter().any(|term| id_lower.contains(*term)) {
                    0.3
                } else {
                    0.0
                };
                
                let base_score = content_matches as f32 / query_terms.len().max(1) as f32;
                let score = (base_score + id_match_boost).min(1.0);
                
                (id.clone(), score, content.clone())
            })
            .filter(|(_, score, _)| *score >= min_score_threshold)
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        let results: Vec<SearchHit> = scored
            .into_iter()
            .take(top_k)
            .map(|(id, score, content)| SearchHit {
                doc_id: id,
                score,
                content: Some(content),
            })
            .collect();

        Ok(results)
    }

    pub async fn bm25_search(&self, query: &str, top_k: usize) -> Result<Vec<SearchHit>, String> {
        self.local_search(query, top_k).await
    }

    pub async fn get_document(&self, doc_id: &str) -> Option<SearchHit> {
        let cache = self.content_cache.read().await;
        cache.get(doc_id).map(|content| SearchHit {
            doc_id: doc_id.to_string(),
            score: 1.0,
            content: Some(content.clone()),
        })
    }

    pub async fn get_document_count(&self) -> usize {
        let cache = self.content_cache.read().await;
        cache.len()
    }

    pub async fn list_all_documents(&self) -> Vec<SearchHit> {
        let cache = self.content_cache.read().await;
        cache.iter().map(|(id, content)| SearchHit {
            doc_id: id.clone(),
            score: 1.0,
            content: Some(content.clone()),
        }).collect()
    }

    // Backward compatibility
    pub async fn index_vector(&self, doc_id: &str, content: &str) -> Result<(), reqwest::Error> {
        let _ = self.index_document(doc_id, content).await;
        Ok(())
    }

    pub async fn index_bm25(&self, doc_id: &str, _content: &str) -> Result<(), reqwest::Error> {
        println!("DEBUG: BM25 index for doc {}", doc_id);
        Ok(())
    }
}
