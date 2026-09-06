# Personal Execution Strategy Handbook — Smart Office Appliance Control System

**Document Governance:** Governed by every document produced before it — the Project Summary, PRD, TRD, UI/UX Documentation, Frontend Documentation, Security Documentation, and CI/CD Documentation. This Handbook does not introduce new product or architecture decisions; it operationalizes what those documents already decided. Tie-break on same-level conflict: most recent revision governs, and any conflict is flagged, never silently resolved.

**A note on what's deliberately absent from this Handbook:** the standard template for this document includes a closing "What's Still Genuinely Pending" section. Per an explicit standing instruction given during this project's document generation, that section — and any "open risks" style content — is omitted from every document in this set, including this one. Every open question that came up while writing these seven documents was resolved with a concrete engineering decision before being written down, not left dangling. This Handbook is a snapshot of a genuinely complete plan, not a plan with gaps papered over as "future work."

---

## 1. How to Use This Document

This Handbook is written for whoever picks up this project and needs to actually build it — primarily Israel, but written assuming no prior context, so it also works if Abdulfatai, Jesutoyin, or someone else entirely needs to understand the plan cold.

**Read in this order on a first pass:** §2 (who decides what) → §3 (which document wins if two disagree) → §5 (the big picture of what depends on what) → §6, the stage relevant to whatever you're about to work on. §4 (environment setup) is a one-time read, done once at the start of the project, then referenced again only when setting up a new machine. §7 and §8 are reference material — skim once, then return to them when something breaks or before a milestone, rather than reading them start to finish now.

**What to skip on a first pass:** you do not need to read every stage in §6 before starting Stage 1 — read the stage you're on, and the one immediately after it, so you know what you're building toward.

## 2. Role & Scope

Three people, two of whom touch the build directly, one of whom does not:

- **Israel** builds the firmware, the backend, and the frontend, working with Antigravity as the coding agent. Israel has final decision authority on any contested technical or product choice — no decision in this project escalates to someone else for approval.
- **Abdulfatai** handles the physical hardware: relay wiring, switch wiring, power supply, and enclosure. Abdulfatai's one binding interface with the software side is the GPIO pin-mapping contract (TRD §6) — once that's agreed, Abdulfatai's work and Israel's firmware work proceed independently.
- **Jesutoyin** is the credited author of the academic submission this project fulfills, and presents/defends it. Jesutoyin has no role in building or testing the system and makes no technical decisions.

**What the coding agent (Antigravity) may decide unilaterally versus must not touch:** Antigravity may make implementation-level decisions consistent with what's already been decided in the TRD, Frontend Documentation, and Security Documentation — variable names, function structure, exact library calls that implement an already-decided approach. Antigravity must never independently alter a decision already made in any of the seven governing documents (e.g. it may not decide to use Nginx instead of Caddy, or switch the database, or change the auth flow) without that change being surfaced to Israel first. Antigravity is explicitly barred from ever creating, reading, or modifying the actual `.env` file (Security Documentation §4) — it may only maintain `.env.template`.

## 3. Foundational Documents & Source-of-Truth Hierarchy

The governing order for this project, most-authoritative first:

**Project Summary → PRD → TRD → UI/UX Documentation & Frontend Documentation → Security Documentation & CI/CD Documentation → this Handbook → `AGENTS.md` / `SKILLS_MANIFEST.md` / `STAGE_PROTOCOLS.md`.**

A downstream document may add detail but may never silently contradict an upstream one. If a decision made while building genuinely needs to override something an upstream document already settled, that override must be written explicitly into both the upstream document and wherever the new decision lives, dated, with a one-line reason — never just quietly built differently from what's on paper. When two documents at the same level in this hierarchy disagree (for instance, if the Security Documentation and the CI/CD Documentation ever imply different secret-handling behavior), the most recently revised one governs, and the conflict gets flagged to Israel rather than silently picked one way.

## 4. Environment & Tooling Setup

**Coding agent:** Antigravity, using PlatformIO Core (confirmed installed, version 6.1.19) for firmware, driven against the `esp32dev` PlatformIO environment.

**Skill install-and-prune procedure** — this section is the teaching-register explanation of the same curation event that `SKILLS_MANIFEST.md` records in terse, operational form.

Two sources were evaluated, per the interrogation that named them: Matt Pocock's `skills` repository (github.com/mattpocock/skills — a real, verified, MIT-licensed collection of workflow-discipline skills, not capability-extension skills), and Anthropic's own published public skills.

