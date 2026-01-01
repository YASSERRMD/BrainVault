use actix_web::{get, web, HttpResponse, Responder};
use crate::core::audit_manager::AuditManager;

#[get("/api/security/logs")]
pub async fn get_security_logs(
    audit: web::Data<AuditManager>,
) -> impl Responder {
    let logs = audit.get_logs().await;
    HttpResponse::Ok().json(logs)
}
