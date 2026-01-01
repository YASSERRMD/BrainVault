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
- [ ] **Graph-Augmented Retrieval (GraphRAG)**:
    - Update Chat to query the Graph for context, not just Vector DB.
    - Enable "Pathfinding" queries (e.g., "Connection between Project X and Client Y").

## Phase 4: Enterprise Security & Observability
**Objective:** Production-readiness.
- [ ] **RBAC Enforcement**: Lock down API endpoints based on User Roles (Admin vs User).
- [ ] **Audit Dashboard**: Visualize agent actions and access logs.
