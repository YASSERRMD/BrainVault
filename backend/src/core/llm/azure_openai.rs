use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::env;

#[derive(Debug, Clone)]
pub struct AzureOpenAIClient {
    endpoint: String,
    api_key: String,
    api_version: String,
    deployment: String,
    client: Client,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct ChatRequest {
    messages: Vec<Message>,
    max_tokens: i32,
    temperature: f32,
}

#[derive(Deserialize)]
struct Choice {
    message: MessageContent,
}

#[derive(Deserialize)]
struct MessageContent {
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

impl AzureOpenAIClient {
    pub fn new() -> Option<Self> {
        let endpoint = env::var("AZURE_OPENAI_ENDPOINT").ok()?;
        let api_key = env::var("AZURE_OPENAI_API_KEY").ok()?;
        let api_version = env::var("AZURE_OPENAI_API_VERSION").unwrap_or("2024-12-01-preview".to_string());
        let deployment = env::var("AZURE_OPENAI_DEPLOYMENT").unwrap_or("gpt-4o".to_string());

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

    pub async fn generate(&self, prompt: &str) -> Result<String, String> {
        let url = format!(
            "{}/openai/deployments/{}/chat/completions?api-version={}",
            self.endpoint.trim_end_matches('/'),
            self.deployment,
            self.api_version
        );

        let request_body = ChatRequest {
            messages: vec![
                Message {
                    role: "system".to_string(),
                    content: "You are an intelligent AI assistant for an enterprise knowledge management system.".to_string(),
                },
                Message {
                    role: "user".to_string(),
                    content: prompt.to_string(),
                },
            ],
            max_tokens: 500,
            temperature: 0.7,
        };

        let response = self.client
            .post(&url)
            .header("api-key", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Azure OpenAI request failed: {}", e))?;

        if response.status().is_success() {
            let resp_json: ChatResponse = response.json().await
                .map_err(|e| format!("Azure OpenAI parse error: {}", e))?;

            if let Some(choice) = resp_json.choices.first() {
                Ok(choice.message.content.clone())
            } else {
                Err("No response from Azure OpenAI".to_string())
            }
        } else if response.status().as_u16() == 429 {
            Err("Azure OpenAI Rate Limit Exceeded (429). Please try again later.".to_string())
        } else {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            Err(format!("Azure OpenAI Error {}: {}", status, body))
        }
    }
}
