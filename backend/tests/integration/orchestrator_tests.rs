use brainvault_backend::core::agent_orchestrator::{AgentOrchestrator, AgentProfile, AgentType, TaskStatus};

#[tokio::test]
async fn test_orchestrator_flow() {
    let orchestrator = AgentOrchestrator::new(None, None);
    
    // 1. Register Agent
    let agent = AgentProfile {
        id: "agent_007".to_string(),
        name: "Bond".to_string(),
        agent_type: AgentType::Researcher,
        capabilities: vec!["search".to_string(), "deduction".to_string()],
    };
    orchestrator.register_agent(agent).await;
    
    // 2. Submit Task
    let task_id = orchestrator.submit_task("Find Goldfinger".to_string()).await;
    
    // 3. Assign Task
    let assigned_agent = orchestrator.assign_task(&task_id).await.unwrap();
    assert_eq!(assigned_agent, "agent_007");
    
    let task_after_assign = orchestrator.get_task(&task_id).await.unwrap();
    assert!(matches!(task_after_assign.status, TaskStatus::InProgress));
    
    // 4. Complete Task
    orchestrator.complete_task(&task_id, "Found him in Miami".to_string()).await.unwrap();
    
    let completed_task = orchestrator.get_task(&task_id).await.unwrap();
    assert!(matches!(completed_task.status, TaskStatus::Completed));
    assert_eq!(completed_task.result.unwrap(), "Found him in Miami");
}

#[tokio::test]
async fn test_agent_execution_loop() {
    use std::sync::Arc;
    use brainvault_backend::core::search_engine::{HybridSearchEngine, SearchWeights};
    use brainvault_backend::db::barq_vector::BarqVectorClient;
    
    // Setup Engine
    let client = BarqVectorClient::new();
    let engine = HybridSearchEngine::new(client, SearchWeights { vector_weight: 0.5, bm25_weight: 0.5 });
    
    let orchestrator = Arc::new(AgentOrchestrator::new(Some(Arc::new(engine)), None));
    
    // Register Researcher
    let agent_id = "researcher_1".to_string();
    orchestrator.register_agent(AgentProfile {
        id: agent_id.clone(),
        name: "Sherlock".to_string(),
        agent_type: AgentType::Researcher,
        capabilities: vec![],
    }).await;
    
    // Spawn Loop
    let orch_clone = orchestrator.clone();
    tokio::spawn(async move {
        orch_clone.run_agent_loop().await;
    });
    
    // Submit Task
    let task_id = orchestrator.submit_task("Find secret documents".to_string()).await;
    
    // Assign Task manually for now (or let scheduler picks it up if we trigger it, but scheduler is inside assign_task)
    // Wait, assign_task selects an agent.
    let assigned = orchestrator.assign_task(&task_id).await.unwrap();
    assert_eq!(assigned, agent_id);
    
    // Wait for completion (poll)
    for _ in 0..10 {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        let task = orchestrator.get_task(&task_id).await.unwrap();
        if let TaskStatus::Completed = task.status {
            assert!(task.result.unwrap().contains("Found 0 docs")); // 0 because mock engine returns empty vec
            return;
        }
    }
    
    panic!("Task did not complete in time");
}
