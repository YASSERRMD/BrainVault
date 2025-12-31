"use client";

import React, { useState } from "react";
import {
    Cpu,
    Plus,
    Play,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowRight
} from "lucide-react";
import Link from "next/link";
import { api, TaskRequest, TaskResponse } from "@/lib/api";
import { clsx } from "clsx";

export default function AgentsPage() {
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [recentTasks, setRecentTasks] = useState<TaskResponse[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) return;

        setSubmitting(true);
        try {
            const response = await api.post<{ task_id: string, status: string }>("/agents/task", {
                description: description,
            });

            // Mock adding to local list for immediate feedback (since we don't have a list endpoint yet)
            const newTask: TaskResponse = {
                task_id: response.data.task_id,
                status: "Pending", // Usually starts as pending
                result: null,
                audit_log: []
            };

            setRecentTasks([newTask, ...recentTasks]);
            setDescription("");
        } catch (err) {
            console.error("Task submission failed", err);
            alert("Failed to assign task. Is the Orchestrator running?");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Agent Orchestration</h1>
                    <p className="text-muted-foreground mt-1">
                        Delegate complex tasks to autonomous AI agents.
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-sm font-medium border border-green-500/20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        System Active
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Task Submission Panel */}
                <div className="lg:col-span-1">
                    <div className="p-6 rounded-xl bg-card border border-border sticky top-24">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            New Assignment
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Task Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g., Research the impact of quantum computing on modern cryptography protocols..."
                                    className="w-full h-40 p-3 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none text-sm placeholder:text-muted-foreground/50"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting || !description.trim()}
                                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                            >
                                {submitting ? (
                                    <Clock className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 fill-current" />
                                )}
                                {submitting ? "Assigning..." : "Assign Task"}
                            </button>
                            <p className="text-xs text-muted-foreground text-center">
                                Orchestrator will automatically assign an appropriate agent.
                            </p>
                        </form>
                    </div>
                </div>

                {/* Task List / Monitor */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-primary" />
                        Active Operations
                    </h3>

                    {recentTasks.length === 0 ? (
                        <div className="p-12 rounded-xl bg-secondary/20 border border-dashed border-border text-center">
                            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                                <Cpu className="w-8 h-8" />
                            </div>
                            <h4 className="text-foreground font-medium">No Active Tasks</h4>
                            <p className="text-muted-foreground text-sm mt-1">Submit a task on the left to see agents in action.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {recentTasks.map((task) => (
                                <div key={task.task_id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all group relative overflow-hidden">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                                                ID: {task.task_id.substring(0, 8)}...
                                            </span>
                                            {getStatusBadge(task.status)}
                                        </div>
                                        <Link
                                            href={`/agents/${task.task_id}`}
                                            className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            Monitor <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                    <p className="text-foreground font-medium line-clamp-2">
                                        {task.result || "Processing task..."}
                                        {/* Note: we might not have descriptions in the response if we just blindly pushed from submit response, 
                                    but usually we'd re-fetch. For now this is a placeholder. 
                                    Ideally we'd fetch the task details or store the description locally. */}
                                    </p>

                                    {/* Simple progress bar simulation */}
                                    <div className="mt-4 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                        <div className={clsx(
                                            "h-full transition-all duration-1000",
                                            task.status === 'Completed' ? "w-full bg-green-500" :
                                                task.status === 'InProgress' ? "w-1/2 bg-blue-500 animate-pulse" :
                                                    "w-5 bg-slate-500"
                                        )} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function getStatusBadge(status: string) {
    switch (status) {
        case "Completed":
            return (
                <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                </span>
            );
        case "InProgress":
            return (
                <span className="flex items-center gap-1 text-xs font-medium text-blue-500">
                    <Clock className="w-3 h-3 animate-spin" /> In Progress
                </span>
            );
        case "Failed":
            return (
                <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                    <AlertCircle className="w-3 h-3" /> Failed
                </span>
            );
        default:
            return (
                <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Clock className="w-3 h-3" /> Pending
                </span>
            );
    }
}
