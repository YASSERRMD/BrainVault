"use client";

import React from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { api, TaskResponse } from "@/lib/api";
import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    Terminal,
    ArrowLeft,
    Cpu
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

const fetcher = (url: string) => api.get<TaskResponse>(url).then((res) => res.data);

export default function AgentTaskDetail() {
    const { taskId } = useParams();

    // Poll every 2 seconds
    const { data: task, error } = useSWR(taskId ? `/agents/task/${taskId}` : null, fetcher, {
        refreshInterval: 2000,
    });

    if (error) return (
        <div className="p-8 text-center">
            <div className="inline-block p-4 rounded-full bg-red-500/10 text-red-500 mb-4">
                <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">Failed to load task</h2>
            <p className="text-muted-foreground mt-2">Could not fetch task details for ID: {taskId}</p>
            <Link href="/agents" className="mt-6 inline-block text-primary hover:underline">
                Return to Agents
            </Link>
        </div>
    );

    if (!task) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h2 className="text-xl font-medium text-foreground">Connecting to Agent Feed...</h2>
            <p className="text-muted-foreground mt-1">Establishing secure link to Orchestrator</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Link href="/agents" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Operations
            </Link>

            {/* Header Status Card */}
            <div className="p-8 rounded-xl bg-card border border-border relative overflow-hidden">
                {/* Ambient glow based on status */}
                <div className={clsx(
                    "absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none",
                    task.status === 'Completed' ? "bg-green-500" :
                        task.status === 'Failed' ? "bg-red-500" :
                            "bg-blue-500"
                )} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-1 rounded border border-white/5">
                                TASK-ID: {task.task_id}
                            </span>
                            {getStatusBadge(task.status)}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground max-w-2xl">
                            Task Operation Detail
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Cpu className="w-4 h-4" />
                            <span>Assigned to Agent: <strong>{task.audit_log.find(l => l.action === "ASSIGNED")?.details.split(' ').pop() || "Pending Assignment..."}</strong></span>
                        </div>
                    </div>

                    {task.status === 'Completed' && (
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 max-w-sm">
                            <p className="font-semibold text-sm mb-1">Final Result</p>
                            <p className="text-sm opacity-90">{task.result}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Result/Context */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-6 rounded-xl bg-card border border-border min-h-[400px]">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-primary" />
                            Live Audit Trail
                        </h3>

                        <div className="space-y-8 relative pl-4 border-l border-border/50 ml-2">
                            {task.audit_log.map((log, i) => (
                                <div key={i} className="relative animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className={clsx(
                                        "absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-background",
                                        log.action === 'COMPLETED' ? "bg-green-500" :
                                            log.action === 'FAILED' ? "bg-red-500" :
                                                log.action === 'SUBMITTED' ? "bg-slate-500" :
                                                    "bg-blue-500"
                                    )} />

                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx(
                                                "text-xs font-bold px-2 py-0.5 rounded",
                                                log.action === 'COMPLETED' ? "bg-green-500/10 text-green-500" :
                                                    log.action === 'FAILED' ? "bg-red-500/10 text-red-500" :
                                                        "bg-blue-500/10 text-blue-500"
                                            )}>
                                                {log.action}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {new Date(log.timestamp * 1000).toLocaleTimeString()}
                                            </span>
                                            {log.agent_id && (
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    by {log.agent_id}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-foreground text-sm pl-1 border-l-2 border-transparent hover:border-border transition-colors">
                                            {log.details}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {task.status === 'InProgress' && (
                                <div className="relative animate-pulse">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500/50" />
                                    <p className="text-sm text-muted-foreground pl-1 italic">Agent is processing...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Col: Metadata */}
                <div className="space-y-6">
                    <div className="p-6 rounded-xl bg-card border border-border">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Metric Context</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm">Created At</span>
                                <span className="text-sm font-mono">{task.audit_log[0] ? new Date(task.audit_log[0].timestamp * 1000).toLocaleDateString() : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm">Duration</span>
                                <span className="text-sm font-mono text-primary">
                                    {task.status === 'Completed' && task.audit_log.length > 0
                                        ? `${(task.audit_log[task.audit_log.length - 1].timestamp - task.audit_log[0].timestamp).toFixed(1)}s`
                                        : "Running..."}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-sm">Resources Used</span>
                                <span className="text-sm font-mono">Hybrid Search</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                        <h4 className="font-semibold text-indigo-400 mb-2">AI Insight</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            This agent is utilizing the Hybrid Search Engine (Vector + BM25) to retrieve relevant context before finalizing the result.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getStatusBadge(status: string) {
    switch (status) {
        case "Completed":
            return (
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium border border-green-500/20 shadow-lg shadow-green-500/10">
                    <CheckCircle2 className="w-4 h-4" /> Completed
                </span>
            );
        case "InProgress":
            return (
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm font-medium border border-blue-500/20 shadow-lg shadow-blue-500/10">
                    <Clock className="w-4 h-4 animate-spin" /> In Progress
                </span>
            );
        case "Failed":
            return (
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-sm font-medium border border-red-500/20">
                    <AlertCircle className="w-4 h-4" /> Failed
                </span>
            );
        default:
            return (
                <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-500/10 text-slate-500 text-sm font-medium border border-slate-500/20">
                    <Clock className="w-4 h-4" /> Pending
                </span>
            );
    }
}
