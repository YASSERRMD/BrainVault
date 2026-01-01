"use client";

import React, { useState } from "react";
import { FilePlus, Save, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AddDocumentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        doc_id: `doc-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        content: ""
    });

    const handleSubmit = async () => {
        if (!formData.content.trim()) return;

        setLoading(true);
        try {
            await api.post("/knowledge/ingest", {
                doc_id: formData.doc_id,
                content: formData.content,
                entities: [],      // TODO: Auto-extract in backend
                relationships: []  // TODO: Auto-extract in backend
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
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <FilePlus className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Add Knowledge</h1>
                    <p className="text-muted-foreground">Ingest new documents into BrainVault's memory.</p>
                </div>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        Document ID
                    </label>
                    <input
                        type="text"
                        value={formData.doc_id}
                        onChange={(e) => setFormData({ ...formData, doc_id: e.target.value })}
                        className="w-full px-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm"
                        placeholder="unique-doc-id"
                    />
                    <p className="text-xs text-muted-foreground">Unique identifier for this document.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Content</label>
                    <textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary min-h-[300px] resize-y font-mono text-sm leading-relaxed"
                        placeholder="Paste your document content here..."
                    />
                </div>

                <div className="pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertCircle className="w-4 h-4" />
                        <span>Content will be vector-embedded immediately.</span>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.content}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${success
                                ? "bg-green-500 text-white"
                                : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                            }`}
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : success ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {loading ? "Ingesting..." : success ? "Saved!" : "Add Document"}
                    </button>
                </div>
            </div>
        </div>
    );
}
