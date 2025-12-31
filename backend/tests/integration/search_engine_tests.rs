use brainvault_backend::core::search_engine::{HybridSearchEngine, SearchWeights};
use brainvault_backend::db::barq_vector::BarqVectorClient;

#[tokio::test]
async fn test_hybrid_search_instantiation() {
    let client = BarqVectorClient::new();
    let weights = SearchWeights { vector_weight: 0.7, bm25_weight: 0.3 };
    let engine = HybridSearchEngine::new(client, weights);
    
    let result = engine.search("test", 5).await;
    assert!(result.is_ok());
    let hits = result.unwrap().hits;
    assert_eq!(hits.len(), 0);
}