*From `mattpocock/skills`, installed via:*
```
npx skills@latest add mattpocock/skills
```
This installer lets you pick specific skills and target agents interactively — select Antigravity as the target, and take only the following:

| Skill | Why it's kept |
|---|---|
| `tdd` | Enforces a red-green-refactor loop — directly useful across firmware, backend, and frontend work under a tight few-weeks timeline where untested code is expensive to debug later |
| `code-review` | The only review this codebase gets before a commit, since there's no second engineer reviewing Israel's code |
| `diagnosing-bugs` | A disciplined debug loop, specifically valuable for the kind of hard-to-reproduce bugs this project will hit — MQTT connectivity flakiness, relay timing issues |
| `research` | The same capability already used repeatedly while writing this document set (e.g. the Kaduna Electric tariff lookup, the Nginx-vs-Caddy comparison) — worth having as a standing tool for the build itself |
| `handoff` | Compacts a long session into a resumable document — valuable for a solo, multi-week build likely to span many separate Antigravity sessions |
| `wizard` | Generates a step-by-step guide for the tasks only a human can do — provisioning the OCI VPS, setting up GitHub Actions secrets, walking the Google OAuth console — exactly the setup work this stage requires |
| `grill-me` (plus `grilling`, the primitive it depends on) | The interview discipline behind this entire document set — useful again the moment a new feature or change needs the same rigor before it's built |
| `writing-for-agents` | Keeps `AGENTS.md` and `STAGE_PROTOCOLS.md` themselves well-written as the project evolves |
| `setup-pre-commit` | Configures pre-commit hooks (Husky/lint-staged/Ruff/ESLint), enforcing formatting and critically blocking accidental secret or `.env` commits |

*Pruned, with reason:* `to-spec`, `to-tickets`, `triage`, `wayfinder`, `implement`, `ask-matt`, and `setup-matt-pocock-skills` are all built around a formal issue-tracker workflow (GitHub Issues, Linear, or local ticket files) — redundant here, since `STAGE_PROTOCOLS.md` already provides the phase-gating a two-person, few-weeks project needs, without the overhead of a separate ticketing discipline. `domain-modeling` and `codebase-design` do the shared-vocabulary and architecture work that this document set has already done in full. `resolving-merge-conflicts` addresses a risk that doesn't really exist here, since Abdulfatai never commits code — Israel is the only committer. `improve-codebase-architecture`, `prototype`, `teach`, `to-questionnaire`, and `wait-what` are all real, working skills, but their value is marginal for a short-lived academic demo, and installing them anyway would be padding, not curation.

*From Anthropic's public skills:* three curated skills are installed into `.agent/` via the `skill-installer` adaptation pipeline:
1. `frontend-design` — styling guidance and aesthetic direction for the React dashboard.
2. `webapp-testing` — Playwright-based automated testing to verify the web dashboard against the live backend during Stages 5 and 8.
3. `pptx` — slide presentation generator, directly serving Stage 9 defense preparation for Jesutoyin's capstone defense presentation.
`docx`, `xlsx`, `pdf`, `pdf-reading`, and `file-reading` were evaluated during the 2026-09-06 gallery audit and omitted as unnecessary for this project's core scope.

**One project-authored skill, filling a real gap:** no suitable off-the-shelf skill exists for this project's specific embedded-firmware conventions — search turned up only generic mega-repositories of over a thousand unreviewed skills, not a focused, trustworthy PlatformIO/ESP32 skill. Rather than install something broad and unvetted, a bespoke skill is authored directly for this project at `.agent/embedded-esp32-conventions/SKILL.md`, capturing the GPIO pin contract (TRD §6), the 1-second relay debounce, the single-authority arbitration model, flash state recovery, and the OTA password handling — so Antigravity applies these house rules consistently every time it touches firmware code, without re-deriving them from the TRD each session.

**No MCP connectors are configured for this project.** GitHub Actions and repository operations are handled through the coding agent's native git integration, not through a separate MCP server — there's no confirmed need for one here.

**Final curated stack, named:** 10 `mattpocock` skills, 3 Anthropic public skills (`frontend-design`, `webapp-testing`, `pptx`), 1 project-authored skill (`embedded-esp32-conventions`) — 14 total, all placed under `.agent/` for Antigravity to reach.

## 5. Master Dependency Graph

