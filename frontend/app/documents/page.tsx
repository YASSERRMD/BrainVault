"use client";

import React from "react";
import { FileText, Clock, ChevronRight, Loader2, Database, Zap } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";
import { api } from "@/lib/api";

interface Document {
    id: string;
    content_preview?: string;
    indexed_at?: string;
}

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function DocumentsPage() {
    const { data, error, isLoading } = useSWR<{ documents: Document[] }>("/knowledge/documents", fetcher);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
                        <Database className="w-3 h-3" />
                        Knowledge Archive
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Documents</h1>
                    <p className="text-muted-foreground text-lg">
                        Browse all ingested knowledge in BrainVault.
                    </p>
                </div>
                <Link
                    href="/add"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                >
                    <Zap className="w-4 h-4" />
                    Add Knowledge
                </Link>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-destructive">
                    Failed to load documents. Check API connection.
                </div>
            ) : !data?.documents?.length ? (
                <div className="glass-panel rounded-2xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold">No Documents Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Start by uploading your first file. The agent swarm will handle chunking and extraction.
                    </p>
                    <Link
                        href="/add"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm mt-4"
                    >
                        Upload First Document
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.documents.map((doc) => (
                        <Link
                            key={doc.id}
                            href={`/documents/${encodeURIComponent(doc.id)}`}
                            className="group glass-panel rounded-2xl p-6 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
                        >
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>

                            <h3 className="font-bold text-lg mb-2 truncate">{doc.id}</h3>

                            {doc.content_preview && (
                                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                    {doc.content_preview}
                                </p>
                            )}

                            {doc.indexed_at && (
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span>Indexed recently</span>
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
