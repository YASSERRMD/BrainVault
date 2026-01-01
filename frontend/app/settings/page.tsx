"use client";

import React, { useState } from "react";
import { Settings, Key, Database, Shield, Save, Check, AlertCircle, Server, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import useSWR from "swr";

interface HealthStatus {
    api: string;
    vector_db: string;
    graph_db: string;
    vector_db_url: string;
    graph_db_url: string;
}

const healthFetcher = (url: string) => api.get<HealthStatus>(url).then((res) => res.data);

export default function SettingsPage() {
    const [saved, setSaved] = useState(false);

    const { data: health, error: healthError, isLoading } = useSWR("/health", healthFetcher, {
        refreshInterval: 5000,
    });

    const [config, setConfig] = useState({
        azure_endpoint: "",
        azure_deployment: "gpt-4o",
        embedding_deployment: "text-embedding-ada-002",
        rbac_enabled: true,
        audit_logging: true,
    });

    const handleSave = () => {
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

            {/* System Status - Real-time from API */}
            <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                        <Server className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold">System Status</h2>
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${health?.api ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                            <span className="text-sm font-medium">API Server</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {health?.api === "running" ? "Running on :8080" : "Checking..."}
                        </p>
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
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.vector_db || "")}`} />
                            <span className="text-sm font-medium">Vector DB</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {getStatusText(health?.vector_db || "checking")}
                        </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(health?.graph_db || "")}`} />
                            <span className="text-sm font-medium">Graph DB</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {getStatusText(health?.graph_db || "checking")}
                        </p>
                    </div>
                </div>

                {/* Connection URLs */}
                {health && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-muted-foreground">Vector DB URL:</span>
                                <code className="ml-2 px-2 py-0.5 bg-secondary rounded">{health.vector_db_url}</code>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Graph DB URL:</span>
                                <code className="ml-2 px-2 py-0.5 bg-secondary rounded">{health.graph_db_url}</code>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-blue-400">Configuration Note</p>
                    <p className="text-muted-foreground mt-1">
                        Environment variables are loaded from <code className="bg-secondary px-1 rounded">.env</code> file.
                        Update your <code className="bg-secondary px-1 rounded">.env</code> file and restart containers to apply changes.
                    </p>
                </div>
            </div>

            {/* Azure OpenAI Configuration */}
            <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Key className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold">Azure OpenAI</h2>
                </div>

                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4 items-start">
                        <div>
                            <label className="text-sm font-medium text-foreground">GPT Deployment</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Model deployment for chat</p>
                        </div>
                        <div className="col-span-2">
                            <input
                                type="text"
                                value={config.azure_deployment}
                                onChange={(e) => setConfig({ ...config, azure_deployment: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 items-start">
                        <div>
                            <label className="text-sm font-medium text-foreground">Embedding Deployment</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Model for embeddings</p>
                        </div>
                        <div className="col-span-2t">
                            <input
                                type="text"
                                value={config.embedding_deployment}
                                onChange={(e) => setConfig({ ...config, embedding_deployment: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="p-6 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Shield className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold">Security & Access</h2>
                </div>

                <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <div>
                            <label className="text-sm font-medium text-foreground">RBAC Enforcement</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Role-based access control</p>
                        </div>
                        <div className="col-span-2">
                            <button
                                onClick={() => setConfig({ ...config, rbac_enabled: !config.rbac_enabled })}
                                className={`relative w-14 h-7 rounded-full transition-colors ${config.rbac_enabled ? "bg-green-500" : "bg-secondary"
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${config.rbac_enabled ? "translate-x-8" : "translate-x-1"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <div>
                            <label className="text-sm font-medium text-foreground">Audit Logging</label>
                            <p className="text-xs text-muted-foreground mt-0.5">Log all agent actions</p>
                        </div>
                        <div className="col-span-2">
                            <button
                                onClick={() => setConfig({ ...config, audit_logging: !config.audit_logging })}
                                className={`relative w-14 h-7 rounded-full transition-colors ${config.audit_logging ? "bg-green-500" : "bg-secondary"
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${config.audit_logging ? "translate-x-8" : "translate-x-1"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
