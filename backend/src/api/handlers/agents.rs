use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::core::agent_orchestrator::{AgentOrchestrator, AgentProfile, AgentType};

#[derive(Deserialize)]
pub struct TaskRequest {
    pub description: String,
    pub task_type: Option<AgentType>,
}

#[derive(Serialize)]
pub struct TaskResponse {
    pub task_id: String,
    pub status: String,
    pub result: Option<String>,
    pub audit_log: Vec<crate::core::agent_orchestrator::AuditLogEntry>,
}

#[post("/api/agents/task")]
pub async fn submit_task(
    req: web::Json<TaskRequest>,
    orchestrator: web::Data<AgentOrchestrator>,
) -> impl Responder {
    let type_enum = req.task_type.clone().unwrap_or(AgentType::Researcher); // Default to Researcher
    let task_id = orchestrator.submit_task(req.description.clone(), Some(type_enum)).await;
    
    // Auto-assign for now (Phase 2 requirement says "trigger tasks", not necessarily manual assign)
    // In a real flow, this might happen asynchronously.
    let _ = orchestrator.assign_task(&task_id).await;
    
    HttpResponse::Ok().json(serde_json::json!({
        "task_id": task_id,
        "status": "Submitted"
    }))
}

#[get("/api/agents/task/{task_id}")]
pub async fn get_task_status(
    path: web::Path<String>,
    orchestrator: web::Data<AgentOrchestrator>,
) -> impl Responder {
    let task_id = path.into_inner();
    
    match orchestrator.get_task(&task_id).await {
        Some(task) => HttpResponse::Ok().json(TaskResponse {
            task_id: task.id,
            status: format!("{:?}", task.status),
            result: task.result,
            audit_log: task.audit_log,
        }),
        None => HttpResponse::NotFound().body("Task not found"),
    }
}

#[get("/api/agents/stats")]
pub async fn get_stats(
    orchestrator: web::Data<AgentOrchestrator>,
) -> impl Responder {
    let (tasks, agents) = orchestrator.get_stats().await;
    HttpResponse::Ok().json(serde_json::json!({
        "active_tasks": tasks,
        "active_agents": agents,
        "system_status": "Operational"
    }))
}

#[get("/api/agents/tasks")]
pub async fn get_all_tasks(
    orchestrator: web::Data<AgentOrchestrator>,
) -> impl Responder {
    let tasks = orchestrator.get_all_tasks().await;
    // Map to TaskResponse
    let response: Vec<TaskResponse> = tasks.into_iter().map(|t| TaskResponse {
        task_id: t.id,
        status: format!("{:?}", t.status),
        result: t.result,
        audit_log: t.audit_log,
    }).collect();
    
    HttpResponse::Ok().json(response)
}

#[post("/api/agents/register")]
pub async fn register_agent(
    req: web::Json<AgentProfile>,
    orchestrator: web::Data<AgentOrchestrator>,
) -> impl Responder {
    orchestrator.register_agent(req.into_inner()).await;
    HttpResponse::Ok().body("Agent registered")
}
