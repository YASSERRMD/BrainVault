---
description: Git branching workflow for committing and merging tasks
---

# Git Workflow Instructions

**User Name:** YASSERRMD  
**Commit Frequency:** Commit for each small task

## Branching Strategy

For each phase/task, follow these steps:

### 1. Create a New Branch
```bash
git checkout -b <branch-name>
```

### 2. Push the New Branch to GitHub
```bash
git push -u origin <branch-name>
```

### 3. Perform the Task and Commit Changes Locally
```bash
git add -A && git commit -m "..."
```

### 4. Push the Task Commit to the Remote Branch
```bash
git push origin <branch-name>
```

### 5. Merge the Branch into Main
```bash
git checkout main && git merge <branch-name> -m "..."
```

### 6. Push Main to GitHub
```bash
git push origin main
```

### 7. Delete the Local Branch
```bash
git branch -d <branch-name>
```

### 8. Delete the Remote Branch
```bash
git push origin --delete <branch-name>
```

---

## Workflow Benefits

This workflow ensures:

- ✅ **Clean branch history** with one branch per task
- ✅ **Remote backup** before merging
- ✅ **Clean deletion** of both local and remote branches after merge
- ✅ **`main` is always pushed** after each merge

---

## Branch Naming Convention

Use descriptive branch names that indicate the phase and task:

- `phase-1a-initial-setup`
- `phase-2b-feature-name`
- `fix/issue-description`
- `feat/new-feature`

---

## Quick Reference Commands

### Full Workflow (Copy-Paste Ready)

Replace `<branch-name>` and `<commit-message>` with your values:

```bash
# Create and push new branch
git checkout -b <branch-name>
git push -u origin <branch-name>

# After completing work, commit and push
git add -A && git commit -m "<commit-message>"
git push origin <branch-name>

# Merge to main and cleanup
git checkout main && git merge <branch-name> -m "Merge <branch-name> into main"
git push origin main
git branch -d <branch-name>
git push origin --delete <branch-name>
```
