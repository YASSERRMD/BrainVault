import axios from "axios";

// Default admin user ID for phase 1-2
const DEFAULT_USER_ID = "admin";

export const api = axios.create({
    baseURL: "http://localhost:8080/api",
    headers: {
        "Content-Type": "application/json",
        "X-User-ID": DEFAULT_USER_ID,
    },
});

export interface SearchResult {
    doc_id: string;
    score: number;
    content: string;
    metadata: Record<string, string>;
}

export interface SearchResponse {
    hits: SearchResult[];
    processing_time_ms: number;
}

export type TaskStatus = "Pending" | "InProgress" | "Completed" | "Failed";

export interface AuditLogEntry {
    timestamp: number;
    agent_id: string | null;
    action: string;
    details: string;
}

export interface TaskResponse {
    task_id: string;
    status: TaskStatus;
    result: string | null;
    audit_log: AuditLogEntry[];
}

export interface TaskRequest {
    description: string;
}
