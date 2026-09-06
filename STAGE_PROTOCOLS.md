# STAGE_PROTOCOLS.md — Smart Office Appliance Control System

Strict sequential phase-gating for the coding agent. Do not begin a stage until its gate condition is met. Full reasoning for every stage lives in `docs/Execution_Strategy_Handbook.md` §6 — this file states the rules tersely; consult the Handbook for why.

## 1. Master Resource/Data Inventory

| Resource | Source | Status |
|---|---|---|
| ESP32 dev board(s) | Hardware procurement (Abdulfatai) | Assumed acquired/acquirable — standard part, no unusual sourcing constraint |
| Relay modules (2–4) | Hardware procurement (Abdulfatai) | Same as above |
| LED bulbs (simulate appliances) | Hardware procurement (Abdulfatai) | Same as above |
| Physical toggle switches (2–4) | Hardware procurement (Abdulfatai) | Same as above |
| Prototype enclosure/box | Hardware procurement (Abdulfatai) | Same as above |
| OCI Ampere A1 VM (always-free tier), with a reserved static public IP | Oracle Cloud Infrastructure | Provisioned in Stage 1 |
| Free DuckDNS subdomain, pointed at the OCI VM's static IP | DuckDNS (free) | Registered in Stage 1 — required for Caddy's automatic HTTPS, which cannot issue a certificate for a bare IP |
| GitHub repository, with `.gitignore` excluding `.env` from its first commit | GitHub | Created in Stage 1 |
| Google OAuth Client ID & Secret | Google Cloud Console | Created in Stage 1, consumed in Stage 4 |
| GitHub Actions encrypted repository secrets (SSH deploy key, VM host, JWT signing key, OAuth secret, MQTT credential) | GitHub | Configured in Stage 1, consumed in Stage 7 |

## 2. Cross-Cutting Rules

- The GPIO pin contract (TRD §6) is fixed the moment it's agreed in Stage 1 setup — no stage may alter it without explicit confirmation from Israel.
- The 1-second relay debounce (TRD §6) applies in every stage that touches relay control — never bypassed for test convenience.
- No stage creates, reads, or modifies `.env` — only `.env.template`, per `AGENTS.md` §3.
- No stage commits a secret to source control, in any form.
- Every stage's output is testable in isolation before the next stage begins — a stage is not "done" until its own verification passes, not just when code is written.

## 3. Master Dependency Graph

Mirrored from `docs/Execution_Strategy_Handbook.md` §5:

1. Stage 1 blocks everything.
2. From Stage 1, two independent tracks run in parallel: Hardware (Abdulfatai, outside this file's scope) and Software (Stages 2 → 3 → 4 → 5 → 6 → 7, strictly sequential — Israel is the sole implementer, so there is no parallelism within the software track).
3. Stage 8 is gated on **both** tracks being individually complete.
4. Stage 9 is gated on Stage 8.

## 4. Stage-Specific Protocols

**Stage 1 — Environment & Tooling Setup**
- Gate to begin: none — this is the entry point.
- Gate to exit: Antigravity + PlatformIO confirmed; `SKILLS_MANIFEST.md`'s 14-entry stack installed and verified; Git repo initialized with `.env` excluded from the first commit; GitHub Actions workflow skeleton committed; OCI VM provisioned with a reserved static IP; DuckDNS subdomain registered and resolving to that IP; Google OAuth Client ID/Secret created; GitHub Actions secrets configured.
- Why: Handbook §6, Stage 1.

**Stage 2 — Firmware Core (no networking)**
- Gate to begin: Stage 1 exit met; GPIO pin contract agreed with Abdulfatai.
- Gate to exit: relay output, switch input, debounce, arbitration, and flash persistence all verified via serial monitor, with zero MQTT/Wi-Fi dependency.
- Why: Handbook §6, Stage 2.

**Stage 3 — MQTT Integration**
- Gate to begin: Stage 2 exit met.
- Gate to exit: ESP32 connects outbound to a local Mosquitto broker; three-topic structure with per-device ACLs live; QoS 1 confirmed; OTA update tested at least once with password protection active.
- Why: Handbook §6, Stage 3.

**Stage 4 — Backend Core**
- Gate to begin: Stage 3 exit met.
- Gate to exit: FastAPI scaffold running; Alembic-managed SQLite schema in place; Google OAuth + fallback password + JWT (with rate limiting) working end-to-end; MQTT subscribe/publish integrated; WebSocket broadcast verified against the Stage 3 device.
- Why: Handbook §6, Stage 4.

**Stage 5 — Frontend Core**
- Gate to begin: Stage 4 exit met.
- Gate to exit: React/TypeScript scaffold running; Login, Password Setup, and Dashboard screens working against the real backend API and WebSocket (not a mock).
- Why: Handbook §6, Stage 5.

**Stage 6 — Remaining Features**
- Gate to begin: Stage 5 exit met.
- Gate to exit: scheduling, activity log, admin-only report export, and energy/cost estimation (using the configurable tariff rate) all implemented and individually tested.
- Why: Handbook §6, Stage 6.

**Stage 7 — Deployment Pipeline**
- Gate to begin: Stage 6 exit met.
- Gate to exit: Docker Compose stack (Caddy, FastAPI, Mosquitto) running on the OCI VM under the DuckDNS domain with valid HTTPS; GitHub Actions pipeline live (lint → test → build → SSH deploy, manual-approval gated); `.env` populated on the VM by Israel from `.env.template`.
- Why: Handbook §6, Stage 7.

**Stage 8 — Hardware Integration & End-to-End Testing**
- Gate to begin: Stage 7 exit met AND Abdulfatai's hardware track independently complete.
- Gate to exit: sub-500ms relay latency verified live; ~1-second dashboard sync verified live; 20-concurrent-connection load test passed without breaking either target; induced-disconnect failure branch confirmed to produce the specific error, not a silent hang.
- Why: Handbook §6, Stage 8.

**Stage 9 — Defense Readiness**
- Gate to begin: Stage 8 exit met.
- Gate to exit: full demo flow rehearsed start to finish; Kaduna Electric tariff rate checked against the configured value; every generated document spot-checked against what was actually built.
- Why: Handbook §6, Stage 9.

## 5. Environment/Constraint Notes

- **Zero-budget constraint** applies to every stage: no paid infrastructure, no paid domain (DuckDNS free tier, not a purchased domain), no paid MQTT broker (self-hosted Mosquitto only).
- **Connectivity constraint**: the ESP32 must operate correctly on a mobile personal hotspot, not only office Wi-Fi — Stage 3 testing must include at least one hotspot-connected test, not local Wi-Fi only.
- **No staging environment exists** — Stage 7's deploy target is production directly; there is no intermediate environment to test a deploy against before it's live.
- **Two-person team, one committer**: Israel is the only person who writes and commits code across Stages 2–7; Abdulfatai's track has no code dependency until Stage 8.
