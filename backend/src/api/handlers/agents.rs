use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use crate::core::agent_orchestrator::{AgentOrchestrator, AgentProfile};

#[derive(Deserialize)]
pub struct TaskRequest {
    pub description: String,
}

#[derive(Serialize)]
pub struct TaskResponse {
    pub task_id: String,
    pub status: String,
    pub result: Option<String>,
}

#[post("/api/agents/task")]
pub async fn submit_task(
    req: web::Json<TaskRequest>,
    orchestrator: web::Data<AgentOrchestrator>,
) -> impl Responder {
    let task_id = orchestrator.submit_task(req.description.clone()).await;
    
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
        }),
        None => HttpResponse::NotFound().body("Task not found"),
    }
}

#[post("/api/agents/register")]
pub async fn register_agent(
    req: web::Json<AgentProfile>,
    orchestrator: web::Data<AgentOrchestrator>,
) -> impl Responder {
    orchestrator.register_agent(req.into_inner()).await;
    HttpResponse::Ok().body("Agent registered")
}
