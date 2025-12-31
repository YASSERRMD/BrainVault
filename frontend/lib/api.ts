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