The build has one hard fork near the start (firmware and hardware proceed independently once one contract is fixed) and otherwise runs largely linearly, because Israel is the sole person writing all the software:

1. Everything begins with **fixing the GPIO pin contract** (TRD §6) between Israel and Abdulfatai. Nothing else can safely start until this is agreed, because both the firmware's pin assignments and Abdulfatai's physical wiring depend on it.
2. Once fixed, two tracks run in parallel: **Abdulfatai's hardware wiring** proceeds independently from this point on, needing no further software input until final integration. **Israel's software track** continues sequentially: firmware core → MQTT integration → backend core → frontend core → remaining features → deployment.
3. **Hardware integration** (Stage 8) is the point where the two tracks meet again — it cannot start until both Abdulfatai's wiring and Israel's firmware-through-frontend work are individually working.
4. **Defense readiness** (Stage 9) depends on everything before it being complete and integrated — it is the final stage, not a parallel one.

## 6. Stage-by-Stage Build Plan

**Stage 1 — Environment & Tooling Setup.** Produces: a working Antigravity setup with PlatformIO confirmed, the skill stack from §4 installed, an initialized Git repository with `.gitignore` correctly excluding `.env` from its first commit, GitHub Actions workflow skeleton, OCI VPS provisioned with a reserved static public IP (using the `wizard` skill to walk the OCI console steps a human must click through), a free DuckDNS subdomain registered and pointed at that IP (required for Caddy's automatic HTTPS, which cannot issue a certificate for a bare IP address), and a Google OAuth Client ID/Secret created in the Google Cloud Console. Sequenced first because every later stage assumes this exists. Implements: TRD §1 (Build & Runtime Environment), §2 (Core Architecture, re: Caddy's domain requirement), CI/CD Documentation §1–§2.

**Stage 2 — Firmware Core (no networking yet).** Produces: relay output and switch input handling on the agreed GPIO pins, the 1-second debounce, the single-authority arbitration logic, and flash-based state persistence — all testable locally via serial monitor, with no MQTT or Wi-Fi dependency yet. Sequenced before networking so the core hardware-control logic can be verified in isolation, without also debugging network issues at the same time. Implements: TRD §6, PRD FR-6–FR-9, FR-22–FR-24.

