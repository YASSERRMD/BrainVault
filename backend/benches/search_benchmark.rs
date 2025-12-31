use criterion::{criterion_group, criterion_main, Criterion};
use brainvault_backend::core::search_engine::{HybridSearchEngine, SearchWeights};
use brainvault_backend::db::barq_vector::BarqVectorClient;
use tokio::runtime::Runtime;

fn bench_hybrid_search(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let client = BarqVectorClient::new();
    let engine = HybridSearchEngine::new(
        client,
        SearchWeights { vector_weight: 0.7, bm25_weight: 0.3 }
    );
    
    c.bench_function("hybrid_search_empty", |b| {
        b.to_async(&rt).iter(|| async {
            // We use black_box if we want to prevent compiler optimizations, 
            // but engine.search returns a result which we unwrap.
            engine.search("benchmark query", 10).await.unwrap();
        })
    });
}

criterion_group!(benches, bench_hybrid_search);
criterion_main!(benches);
