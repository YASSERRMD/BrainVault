use brainvault_backend::core::rbac::{RBAC, Role, Permission};
use brainvault_backend::core::search_engine::{SearchResults, SearchHit};

#[tokio::test]
async fn test_rbac_filtering() {
    let mut rbac = RBAC::new();
    
    rbac.add_permission(Permission {
        user_id: "user_a".to_string(),
        role: Role::Viewer,
        accessible_entities: vec!["doc_1".to_string(), "doc_2".to_string()],
        accessible_collections: vec![],
    });
    
    let results = SearchResults {
        hits: vec![
            SearchHit { doc_id: "doc_1".to_string(), score: 1.0, content: None },
            SearchHit { doc_id: "doc_3".to_string(), score: 0.9, content: None },
        ],
    };
    
    let filtered = rbac.get_permitted_search_results("user_a", results).await;
    assert_eq!(filtered.hits.len(), 1);
    assert_eq!(filtered.hits[0].doc_id, "doc_1");
}

#[tokio::test]
async fn test_admin_access() {
    let mut rbac = RBAC::new();
     rbac.add_permission(Permission {
        user_id: "admin".to_string(),
        role: Role::Admin,
        accessible_entities: vec![],
        accessible_collections: vec![],
    });
    
    let checks = rbac.check_access("admin", "any_doc").await;
    assert!(checks.unwrap());
}
