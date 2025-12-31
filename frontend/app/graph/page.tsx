export default function GraphPage() {
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
            <div className="p-4 rounded-full bg-blue-500/10 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3" /><line x1="12" x2="12" y1="8" y2="21" /><line x1="9" x2="15" y1="11" y2="11" /><line x1="9" x2="9" y1="11" y2="21" /><line x1="15" x2="15" y1="11" y2="21" /></svg>
            </div>
            <h1 className="text-2xl font-bold">Knowledge Graph Visualization</h1>
            <p className="text-muted-foreground max-w-md">This module uses barq-graph to visualize entity relationships. Integration coming in next update.</p>
        </div>
    );
}
