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
    InProgress, // Assigned but not started execution logic
    Executing,  // Currently running in thread
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub description: String,
    pub status: TaskStatus,
    pub assigned_agent_id: Option<String>,
    pub preferred_agent_type: Option<AgentType>,
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

    pub async fn submit_task(&self, description: String, agent_type: Option<AgentType>) -> String {
        let task_id = Uuid::new_v4().to_string();
        let mut task = Task {
            id: task_id.clone(),
            description: description.clone(),
            status: TaskStatus::Pending,
            assigned_agent_id: None,
            preferred_agent_type: agent_type,
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
        
        // Find suitable agent
        let selected_agent = if let Some(pref_type) = &task.preferred_agent_type {
            agents.values()
                .find(|p| p.agent_type == *pref_type)
                .map(|p| p.id.clone())
        } else {
            // Default to any available
            agents.keys().next().cloned()
        };

        if let Some(agent_id) = selected_agent {
            task.assigned_agent_id = Some(agent_id.clone());
            task.status = TaskStatus::InProgress;
            task.add_log(Some("system".to_string()), "ASSIGNED".to_string(), format!("Assigned to agent {}", agent_id));
            return Ok(agent_id);
        }

        Err("No suitable agents available".to_string())
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
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            
            // 1. Identify tasks involved and mark Executing
            let mut tasks_to_launch: Vec<(String, String)> = Vec::new();
            
            {
                let mut tasks = self.tasks.lock().await;
                for (id, task) in tasks.iter_mut() {
                    if matches!(task.status, TaskStatus::InProgress) && task.assigned_agent_id.is_some() {
                         task.status = TaskStatus::Executing;
                         tasks_to_launch.push((id.clone(), task.assigned_agent_id.clone().unwrap()));
                    }
                }
            }
            
            // 2. Spawn execution
            for (task_id, agent_id) in tasks_to_launch {
                let orchestrator = self.clone();
                tokio::spawn(async move {
                    orchestrator.process_single_task(task_id, agent_id).await;
                });
            }
        }
    }

    async fn process_single_task(&self, task_id: String, agent_id: String) {
        let agent_profile = {
            let agents = self.agents.lock().await;
            agents.get(&agent_id).cloned()
        };
        
        if let Some(profile) = agent_profile {
            let description = {
                 let tasks = self.tasks.lock().await;
                 if let Some(t) = tasks.get(&task_id) {
                     t.description.clone()
                 } else {
                     return;
                 }
            };
            
            // Pass task_id to logic for Manager recursive capabilities
            let result = self.execute_agent_logic(&profile, &description, &task_id).await;
            
            // Store result
            if let Some(ref engine) = self.search_engine {
                let doc_id = format!("agent-result-{}", task_id);
                let content = format!(
                    "Agent Task Result\nTask ID: {}\nAgent: {} ({})\nQuery: {}\n\n{}",
                    task_id, profile.name, format!("{:?}", profile.agent_type), description, result
                );
                let _ = engine.ingest_document(&doc_id, &content).await;
            }
            
            let _ = self.complete_task(&task_id, result).await;
        }
    }
    
    async fn execute_agent_logic(&self, profile: &AgentProfile, description: &str, current_task_id: &str) -> String {
        use crate::core::llm::azure_openai::AzureOpenAIClient;
        
        // Helper to call LLM
        async fn call_llm(prompt: &str) -> Result<String, String> {
            if let Some(client) = AzureOpenAIClient::new() {
                 match client.generate(prompt).await {
                    Ok(res) => return Ok(res),
                     Err(e) => println!("WARN: Azure OpenAI failed: {}", e),
                 }
            }
            // Fallback for demo if no LLM key
            Ok("LLM Output Mock".to_string())
        }
        
        match profile.agent_type {
            AgentType::Manager => {
                let plan_prompt = format!(
                    "You are a Project Manager. Break down this objective into specialized steps.\nObjective: '{}'\n\
                    Available Agents: Researcher (data gathering), Analyst (pattern finding), Coder (implementation).\n\
                    Output strict format per line: PLAN|<AgentType>|<TaskDescription>\n\
                    Example: PLAN|Researcher|Find libraries for X", 
                    description
                );
                
                let response = call_llm(&plan_prompt).await.unwrap_or_default();
                let mut subtask_ids = Vec::new();
                
                for line in response.lines() {
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 3 && parts[0].trim() == "PLAN" {
                        let agent_str = parts[1].trim();
                        let task_desc = parts[2].trim();
                        
                        let target_type = match agent_str {
                            "Researcher" => AgentType::Researcher,
                            "Analyst" => AgentType::Analyst,
                            "Coder" => AgentType::Coder,
                            _ => AgentType::Researcher
                        };
                        
                        let sid = self.submit_task(task_desc.to_string(), Some(target_type)).await;
                        let _ = self.assign_task(&sid).await; // Kickoff
                        subtask_ids.push(sid);
                    }
                }
                
                if subtask_ids.is_empty() {
                    return "No subtasks generated. Task failed.".to_string();
                }
                
                // Monitor subtasks
                let mut results = Vec::new();
                let start = std::time::Instant::now();
                
                loop {
                    // Check timeout (e.g. 5 mins)
                    if start.elapsed().as_secs() > 300 {
                        return "Manager timed out waiting for subtasks.".to_string();
                    }
                    
                    let mut all_done = true;
                    // Re-check all
                    results.clear();
                    
                    for sid in &subtask_ids {
                        if let Some(t) = self.get_task(sid).await {
                            match t.status {
                                TaskStatus::Completed => results.push(format!("Task {}: {}", sid, t.result.unwrap_or_default())),
                                TaskStatus::Failed => results.push(format!("Task {}: Failed", sid)),
                                _ => all_done = false,
                            }
                        }
                    }
                    
                    if all_done { break; }
                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                }
                
                // Synthesize
                let synthesis_prompt = format!(
                    "You are a Project Manager. Synthesize these subtask results into a final report for: '{}'.\n\nResults:\n{}",
                    description, results.join("\n---\n")
                );
                call_llm(&synthesis_prompt).await.unwrap_or("Synthesis Failed".into())
            },
            AgentType::Researcher => {
                let plan_prompt = format!(
                    "You are a Lead Researcher. Break down this research topic into 3 specific search queries.\nTopic: '{}'\nOutput Format: just the 3 queries, one per line.", 
                    description
                );
                
                let queries = match call_llm(&plan_prompt).await {
                    Ok(res) => res.lines().map(|s| s.trim().replace("- ", "").to_string()).collect::<Vec<String>>(),
                    Err(_) => vec![description.to_string()]
                };
                
                let mut accumulated_context = String::new();
                if let Some(ref engine) = self.search_engine {
                    for query in queries {
                        // In a real swarm, researcher might create sub-research tasks too? No, keep simple.
                        if let Ok(results) = engine.search(&query, 3).await {
                            for hit in results.hits {
                                accumulated_context.push_str(&format!("\nSource [{}]: {}\n", hit.doc_id, hit.content.unwrap_or_default()));
                            }
                        }
                    }
                }
                
                let report_prompt = format!(
                    "You are a Research Agent. Write a report on: '{}'.\nContext:\n{}", 
                    description, accumulated_context
                );
                
                call_llm(&report_prompt).await.unwrap_or_default()
            },
            AgentType::Analyst => {
                let analysis_prompt = format!(
                    "You are a Senior Data Analyst. specific task: '{}'.\nAnalyze patterns/anomalies.", 
                    description
                );
                call_llm(&analysis_prompt).await.unwrap_or_default()
            },
            AgentType::Coder => {
                let coder_prompt = format!(
                    "You are specific Software Engineer. Task: {}. Output code blocks.", 
                    description
                );
                call_llm(&coder_prompt).await.unwrap_or_default()
            },
            _ => {
                call_llm(description).await.unwrap_or_else(|e| format!("Task failed: {}", e))
            }
        }
    }
}
