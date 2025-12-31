use brainvault_backend::core::agent_orchestrator::{AgentOrchestrator, AgentProfile, AgentType, TaskStatus};

#[tokio::test]
async fn test_orchestrator_flow() {
    let orchestrator = AgentOrchestrator::new();
    
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
