# SKILLS_MANIFEST.md — Smart Office Appliance Control System

## 1. The Systems in Use, Not to Be Confused

This project's coding agent is **Antigravity**. It has two distinct systems that must not be confused with each other:

- **Skill mechanism:** each skill lives in its own named subfolder under `.agent/` — **singular** — containing that skill's full contents, including its `SKILL.md` (e.g. `.agent/tdd/SKILL.md`, not a bare `.agent/tdd.md`).
- **Connector mechanism:** `mcp_config.json`, either global at `~/.gemini/config/mcp_config.json` or workspace-local at `.agents/mcp_config.json` — **plural**.

**These are not the same folder.** `.agent` (skills) and `.agents` (connector config) differ by exactly one letter and serve entirely different purposes — a file placed in the wrong one silently does nothing. Double-check the folder name every time, not just the file name.

## 2. Final Stack

| Tool | Type | Where it lives | Status |
|---|---|---|---|
| `tdd` | Skill (mattpocock) | `.agent/tdd/` | Installed & curated — 2026-09-05 |
| `code-review` | Skill (mattpocock) | `.agent/code-review/` | Installed & curated — 2026-09-05 |
| `diagnosing-bugs` | Skill (mattpocock) | `.agent/diagnosing-bugs/` | Installed & curated — 2026-09-05 |
| `research` | Skill (mattpocock) | `.agent/research/` | Installed & curated — 2026-09-05 |
| `handoff` | Skill (mattpocock) | `.agent/handoff/` | Installed & curated — 2026-09-05 |
| `wizard` | Skill (mattpocock) | `.agent/wizard/` | Installed & curated — 2026-09-05 |
| `grill-me` | Skill (mattpocock) | `.agent/grill-me/` | Installed & curated — 2026-09-05 |
| `grilling` | Skill (mattpocock, dependency of `grill-me`) | `.agent/grilling/` | Installed & curated — 2026-09-05 |
| `writing-for-agents` | Skill (mattpocock) | `.agent/writing-for-agents/` | Installed & curated — 2026-09-05 |
| `setup-pre-commit` | Skill (mattpocock) | `.agent/setup-pre-commit/` | Installed & curated — 2026-09-06 |
| `frontend-design` | Skill (Anthropic public) | `.agent/frontend-design/` | Installed & curated — 2026-09-05 |
| `webapp-testing` | Skill (Anthropic public) | `.agent/webapp-testing/` | Installed & curated — 2026-09-06 |
| `pptx` | Skill (Anthropic public) | `.agent/pptx/` | Installed & curated — 2026-09-06 |
| `embedded-esp32-conventions` | Skill (project-authored) | `.agent/embedded-esp32-conventions/` | Installed & curated — 2026-09-06 |
| — | MCP connectors | `.agents/mcp_config.json` | None configured — no confirmed need for this project |

This table is authoritative. If a skill exists in `.agent/` that isn't listed here, that's a defect — remove it or add it to this table, don't leave it unaccounted for.

## 3. Install & Verification Procedure

**Completed record**, not a plan — see `docs/Execution_Strategy_Handbook.md` §4 for the reasoning behind each choice.

1. Ran `npx skills@latest add mattpocock/skills`, targeting Antigravity, selecting: `tdd`, `code-review`, `diagnosing-bugs`, `research`, `handoff`, `wizard`, `grill-me`, `grilling`, `writing-for-agents`, and `setup-pre-commit`.
2. Downloaded Anthropic's public skills from `anthropics/skills` using the `skill-installer` pipeline, selecting: `frontend-design` (UI guidance), `webapp-testing` (Playwright automated frontend test harnesses for Stages 5/8), and `pptx` (presentation deck generator for Stage 9 defense preparation).
3. Authored `embedded-esp32-conventions` directly as a new project-specific skill in `.agent/embedded-esp32-conventions/` using `master-skill-creator` principles, encoding the locked GPIO pin contract, the 1-second debounce, the single-authority arbitration model, flash state recovery, and OTA password handling from TRD §6.
4. Ran full 6-point compatibility scans on all downloaded skills (neutralizing agent-specific tool names, adjusting path structures, validating YAML frontmatter, confirming script portability) before placement into `.agent/`.
5. Pruned (never installed): `to-spec`, `to-tickets`, `triage`, `wayfinder`, `implement`, `ask-matt`, `setup-matt-pocock-skills` (redundant with `STAGE_PROTOCOLS.md`'s own phase-gating), `domain-modeling`, `codebase-design` (redundant with work already done in this document set), `resolving-merge-conflicts` (no realistic merge-conflict risk, since only Israel commits code), `improve-codebase-architecture`, `prototype`, `teach`, `to-questionnaire`, `wait-what` (marginal value for this project's scope), `docx`, `xlsx`, `pdf` (omitted per curation audit).
6. Verified the pruned state via a manual `.agent/` directory listing after installation, confirming exactly the 14 entries in §2's table and nothing else.

## 4. Rule for the Agent

Every install above has been verified and curated as of 2026-09-06. Nothing further gets installed — from `mattpocock/skills`, Anthropic's public skills, or anywhere else — without explicit direction from Israel. If a task seems to need a capability not covered by §2's table, say so and ask, rather than installing something new to fill the gap.
