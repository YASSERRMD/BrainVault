"use client";
import React from "react";
import { Bell, Search, User } from "lucide-react";

export function Header() {
    return (
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-4">
                {/* Breadcrumbs could go here */}
                <h2 className="text-lg font-semibold text-foreground">Overview</h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search knowledge base..."
                        className="pl-9 pr-4 py-1.5 bg-secondary/50 border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-64 text-foreground placeholder-muted-foreground transition-all focus:w-80"
                    />
                </div>

                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-secondary/50 rounded-full relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background"></span>
                </button>

                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/10 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                    MY
                </div>
            </div>
        </header>
    );
}
