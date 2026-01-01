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
        let data_path = std::env::var("DATA_PATH").unwrap_or_else(|_| "/data".to_string());
        let log_file = format!("{}/audit_logs.json", data_path);
        
        let mut logs = Vec::new();
        if let Ok(content) = std::fs::read_to_string(&log_file) {
            if let Ok(loaded) = serde_json::from_str::<Vec<SecurityLog>>(&content) {
                logs = loaded;
            }
        }

        Self { logs: Arc::new(Mutex::new(logs)) }
    }

    pub async fn save_logs(&self) {
        let data_path = std::env::var("DATA_PATH").unwrap_or_else(|_| "/data".to_string());
        let log_file = format!("{}/audit_logs.json", data_path);
        let logs = self.logs.lock().await;
        if let Ok(content) = serde_json::to_string(&*logs) {
            let _ = std::fs::write(log_file, content);
        }
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
        {
            let mut logs = self.logs.lock().await;
            logs.push(log);
            // Keep last 100 logs
            if logs.len() > 100 {
                logs.remove(0);
            }
        }
        self.save_logs().await;
    }
    
    pub async fn get_logs(&self) -> Vec<SecurityLog> {
        let mut logs = self.logs.lock().await.clone();
        logs.reverse(); // Newest first
        logs
    }
}
