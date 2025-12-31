use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AgentType {
    Researcher,
    Analyst,
    Coder,
    Reviewer,
    Manager,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentProfile {
    pub id: String,
    pub name: String,
    pub agent_type: AgentType,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub description: String,
    pub status: TaskStatus,
    pub assigned_agent_id: Option<String>,
    pub result: Option<String>,
}

use crate::core::search_engine::HybridSearchEngine;
use crate::core::graph_manager::KnowledgeGraphManager;

#[derive(Clone)]
pub struct AgentOrchestrator {
    agents: Arc<Mutex<HashMap<String, AgentProfile>>>,
    tasks: Arc<Mutex<HashMap<String, Task>>>,
    search_engine: Option<Arc<HybridSearchEngine>>,
    graph_manager: Option<Arc<KnowledgeGraphManager>>,
}

impl AgentOrchestrator {
    pub fn new(
        search_engine: Option<Arc<HybridSearchEngine>>,
        graph_manager: Option<Arc<KnowledgeGraphManager>>,
    ) -> Self {
        Self {
            agents: Arc::new(Mutex::new(HashMap::new())),
            tasks: Arc::new(Mutex::new(HashMap::new())),
            search_engine,
            graph_manager,
        }
    }

    pub async fn register_agent(&self, profile: AgentProfile) {
        let mut agents = self.agents.lock().await;
        agents.insert(profile.id.clone(), profile);
    }

    pub async fn submit_task(&self, description: String) -> String {
        let task_id = Uuid::new_v4().to_string();
        let task = Task {
            id: task_id.clone(),
            description,
            status: TaskStatus::Pending,
            assigned_agent_id: None,
            result: None,
        };
        
        let mut tasks = self.tasks.lock().await;
        tasks.insert(task_id.clone(), task);
        task_id
    }

    pub async fn assign_task(&self, task_id: &str) -> Result<String, String> {
        let mut tasks = self.tasks.lock().await;
        let task = tasks.get_mut(task_id).ok_or("Task not found")?;
        
        if task.assigned_agent_id.is_some() {
            return Ok(task.assigned_agent_id.clone().unwrap());
        }

        let agents = self.agents.lock().await;
        // Simple mock scheduling
        if let Some((agent_id, _)) = agents.iter().next() {
            task.assigned_agent_id = Some(agent_id.clone());
            task.status = TaskStatus::InProgress;
            return Ok(agent_id.clone());
        }

        Err("No agents available".to_string())
    }
    
    pub async fn complete_task(&self, task_id: &str, result: String) -> Result<(), String> {
        let mut tasks = self.tasks.lock().await;
        let task = tasks.get_mut(task_id).ok_or("Task not found")?;
        task.status = TaskStatus::Completed;
        task.result = Some(result);
        Ok(())
    }

    pub async fn get_task(&self, task_id: &str) -> Option<Task> {
        let tasks = self.tasks.lock().await;
        tasks.get(task_id).cloned()
    }
    
    // The background worker that processes tasks
    pub async fn run_agent_loop(&self) {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            
            // 1. Identify tasks involved
            let mut tasks_to_process: Vec<(String, String)> = Vec::new(); // (task_id, agent_id)
            
            {
                let tasks = self.tasks.lock().await;
                for (id, task) in tasks.iter() {
                    if matches!(task.status, TaskStatus::InProgress) && task.assigned_agent_id.is_some() {
                         tasks_to_process.push((id.clone(), task.assigned_agent_id.clone().unwrap()));
                    }
                }
            }
            
            // 2. Execute agent logic
            for (task_id, agent_id) in tasks_to_process {
                let agent_profile = {
                    let agents = self.agents.lock().await;
                    agents.get(&agent_id).cloned()
                };
                
                if let Some(profile) = agent_profile {
                    let description = {
                         let tasks = self.tasks.lock().await;
                         tasks.get(&task_id).unwrap().description.clone()
                    };
                    
                    let result = self.execute_agent_logic(&profile, &description).await;
                    
                    // 3. Update task
                    let _ = self.complete_task(&task_id, result).await;
                    println!("DEBUG: Agent {} completed task {}", agent_id, task_id);
                }
            }
        }
    }
    
    async fn execute_agent_logic(&self, profile: &AgentProfile, description: &str) -> String {
        match profile.agent_type {
            AgentType::Researcher => {
                if let Some(ref engine) = self.search_engine {
                    // Extract query from description (mock)
                    // "Find X" -> query "X"
                    let query = description.replace("Find ", "").replace("Search for ", "");
                    match engine.search(&query, 5).await {
                         Ok(results) => {
                             let docs: Vec<String> = results.hits.iter().map(|h| h.doc_id.clone()).collect();
                             format!("Found {} docs: {:?}", docs.len(), docs)
                         },
                         Err(e) => format!("Search failed: {}", e)
                    }
                } else {
                    "No search engine available".to_string()
                }
            },
            AgentType::Analyst => {
                format!("Analyzed: {}", description)
            },
            _ => format!("Processed by {:?}", profile.agent_type)
        }
    }
}
