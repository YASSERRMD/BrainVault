use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::env;

#[derive(Debug, Clone)]
pub struct AzureEmbeddingClient {
    endpoint: String,
    api_key: String,
    api_version: String,
    deployment: String,
    client: Client,
}

#[derive(Serialize)]
struct EmbeddingRequest {
    input: Vec<String>,
}

#[derive(Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

impl AzureEmbeddingClient {
    pub fn new() -> Option<Self> {
        let endpoint = env::var("AZURE_OPENAI_ENDPOINT").ok()?;
        let api_key = env::var("AZURE_OPENAI_API_KEY").ok()?;
        let api_version = env::var("AZURE_OPENAI_API_VERSION").unwrap_or("2024-12-01-preview".to_string());
        // Use text-embedding-ada-002 or text-embedding-3-small deployment
        let deployment = env::var("AZURE_OPENAI_EMBEDDING_DEPLOYMENT").unwrap_or("text-embedding-ada-002".to_string());

        if endpoint.is_empty() || api_key.is_empty() {
            return None;
        }

        Some(Self {
            endpoint,
            api_key,
            api_version,
            deployment,
            client: Client::new(),
        })
    }

    pub async fn get_embedding(&self, text: &str) -> Result<Vec<f32>, String> {
        let url = format!(
            "{}/openai/deployments/{}/embeddings?api-version={}",
            self.endpoint.trim_end_matches('/'),
            self.deployment,
            self.api_version
        );

        let request_body = EmbeddingRequest {
            input: vec![text.to_string()],
        };

        let response = self.client
            .post(&url)
            .header("api-key", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Embedding request failed: {}", e))?;

        if response.status().is_success() {
            let resp_json: EmbeddingResponse = response.json().await
                .map_err(|e| format!("Embedding parse error: {}", e))?;

            if let Some(data) = resp_json.data.first() {
                Ok(data.embedding.clone())
            } else {
                Err("No embedding returned".to_string())
            }
        } else {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            Err(format!("Embedding Error {}: {}", status, body))
        }
    }
}