**Stage 3 — MQTT Integration.** Produces: a local Mosquitto broker (per TRD's dev/prod parity approach), the ESP32 connecting outbound to it, the three-topic structure with per-device ACLs, QoS 1 delivery, and OTA update capability with its password protection. Sequenced after Stage 2 so networking is added to already-verified hardware logic, not debugged simultaneously with it. Implements: TRD §2, §6.

**Stage 4 — Backend Core.** Produces: the FastAPI application scaffold, the SQLite schema managed via Alembic, the Google OAuth + fallback-password + JWT auth flow with rate limiting, the MQTT subscribe/publish integration, and the WebSocket broadcast mechanism. Sequenced after firmware is MQTT-capable, so the backend has a real device to integrate against rather than a mocked one. Implements: TRD §2–§4, PRD §3.1, Security Documentation §2.

**Stage 5 — Frontend Core.** Produces: the React/TypeScript scaffold, the Login and Password Setup screens, the Dashboard with appliance tiles wired to the backend's REST API and WebSocket connection, and the TanStack Query + Context state layer. Sequenced after the backend exists, so the frontend is built against a real API rather than a guessed one. Implements: UI/UX Documentation §3.1–§3.4, Frontend Documentation §2–§4.

**Stage 6 — Remaining Features.** Produces: scheduling, the activity log screen, admin-only report export, and the energy/cost estimation using the configurable tariff rate (TRD's Data Layer addendum). Sequenced after the core dashboard works, since these all build on the same auth and data layer Stage 4–5 already established. Implements: PRD §3.4–§3.7, UI/UX Documentation §3.5–§3.7.

**Stage 7 — Deployment Pipeline.** Produces: the Docker Compose stack running on the OCI VPS (Caddy, FastAPI, Mosquitto), the full GitHub Actions pipeline (lint, test, build, SSH-based deploy with manual approval), and the actual `.env` file populated by Israel on the VPS from `.env.template`. Sequenced after the application exists to deploy — this stage has nothing to do until Stage 4–6 produce a working application. Implements: CI/CD Documentation in full, TRD §5.

**Stage 8 — Hardware Integration & End-to-End Testing.** Produces: the software stack (now deployed) connected to Abdulfatai's completed physical wiring in the prototype box, verified against the PRD's concrete targets — sub-500ms relay latency, ~1-second dashboard sync, the 20-concurrent-connection load test, and the failure-branch behavior under an induced disconnect. This is the first point where the two parallel tracks from §5 actually meet. Implements: PRD §4 (Non-Functional Requirements) and §7 (Success Metrics) in full.

**Stage 9 — Defense Readiness.** Produces: a rehearsed run-through of the full demo flow, a check that the energy-cost tariff rate is still current against Kaduna Electric's published rate, and a final read-through of every generated document against what was actually built, catching any drift before the defense rather than during it. This is the final stage — everything before it must be working first.

## 7. Edge Cases & Failure Modes

Specific, predictable scenarios, not generic categories:

- **The physical switch is flipped while the dashboard has an in-flight command to the same appliance.** Per the single-authority model (TRD §6), whichever event the firmware's main loop processes second simply wins — there is no special-case handling needed, and none should be added, since adding one would contradict the "most-recent-change-wins" design this project deliberately chose over cross-system timestamp comparison.
- **The ESP32 loses Wi-Fi mid-demo.** The physical switch keeps working (PRD FR-20); the dashboard should show the stale-state indicator (UI/UX §3.4) within roughly the WebSocket's disconnect-detection window — if this indicator doesn't appear promptly during testing, that's a bug in the WebSocket layer, not an acceptable gap, since the entire point of FR-21 is that staleness is visible, not silent.
- **A relay is commanded on/off faster than the 1-second cooldown allows** (e.g. a double-click, or a bug retrying too eagerly). The correct behavior is the change gets queued and applied the moment the cooldown clears (TRD §6) — if testing shows a command being silently dropped instead of queued, that's a firmware bug against the spec, not an acceptable simplification.
- **The tariff rate goes stale before the defense.** Since it's a configurable backend value, not hardcoded (TRD's Data Layer addendum), the fix is a one-line settings change, not a code change — this is exactly why it was built configurable rather than fixed at write time.
- **A GitHub Actions deploy runs while someone is mid-demo.** Given the manual-approval gate (CI/CD Documentation §3), this should never happen unintentionally — but if a deploy is approved and running near a scheduled demo, the safe action is to wait for it to finish rather than interrupt it, since an interrupted deploy can leave the Docker Compose stack in a half-updated state.
- **Abdulfatai's wiring doesn't match the agreed GPIO pin contract.** Because this contract (TRD §6) is treated as fixed the moment it's agreed, any mismatch discovered during Stage 8 integration is a wiring correction, not a firmware change — re-wiring to match the contract is the correct fix, not editing the firmware to match whatever was actually wired, since the firmware's pin assignments are shared with the rest of the codebase's assumptions.

## 8. Quick-Reference Checklists

**Before starting Stage 1:**
- [ ] Antigravity installed and working
- [ ] PlatformIO Core confirmed (`pio --version`)
- [ ] `npx skills@latest add mattpocock/skills` run, the 8 named skills selected, Antigravity chosen as target
- [ ] `frontend-design` copied into `.agent/`
- [ ] Project-authored embedded-conventions skill written and placed in `.agent/`
- [ ] Git repository initialized with `.env` excluded in the very first `.gitignore` commit
- [ ] GitHub Actions workflow skeleton committed
- [ ] OCI Ampere A1 VM provisioned with a reserved static public IP
- [ ] Free DuckDNS subdomain registered and resolving to that IP
- [ ] Google OAuth Client ID/Secret created in the Google Cloud Console

**Before starting Stage 8 (hardware integration):**
- [ ] Firmware, MQTT, backend, and frontend each individually verified working (Stages 2–6 complete)
- [ ] Deployment pipeline live and the application reachable on the OCI VPS (Stage 7 complete)
- [ ] Abdulfatai's wiring complete and checked against the GPIO pin contract
- [ ] `.env` populated on the VPS from `.env.template`, with real secrets

**Before the defense (Stage 9):**
- [ ] Full demo flow rehearsed at least once, start to finish
- [ ] Kaduna Electric Band A tariff rate checked against the currently configured value
- [ ] Sub-500ms relay latency and ~1-second dashboard sync verified live, not just in earlier testing
- [ ] A deliberate failure (e.g. disconnecting the ESP32) tested to confirm the specific-error behavior, not a silent hang
- [ ] Every generated document spot-checked against what was actually built, to catch any drift
