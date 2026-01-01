"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Network, RefreshCw, Plus, Loader2, FileText, Database, Share2, Move } from "lucide-react";
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

interface VisualNode extends Entity {
    x: number;
    y: number;
    color: string;
    fill: string;
    stroke: string;
    displayName: string;
}

const statsFetcher = (url: string) => api.get<KnowledgeStats>(url).then((res) => res.data);
const graphFetcher = (url: string) => api.get<GraphData>(url).then((res) => res.data);
const docsFetcher = (url: string) => api.get<DocumentsResponse>(url).then((res) => res.data);

export default function GraphPage() {
    const { data: stats, mutate: mutateStats } = useSWR("/knowledge/stats", statsFetcher, { refreshInterval: 5000 });
    const { data: graphData, mutate: mutateGraph, isLoading: isGraphLoading } = useSWR("/graph/data", graphFetcher, { refreshInterval: 5000 });
    const { data: docsData, mutate: mutateDocs } = useSWR("/documents", docsFetcher, { refreshInterval: 10000 });

    const [loading, setLoading] = useState(false);
    const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
    const [dragging, setDragging] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<VisualNode | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

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

    // Initialize positions
    const initialPositions = useMemo(() => {
        const width = 600;
        const height = 400;
        const padding = 50;
        const count = entities.length;
        if (!count) return {};

        const cols = Math.ceil(Math.sqrt(count * (width / height)));
        const rows = Math.ceil(count / cols);
        const cellW = (width - 2 * padding) / Math.max(cols, 1);
        const cellH = (height - 2 * padding) / Math.max(rows, 1);

        const positions: Record<string, { x: number; y: number }> = {};
        entities.forEach((entity, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            positions[entity.id] = {
                x: padding + col * cellW + cellW / 2,
                y: padding + row * cellH + cellH / 2,
            };
        });
        return positions;
    }, [entities]);

    // Merge with dragged positions
    const mergedPositions = useMemo(() => {
        return { ...initialPositions, ...nodePositions };
    }, [initialPositions, nodePositions]);

    // Helper to get display name
    const getDisplayName = (entity: Entity): string => {
        const name = entity.properties?.name || entity.properties?.content_preview || entity.id;
        return name.length > 12 ? name.slice(0, 12) + "…" : name;
    };

    // Color mapping
    const labelColors: Record<string, { color: string; fill: string; stroke: string }> = {
        Document: { color: "text-emerald-500", fill: "fill-emerald-500/20", stroke: "stroke-emerald-500" },
        Technology: { color: "text-blue-500", fill: "fill-blue-500/20", stroke: "stroke-blue-500" },
        Chunk: { color: "text-amber-500", fill: "fill-amber-500/20", stroke: "stroke-amber-500" },
        Person: { color: "text-pink-500", fill: "fill-pink-500/20", stroke: "stroke-pink-500" },
        Field: { color: "text-cyan-500", fill: "fill-cyan-500/20", stroke: "stroke-cyan-500" },
        Domain: { color: "text-violet-500", fill: "fill-violet-500/20", stroke: "stroke-violet-500" },
    };
    const defaultColor = { color: "text-slate-500", fill: "fill-slate-500/20", stroke: "stroke-slate-500" };

    const visualNodes: VisualNode[] = useMemo(() => {
        return entities.map((entity) => ({
            ...entity,
            x: mergedPositions[entity.id]?.x || 300,
            y: mergedPositions[entity.id]?.y || 200,
            displayName: getDisplayName(entity),
            ...(labelColors[entity.label] || defaultColor),
        }));
    }, [entities, mergedPositions]);

    const visualEdges = useMemo(() => {
        return relationships.map(rel => {
            const source = visualNodes.find(n => n.id === rel.from_id);
            const target = visualNodes.find(n => n.id === rel.to_id);
            return { ...rel, source, target };
        }).filter(e => e.source && e.target);
    }, [relationships, visualNodes]);

    // Drag handlers
    const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault();
        setDragging(nodeId);
        const node = visualNodes.find(n => n.id === nodeId);
        if (node) setSelectedNode(node);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragging || !svgRef.current) return;

        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

        setNodePositions(prev => ({
            ...prev,
            [dragging]: { x: svgP.x, y: svgP.y }
        }));
    }, [dragging]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    useEffect(() => {
        if (dragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [dragging, handleMouseMove, handleMouseUp]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Share2 className="w-8 h-8 text-primary" />
                        Knowledge Graph
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Drag nodes to rearrange. Click to inspect.
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
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Move className="w-5 h-5 text-muted-foreground" />
                        Entity Relationships
                    </h3>
                    {selectedNode && (
                        <div className="px-4 py-2 bg-secondary rounded-lg text-sm">
                            <span className="text-muted-foreground">Selected:</span>{" "}
                            <span className="font-bold">{selectedNode.properties?.name || selectedNode.id}</span>
                            <span className="text-xs text-muted-foreground ml-2">({selectedNode.label})</span>
                        </div>
                    )}
                </div>
                {isGraphLoading ? (
                    <div className="h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : visualNodes.length === 0 ? (
                    <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
                        <Network className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg font-medium">No entities in graph</p>
                        <p className="text-sm mt-1">Click "Seed Data" to create entities</p>
                    </div>
                ) : (
                    <div className="relative h-[400px] bg-gradient-to-br from-secondary/20 to-background rounded-lg border border-border/50 overflow-hidden">
                        <svg ref={svgRef} className="w-full h-full cursor-crosshair" viewBox="0 0 600 400">
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
                                        strokeOpacity={0.3}
                                        strokeWidth={1}
                                        markerEnd="url(#arrowhead)"
                                    />
                                </g>
                            ))}

                            {/* Nodes */}
                            {visualNodes.map((node) => (
                                <g
                                    key={node.id}
                                    className={`cursor-grab ${dragging === node.id ? "cursor-grabbing" : ""}`}
                                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                                    style={{ transition: dragging === node.id ? "none" : "all 0.1s ease-out" }}
                                >
                                    <circle
                                        cx={node.x}
                                        cy={node.y}
                                        r={20}
                                        className={`${node.fill} ${node.stroke} ${selectedNode?.id === node.id ? "stroke-[3]" : ""}`}
                                        strokeWidth={selectedNode?.id === node.id ? 3 : 2}
                                    />
                                    <text
                                        x={node.x}
                                        y={node.y + 4}
                                        textAnchor="middle"
                                        fontSize="9"
                                        fill="currentColor"
                                        className="font-medium pointer-events-none select-none"
                                    >
                                        {node.displayName}
                                    </text>
                                    <title>{node.properties?.name || node.id} ({node.label})</title>
                                </g>
                            ))}
                        </svg>

                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                            {visualNodes.length} entities • {visualEdges.length} edges
                        </div>
                        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground flex items-center gap-2">
                            <Move className="w-3 h-3" /> Drag nodes to rearrange
                        </div>
                    </div>
                )}
            </div>

            {/* Document List */}
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

