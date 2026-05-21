You are running a Foundry Symphony task.

Task ID: 6a646251-f931-4480-8806-c0ff8ea88536
Title: Full fleet audit: everythingrated
Project: everythingrated
Priority: high
Current status: in_progress

Description:
Audit everythingrated end to end after task-board reset.

Acceptance criteria:
- GitHub repository is connected, reachable, on the expected default branch, and local checkout matches/pulls cleanly from https://github.com/sarthakagrawal927/everythingrated.git.
- GitHub Actions/required workflows are present where expected and latest main/default-branch runs are green or explicitly explained.
- Cloudflare deployment target is identified: Workers, Pages, custom domain, routes, D1/KV/R2/Queues/AI bindings as applicable.
- Production URL and health/smoke endpoints respond successfully; no current failed deployment is the latest active deployment.
- Auth flow works where the product requires auth, including OAuth/session callback URLs and local auth bypass where intended.
- App runs locally from the fleet checkout with documented command; env gaps are listed without exposing secrets.
- Any failing deploy, broken auth, missing secret, failing smoke, or workflow drift is captured as a follow-up Symphony task with evidence links.

Project description: Multi-axis ratings platform for rating things across aspect-specific directories.

Decision / Handoff
Agent assignment: gemini
Reason: Broad fleet audit with mostly verification/synthesis work.
Assigned by Codex on 2026-05-16. Status remains todo until the assigned agent actually starts work.


Execution contract:
- Treat the task row as the source of truth.
- Work in the project context above.
- Use this repository's AGENTS.md and WORKFLOW.md as operating guidance.
- Keep changes scoped to the task.
- Verify before claiming completion.
- When done, report changed files, evidence, and remaining risk so the task can be moved to Done.
