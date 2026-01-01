"use client";

import React, { useState, useRef } from "react";
import { FilePlus, Save, FileText, Check, AlertCircle, Loader2, Upload, X } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AddDocumentPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [formData, setFormData] = useState({
        doc_id: `doc-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        content: ""
    });

    const handleFileRead = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setFormData({
                doc_id: file.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9]/g, "-"),
                content: content
            });
        };
        reader.readAsText(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileRead(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileRead(file);
    };

    const handleSubmit = async () => {
        if (!formData.content.trim()) return;

        setLoading(true);
        try {
            await api.post("/knowledge/ingest", {
                doc_id: formData.doc_id,
                content: formData.content,
                entities: [],
                relationships: []
            });
            setSuccess(true);
            setTimeout(() => {
                router.push("/documents/" + encodeURIComponent(formData.doc_id));
            }, 1000);
        } catch (err) {
            console.error("Ingest failed", err);
            alert("Failed to add document. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
                    <FilePlus className="w-7 h-7" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add Knowledge</h1>
                    <p className="text-muted-foreground text-lg">Ingest new documents into BrainVault's neural swarm.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Upload & Config */}
                <div className="lg:col-span-4 space-y-6">
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`group relative p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 ${dragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-secondary/50"
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept=".txt,.md,.json,.csv"
                        />
                        <div className="p-4 rounded-full bg-secondary text-muted-foreground group-hover:text-primary transition-colors">
                            <Upload className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Drop file here</p>
                            <p className="text-xs text-muted-foreground mt-1">or click to browse (.txt, .md, .json)</p>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                Knowledge ID
                            </label>
                            <input
                                type="text"
                                value={formData.doc_id}
                                onChange={(e) => setFormData({ ...formData, doc_id: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm"
                                placeholder="unique-id"
                            />
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <div className="flex items-center gap-3 text-xs p-3 rounded-xl bg-primary/5 text-primary/80 border border-primary/10">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Agent swarm will handle chunking & extraction.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Content Editor */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="glass-panel p-1 rounded-2xl overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Document Content</span>
                            {formData.content && (
                                <button
                                    onClick={() => setFormData({ ...formData, content: "" })}
                                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full flex-grow p-6 bg-transparent border-none focus:ring-0 resize-none font-mono text-sm leading-relaxed"
                            placeholder="Paste or upload document content to begin ingestion..."
                        />
                        <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-end">
                            <button
                                onClick={handleSubmit}
                                disabled={loading || !formData.content}
                                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${success
                                    ? "bg-green-500 text-white"
                                    : "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                                    }`}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : success ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                {loading ? "Agent Processing..." : success ? "Task Submitted!" : "Ingest Knowledge"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
