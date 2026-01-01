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
    FilePlus,
    Sun,
    Moon,
    User,
    Lock
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
    const [theme, setTheme] = React.useState("dark");
    const [role, setRole] = React.useState("admin");

    React.useEffect(() => {
        const savedTheme = localStorage.getItem("theme") || "dark";
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);

        const savedRole = localStorage.getItem("current_user") || "admin";
        setRole(savedRole);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    const toggleRole = () => {
        const newRole = role === "admin" ? "viewer" : "admin";
        setRole(newRole);
        localStorage.setItem("current_user", newRole);
        window.location.reload();
    };

    return (
        <div className="w-64 border-r border-border h-screen p-4 flex flex-col bg-card/30 glass-panel backdrop-blur-xl">
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

            <div className="mt-auto px-2 space-y-3">
                {/* Toggles */}
                <div className="flex gap-2">
                    <button
                        onClick={toggleTheme}
                        className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-secondary text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all border border-border"
                        title="Toggle Theme"
                    >
                        {theme === "dark" ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                        {theme === "dark" ? "Dark" : "Light"}
                    </button>
                    <button
                        onClick={toggleRole}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium transition-all border border-border",
                            role === "admin" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-secondary text-muted-foreground"
                        )}
                        title="Toggle Role"
                    >
                        {role === "admin" ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {role === "admin" ? "Admin" : "Viewer"}
                    </button>
                </div>

                <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">System Status</p>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <span className="text-sm font-semibold text-foreground">Online</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">v1.2.0 • NAFS-4 Active</p>
                </div>
            </div>
        </div>
    );
}
