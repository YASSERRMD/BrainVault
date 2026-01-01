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
    pub audit_log: Vec<AuditLogEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub timestamp: u64, // simplified ts
    pub agent_id: Option<String>,
    pub action: String,
    pub details: String,
}

impl Task {
    pub fn add_log(&mut self, agent_id: Option<String>, action: String, details: String) {
        self.audit_log.push(AuditLogEntry {
            timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
            agent_id,
            action,
            details,
        });
    }
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
        let mut task = Task {
            id: task_id.clone(),
            description: description.clone(),
            status: TaskStatus::Pending,
            assigned_agent_id: None,
            result: None,
            audit_log: Vec::new(),
        };
        
        task.add_log(None, "SUBMITTED".to_string(), format!("Task submitted: {}", description));
        
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
            task.add_log(Some("system".to_string()), "ASSIGNED".to_string(), format!("Assigned to agent {}", agent_id));
            return Ok(agent_id.clone());
        }

        Err("No agents available".to_string())
    }
    
    pub async fn complete_task(&self, task_id: &str, result: String) -> Result<(), String> {
        let mut tasks = self.tasks.lock().await;
        let task = tasks.get_mut(task_id).ok_or("Task not found")?;
        task.status = TaskStatus::Completed;
        task.result = Some(result.clone());
        task.add_log(task.assigned_agent_id.clone(), "COMPLETED".to_string(), format!("Task completed with result: {}", result)); 
        Ok(())
    }

    pub async fn get_task(&self, task_id: &str) -> Option<Task> {
        let tasks = self.tasks.lock().await;
        tasks.get(task_id).cloned()
    }

    pub async fn get_all_tasks(&self) -> Vec<Task> {
        let tasks = self.tasks.lock().await;
        tasks.values().cloned().collect()
    }
    
    pub async fn get_stats(&self) -> (usize, usize) {
        let tasks = self.tasks.lock().await;
        let agents = self.agents.lock().await;
        (tasks.len(), agents.len())
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
                    
                    // 3. Store the result in the knowledge base
                    if let Some(ref engine) = self.search_engine {
                        let doc_id = format!("agent-result-{}", task_id);
                        let content = format!(
                            "Agent Task Result\nTask ID: {}\nAgent: {} ({})\nQuery: {}\n\n{}",
                            task_id,
                            profile.name,
                            format!("{:?}", profile.agent_type),
                            description,
                            result
                        );
                        if let Err(e) = engine.ingest_document(&doc_id, &content).await {
                            println!("WARN: Failed to store agent result: {}", e);
                        } else {
                            println!("INFO: Stored agent result as document '{}'", doc_id);
                        }
                    }
                    
                    // 4. Update task
                    let _ = self.complete_task(&task_id, result).await;
                    println!("DEBUG: Agent {} completed task {}", agent_id, task_id);
                }
            }
        }
    }
    
    async fn execute_agent_logic(&self, profile: &AgentProfile, description: &str) -> String {
        use crate::core::llm::azure_openai::AzureOpenAIClient;
        
        // Helper to call LLM
        async fn call_llm(prompt: &str) -> Result<String, String> {
            if let Some(client) = AzureOpenAIClient::new() {
                 match client.generate(prompt).await {
                    Ok(res) => return Ok(res),
                     Err(e) => println!("WARN: Azure OpenAI failed: {}", e),
                 }
            }
            Err("No LLM provider available".to_string())
        }
        
        match profile.agent_type {
            AgentType::Researcher => {
                // deep_research_workflow
                let plan_prompt = format!(
                    "You are a Lead Researcher. Break down this research topic into 3 specific search queries to gather comprehensive information.\nTopic: '{}'\nOutput Format: just the 3 queries, one per line.", 
                    description
                );
                
                let queries = match call_llm(&plan_prompt).await {
                    Ok(res) => res.lines().map(|s| s.trim().replace("- ", "").to_string()).collect::<Vec<String>>(),
                    Err(_) => vec![description.to_string()]
                };
                
                let mut accumulated_context = String::new();
                
                if let Some(ref engine) = self.search_engine {
                    for query in queries {
                        if let Ok(results) = engine.search(&query, 3).await {
                            for hit in results.hits {
                                accumulated_context.push_str(&format!("\nSource [{}]: {}\n", hit.doc_id, hit.content.unwrap_or_default()));
                            }
                        }
                    }
                }
                
                if accumulated_context.is_empty() {
                    accumulated_context = "No internal documents found.".to_string();
                }
                
                let report_prompt = format!(
                    "You are a Research Agent. Write a comprehensive research report on: '{}'.\n\nBase your report strictly on the following gathered context:\n{}\n\nStructure the report with Introduction, Key Findings, and Conclusion.", 
                    description, accumulated_context
                );
                
                call_llm(&report_prompt).await.unwrap_or_else(|e| format!("Research failed: {}", e))
            },
            AgentType::Analyst => {
                // Analysis logic
                let mut context = String::new();
                if let Some(ref engine) = self.search_engine {
                     if let Ok(results) = engine.search(description, 5).await {
                         for hit in results.hits {
                             context.push_str(&format!("\n[{}]: {}\n", hit.doc_id, hit.content.unwrap_or_default()));
                         }
                     }
                }
                
                let analysis_prompt = format!(
                    "You are a Senior Data Analyst. specific task: '{}'.\n\nAnalyze the following data points for patterns, anomalies, or contradictions:\n{}\n\nProvide a detailed analysis.", 
                    description, context
                );
                
                call_llm(&analysis_prompt).await.unwrap_or_else(|e| format!("Analysis failed: {}", e))
            },
            AgentType::Coder => {
                let coder_prompt = format!(
                    "You are an expert Software Engineer. Your task is to generate high-quality, production-ready code.\n\nTask: {}\n\nProvide the solution in a generic format (markdown code blocks) with brief explanations.", 
                    description
                );
                call_llm(&coder_prompt).await.unwrap_or_else(|e| format!("Coding task failed: {}", e))
            },
            _ => {
                call_llm(description).await.unwrap_or_else(|e| format!("Task failed: {}", e))
            }
        }
    }
}
