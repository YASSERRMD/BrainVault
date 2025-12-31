"use client";

import React, { useState } from "react";
import { Settings, Key, Database, Users, Shield, Save, Check, AlertCircle, Server } from "lucide-react";

interface ConfigSection {
    title: string;
    icon: React.ReactNode;
    fields: ConfigField[];
}

interface ConfigField {
    key: string;
    label: string;
    type: "text" | "password" | "toggle" | "select";
    value: string | boolean;
    options?: string[];
    description?: string;
}

export default function SettingsPage() {
    const [saved, setSaved] = useState(false);
    const [config, setConfig] = useState({
        azure_endpoint: process.env.NEXT_PUBLIC_AZURE_ENDPOINT || "",
        azure_deployment: "gpt-4o",
        embedding_deployment: "text-embedding-ada-002",
        vector_db_url: "http://barq-vector:8080",
        graph_db_url: "http://barq-graph:3000",
        rbac_enabled: true,
        audit_logging: true,
    });

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const sections: ConfigSection[] = [
        {
            title: "Azure OpenAI",
            icon: <Key className="w-5 h-5" />,
            fields: [
                { key: "azure_endpoint", label: "Endpoint URL", type: "text", value: config.azure_endpoint, description: "Azure OpenAI resource endpoint" },
                { key: "azure_deployment", label: "GPT Deployment", type: "text", value: config.azure_deployment, description: "Model deployment name for chat completion" },
                { key: "embedding_deployment", label: "Embedding Deployment", type: "text", value: config.embedding_deployment, description: "Model deployment for text embeddings" },
            ]
        },
        {
            title: "Database Connections",
            icon: <Database className="w-5 h-5" />,
            fields: [
                { key: "vector_db_url", label: "Vector DB URL", type: "text", value: config.vector_db_url, description: "Barq Vector Database endpoint" },
                { key: "graph_db_url", label: "Graph DB URL", type: "text", value: config.graph_db_url, description: "Barq GraphDB endpoint" },
            ]
        },
        {
            title: "Security & Access",
            icon: <Shield className="w-5 h-5" />,
            fields: [
                { key: "rbac_enabled", label: "RBAC Enforcement", type: "toggle", value: config.rbac_enabled, description: "Enable role-based access control on all queries" },
                { key: "audit_logging", label: "Audit Logging", type: "toggle", value: config.audit_logging, description: "Log all agent actions and decisions" },
            ]
        },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Settings className="w-8 h-8 text-primary" />
                        System Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure API connections, security policies, and system behavior.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                    {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? "Saved!" : "Save Changes"}
                </button>
            </div>

            {/* Info Banner */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-blue-400">Configuration Note</p>
                    <p className="text-muted-foreground mt-1">
                        Environment variables are loaded from <code className="bg-secondary px-1 rounded">.env</code> file.
                        Changes here are for display only. Update your <code className="bg-secondary px-1 rounded">.env</code> file and restart containers to apply changes.
                    </p>
                </div>
            </div>

            {/* Configuration Sections */}
            <div className="space-y-6">
                {sections.map((section) => (
                    <div key={section.title} className="p-6 rounded-xl bg-card border border-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                {section.icon}
                            </div>
                            <h2 className="text-lg font-semibold">{section.title}</h2>
                        </div>

                        <div className="space-y-5">
                            {section.fields.map((field) => (
                                <div key={field.key} className="grid grid-cols-3 gap-4 items-start">
                                    <div>
                                        <label className="text-sm font-medium text-foreground">{field.label}</label>
                                        {field.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        {field.type === "toggle" ? (
                                            <button
                                                onClick={() => setConfig({ ...config, [field.key]: !field.value })}
                                                className={`relative w-14 h-7 rounded-full transition-colors ${field.value ? "bg-green-500" : "bg-secondary"
                                                    }`}
                                            >
                                                <div
                                                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${field.value ? "translate-x-8" : "translate-x-1"
                                                        }`}
                                                />
                                            </button>
                                        ) : field.type === "password" ? (
                                            <input
                                                type="password"
                                                value={field.value as string}
                                                onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={field.value as string}
                                                onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* System Status */}
            <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                        <Server className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold">System Status</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-medium">API Server</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Running on :8080</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-medium">Frontend</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Running on :3000</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-sm font-medium">Vector DB</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Local fallback</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-sm font-medium">Graph DB</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Local fallback</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
