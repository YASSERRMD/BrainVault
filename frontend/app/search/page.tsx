"use client";

import React, { useState } from "react";
import { Search, Loader2, FileText, ArrowRight, Database, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

interface SearchHit {
    doc_id: string;
    score: number;
    content: string | null;
}

interface SearchResponse {
    hits: SearchHit[];
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await api.post<SearchResponse>("/search", {
                q: query,
                top_k: 10,
            });
            setResults(response.data);
        } catch (err: any) {
            console.error("Search failed", err);
            setError(err?.response?.data || "Failed to fetch search results. Please ensure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const handleSeedData = async () => {
        setLoading(true);
        try {
            await api.post("/knowledge/seed");
            alert("Test data seeded successfully! Try searching for 'quantum', 'machine learning', or 'kubernetes'.");
        } catch (err) {
            alert("Failed to seed data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Semantic Search</h1>
                    <p className="text-muted-foreground mt-1">
                        Query the knowledge base using hybrid vector and keyword search.
                    </p>
                </div>
                <button
                    onClick={handleSeedData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors text-sm font-medium"
                >
                    <Database className="w-4 h-4" />
                    Seed Test Data
                </button>
            </div>

            <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for policies, documents, or entities..."
                    className="w-full pl-11 pr-32 py-4 rounded-xl bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg shadow-sm"
                />
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? "Searching..." : "Search"}
                </button>
            </form>

            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                    {error}
                </div>
            )}

            {results && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Found {results.hits.length} results</span>
                    </div>

                    <div className="space-y-4">
                        {results.hits.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground space-y-4">
                                <p>No results found for "{query}".</p>
                                <p className="text-sm">Try clicking "Seed Test Data" to add sample documents.</p>
                            </div>
                        ) : (
                            results.hits.map((hit, i) => (
                                <div
                                    key={hit.doc_id + i}
                                    className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <span className="font-mono text-xs text-muted-foreground">{hit.doc_id}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                            <span>Score: {(hit.score * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>

                                    <p className="text-foreground mt-2 leading-relaxed">
                                        {hit.content || "No content available"}
                                    </p>

                                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-end">
                                        <Link
                                            href={`/documents/${encodeURIComponent(hit.doc_id)}`}
                                            className="text-sm font-medium text-primary flex items-center gap-1 hover:gap-2 transition-all"
                                        >
                                            View Details <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {!results && !loading && (
                <div className="text-center py-16 text-muted-foreground">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a query above to search the knowledge base.</p>
                    <p className="text-sm mt-2">Try: "quantum computing", "kubernetes", "machine learning"</p>
                </div>
            )}
        </div>
    );
}
