use crate::core::search_engine::SearchResults;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum Role {
    Admin,
    DataOwner,
    Agent,
    Viewer,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Permission {
    pub user_id: String,
    pub role: Role,
    pub accessible_entities: Vec<String>,    // Graph node IDs they can access
    pub accessible_collections: Vec<String>, // Document collections
}

pub struct RBAC {
    pub permissions: HashMap<String, Permission>,
}

impl RBAC {
    pub fn new() -> Self {
        Self {
            permissions: HashMap::new(),
        }
    }
    
    pub fn add_permission(&mut self, perm: Permission) {
        self.permissions.insert(perm.user_id.clone(), perm);
    }
    
    pub async fn get_permission(&self, user_id: &str) -> Result<&Permission, String> {
        self.permissions.get(user_id).ok_or_else(|| "User not found".to_string())
    }

    pub async fn check_access(&self, user_id: &str, entity_id: &str) -> Result<bool, String> {
        let perm = self.get_permission(user_id).await?;
        if perm.role == Role::Admin {
            return Ok(true);
        }
        Ok(perm.accessible_entities.contains(&entity_id.to_string()))
    }
    
    pub async fn get_permitted_search_results(&self, user_id: &str, results: SearchResults) -> SearchResults {
        let perm_result = self.get_permission(user_id).await;
        if let Ok(perm) = perm_result {
             if perm.role == Role::Admin {
                 return results;
             }
             
             let filtered = results.hits.into_iter()
                .filter(|hit| perm.accessible_entities.contains(&hit.doc_id))
                .collect();
             return SearchResults { hits: filtered };
        }
        
        SearchResults { hits: vec![] }
    }
    
    pub async fn filter_context(&self, user_id: &str, context: crate::db::barq_graph::ContextGraph) -> Result<crate::db::barq_graph::ContextGraph, String> {
         let perm = self.get_permission(user_id).await?;
         if perm.role == Role::Admin {
             return Ok(context);
         }
         
         let nodes: Vec<_> = context.nodes.into_iter()
             .filter(|n| perm.accessible_entities.contains(&n.id))
             .collect();
             
         // Also filter relationships where both endpoints are visible?
         // For now keep it simple and just return filtered nodes.
         
         Ok(crate::db::barq_graph::ContextGraph {
             nodes,
             relationships: context.relationships, 
         })
    }
}
