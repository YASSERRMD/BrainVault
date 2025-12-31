"use client";

import React from "react";
import { Activity, Shield, Users, Database, Zap, Cpu } from "lucide-react";
import { api, SystemStats } from "@/lib/api";
import useSWR from "swr";
import { clsx } from "clsx";
import Link from "next/link";

const fetcher = (url: string) => api.get<SystemStats>(url).then((res) => res.data);

export default function Dashboard() {
  const { data: stats, error } = useSWR("/agents/stats", fetcher, {
    refreshInterval: 5000,
  });

  const loading = !stats && !error;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-card border border-border p-8 md:p-12">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in border border-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            System Operational
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Welcome to BrainVault
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your centralized command center for autonomous agents and neural knowledge management.
            Orchestrate complex workflows with advanced AI intelligence.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Cpu />}
          label="Active Agents"
          value={loading ? "-" : stats?.active_agents.toString() || "0"}
          subLabel="2 idle, 1 processing"
          trend="+12%"
          color="blue"
          href="/agents"
        />
        <StatCard
          icon={<Zap />}
          label="Total Operations"
          value={loading ? "-" : stats?.active_tasks.toString() || "0"}
          subLabel="In the last 24h"
          trend="+8%"
          color="purple"
          href="/agents"
        />
        <StatCard
          icon={<Database />}
          label="Knowledge Vectors"
          value="12,504"
          subLabel="Indexed documents"
          trend="+5%"
          color="amber"
          href="/search"
        />
        <StatCard
          icon={<Shield />}
          label="Security Status"
          value="Secure"
          subLabel="RBAC Enforcement Active"
          trend="100%"
          color="green"
          href="/security"
        />
      </div>

      {/* Activity Feed Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Live System Activity
            </h3>
            <span className="text-xs text-muted-foreground">Real-time feed</span>
          </div>

          <div className="space-y-6 relative pl-4 border-l border-border/50 ml-2">
            <RecentActivityFeed />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-br from-secondary/50 to-background border border-border">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Team Access</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Manage permissions and access roles for your organization.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-500">AD</div>
              <div>
                <p className="text-xs font-semibold">Admin User</p>
                <p className="text-[10px] text-muted-foreground">Root Access</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function RecentActivityFeed() {
  const { data: tasks, error } = useSWR("/agents/tasks", (url) => api.get<any[]>(url).then(res => res.data), {
    refreshInterval: 2000,
  });

  if (!tasks || tasks.length === 0) {
    return (
      <div className="relative">
        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-secondary border-2 border-background" />
        <p className="text-sm text-foreground">System initialized. Waiting for tasks...</p>
        <span className="text-xs text-muted-foreground">Now</span>
      </div>
    );
  }

  // Show last 5 tasks
  return (
    <>
      {[...tasks].reverse().slice(0, 5).map((task: any, i: number) => {
        // Find latest audit log
        const latestLog = task.audit_log && task.audit_log.length > 0
          ? task.audit_log[task.audit_log.length - 1]
          : { action: "CREATED", timestamp: Date.now() / 1000 };

        const status = task.status.replace(/"/g, ''); // Clean quotes

        return (
          <Link key={task.task_id + i} href={`/agents/${task.task_id}`} className="block group relative animate-fade-in pl-2 rounded-lg hover:bg-secondary/30 transition-colors p-2 -ml-2">
            <div className={clsx(
              "absolute -left-[21px] top-3 w-3 h-3 rounded-full border-2 border-background ring-2 ring-background group-hover:ring-primary/20 transition-all",
              status === "Completed" ? "bg-green-500" :
                status === "InProgress" ? "bg-blue-500 animate-pulse" :
                  status === "Failed" ? "bg-red-500" :
                    "bg-slate-500"
            )} />
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-foreground font-medium group-hover:text-primary transition-colors">
                  {latestLog.action}: {task.task_id.substring(0, 8)}...
                </p>
                <p className="text-xs text-muted-foreground/80 line-clamp-1 mt-0.5">
                  {latestLog.details || task.description}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {new Date(latestLog.timestamp * 1000).toLocaleTimeString()}
              </span>
            </div>
          </Link>
        );
      })}
    </>
  );
}

function StatCard({ icon, label, value, subLabel, trend, color, href }: any) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    green: "text-green-500 bg-green-500/10 border-green-500/20",
  };

  const Content = (
    <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all group h-full cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <div className={clsx("p-3 rounded-xl transition-colors", colorMap[color], "group-hover:bg-opacity-20")}>
          {React.cloneElement(icon, { className: "w-6 h-6" })}
        </div>
        <span className={clsx("text-xs font-medium px-2 py-1 rounded-full bg-secondary text-foreground")}>
          {trend}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{value}</h3>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-xs text-muted-foreground/60">{subLabel}</p>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{Content}</Link>;
  }
  return Content;
}
