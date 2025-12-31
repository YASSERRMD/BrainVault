use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::env;

#[derive(Debug, Clone)]
pub struct CohereClient {
    api_key: String,
    client: Client,
}

#[derive(Serialize)]
struct GenerateRequest {
    model: String,
    prompt: String,
    max_tokens: i32,
    temperature: f32,
}

#[derive(Deserialize)]
struct Generation {
    text: String,
}

#[derive(Deserialize)]
struct GenerateResponse {
    generations: Vec<Generation>,
}

impl CohereClient {
    pub fn new() -> Option<Self> {
        let api_key = env::var("COHERE_API_KEY").ok();
        if let Some(key) = api_key {
            if key.is_empty() { return None; }
            Some(Self {
                api_key: key,
                client: Client::new(),
            })
        } else {
            // Log warning?
            None
        }
    }

    pub async fn generate(&self, prompt: &str) -> Result<String, String> {
        let request_body = GenerateRequest {
            model: "command".to_string(), // Using standard Cohere command model
            prompt: prompt.to_string(),
            max_tokens: 300,
            temperature: 0.7,
        };

        let response = self.client
            .post("https://api.cohere.ai/v1/generate")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
             return Err(format!("Cohere API Error: {}", response.status()));
        }

        let resp_json: GenerateResponse = response.json().await
            .map_err(|e| format!("Parse error: {}", e))?;

        if let Some(gen) = resp_json.generations.first() {
            Ok(gen.text.clone())
        } else {
            Err("No generations returned".to_string())
        }
    }
}
