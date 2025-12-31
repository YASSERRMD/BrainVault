"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Network, RefreshCw, Plus, Loader2, Circle, FileText, Search } from "lucide-react";
import { api, KnowledgeStats } from "@/lib/api";
import useSWR from "swr";

interface SearchHit {
    doc_id: string;
    score: number;
    content: string | null;
}

interface SearchResponse {
    hits: SearchHit[];
}

const statsFetcher = (url: string) => api.get<KnowledgeStats>(url).then((res) => res.data);

export default function GraphPage() {
    const { data: stats, error, mutate } = useSWR("/knowledge/stats", statsFetcher, {
        refreshInterval: 5000,
    });

    const [loading, setLoading] = useState(false);
    const [documents, setDocuments] = useState<SearchHit[]>([]);

    const loadDocuments = async () => {
        try {
            // Search with common terms to get all documents
            const response = await api.post<SearchResponse>("/search", {
                q: "computing learning security cloud",
                top_k: 20
            });
            setDocuments(response.data.hits);
        } catch (err) {
            console.error("Failed to load documents", err);
        }
    };

    useEffect(() => {
        loadDocuments();
    }, []);

    const handleSeedData = async () => {
        setLoading(true);
        try {
            await api.post("/knowledge/seed");
            mutate();
            loadDocuments();
        } catch (err) {
            console.error("Seed failed", err);
        } finally {
            setLoading(false);
        }
    };

    // Generate graph nodes from actual documents
    const graphData = useMemo(() => {
        const nodes = documents.slice(0, 8).map((doc, i) => {
            const angle = (i / Math.min(documents.length, 8)) * 2 * Math.PI;
            const radius = 150;
            return {
                id: doc.doc_id,
                label: doc.doc_id.replace("doc-", "Doc ").replace("agent-result-", "Result "),
                type: doc.doc_id.startsWith("agent-result-") ? "AgentResult" : "Document",
                x: 300 + radius * Math.cos(angle),
                y: 200 + radius * Math.sin(angle),
                content: doc.content?.slice(0, 100) || ""
            };
        });

        // Create edges between related documents (simple proximity based on array order)
        const edges = nodes.slice(0, -1).map((node, i) => ({
            from: i,
            to: i + 1,
            type: "RELATED"
        }));
        // Connect last to first to form a ring
        if (nodes.length > 2) {
            edges.push({ from: nodes.length - 1, to: 0, type: "RELATED" });
        }

        return { nodes, edges };
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
                        Visualize entity relationships and traverse the knowledge network.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { mutate(); loadDocuments(); }}
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
                    <div className="text-4xl font-bold text-blue-500">{stats?.documents || 0}</div>
                    <div className="text-sm text-muted-foreground mt-1">Documents</div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="text-4xl font-bold text-purple-500">{stats?.entities || 0}</div>
                    <div className="text-sm text-muted-foreground mt-1">Entities</div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                    <div className="text-4xl font-bold text-green-500">{stats?.relationships || 0}</div>
                    <div className="text-sm text-muted-foreground mt-1">Relationships</div>
                </div>
            </div>

            {/* Graph Visualization */}
            <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold mb-4">Document Network</h3>
                {graphData.nodes.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                        <Search className="w-12 h-12 mb-4 opacity-50" />
                        <p>No documents in knowledge base</p>
                        <p className="text-sm mt-1">Click "Seed Data" to add sample documents</p>
                    </div>
                ) : (
                    <div className="relative h-[400px] bg-gradient-to-br from-secondary/30 to-background rounded-lg overflow-hidden">
                        <svg className="w-full h-full">
                            {/* Edges */}
                            {graphData.edges.map((edge, i) => {
                                const fromNode = graphData.nodes[edge.from];
                                const toNode = graphData.nodes[edge.to];
                                if (!fromNode || !toNode) return null;
                                return (
                                    <line
                                        key={i}
                                        x1={fromNode.x}
                                        y1={fromNode.y}
                                        x2={toNode.x}
                                        y2={toNode.y}
                                        stroke="currentColor"
                                        strokeOpacity={0.15}
                                        strokeWidth={2}
                                        strokeDasharray="4,4"
                                    />
                                );
                            })}

                            {/* Nodes */}
                            {graphData.nodes.map((node, i) => (
                                <g key={node.id} className="cursor-pointer hover:opacity-80 transition-opacity">
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r={35}
                                        className={
                                            node.type === "AgentResult"
                                                ? "fill-purple-500/20 stroke-purple-500"
                                                : "fill-blue-500/20 stroke-blue-500"
                                        }
                                        strokeWidth={2}
                                    />
                                    <foreignObject x={node.x - 30} y={node.y - 10} width={60} height={20}>
                                        <div className="text-[10px] text-center font-medium truncate">
                                            {node.label.slice(0, 8)}
                                        </div>
                                    </foreignObject>
                                </g>
                            ))}

                            {/* Center label */}
                            <text x={300} y={200} textAnchor="middle" fontSize={12} fill="currentColor" opacity={0.3}>
                                Knowledge Base
                            </text>
                        </svg>

                        {/* Legend */}
                        <div className="absolute bottom-4 left-4 flex gap-4 text-xs">
                            <div className="flex items-center gap-1">
                                <Circle className="w-3 h-3 fill-blue-500/50 text-blue-500" />
                                <span className="text-muted-foreground">Document</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Circle className="w-3 h-3 fill-purple-500/50 text-purple-500" />
                                <span className="text-muted-foreground">Agent Result</span>
                            </div>
                        </div>

                        {/* Document count badge */}
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {graphData.nodes.length} nodes
                        </div>
                    </div>
                )}
                <p className="text-xs text-muted-foreground mt-4 text-center">
                    Nodes represent indexed documents. Agent results are shown in purple.
                </p>
            </div>

            {/* Document List */}
            {documents.length > 0 && (
                <div className="p-6 rounded-xl bg-card border border-border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Indexed Documents
                    </h3>
                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <div key={doc.doc_id} className="p-3 rounded-lg bg-secondary/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${doc.doc_id.startsWith("agent-result-") ? "bg-purple-500" : "bg-blue-500"}`} />
                                    <span className="font-mono text-sm">{doc.doc_id}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {doc.content?.slice(0, 50)}...
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
