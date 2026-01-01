# BrainVault

**An Agentic Knowledge Management System with Neural Graph Intelligence**

BrainVault is a next-generation knowledge base that combines **vector search**, **knowledge graphs**, and **autonomous AI agents** to transform raw documents into interconnected, queryable intelligence.

<p align="center">
  <img src="assets/logo.svg" alt="BrainVault Logo" width="200" height="200">
</p>

![Architecture](https://img.shields.io/badge/Architecture-Rust%20%2B%20Next.js-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## Features

### Agentic Knowledge Processing
- **Autonomous Ingestion**: Upload files and let the AI agent swarm handle chunking, entity extraction, and graph linking
- **Multi-Agent Orchestration**: Manager, Researcher, Analyst, Coder, and Ingestor agents work concurrently
- **Real-time Task Tracking**: Monitor agent tasks and their completion status

### Hybrid Search
- **Vector Similarity**: Semantic search using embeddings
- **BM25 Ranking**: Traditional keyword-based retrieval
- **Weighted Fusion**: Configurable blend of vector and lexical search

### Knowledge Graph
- **Auto-extracted Entities**: LLM-powered entity and relationship extraction
- **Visual Graph Explorer**: Interactive node-based visualization with drag support
- **Semantic Linking**: Documents automatically linked to extracted concepts

### Enterprise Security
- **RBAC**: Role-based access control (Admin, Editor, Viewer)
- **Audit Logging**: Complete trail of all agent actions and user queries
- **Secure by Default**: API-key protected endpoints

### Premium UI
- **Modern Dashboard**: Real-time system metrics and agent activity
- **Dark/Light Themes**: Automatic theme detection with manual override
- **Responsive Design**: Works on desktop and mobile

---

## Architecture

```
+-----------------------------------------------------------------+
|                        BrainVault                               |
+-----------------------------------------------------------------+
|  Frontend (Next.js 14)                                          |
|  - Dashboard, Chat, Search, Graph Visualization                 |
|  - File Upload with Drag & Drop                                 |
|  - Multi-Provider Settings (LLM + Embeddings)                   |
+-----------------------------------------------------------------+
|  Backend (Rust + Actix-Web)                                     |
|  - Agent Orchestrator (Manager, Researcher, Analyst, etc.)      |
|  - Hybrid Search Engine (Vector + BM25)                         |
|  - Knowledge Graph Manager                                      |
|  - RBAC + Audit System                                          |
+-----------------------------------------------------------------+
|  Data Layer                                                     |
|  - Barq VectorDB (Embeddings & Similarity Search)               |
|  - Barq GraphDB (Entities & Relationships)                      |
+-----------------------------------------------------------------+
```

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- LLM API Key (OpenAI, Azure, Anthropic, or any OpenAI-compatible provider)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/BrainVault.git
cd BrainVault
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Launch with Docker
```bash
docker-compose up --build -d
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080
- **Health Check**: http://localhost:8080/api/health

---

## Configuration

### LLM Provider Options

BrainVault supports **any OpenAI-compatible API**. Configure in `.env`:

#### OpenAI (Default)
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

#### Azure OpenAI
```env
LLM_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-12-01-preview
```

#### Anthropic
```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

#### Together AI / Groq / Fireworks
```env
LLM_PROVIDER=together  # or groq, fireworks
LLM_BASE_URL=https://api.together.xyz/v1
LLM_API_KEY=...
LLM_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
```

#### Ollama (Local)
```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.2
```

#### Custom OpenAI-Compatible
```env
LLM_PROVIDER=custom
LLM_BASE_URL=https://your-api.com/v1
LLM_API_KEY=...
LLM_MODEL=your-model
```

### Embedding Provider (Can Be Different)

```env
# Use a different provider for embeddings
EMBEDDING_PROVIDER=voyage
EMBEDDING_BASE_URL=https://api.voyageai.com/v1
EMBEDDING_API_KEY=...
EMBEDDING_MODEL=voyage-3
```

**Supported Embedding Providers:**
- OpenAI (`text-embedding-3-small`, `text-embedding-3-large`)
- Azure OpenAI
- Voyage AI (`voyage-3`, `voyage-3-lite`)
- Jina AI (`jina-embeddings-v3`)
- Together AI
- Ollama (local models)

---

## Project Structure

```
BrainVault/
|-- backend/                 # Rust API Server
|   |-- src/
|   |   |-- api/            # HTTP handlers
|   |   |-- core/           # Business logic
|   |   |   |-- agent_orchestrator.rs
|   |   |   |-- search_engine.rs
|   |   |   |-- graph_manager.rs
|   |   |   +-- llm/        # LLM clients
|   |   +-- db/             # Database clients
|   +-- Cargo.toml
|-- frontend/               # Next.js 14 App
|   |-- app/               # App Router pages
|   |   |-- add/           # File upload
|   |   |-- agents/        # Agent dashboard
|   |   |-- chat/          # AI chat interface
|   |   |-- documents/     # Document browser
|   |   |-- graph/         # Knowledge graph
|   |   |-- search/        # Hybrid search
|   |   |-- security/      # Audit logs
|   |   +-- settings/      # Configuration
|   +-- components/        # Shared UI components
|-- docker-compose.yml
+-- .env.example
```

---

## API Reference

### Knowledge Ingestion
```bash
POST /api/knowledge/ingest
Content-Type: application/json

{
  "doc_id": "my-document",
  "content": "Document text content...",
  "entities": [],      # Optional, auto-extracted if empty
  "relationships": []  # Optional, auto-extracted if empty
}
```

### Hybrid Search
```bash
POST /api/knowledge/search
Content-Type: application/json

{
  "query": "quantum computing applications",
  "top_k": 10
}
```

### Chat with Knowledge
```bash
POST /api/knowledge/chat
Content-Type: application/json

{
  "message": "Explain quantum entanglement",
  "context_docs": 5
}
```

### Agent Task Submission
```bash
POST /api/agents/task
Content-Type: application/json

{
  "description": "Research latest AI developments",
  "agent_type": "Researcher"
}
```

---

## Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `brainvault-frontend` | 3000 | Next.js UI |
| `brainvault-api` | 8080 | Rust Backend |
| `barq-vector` | 8081 | Vector Database |
| `barq-graph` | 7687 | Graph Database |

### Persistent Volumes
- `brainvault_api_data`: Backend caches and state
- `brainvault_vector_data`: Vector embeddings
- `brainvault_graph_data`: Graph entities and relationships

---

## Development

### Run Backend Locally
```bash
cd backend
cargo run
```

### Run Frontend Locally
```bash
cd frontend
npm install
npm run dev
```

### Run Tests
```bash
cd backend
cargo test
```

---

## Roadmap

- [x] Phase 1: Core Infrastructure (Vector + Graph DBs)
- [x] Phase 2: Hybrid Search Engine
- [x] Phase 3: Agent Orchestration System
- [x] Phase 4: RBAC & Audit Logging
- [x] Phase 5: Agentic Knowledge Ingestion
- [x] Phase 5.5: Multi-Provider LLM Support
- [ ] Phase 6: Advanced RAG Strategies
- [ ] Phase 7: Multi-Modal Support (Images, PDFs)
- [ ] Phase 8: Collaborative Workspaces

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- Built with [Rust](https://www.rust-lang.org/), [Actix-Web](https://actix.rs/), [Next.js](https://nextjs.org/)
- Powered by Barq Vector & Graph databases
- UI components inspired by modern design systems

---

**Made with care by the BrainVault Team**
