"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Search,
    Database,
    Settings,
    ShieldCheck,
    Cpu,
    MessageSquare,
    FilePlus
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Search", href: "/search", icon: Search },
    { name: "Knowledge Graph", href: "/graph", icon: Database },
    { name: "Add Knowledge", href: "/add", icon: FilePlus },
    { name: "Agents", href: "/agents", icon: Cpu },
    { name: "Security", href: "/security", icon: ShieldCheck },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 border-r border-border h-screen p-4 flex flex-col bg-card/50 glass-panel">
            <div className="flex items-center gap-3 px-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                    <Cpu className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-xl gradient-text">BrainVault</span>
            </div>

            <nav className="flex-1 flex flex-col gap-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                        >
                            <item.icon
                                className={clsx(
                                    "w-5 h-5 transition-colors",
                                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                )}
                            />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto px-2">
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700">
                    <p className="text-xs text-muted-foreground mb-2">System Status</p>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-semibold">Online</span>
                    </div>
                    <p className="text-[10px] text-slate-500">v1.2.0 • NAFS-4 Active</p>
                </div>
            </div>
        </div>
    );
}
