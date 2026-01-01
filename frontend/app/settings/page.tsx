"use client";

import React, { useState, useEffect } from "react";
import { Settings, Key, Database, Shield, Save, Check, AlertCircle, Server, Loader2, Sparkles, Cpu, Globe } from "lucide-react";
import { api } from "@/lib/api";
import useSWR from "swr";

interface HealthStatus {
    api: string;
    vector_db: string;
    graph_db: string;
    vector_db_url: string;
    graph_db_url: string;
}

const LLM_PROVIDERS = [
    { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
    { id: "azure", name: "Azure OpenAI", baseUrl: "" },
    { id: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com" },
    { id: "together", name: "Together AI", baseUrl: "https://api.together.xyz/v1" },
    { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
    { id: "fireworks", name: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1" },
    { id: "ollama", name: "Ollama (Local)", baseUrl: "http://localhost:11434/v1" },
    { id: "custom", name: "Custom OpenAI-Compatible", baseUrl: "" },
];

const EMBEDDING_PROVIDERS = [
    { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
    { id: "azure", name: "Azure OpenAI", baseUrl: "" },
    { id: "voyage", name: "Voyage AI", baseUrl: "https://api.voyageai.com/v1" },
    { id: "jina", name: "Jina AI", baseUrl: "https://api.jina.ai/v1" },
    { id: "together", name: "Together AI", baseUrl: "https://api.together.xyz/v1" },
    { id: "ollama", name: "Ollama (Local)", baseUrl: "http://localhost:11434/v1" },
    { id: "custom", name: "Custom OpenAI-Compatible", baseUrl: "" },
];

const healthFetcher = (url: string) => api.get<HealthStatus>(url).then((res) => res.data);

export default function SettingsPage() {
    const [saved, setSaved] = useState(false);
    const { data: health, isLoading } = useSWR("/health", healthFetcher, { refreshInterval: 5000 });

    // LLM Config
    const [llmProvider, setLlmProvider] = useState("openai");
    const [llmConfig, setLlmConfig] = useState({
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-4o",
        azureDeployment: "",
        azureApiVersion: "2024-12-01-preview",
    });

    // Embedding Config (can be different provider)
    const [embeddingProvider, setEmbeddingProvider] = useState("openai");
    const [embeddingConfig, setEmbeddingConfig] = useState({
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "text-embedding-3-small",
        azureDeployment: "",
    });

    // Security
    const [securityConfig, setSecurityConfig] = useState({
        rbacEnabled: true,
        auditLogging: true,
    });

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("brainvault_llm_config");
        if (saved) {
            const parsed = JSON.parse(saved);
            setLlmProvider(parsed.provider || "openai");
            setLlmConfig(parsed.config || llmConfig);
        }
        const savedEmb = localStorage.getItem("brainvault_embedding_config");
        if (savedEmb) {
            const parsed = JSON.parse(savedEmb);
            setEmbeddingProvider(parsed.provider || "openai");
            setEmbeddingConfig(parsed.config || embeddingConfig);
        }
    }, []);

    const handleProviderChange = (providerId: string, type: "llm" | "embedding") => {
        const providers = type === "llm" ? LLM_PROVIDERS : EMBEDDING_PROVIDERS;
        const provider = providers.find((p) => p.id === providerId);
        if (type === "llm") {
            setLlmProvider(providerId);
            setLlmConfig({ ...llmConfig, baseUrl: provider?.baseUrl || "" });
        } else {
            setEmbeddingProvider(providerId);
            setEmbeddingConfig({ ...embeddingConfig, baseUrl: provider?.baseUrl || "" });
        }
    };

    const handleSave = () => {
        localStorage.setItem("brainvault_llm_config", JSON.stringify({ provider: llmProvider, config: llmConfig }));
        localStorage.setItem("brainvault_embedding_config", JSON.stringify({ provider: embeddingProvider, config: embeddingConfig }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const getStatusColor = (status: string) => {
        if (status === "connected" || status === "running") return "bg-green-500";
        if (status === "local_fallback") return "bg-yellow-500";
        return "bg-red-500";
    };

    const getStatusText = (status: string) => {
        if (status === "connected") return "Connected";
        if (status === "running") return "Running";
        if (status === "local_fallback") return "Local Fallback";
        return "Disconnected";
    };

    const isAzure = (provider: string) => provider === "azure";
    const isCustom = (provider: string) => provider === "custom";

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Settings className="w-8 h-8 text-primary" />
                        System Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure LLM providers, embeddings, and system behavior.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg ${saved ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:scale-[1.02]"
                        }`}
                >
                    {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? "Saved!" : "Save Changes"}
                </button>
            </div>

            {/* System Status */}
            <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500">
                        <Server className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold">System Status</h2>
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${health?.api ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                            <span className="text-sm font-medium">API Server</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {health?.api === "running" ? "Running on :8080" : "Checking..."}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-medium">Frontend</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Running on :3000</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.vector_db || "")}`} />
                            <span className="text-sm font-medium">Vector DB</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{getStatusText(health?.vector_db || "checking")}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.graph_db || "")}`} />
                            <span className="text-sm font-medium">Graph DB</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{getStatusText(health?.graph_db || "checking")}</p>
                    </div>
                </div>
            </div>

            {/* LLM Provider Configuration */}
            <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">LLM Provider</h2>
                        <p className="text-xs text-muted-foreground">For chat, reasoning, and entity extraction</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Provider Selection */}
                    <div className="grid grid-cols-4 gap-2">
                        {LLM_PROVIDERS.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => handleProviderChange(p.id, "llm")}
                                className={`p-3 rounded-xl text-xs font-medium transition-all border ${llmProvider === p.id
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-secondary/50 border-border hover:border-primary/50"
                                    }`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>

                    {/* Base URL */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                        <div>
                            <label className="text-sm font-medium">Base URL</label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {isAzure(llmProvider) ? "Azure endpoint URL" : "API endpoint"}
                            </p>
                        </div>
                        <div className="col-span-2">
                            <input
                                type="text"
                                value={llmConfig.baseUrl}
                                onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                                placeholder={isAzure(llmProvider) ? "https://your-resource.openai.azure.com" : "https://api.example.com/v1"}
                                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono"
                            />
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                        <div>
                            <label className="text-sm font-medium">API Key</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Your provider API key</p>
                        </div>
                        <div className="col-span-2">
                            <input
                                type="password"
                                value={llmConfig.apiKey}
                                onChange={(e) => setLlmConfig({ ...llmConfig, apiKey: e.target.value })}
                                placeholder="sk-... or your API key"
                                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono"
                            />
                        </div>
                    </div>

                    {/* Model / Deployment */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                        <div>
                            <label className="text-sm font-medium">{isAzure(llmProvider) ? "Deployment Name" : "Model"}</label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {isAzure(llmProvider) ? "Azure deployment name" : "Model identifier"}
                            </p>
                        </div>
                        <div className="col-span-2">
                            <input
                                type="text"
                                value={isAzure(llmProvider) ? llmConfig.azureDeployment : llmConfig.model}
                                onChange={(e) =>
                                    isAzure(llmProvider)
                                        ? setLlmConfig({ ...llmConfig, azureDeployment: e.target.value })
                                        : setLlmConfig({ ...llmConfig, model: e.target.value })
                                }
                                placeholder={isAzure(llmProvider) ? "gpt-4o-deployment" : "gpt-4o"}
                                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Embedding Provider Configuration */}
            <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500">
                        <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Embedding Provider</h2>
                        <p className="text-xs text-muted-foreground">Can be different from LLM provider</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Provider Selection */}
                    <div className="grid grid-cols-4 gap-2">
                        {EMBEDDING_PROVIDERS.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => handleProviderChange(p.id, "embedding")}
                                className={`p-3 rounded-xl text-xs font-medium transition-all border ${embeddingProvider === p.id
                                        ? "bg-cyan-500 text-white border-cyan-500"
                                        : "bg-secondary/50 border-border hover:border-cyan-500/50"
                                    }`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>

                    {/* Base URL */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                        <div>
                            <label className="text-sm font-medium">Base URL</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Embedding API endpoint</p>
                        </div>
                        <div className="col-span-2">
                            <input
                                type="text"
                                value={embeddingConfig.baseUrl}
                                onChange={(e) => setEmbeddingConfig({ ...embeddingConfig, baseUrl: e.target.value })}
                                placeholder="https://api.example.com/v1"
                                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono"
                            />
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                        <div>
                            <label className="text-sm font-medium">API Key</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Leave empty to use LLM key</p>
                        </div>
                        <div className="col-span-2">
                            <input
                                type="password"
                                value={embeddingConfig.apiKey}
                                onChange={(e) => setEmbeddingConfig({ ...embeddingConfig, apiKey: e.target.value })}
                                placeholder="sk-... (optional, uses LLM key if empty)"
                                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono"
                            />
                        </div>
                    </div>

                    {/* Model */}
                    <div className="grid grid-cols-3 gap-4 items-start">
                        <div>
                            <label className="text-sm font-medium">{isAzure(embeddingProvider) ? "Deployment" : "Model"}</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Embedding model name</p>
                        </div>
                        <div className="col-span-2">
                            <input
                                type="text"
                                value={isAzure(embeddingProvider) ? embeddingConfig.azureDeployment : embeddingConfig.model}
                                onChange={(e) =>
                                    isAzure(embeddingProvider)
                                        ? setEmbeddingConfig({ ...embeddingConfig, azureDeployment: e.target.value })
                                        : setEmbeddingConfig({ ...embeddingConfig, model: e.target.value })
                                }
                                placeholder="text-embedding-3-small"
                                className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Shield className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold">Security & Access</h2>
                </div>

                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <div>
                            <label className="text-sm font-medium">RBAC Enforcement</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Role-based access control</p>
                        </div>
                        <div className="col-span-2">
                            <button
                                onClick={() => setSecurityConfig({ ...securityConfig, rbacEnabled: !securityConfig.rbacEnabled })}
                                className={`relative w-14 h-7 rounded-full transition-colors ${securityConfig.rbacEnabled ? "bg-green-500" : "bg-secondary"}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${securityConfig.rbacEnabled ? "translate-x-8" : "translate-x-1"}`} />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <div>
                            <label className="text-sm font-medium">Audit Logging</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Log all agent actions</p>
                        </div>
                        <div className="col-span-2">
                            <button
                                onClick={() => setSecurityConfig({ ...securityConfig, auditLogging: !securityConfig.auditLogging })}
                                className={`relative w-14 h-7 rounded-full transition-colors ${securityConfig.auditLogging ? "bg-green-500" : "bg-secondary"}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${securityConfig.auditLogging ? "translate-x-8" : "translate-x-1"}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-amber-400">Backend Configuration</p>
                    <p className="text-muted-foreground mt-1">
                        For backend changes, update your <code className="bg-secondary px-1.5 py-0.5 rounded">.env</code> file and restart containers.
                        Frontend settings are saved to browser storage for client-side features.
                    </p>
                </div>
            </div>
        </div>
    );
}
