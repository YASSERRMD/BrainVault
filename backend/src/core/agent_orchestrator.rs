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
    Ingestor,
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
    
    async fn execute_agent_logic(&self, profile: &AgentProfile, description: &str, _current_task_id: &str) -> String {
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
                // Multi-step Research: Planning -> Search -> Fact Extraction -> Synthesis
                let plan_prompt = format!(
                    "You are a Lead Researcher. Break down this research topic into 3 specific investigative search queries.\nTopic: '{}'\nOutput Format: just the queries, one per line.", 
                    description
                );
                
                let queries = match call_llm(&plan_prompt).await {
                    Ok(res) => res.lines()
                        .map(|s| s.trim().trim_start_matches(|c: char| !c.is_alphanumeric()).to_string())
                        .filter(|l| !l.is_empty())
                        .take(3)
                        .collect::<Vec<String>>(),
                    Err(_) => vec![description.to_string()]
                };
                
                let mut facts = Vec::new();
                if let Some(ref engine) = self.search_engine {
                    for query in queries {
                        if let Ok(results) = engine.search(&query, 5).await {
                             let context = results.hits.iter()
                                .map(|h| format!("[Source {}]: {}", h.doc_id, h.content.as_deref().unwrap_or("")))
                                .collect::<Vec<String>>()
                                .join("\n");
                             
                             if !context.is_empty() {
                                 let extract_prompt = format!(
                                     "As a Researcher, extract key technical details and specific facts related to '{}' from these sources:\n{}\n\nReturn a bulleted list of facts.",
                                     query, context
                                 );
                                 if let Ok(extracted) = call_llm(&extract_prompt).await {
                                     facts.push(extracted);
                                 }
                             }
                        }
                    }
                }
                
                let report_prompt = format!(
                    "You are an expert Research Agent. Compile a comprehensive, highly detailed final research report on: '{}'.\n\nAggregated Research Facts gathered from the database:\n{}\n\nFinal Report Structure: Executive Summary, Key Findings (grouped by topic), and Technical Deep-Dive.", 
                    description, facts.join("\n\n")
                );
                
                call_llm(&report_prompt).await.unwrap_or_else(|_| "Research synthesis failed.".into())
            },
            AgentType::Analyst => {
                // Analyst uses Graph context and Vector context to find correlations
                let mut graph_context = String::new();
                if let Some(ref graph) = self.graph_manager {
                    let entities = graph.find_nodes_by_text(description).await;
                    for ent in entities.iter().take(5) {
                        if let Ok(ctx) = graph.find_related_context(&ent.id, 2).await {
                            for rel in ctx.relationships {
                                graph_context.push_str(&format!("Relationship: {} --[{}]--> {}\n", rel.from_id, rel.rel_type, rel.to_id));
                            }
                        }
                    }
                }

                let analysis_prompt = format!(
                    "You are a Senior Data Analyst. Analyze this objective: '{}'.\n\nKnowledge Graph Context:\n{}\n\nIdentify patterns, hidden correlations, and potential anomalies in this data. Provide an analytical summary with actionable insights.", 
                    description, graph_context
                );
                call_llm(&analysis_prompt).await.unwrap_or_else(|_| "Analysis failed.".into())
            },
            AgentType::Coder => {
                // Coder looks for existing patterns
                let mut code_patterns = String::new();
                if let Some(ref engine) = self.search_engine {
                    if let Ok(hits) = engine.search(description, 3).await {
                        for hit in hits.hits {
                            if hit.doc_id.contains(".rs") || hit.doc_id.contains(".ts") || hit.doc_id.contains(".js") {
                                code_patterns.push_str(&format!("// Reference from {}\n{}\n", hit.doc_id, hit.content.unwrap_or_default()));
                            }
                        }
                    }
                }

                let coder_prompt = format!(
                    "You are a Senior Software Engineer. Task: {}.\n\nReference Material Found:\n{}\n\nGenerate high-quality, production-ready code. Include comments and ensure best practices. Output blocks in Markdown.", 
                    description, code_patterns
                );
                call_llm(&coder_prompt).await.unwrap_or_else(|_| "Coding task failed.".into())
            },
            AgentType::Ingestor => {
                // Parse "INGEST_FILE|<doc_id>|<content>"
                let (doc_id, raw_content) = if description.starts_with("INGEST_FILE|") {
                    let parts: Vec<&str> = description.splitn(3, '|').collect();
                    if parts.len() >= 3 {
                        (parts[1].to_string(), parts[2].to_string())
                    } else {
                        ("unknown".to_string(), description.to_string())
                    }
                } else {
                    ("unknown".to_string(), description.to_string())
                };

                // Chunking logic
                let chunks: Vec<String> = if raw_content.len() > 3000 {
                    raw_content.as_bytes()
                        .chunks(2000)
                        .map(|c| String::from_utf8_lossy(c).to_string())
                        .collect()
                } else {
                    vec![raw_content.to_string()]
                };

                let mut total_entities = 0;
                let mut total_rels = 0;

                if let Some(ref graph) = self.graph_manager {
                    for (i, chunk) in chunks.iter().enumerate() {
                        let chunk_id = format!("chunk-{}-{}", doc_id, i);
                        
                        // 1. Extract knowledge via LLM
                        let extraction_prompt = format!(
                            "You are a Knowledge Graph Ingestor. Analyze this segment from document '{}'.\n\
                            Extract important entities and their relationships.\n\
                            Output Format per line:\n\
                            ENTITY|<id_slug>|<Label>|<name_property>\n\
                            REL|<from_id_slug>|<to_id_slug>|<TYPE>\n\n\
                            Chunk Segment:\n{}", 
                            doc_id, chunk
                        );

                        if let Ok(response) = call_llm(&extraction_prompt).await {
                             let mut chunk_entities = Vec::new();
                             for line in response.lines() {
                                 let parts: Vec<&str> = line.split('|').collect();
                                 if parts.len() >= 4 && parts[0].trim() == "ENTITY" {
                                     let ent = crate::core::graph_manager::Entity {
                                         id: parts[1].trim().to_string(),
                                         label: parts[2].trim().to_string(),
                                         properties: std::collections::HashMap::from([
                                             ("name".to_string(), parts[3].trim().to_string())
                                         ])
                                     };
                                     chunk_entities.push(ent.id.clone());
                                     let _ = graph.add_entity(ent).await;
                                     total_entities += 1;
                                 } else if parts.len() >= 4 && parts[0].trim() == "REL" {
                                     let rel = crate::core::graph_manager::Relationship {
                                         from_id: parts[1].trim().to_string(),
                                         to_id: parts[2].trim().to_string(),
                                         rel_type: parts[3].trim().to_string(),
                                         properties: std::collections::HashMap::new()
                                     };
                                     let _ = graph.add_relationship(rel).await;
                                     total_rels += 1;
                                 }
                             }

                             // 3. Create a Chunk node and link everything
                             let chunk_node = crate::core::graph_manager::Entity {
                                 id: chunk_id.clone(),
                                 label: "Chunk".to_string(),
                                 properties: std::collections::HashMap::from([
                                     ("doc_source".to_string(), doc_id.clone()),
                                     ("content_preview".to_string(), chunk.chars().take(200).collect())
                                 ])
                             };
                             let _ = graph.add_entity(chunk_node).await;

                             for ent_id in chunk_entities {
                                 let _ = graph.add_relationship(crate::core::graph_manager::Relationship {
                                     from_id: chunk_id.clone(),
                                     to_id: ent_id,
                                     rel_type: "EXTRACTED_FROM".to_string(),
                                     properties: std::collections::HashMap::new()
                                 }).await;
                             }
                        }
                    }
                }

                format!("Ingestion Complete for {}. Extracted {} entities and {} correlations across {} graph chunks.", doc_id, total_entities, total_rels, chunks.len())
            },
            _ => {
                call_llm(description).await.unwrap_or_else(|e| format!("Generic Agent execution failed: {}", e))
            }
        }
    }
}
