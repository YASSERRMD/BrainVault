use crate::db::barq_vector::{BarqVectorClient, SearchHit as DbHit};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone)]
pub struct SearchWeights {
    pub vector_weight: f32,
    pub bm25_weight: f32,
}

#[derive(Clone)]
pub struct HybridSearchEngine {
    pub vector_db: BarqVectorClient,
    pub lexical_weights: SearchWeights,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchHit {
    pub doc_id: String,
    pub score: f32,
    pub content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResults {
    pub hits: Vec<SearchHit>,
}

impl HybridSearchEngine {
    pub async fn check_health(&self) -> bool {
        self.vector_db.health().await.unwrap_or(false)
    }

    pub fn new(vector_db: BarqVectorClient, weights: SearchWeights) -> Self {
        Self {
            vector_db,
            lexical_weights: weights,
        }
    }

    pub async fn search(&self, query: &str, top_k: usize) -> Result<SearchResults, Box<dyn std::error::Error + Send + Sync>> {
        let vector_results = self.vector_db.semantic_search(query, top_k).await
            .unwrap_or_else(|e| {
                println!("WARN: Semantic search failed: {}", e);
                vec![]
            });
        let lexical_results = self.vector_db.bm25_search(query, top_k).await
            .unwrap_or_else(|e| {
                println!("WARN: BM25 search failed: {}", e);
                vec![]
            });
        
        let merged = self.merge_results(vector_results, lexical_results);
        Ok(merged)
    }
    
    fn merge_results(&self, vector_hits: Vec<DbHit>, bm25_hits: Vec<DbHit>) -> SearchResults {
        let mut scores: HashMap<String, f32> = HashMap::new();
        let mut content_map: HashMap<String, Option<String>> = HashMap::new();
        
        for hit in vector_hits {
            *scores.entry(hit.doc_id.clone()).or_insert(0.0) += hit.score * self.lexical_weights.vector_weight;
            content_map.entry(hit.doc_id).or_insert(hit.content);
        }
        
        for hit in bm25_hits {
             *scores.entry(hit.doc_id.clone()).or_insert(0.0) += hit.score * self.lexical_weights.bm25_weight;
             content_map.entry(hit.doc_id).or_insert(hit.content);
        }
        
        let mut hits: Vec<SearchHit> = scores.into_iter().map(|(id, score)| {
            SearchHit {
                doc_id: id.clone(),
                score,
                content: content_map.get(&id).cloned().flatten(),
            }
        }).collect();
        // Sort by score descending
        hits.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        SearchResults { hits }
    }
    
    pub async fn ingest_document(&self, doc_id: &str, content: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        self.vector_db.index_document(doc_id, content).await
            .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e)) as Box<dyn std::error::Error + Send + Sync>)?;
        Ok(())
    }

    pub async fn get_document_count(&self) -> usize {
        self.vector_db.get_document_count().await
    }
}

