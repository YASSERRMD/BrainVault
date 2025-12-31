export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            System overview and intelligent insights.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-blue-500/20">
            New Investigation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Documents", value: "12,450", change: "+12%", trend: "up" },
          { title: "Active Agents", value: "8", change: "Optimal", trend: "neutral" },
          { title: "Knowledge Nodes", value: "84,392", change: "+5%", trend: "up" },
          { title: "System Load", value: "24%", change: "-2%", trend: "down" },
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors group">
            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{stat.value}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.trend === 'up' ? 'text-green-500 bg-green-500/10' :
                  stat.trend === 'down' ? 'text-green-500 bg-green-500/10' : // lower load is good
                    'text-blue-500 bg-blue-500/10'
                }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl bg-card border border-border min-h-[400px]">
          <h3 className="text-lg font-semibold mb-4">Recent Agent Activities</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer border border-transparent hover:border-border">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold shrink-0">
                  A{i}
                </div>
                <div>
                  <p className="font-medium text-foreground">Deep Research on Quantum Cryptography</p>
                  <p className="text-sm text-muted-foreground mt-1">Agent assigned to cross-reference 500+ papers for vulnerability assessment.</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>2 mins ago</span>
                    <span className="text-primary">In Progress</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl bg-card border border-border">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Vector Index</span>
                <span className="text-green-500">Healthy</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[98%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Graph Database</span>
                <span className="text-green-500">Healthy</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-500 w-[100%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>API Latency</span>
                <span className="text-yellow-500">45ms</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-[60%]" />
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-200">
              <strong>Note:</strong> Scheduled maintenance for knowledge graph re-indexing in 2 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
