# BrainVault Advanced Features Roadmap

## Phase 2: Advanced Autonomous Agents
**Objective:** Enable agents to perform complex, multi-step cognitive tasks rather than just simple generation.
- [x] **Agent Workflow Engine**: Create a structure to define multi-step agent behaviors.
- [x] **Research Agent**:
    - Capacity to decompose a query into sub-questions.
    - specialized tools for "Deep Reading" of internal documents.
    - Output: Comprehensive Research Report with citations.
- [x] **Analyst Agent**:
    - specialized in detecting patterns, contradictions, and data correlation across documents.

## Phase 3: Intelligent Ingestion (Graph Extraction)
**Objective:** Automate the Knowledge Graph population to make it a true "Second Brain".
- [x] **Entity Extraction Pipeline**:
    - Triggered automatically upon document ingestion.
    - Uses LLM to extract Entities (Nodes) and Relationships (Edges).
- [x] **Graph-Augmented Retrieval (GraphRAG)**:
    - Update Chat to query the Graph for context, not just Vector DB.
    - Enable "Pathfinding" queries (e.g., "Connection between Project X and Client Y").

## Phase 4: Enterprise Security & Observability
**Objective:** Make the system enterprise-ready with strict access controls and audit trails.
- [x] **RBAC Enforcement**:
    - Metadata-based filtering in Vector Search (only return docs matching user role).
    - Hard filtering in Graph traversal.
- [x] **Audit Dashboard**:
    - Centralized view of all Agent activities and Data Access logs.
    - Visual "Security Command Center".

## Phase 5: Cognitive Mesh (Multi-Agent Swarm)
**Objective:** Enable high-level "Manager" agents to autonomously coordinate a team of specialized agents.
- [ ] **Manager Agent Logic**:
    - Ability to break down a high-level goal (e.g., "Build a feature to X") into sub-tasks (Research -> Code -> Review).
    - Recursively submit tasks to the `AgentOrchestrator`.
- [ ] **Inter-Agent Communication**:
    - Agents sharing context/results via the Knowledge Graph (`agent-result-*` documents).
- [ ] **Self-Reflection Loop**:
    - Reviewer Agent critiques output; Manager re-assigns if quality is low.


