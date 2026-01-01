"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Network, RefreshCw, Plus, Loader2, FileText, Database, Share2 } from "lucide-react";
import { api, KnowledgeStats } from "@/lib/api";
import useSWR from "swr";
import Link from "next/link";

interface Entity {
    id: string;
    label: string;
    properties: Record<string, string>;
}

interface Relationship {
    from_id: string;
    to_id: string;
    rel_type: string;
}

interface GraphData {
    entities: Entity[];
    relationships: Relationship[];
}

interface DocumentItem {
    doc_id: string;
    content: string | null;
}

interface DocumentsResponse {
    documents: DocumentItem[];
    count: number;
}

const statsFetcher = (url: string) => api.get<KnowledgeStats>(url).then((res) => res.data);
const graphFetcher = (url: string) => api.get<GraphData>(url).then((res) => res.data);
const docsFetcher = (url: string) => api.get<DocumentsResponse>(url).then((res) => res.data);

export default function GraphPage() {
    const { data: stats, mutate: mutateStats } = useSWR("/knowledge/stats", statsFetcher, { refreshInterval: 5000 });
    const { data: graphData, mutate: mutateGraph, isLoading: isGraphLoading } = useSWR("/graph/data", graphFetcher, { refreshInterval: 5000 });
    const { data: docsData, mutate: mutateDocs } = useSWR("/documents", docsFetcher, { refreshInterval: 10000 });

    const [loading, setLoading] = useState(false);

    const handleSeedData = async () => {
        setLoading(true);
        try {
            await api.post("/knowledge/seed");
            mutateStats();
            mutateGraph();
            mutateDocs();
        } catch (err) {
            console.error("Seed failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        mutateStats();
        mutateGraph();
        mutateDocs();
    };

    const documents = docsData?.documents || [];
    const entities = graphData?.entities || [];
    const relationships = graphData?.relationships || [];

    // Simple layout algorithm
    const visualNodes = useMemo(() => {
        if (!entities.length) return [];

        // Simple circular layout
        return entities.map((entity, i) => {
            const angle = (i / entities.length) * 2 * Math.PI;
            const radius = 150;
            const cx = 300;
            const cy = 200;
            return {
                ...entity,
                x: cx + radius * Math.cos(angle),
                y: cy + radius * Math.sin(angle),
                color: i % 2 === 0 ? "text-blue-500" : "text-purple-500",
                fill: i % 2 === 0 ? "fill-blue-500/20" : "fill-purple-500/20",
                stroke: i % 2 === 0 ? "stroke-blue-500" : "stroke-purple-500",
            };
        });
    }, [entities]);

    const visualEdges = useMemo(() => {
        return relationships.map(rel => {
            const source = visualNodes.find(n => n.id === rel.from_id);
            const target = visualNodes.find(n => n.id === rel.to_id);
            return { ...rel, source, target };
        }).filter(e => e.source && e.target);
    }, [relationships, visualNodes]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Share2 className="w-8 h-8 text-primary" />
                        Knowledge Graph
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Visualize entity relationships and structure.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                    <button onClick={handleSeedData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Seed Data
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
                        <Share2 className="w-8 h-8 text-green-500" />
                        <div>
                            <div className="text-3xl font-bold text-green-500">{stats?.relationships || 0}</div>
                            <div className="text-sm text-muted-foreground">Relationships</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Graph Visualization */}
            <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold mb-4">Entity Relationships</h3>
                {isGraphLoading ? (
                    <div className="h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : visualNodes.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                        <Network className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg font-medium">No entities in graph</p>
                        <p className="text-sm mt-1">Click "Seed Data" to create entities</p>
                    </div>
                ) : (
                    <div className="relative h-[400px] bg-gradient-to-br from-secondary/20 to-background rounded-lg border border-border/50">
                        <svg className="w-full h-full" viewBox="0 0 600 400">
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" opacity="0.5" />
                                </marker>
                            </defs>

                            {/* Edges */}
                            {visualEdges.map((edge, i) => (
                                <g key={i}>
                                    <line
                                        x1={edge.source?.x}
                                        y1={edge.source?.y}
                                        x2={edge.target?.x}
                                        y2={edge.target?.y}
                                        stroke="#64748b"
                                        strokeOpacity={0.4}
                                        strokeWidth={1.5}
                                        markerEnd="url(#arrowhead)"
                                    />
                                    <text
                                        x={((edge.source?.x || 0) + (edge.target?.x || 0)) / 2}
                                        y={((edge.source?.y || 0) + (edge.target?.y || 0)) / 2 - 5}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill="currentColor"
                                        opacity="0.6"
                                        className="bg-card px-1"
                                    >
                                        {edge.rel_type}
                                    </text>
                                </g>
                            ))}

                            {/* Nodes */}
                            {visualNodes.map((node) => (
                                <g key={node.id} className="cursor-pointer transition-opacity hover:opacity-80">
                                    <circle cx={node.x} cy={node.y} r={25} className={`${node.fill} ${node.stroke} transition-all`} strokeWidth={2} />
                                    <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="11" fill="currentColor" className="font-medium pointer-events-none">
                                        {node.label.length > 8 ? node.label.slice(0, 8) + ".." : node.label}
                                    </text>
                                    <title>{node.label}</title>
                                </g>
                            ))}
                        </svg>

                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                            {visualNodes.length} entities • {visualEdges.length} edges
                        </div>
                    </div>
                )}
            </div>

            {/* Document List (Simplified) */}
            {documents.length > 0 && (
                <div className="p-6 rounded-xl bg-card border border-border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Referenced Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {documents.slice(0, 6).map((doc) => (
                            <Link key={doc.doc_id} href={`/documents/${encodeURIComponent(doc.doc_id)}`} className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary flex items-center gap-3 transition-colors border border-transparent hover:border-border">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="font-mono text-xs">{doc.doc_id}</span>
                                <span className="text-xs text-muted-foreground truncate flex-1">{doc.content?.slice(0, 40)}...</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
