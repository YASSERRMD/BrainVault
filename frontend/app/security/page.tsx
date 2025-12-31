export default function SecurityPage() {
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
            <div className="p-4 rounded-full bg-green-500/10 text-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <h1 className="text-2xl font-bold">Security & Audit</h1>
            <p className="text-muted-foreground max-w-md">RBAC policies and active session monitoring will be displayed here.</p>
        </div>
    );
}
