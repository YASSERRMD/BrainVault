//! NAFS-4 LLM Provider Integration
//!
//! Provides a unified interface to all NAFS-4 LLM providers based on environment configuration.

use nafs_llm::{
    ChatMessage, ChatConfig, ChatResponse, LLMProvider,
    OpenAIConfig, OpenAIProvider,
    AnthropicConfig, AnthropicProvider,
    TogetherConfig, TogetherProvider,
    GroqConfig, GroqProvider,
    FireworksConfig, FireworksProvider,
    AzureConfig, AzureOpenAIProvider,
};
use std::env;
use std::sync::Arc;

/// Provider types supported
#[derive(Debug, Clone, PartialEq)]
pub enum ProviderType {
    OpenAI,
    Azure,
    Anthropic,
    Together,
    Groq,
    Fireworks,
    Ollama,
    Custom,
}

impl ProviderType {
    pub fn from_env() -> Self {
        match env::var("LLM_PROVIDER").unwrap_or("openai".into()).to_lowercase().as_str() {
            "azure" => Self::Azure,
            "anthropic" => Self::Anthropic,
            "together" => Self::Together,
            "groq" => Self::Groq,
            "fireworks" => Self::Fireworks,
            "ollama" => Self::Ollama,
            "custom" => Self::Custom,
            _ => Self::OpenAI,
        }
    }
}

/// Create a provider based on environment configuration
pub fn create_provider() -> Option<Arc<dyn LLMProvider>> {
    let provider_type = ProviderType::from_env();
    
    match provider_type {
        ProviderType::OpenAI => {
            let api_key = env::var("OPENAI_API_KEY").ok()?;
            let config = OpenAIConfig::new(api_key);
            Some(Arc::new(OpenAIProvider::new(config)))
        }
        ProviderType::Azure => {
            let api_key = env::var("AZURE_OPENAI_API_KEY").ok()?;
            let endpoint = env::var("AZURE_OPENAI_ENDPOINT").ok()?;
            let deployment = env::var("AZURE_OPENAI_DEPLOYMENT").unwrap_or("gpt-4o".into());
            let config = AzureConfig::new(api_key, endpoint, deployment);
            Some(Arc::new(AzureOpenAIProvider::new(config)))
        }
        ProviderType::Anthropic => {
            let api_key = env::var("ANTHROPIC_API_KEY").ok()?;
            let config = AnthropicConfig::new(api_key);
            Some(Arc::new(AnthropicProvider::new(config)))
        }
        ProviderType::Together => {
            let api_key = env::var("TOGETHER_API_KEY")
                .or_else(|_| env::var("LLM_API_KEY")).ok()?;
            let config = TogetherConfig::new(api_key);
            Some(Arc::new(TogetherProvider::new(config)))
        }
        ProviderType::Groq => {
            let api_key = env::var("GROQ_API_KEY")
                .or_else(|_| env::var("LLM_API_KEY")).ok()?;
            let config = GroqConfig::new(api_key);
            Some(Arc::new(GroqProvider::new(config)))
        }
        ProviderType::Fireworks => {
            let api_key = env::var("FIREWORKS_API_KEY")
                .or_else(|_| env::var("LLM_API_KEY")).ok()?;
            let config = FireworksConfig::new(api_key);
            Some(Arc::new(FireworksProvider::new(config)))
        }
        ProviderType::Ollama | ProviderType::Custom => {
            // Use OpenAI-compatible endpoint with custom base URL
            let api_key = env::var("LLM_API_KEY").unwrap_or("ollama".into());
            let base_url = env::var("LLM_BASE_URL").unwrap_or("http://localhost:11434/v1".into());
            let config = OpenAIConfig::new(api_key).with_base_url(base_url);
            Some(Arc::new(OpenAIProvider::new(config)))
        }
    }
}

/// Get the default model for the current provider
pub fn get_default_model() -> String {
    let provider_type = ProviderType::from_env();
    
    // Check explicit model env var first
    if let Ok(model) = env::var("LLM_MODEL") {
        return model;
    }
    if let Ok(model) = env::var("OPENAI_MODEL") {
        return model;
    }
    if let Ok(model) = env::var("ANTHROPIC_MODEL") {
        return model;
    }
    if let Ok(deployment) = env::var("AZURE_OPENAI_DEPLOYMENT") {
        return deployment;
    }
    
    // Provider-specific defaults
    match provider_type {
        ProviderType::OpenAI => "gpt-4o".to_string(),
        ProviderType::Azure => "gpt-4o".to_string(),
        ProviderType::Anthropic => "claude-3-5-sonnet-20241022".to_string(),
        ProviderType::Together => "meta-llama/Llama-3.3-70B-Instruct-Turbo".to_string(),
        ProviderType::Groq => "llama-3.1-70b-versatile".to_string(),
        ProviderType::Fireworks => "accounts/fireworks/models/llama-v3p1-70b-instruct".to_string(),
        ProviderType::Ollama => "llama3.2".to_string(),
        ProviderType::Custom => "gpt-4".to_string(),
    }
}

/// Convenience wrapper for simple text generation
pub struct NafsLLMClient {
    provider: Arc<dyn LLMProvider>,
    model: String,
}

impl NafsLLMClient {
    pub fn new() -> Option<Self> {
        let provider = create_provider()?;
        let model = get_default_model();
        Some(Self { provider, model })
    }
    
    pub fn with_model(model: impl Into<String>) -> Option<Self> {
        let provider = create_provider()?;
        Some(Self { provider, model: model.into() })
    }
    
    /// Simple prompt -> response
    pub async fn generate(&self, prompt: &str) -> Result<String, String> {
        let messages = vec![
            ChatMessage::system("You are an intelligent AI assistant for an enterprise knowledge management system."),
            ChatMessage::user(prompt),
        ];
        
        let config = ChatConfig::for_model(&self.model)
            .with_max_tokens(2000)
            .with_temperature(0.7);
        
        self.provider.chat(&messages, &config).await
            .map(|r| r.content)
            .map_err(|e| format!("LLM error: {}", e))
    }
    
    /// Chat completion with full message history
    pub async fn chat(&self, messages: Vec<ChatMessage>, max_tokens: usize) -> Result<ChatResponse, String> {
        let config = ChatConfig::for_model(&self.model)
            .with_max_tokens(max_tokens)
            .with_temperature(0.7);
        
        self.provider.chat(&messages, &config).await
            .map_err(|e| format!("LLM error: {}", e))
    }
    
    /// Get embeddings for text
    pub async fn embed(&self, text: &str) -> Result<Vec<f32>, String> {
        self.provider.embed(text).await
            .map_err(|e| format!("Embedding error: {}", e))
    }
    
    pub fn provider_name(&self) -> &str {
        self.provider.name()
    }
}

// Re-export for convenience
pub use nafs_llm::{ChatMessage as NafsChatMessage, MessageRole as NafsMessageRole};
