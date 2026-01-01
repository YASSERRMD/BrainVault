"use client";

import React, { useState, useRef } from "react";
import {
    FilePlus,
    Save,
    FileText,
    Check,
    AlertCircle,
    Loader2,
    Upload,
    X,
    FileCode,
    ShieldCheck,
    Zap,
    Cpu
} from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AddDocumentPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        doc_id: "",
        content: ""
    });

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
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
        if (file) handleFileSelect(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleSubmit = async () => {
        if (!formData.content.trim()) return;

        setLoading(true);
        try {
            await api.post("/knowledge/ingest", {
                doc_id: formData.doc_id || "manual-entry",
                content: formData.content,
                entities: [],
                relationships: []
            });
            setSuccess(true);
            setTimeout(() => {
                router.push("/documents"); // Redirect to documents list or dashboard
            }, 1500);
        } catch (err) {
            console.error("Ingest failed", err);
            alert("Agent swarm failed to accept the request. Check API status.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 py-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20 mb-2">
                        <Zap className="w-3 h-3" />
                        Neural Ingestion
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Expand BrainVault
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl">
                        Upload raw data and let the agent swarm perform autonomous chunking, entity extraction, and graph linking.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-secondary/30 p-4 rounded-2xl border border-border/50">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center">
                                <Cpu className="w-4 h-4 text-primary" />
                            </div>
                        ))}
                    </div>
                    <div className="text-xs">
                        <p className="font-bold text-foreground">Worker Swarm</p>
                        <p className="text-muted-foreground">Standing by for files</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Upload Zone */}
                <div className="lg:col-span-12">
                    {!selectedFile ? (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`group h-80 relative rounded-[32px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-6 overflow-hidden ${dragging
                                    ? "border-primary bg-primary/5 scale-[1.01] shadow-2xl shadow-primary/10"
                                    : "border-border hover:border-primary/40 hover:bg-secondary/40"
                                }`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                                accept=".txt,.md,.json,.pdf"
                            />

                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="relative p-6 rounded-3xl bg-secondary shadow-inner border border-border group-hover:scale-110 transition-transform duration-500">
                                <Upload className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>

                            <div className="relative space-y-2">
                                <h3 className="text-xl font-bold">Transmit New Knowledge</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    Drop your files here to initiate agentic extraction.
                                    Supports Markdown, Text, and Documentation.
                                </p>
                            </div>

                            <button className="relative px-8 py-3 rounded-full bg-foreground text-background font-bold text-sm hover:opacity-90 transition-opacity">
                                Select from System
                            </button>
                        </div>
                    ) : (
                        <div className="glass-panel rounded-[32px] p-8 border border-border/50 animate-in zoom-in-95 duration-500">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                {/* File Representation */}
                                <div className="w-full md:w-64 aspect-[3/4] rounded-2xl bg-secondary/50 border border-border flex flex-col items-center justify-center gap-4 relative group shrink-0">
                                    <div className="p-5 rounded-2xl bg-primary/10 text-primary">
                                        <FileCode className="w-12 h-12" />
                                    </div>
                                    <div className="text-center px-4">
                                        <p className="font-bold truncate max-w-[180px]">{selectedFile.name}</p>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-widest">
                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedFile(null); setFormData({ doc_id: "", content: "" }); }}
                                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Controls & Preview */}
                                <div className="flex-grow space-y-8 w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Archive Identity</label>
                                            <div className="relative">
                                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={formData.doc_id}
                                                    onChange={(e) => setFormData({ ...formData, doc_id: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary/30 border border-border focus:border-primary outline-none transition-all font-mono text-sm"
                                                    placeholder="knowledge-slug-id"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-end">
                                            <div className="w-full p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                                                <ShieldCheck className="w-5 h-5 text-primary" />
                                                <p className="text-xs leading-tight text-primary/80">
                                                    Verified for processing. The <strong>KnowledgeExtractor</strong> agent will analyze this data.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between ml-1">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground underline decoration-primary/30 decoration-2 underline-offset-4">Content Insight</label>
                                            <span className="text-[10px] text-muted-foreground font-mono">{formData.content.length} characters detected</span>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-secondary/20 border border-border/40 font-mono text-xs text-muted-foreground leading-relaxed max-h-48 overflow-y-auto italic">
                                            {formData.content.substring(0, 1000)}
                                            {formData.content.length > 1000 && "..."}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-4 pt-4 border-t border-border/30">
                                        <button
                                            onClick={() => setSelectedFile(null)}
                                            className="px-6 py-4 rounded-2xl font-bold text-sm hover:bg-secondary transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className={`relative flex items-center gap-3 px-10 py-5 rounded-3xl font-black text-sm tracking-wide transition-all shadow-xl shadow-primary/20 ${loading
                                                    ? "bg-primary/50 cursor-not-allowed"
                                                    : "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] active:shadow-none"
                                                }`}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Disseminating to Swarm...
                                                </>
                                            ) : success ? (
                                                <>
                                                    <Check className="w-5 h-5" />
                                                    Transmission Successful
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="w-5 h-5 fill-current" />
                                                    Engage Agent Swarm
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
