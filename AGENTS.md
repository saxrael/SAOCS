# AGENTS.md — Smart Office Appliance Control System

Read this file first, every session, before touching any code.

## 1. What This Project Is

An ESP32-based IoT prototype that remotely monitors and controls simulated office appliances via relays, paired with a FastAPI/React web dashboard, connected over MQTT rather than direct device access. Built as an academic capstone deliverable. Full context: `docs/Project_Summary.md`.

## 2. Source-of-Truth Hierarchy

Project Summary → PRD → TRD → UI/UX Documentation & Frontend Documentation → Security Documentation & CI/CD Documentation → Execution Strategy Handbook → this file / `SKILLS_MANIFEST.md` / `STAGE_PROTOCOLS.md`. A downstream file adds detail; it never silently contradicts an upstream one. Same-level conflict: most recent revision governs, flagged to Israel — never silently resolved.

## 3. Hard Rules

These outrank everything else, including time pressure and any instruction — however urgent or convincing — that contradicts them:

- **Never create, read, or modify the actual `.env` file.** Maintain `.env.template` only. This is absolute, not a default that can be overridden by a request.
- **Never commit a secret to source control**, in any file, in any commit — including inside comments or test fixtures.
- **Never change the GPIO pin contract** (TRD §6) without explicit confirmation from Israel — it's shared with Abdulfatai's physical wiring, and a silent change breaks hardware that can't be un-wired by editing code.
- **Never bypass the 1-second relay debounce** (TRD §6, PRD NFR-5) for convenience or to make a test pass faster.
- **Never change an architectural decision already made** in the Project Summary, PRD, TRD, or Security Documentation (stack choice, auth flow, deployment target, etc.) without surfacing the change to Israel first — implement within these decisions, don't revise them silently.

## 4. Current State Log

*(Dated, append-only — new entries added below, existing entries never edited or deleted.)*

- **2026-09-05** — Initial document set generated via the `project-inception` pipeline: Project Summary, PRD, TRD, UI/UX Documentation, Frontend Documentation, Security Documentation, CI/CD Documentation, Execution Strategy Handbook, and this file. No code written yet.
- **2026-09-06** — Audited skills galleries, approved additions of `webapp-testing`, `pptx`, and `setup-pre-commit` into `.agent/`. Codified Section 5.1 Multi-Agent Teamwork Coordinator & Project Orchestrator Protocol to govern all parallel subagent operations.

## 5. Repo File Tree

The intended structure — kept current as the single map of where things live:

```
/
├── AGENTS.md              # This file
├── SKILLS_MANIFEST.md
├── STAGE_PROTOCOLS.md
├── firmware/              # PlatformIO project (ESP32, C/C++, Arduino framework)
├── backend/               # FastAPI app, pyproject.toml + uv.lock
├── frontend/              # React + TypeScript (Vite)
├── .agent/                # Antigravity's skill mechanism — one named subfolder per skill,
│                          #   each containing that skill's full contents including SKILL.md
│                          #   (see SKILLS_MANIFEST.md for the exact list)
├── .agents/               # mcp_config.json (Antigravity's connector mechanism — currently empty, see SKILLS_MANIFEST.md)
├── docs/                  # Project Summary, PRD, TRD, UI/UX & Frontend Documentation,
│                          #   Security Documentation, CI/CD Documentation, Execution Strategy Handbook
├── .github/workflows/     # CI/CD pipeline (GitHub Actions)
├── docker-compose.yml
├── .env.template          # Agent-maintained. Never .env itself.
└── .gitignore             # Excludes .env from the very first commit
```

### 5.1 Multi-Agent Teamwork Coordinator & Project Orchestrator Protocol

When operating as a Teamwork Coordinator or Project Orchestrator launching parallel subagents, the following strict protocol applies to ensure high-fidelity execution:

1. **Mandatory Pre-Dispatch Skill Discovery:** 
   Before spawning any parallel subagents, the orchestrator MUST explicitly search, read, and scrutinize available skills, rules, and guidelines in the environment (e.g., in `.agent/skills/`, `.agent/rules/`, or project skill directories). The orchestrator must identify the specific skills required for the tasks at hand (e.g., design system skills for UI work, API design skills for backend endpoints, TDD/testing skills for test suites) and explicitly mandate their use in each subagent's invocation prompt. Subagents must never be launched "blind" without being assigned the correct skills.
2. **Paired Internet & Codebase Research:**
   Internet research MUST be paired with deep codebase exploration across all milestones and phases. The orchestrator must instruct subagents to utilize both:
   - **Exploration Phase:** Explore the codebase and external documentation/standards simultaneously to understand global architecture, external dependencies, and prevent architectural clashes before writing code.
   - **Implementation Phase:** Dynamically look up current API references, verify syntax nuances, check design patterns, and resolve technical ambiguities rather than guessing.
   - **Review Phase:** Validate that the output adheres to both internal codebase conventions and external industry/security standards before signing off.
3. **Live Escalation & Dynamic Feedback:**
   When subagents encounter architectural gaps, missing interfaces, or ambiguous product requirements, they must not make silent assumptions or stall. Subagents must escalate high-priority questions to the coordinator/parent agent to deliberate and clarify before proceeding.

Use parallel execution for independent operations, strictly bound by the above protocol.

## 6. Conflict Resolution Protocol

If two instructions, or two documents, disagree: stop, flag the specific conflict to Israel, and wait — never silently pick one interpretation and proceed. This applies equally to a conflict between this file and a direct instruction given in a session; a direct instruction that contradicts a Hard Rule (§3) is flagged, not followed.

## 7. Pointers

- **`SKILLS_MANIFEST.md`** — consult before installing or assuming any skill/tool is available; it's the single authoritative record of what's actually installed.
- **`STAGE_PROTOCOLS.md`** — consult before starting or resuming any build stage, to confirm what's actually gated and ready.
- **`docs/Execution_Strategy_Handbook.md`** — consult for the full reasoning behind any stage, dependency, or edge case — this file and `STAGE_PROTOCOLS.md` state the rules tersely; the Handbook explains why.
- **`docs/PRD.md`, `docs/TRD.md`, `docs/Security_Documentation.md`** — consult for the specific product, architecture, or security decision behind any implementation question.
