"use client";

import React, { useState, useEffect } from "react";
import { Network, RefreshCw, Plus, Loader2, Circle, ArrowRight } from "lucide-react";
import { api, KnowledgeStats } from "@/lib/api";
import useSWR from "swr";

const fetcher = (url: string) => api.get<KnowledgeStats>(url).then((res) => res.data);

export default function GraphPage() {
    const { data: stats, error, mutate } = useSWR("/knowledge/stats", fetcher, {
        refreshInterval: 5000,
    });

    const [loading, setLoading] = useState(false);

    const handleSeedData = async () => {
        setLoading(true);
        try {
            await api.post("/knowledge/seed");
            mutate(); // Refresh stats
        } catch (err) {
            console.error("Seed failed", err);
        } finally {
            setLoading(false);
        }
    };

    // Sample visualization data (in production, this would come from the graph API)
    const sampleNodes = [
        { id: 1, label: "Quantum Computing", type: "Technology", x: 200, y: 150 },
        { id: 2, label: "Machine Learning", type: "Technology", x: 400, y: 100 },
        { id: 3, label: "Cybersecurity", type: "Domain", x: 350, y: 250 },
        { id: 4, label: "Cloud Computing", type: "Technology", x: 150, y: 300 },
        { id: 5, label: "DevOps", type: "Practice", x: 450, y: 350 },
    ];

    const sampleEdges = [
        { from: 1, to: 2, type: "RELATED_TO" },
        { from: 2, to: 3, type: "ENABLES" },
        { from: 2, to: 5, type: "INTEGRATES" },
        { from: 4, to: 5, type: "SUPPORTS" },
        { from: 3, to: 4, type: "PROTECTS" },
    ];

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
                        onClick={() => mutate()}
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
                        Seed Entities
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
                <h3 className="text-lg font-semibold mb-4">Graph Preview</h3>
                <div className="relative h-[400px] bg-gradient-to-br from-secondary/30 to-background rounded-lg overflow-hidden">
                    <svg className="w-full h-full">
                        {/* Edges */}
                        {sampleEdges.map((edge, i) => {
                            const fromNode = sampleNodes.find(n => n.id === edge.from);
                            const toNode = sampleNodes.find(n => n.id === edge.to);
                            if (!fromNode || !toNode) return null;
                            return (
                                <g key={i}>
                                    <line
                                        x1={fromNode.x}
                                        y1={fromNode.y}
                                        x2={toNode.x}
                                        y2={toNode.y}
                                        stroke="currentColor"
                                        strokeOpacity={0.2}
                                        strokeWidth={2}
                                    />
                                    <text
                                        x={(fromNode.x + toNode.x) / 2}
                                        y={(fromNode.y + toNode.y) / 2 - 5}
                                        fontSize={10}
                                        fill="currentColor"
                                        opacity={0.5}
                                        textAnchor="middle"
                                    >
                                        {edge.type}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Nodes */}
                        {sampleNodes.map((node) => (
                            <g key={node.id} className="cursor-pointer hover:opacity-80 transition-opacity">
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={30}
                                    className={
                                        node.type === "Technology" ? "fill-blue-500/20 stroke-blue-500" :
                                            node.type === "Domain" ? "fill-purple-500/20 stroke-purple-500" :
                                                "fill-green-500/20 stroke-green-500"
                                    }
                                    strokeWidth={2}
                                />
                                <text
                                    x={node.x}
                                    y={node.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={10}
                                    fill="currentColor"
                                    className="font-medium"
                                >
                                    {node.label.split(" ")[0]}
                                </text>
                                <text
                                    x={node.x}
                                    y={node.y + 45}
                                    textAnchor="middle"
                                    fontSize={11}
                                    fill="currentColor"
                                    opacity={0.7}
                                >
                                    {node.label}
                                </text>
                            </g>
                        ))}
                    </svg>

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 flex gap-4 text-xs">
                        <div className="flex items-center gap-1">
                            <Circle className="w-3 h-3 fill-blue-500/50 text-blue-500" />
                            <span className="text-muted-foreground">Technology</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Circle className="w-3 h-3 fill-purple-500/50 text-purple-500" />
                            <span className="text-muted-foreground">Domain</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Circle className="w-3 h-3 fill-green-500/50 text-green-500" />
                            <span className="text-muted-foreground">Practice</span>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                    Interactive graph visualization powered by Barq-GraphDB. Click nodes to explore relationships.
                </p>
            </div>
        </div>
    );
}
