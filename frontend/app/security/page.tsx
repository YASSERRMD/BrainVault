"use client";

import React from "react";
import { Shield, Lock, Activity, FileText, AlertTriangle, UserCheck } from "lucide-react";
import { api } from "@/lib/api";
import useSWR from "swr";

interface SecurityLog {
    id: string;
    timestamp: number;
    event: string;
    user: string;
    status: string;
    risk: string;
}

const fetcher = (url: string) => api.get<SecurityLog[]>(url).then(res => res.data);

export default function SecurityPage() {
    const { data: logs, error } = useSWR("/security/logs", fetcher, {
        refreshInterval: 2000,
        fallbackData: []
    });

    const formatTime = (ts: number) => {
        return new Date(ts * 1000).toLocaleTimeString();
    };

    const auditedCount = logs ? logs.length : 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Shield className="w-8 h-8 text-green-500" />
                        Security Command Center
                    </h1>
                    <p className="text-muted-foreground mt-1">Real-time threat monitoring and access control logs.</p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-card border border-border rounded-lg flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium">System Secure</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-card border border-border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Lock className="w-24 h-24" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">RBAC Status</h3>
                    <div className="text-2xl font-bold mb-1">Enforced</div>
                    <p className="text-xs text-green-500 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Policy Active
                    </p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-24 h-24" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Threat Level</h3>
                    <div className="text-2xl font-bold mb-1 text-green-500">Low</div>
                    <p className="text-xs text-muted-foreground">0 active threats detected</p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText className="w-24 h-24" />
                    </div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Audited Events</h3>
                    <div className="text-2xl font-bold mb-1">{auditedCount}</div>
                    <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </div>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-bold mb-6">Audit Log</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Time</th>
                                <th className="px-4 py-3">Event</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 rounded-r-lg">Risk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {logs && logs.map((log) => (
                                <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                                    <td className="px-4 py-4 font-mono text-muted-foreground">{formatTime(log.timestamp)}</td>
                                    <td className="px-4 py-4 font-medium">{log.event}</td>
                                    <td className="px-4 py-4 text-muted-foreground">{log.user}</td>
                                    <td className="px-4 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${log.status === "Denied" ? "bg-red-500/10 text-red-500" :
                                                log.status === "Success" ? "bg-green-500/10 text-green-500" :
                                                    "bg-blue-500/10 text-blue-500"
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        {log.risk === "High" ? (
                                            <span className="flex items-center gap-1 text-red-500 font-bold">
                                                <AlertTriangle className="w-3 h-3" /> High
                                            </span>
                                        ) : (
                                            <span className="text-green-500">Low</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {(!logs || logs.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No recent formatted audit logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
