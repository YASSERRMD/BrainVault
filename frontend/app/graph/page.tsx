"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Network, RefreshCw, Plus, Loader2, FileText, Database } from "lucide-react";
import { api, KnowledgeStats } from "@/lib/api";
import useSWR from "swr";
import Link from "next/link";

interface DocumentItem {
    doc_id: string;
    content: string | null;
    score: number;
}

interface DocumentsResponse {
    documents: DocumentItem[];
    count: number;
}

const statsFetcher = (url: string) => api.get<KnowledgeStats>(url).then((res) => res.data);
const docsFetcher = (url: string) => api.get<DocumentsResponse>(url).then((res) => res.data);

export default function GraphPage() {
    const { data: stats, mutate: mutateStats } = useSWR("/knowledge/stats", statsFetcher, {
        refreshInterval: 5000,
    });

    const { data: docsData, mutate: mutateDocs, isLoading } = useSWR("/documents", docsFetcher, {
        refreshInterval: 10000,
    });

    const [loading, setLoading] = useState(false);

    const handleSeedData = async () => {
        setLoading(true);
        try {
            await api.post("/knowledge/seed");
            mutateStats();
            mutateDocs();
        } catch (err) {
            console.error("Seed failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        mutateStats();
        mutateDocs();
    };

    const documents = docsData?.documents || [];

    // Generate graph nodes from documents
    const graphNodes = useMemo(() => {
        return documents.slice(0, 12).map((doc, i) => {
            const angle = (i / Math.min(documents.length, 12)) * 2 * Math.PI - Math.PI / 2;
            const radius = 140;
            const centerX = 300;
            const centerY = 200;
            return {
                id: doc.doc_id,
                label: doc.doc_id.replace("doc-00", "D").replace("doc-0", "D").replace("agent-result-", "A-"),
                isAgent: doc.doc_id.startsWith("agent-result-"),
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
                content: doc.content?.slice(0, 80) || ""
            };
        });
    }, [documents]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Network className="w-8 h-8 text-primary" />
                        Knowledge Graph
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Visualize documents and entities in the knowledge base.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleSeedData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Seed Data
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                        <Database className="w-8 h-8 text-blue-500" />
                        <div>
                            <div className="text-3xl font-bold text-blue-500">{stats?.documents || 0}</div>
                            <div className="text-sm text-muted-foreground">Documents</div>
                        </div>
                    </div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                        <Network className="w-8 h-8 text-purple-500" />
                        <div>
                            <div className="text-3xl font-bold text-purple-500">{stats?.entities || 0}</div>
                            <div className="text-sm text-muted-foreground">Entities</div>
                        </div>
                    </div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="6" y1="12" x2="18" y2="12" />
                            <polyline points="12 6 18 12 12 18" />
                        </svg>
                        <div>
                            <div className="text-3xl font-bold text-green-500">{stats?.relationships || 0}</div>
                            <div className="text-sm text-muted-foreground">Relationships</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Graph Visualization */}
            <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold mb-4">Document Network</h3>
                {isLoading ? (
                    <div className="h-[400px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : graphNodes.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                        <Database className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg font-medium">No documents in knowledge base</p>
                        <p className="text-sm mt-1">Click "Seed Data" to add sample documents</p>
                    </div>
                ) : (
                    <div className="relative h-[400px] bg-gradient-to-br from-secondary/20 to-background rounded-lg border border-border/50">
                        <svg className="w-full h-full" viewBox="0 0 600 400">
                            {/* Center hub */}
                            <circle cx="300" cy="200" r="40" className="fill-primary/10 stroke-primary/30" strokeWidth="2" />
                            <text x="300" y="195" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5">Knowledge</text>
                            <text x="300" y="210" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5">Base</text>

                            {/* Edges from center to nodes */}
                            {graphNodes.map((node, i) => (
                                <line
                                    key={`edge-${i}`}
                                    x1="300"
                                    y1="200"
                                    x2={node.x}
                                    y2={node.y}
                                    stroke="currentColor"
                                    strokeOpacity={0.1}
                                    strokeWidth={1}
                                />
                            ))}

                            {/* Nodes */}
                            {graphNodes.map((node) => (
                                <g key={node.id} className="cursor-pointer">
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r={28}
                                        className={node.isAgent
                                            ? "fill-purple-500/20 stroke-purple-500 hover:fill-purple-500/30"
                                            : "fill-blue-500/20 stroke-blue-500 hover:fill-blue-500/30"
                                        }
                                        strokeWidth={2}
                                    />
                                    <text
                                        x={node.x}
                                        y={node.y + 4}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="currentColor"
                                        className="font-medium pointer-events-none"
                                    >
                                        {node.label}
                                    </text>
                                </g>
                            ))}
                        </svg>

                        {/* Legend */}
                        <div className="absolute bottom-4 left-4 flex gap-4 text-xs bg-card/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-blue-500/50 border border-blue-500" />
                                <span className="text-muted-foreground">Document</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-purple-500/50 border border-purple-500" />
                                <span className="text-muted-foreground">Agent Result</span>
                            </div>
                        </div>

                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                            {graphNodes.length} nodes
                        </div>
                    </div>
                )}
            </div>

            {/* Document List */}
            {documents.length > 0 && (
                <div className="p-6 rounded-xl bg-card border border-border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        All Documents ({documents.length})
                    </h3>
                    <div className="grid gap-2">
                        {documents.map((doc) => (
                            <Link
                                key={doc.doc_id}
                                href={`/documents/${encodeURIComponent(doc.doc_id)}`}
                                className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-between transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${doc.doc_id.startsWith("agent-result-") ? "bg-purple-500" : "bg-blue-500"}`} />
                                    <span className="font-mono text-sm">{doc.doc_id}</span>
                                </div>
                                <span className="text-xs text-muted-foreground max-w-md truncate">
                                    {doc.content?.slice(0, 60)}...
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
