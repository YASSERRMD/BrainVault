use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub struct SecurityLog {
    pub id: String,
    pub timestamp: u64,
    pub event: String,
    pub user: String,
    pub status: String,
    pub risk: String,
}

#[derive(Clone)]
pub struct AuditManager {
    logs: Arc<Mutex<Vec<SecurityLog>>>,
}

impl AuditManager {
    pub fn new() -> Self {
        Self { logs: Arc::new(Mutex::new(Vec::new())) }
    }
    
    pub async fn log_event(&self, event: &str, user: &str, status: &str, risk: &str) {
        let log = SecurityLog {
            id: Uuid::new_v4().to_string(),
            timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
            event: event.to_string(),
            user: user.to_string(),
            status: status.to_string(),
            risk: risk.to_string(),
        };
        let mut logs = self.logs.lock().await;
        logs.push(log);
        // Keep last 100 logs
        if logs.len() > 100 {
            logs.remove(0);
        }
    }
    
    pub async fn get_logs(&self) -> Vec<SecurityLog> {
        let mut logs = self.logs.lock().await.clone();
        logs.reverse(); // Newest first
        logs
    }
}
