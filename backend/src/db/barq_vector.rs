use serde::{Deserialize, Serialize};
use std::env;
use std::sync::Arc;
use tokio::sync::RwLock;
use barq_sdk_rust::{BarqGrpcClient, DistanceMetric, DocumentId};
use serde_json::json;
use crate::core::llm::embeddings::AzureEmbeddingClient;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub doc_id: String,
    pub score: f32,
    pub content: Option<String>,
}

// Cache for document content (Barq stores payloads, but we keep local cache for quick access)
#[derive(Clone)]
pub struct BarqVectorClient {
    grpc_url: String,
    collection_name: String,
    content_cache: Arc<RwLock<std::collections::HashMap<String, String>>>,
    dimension: usize,
}

impl BarqVectorClient {
    pub fn new() -> Self {
        let grpc_url = env::var("VECTOR_DB_GRPC_URL").unwrap_or_else(|_| "http://barq-vector:50051".to_string());
        Self {
            grpc_url,
            collection_name: "brainvault_docs".to_string(),
            content_cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
            dimension: 1536, // Azure ada-002 dimension
        }
    }

    async fn get_client(&self) -> Result<BarqGrpcClient, String> {
        BarqGrpcClient::connect(self.grpc_url.clone())
            .await
            .map_err(|e| format!("Failed to connect to Barq: {}", e))
    }

    pub async fn ensure_collection(&self) -> Result<(), String> {
        let mut client = self.get_client().await?;
        // Try to create collection, ignore if exists
        match client.create_collection(&self.collection_name, self.dimension, DistanceMetric::Cosine).await {
            Ok(_) => println!("INFO: Created collection '{}'", self.collection_name),
            Err(e) => println!("INFO: Collection check: {} (may already exist)", e),
        }
        Ok(())
    }

    pub async fn index_document(&self, doc_id: &str, content: &str) -> Result<(), String> {
        // Generate embedding using Azure OpenAI
        let embedding = if let Some(embedding_client) = AzureEmbeddingClient::new() {
            match embedding_client.get_embedding(content).await {
                Ok(emb) => emb,
                Err(e) => {
                    println!("WARN: Embedding failed: {}. Skipping document.", e);
                    return Err(e);
                }
            }
        } else {
            return Err("No embedding client configured".to_string());
        };

        // Ensure collection exists
        let _ = self.ensure_collection().await;

        // Insert into Barq
        let mut client = self.get_client().await?;
        let payload = json!({"content": content, "doc_id": doc_id});
        
        client.insert_document(
            &self.collection_name,
            DocumentId::Str(doc_id.to_string()),
            embedding,
            payload,
        )
        .await
        .map_err(|e| format!("Barq insert failed: {}", e))?;

        // Cache content locally
        let mut cache = self.content_cache.write().await;
        cache.insert(doc_id.to_string(), content.to_string());
        
        println!("INFO: Indexed document '{}' into Barq", doc_id);
        Ok(())
    }

    pub async fn semantic_search(&self, query: &str, top_k: usize) -> Result<Vec<SearchHit>, String> {
        // Generate query embedding
        let query_embedding = if let Some(embedding_client) = AzureEmbeddingClient::new() {
            match embedding_client.get_embedding(query).await {
                Ok(emb) => emb,
                Err(e) => {
                    return Err(format!("Query embedding failed: {}", e));
                }
            }
        } else {
            return Err("No embedding client configured".to_string());
        };

        // Search in Barq
        let mut client = self.get_client().await?;
        let results = client.search(&self.collection_name, query_embedding, top_k)
            .await
            .map_err(|e| format!("Barq search failed: {}", e))?;

        // Map results
        let cache = self.content_cache.read().await;
        let hits: Vec<SearchHit> = results.into_iter().map(|r| {
            let doc_id = format!("{:?}", r.id);
            let content = cache.get(&doc_id).cloned();
            SearchHit {
                doc_id,
                score: r.score,
                content,
            }
        }).collect();

        Ok(hits)
    }

    pub async fn bm25_search(&self, query: &str, top_k: usize) -> Result<Vec<SearchHit>, String> {
        // For BM25, use semantic search as fallback (Barq doesn't have native BM25)
        self.semantic_search(query, top_k).await
    }

    pub async fn get_document_count(&self) -> usize {
        let cache = self.content_cache.read().await;
        cache.len()
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
