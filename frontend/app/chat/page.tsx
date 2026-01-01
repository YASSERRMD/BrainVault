"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, FileText, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";

interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: string[];
}

interface ChatResponse {
    answer: string;
    sources: string[];
}

export default function ChatPage() {
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hello! I'm BrainVault. I can answer questions based on your private knowledge base. What would you like to know?" }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!query.trim() || loading) return;

        const userMsg = query;
        setQuery("");
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setLoading(true);

        try {
            const res = await api.post<ChatResponse>("/chat", { query: userMsg });
            setMessages(prev => [...prev, {
                role: "assistant",
                content: res.data.answer,
                sources: res.data.sources
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Sorry, I encountered an error while processing your request. Please check if the backend is running."
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Chat with Knowledge</h1>
                    <p className="text-muted-foreground">Ask questions and get answers grounded in your data.</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-6 p-4 rounded-xl bg-card border border-border mb-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-purple-500 text-white"
                            }`}>
                            {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>

                        <div className={`max-w-[80%] space-y-2`}>
                            <div className={`p-4 rounded-2xl ${msg.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                    : "bg-secondary text-foreground rounded-tl-none"
                                }`}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>

                            {msg.sources && msg.sources.length > 0 && (
                                <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> Sources:
                                    </span>
                                    {msg.sources.map((source, idx) => (
                                        <span key={idx} className="text-xs px-2 py-1 rounded bg-secondary/50 border border-border text-muted-foreground flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            {source}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="p-4 rounded-2xl bg-secondary rounded-tl-none flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 rounded-xl bg-card border border-border">
                <div className="relative">
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question about your documents..."
                        className="w-full pl-4 pr-12 py-3 rounded-lg bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none min-h-[50px] max-h-[150px]"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !query.trim()}
                        className="absolute right-2 top-2 p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="mt-2 text-xs text-center text-muted-foreground">
                    Build with RAG (Retrieval Augmented Generation) powered by Azure OpenAI.
                </div>
            </div>
        </div>
    );
}
