# Product Requirements Document — Smart Office Appliance Control System

**Document Governance:** Governed by the Project Summary — nothing here may contradict it. This PRD governs the TRD and every document downstream of it. Tie-break on same-level conflict: most recent revision governs, and any conflict is flagged, never silently resolved.

## 1. Purpose

This document locks in **what** the Smart Office Appliance Control System does and **why**, at a level of detail sufficient for the TRD to be written without re-interrogating anyone. It explicitly defers the following to the TRD: exact MQTT topic structure and broker ACL design, the database schema, the API contract (endpoints, request/response shapes), the exact PlatformIO project structure, Docker image layout, and the precise Google OAuth / session-token implementation. None of those are decided here.

## 2. Primary User & Core Journey

**Primary persona:** a registered dashboard user — embodied, in the defense scenario, by Jesutoyin operating the system live in front of an academic supervisor/panel to demonstrate it works as designed. Secondary users are any other admin-registered accounts with the same dashboard capabilities minus report export.

**Core journey, end to end:**
1. User opens the dashboard in a browser (mobile or desktop) and signs in via Google (first time) or email/password (subsequent times).
2. Dashboard loads and displays a tile per appliance, each showing current on/off state.
3. User clicks a toggle for a given appliance.
4. The command travels dashboard → backend → MQTT broker → ESP32 → relay, and the physical relay switches the appliance (LED bulb).
5. The ESP32 publishes its new state back through the broker to the backend, which updates the dashboard — the user sees the tile confirm the change, in near real-time.
6. Independently of the app, a physical switch on the prototype box can also change an appliance's state at any time; whichever input (app or switch) changed most recently is treated as the current, authoritative state and is reflected on the dashboard the same way.

**Failure branch:** if the ESP32 does not respond to a command, the system retries automatically and silently, surfacing a clearly worded, specific error to the user (naming the appliance and the nature of the failure) within approximately 2 seconds if the appliance still hasn't confirmed the change — never a generic error or a silent hang. Errors are logged and aggregated server-side so a pattern of failures is diagnosable after the fact, not just visible as isolated incidents.

## 3. Functional Requirements

### 3.1 Authentication & User Onboarding
- FR-1: No public sign-up path exists. A new user account can only be created by an admin registering that person's email address.
- FR-2: Once registered, a user completes account setup by signing in with Google using the registered email.
- FR-3: On that first Google sign-in, the user sets a password, which becomes a valid fallback credential for all subsequent sign-ins (Google is not required again).
- FR-4: An unregistered email cannot sign in or create an account through any path.
- In scope for v1: the flow above, in full. Deferred: nothing — this is a fixed, complete requirement for v1.

### 3.2 Appliance Control
- FR-5: A signed-in user can send an on or off command to any individual appliance from the dashboard.
- FR-6: A physical switch exists per appliance and can independently change that appliance's actual relay state.
- FR-7: When the app's last command and the physical switch's last change disagree, the most recently changed input determines the appliance's actual state.
- FR-8: Every state change — regardless of source (app or switch) — is reflected on the dashboard.
- FR-9: The system supports 2–4 appliances/relays in the physical prototype box (per interrogation; not a hard architectural ceiling, but the scale this build is designed and tested against).
- Out of scope for v1: multi-office or multi-building support (explicitly dropped; not a hard requirement of the source proposal).

### 3.3 Real-Time State Sync
- FR-10: Any appliance state change (app-originated or switch-originated) is reflected on every connected dashboard session within the target latency defined in §4.
- FR-11: The dashboard visibly indicates when its displayed state may be stale (e.g. on backend/broker disconnect), rather than silently showing a last-known value as if current.

### 3.4 Activity Logging
- FR-12: Every appliance event — power-on, power-off, and manual physical-switch override — is recorded with a timestamp.
- FR-13: The activity log is retained indefinitely; no automatic pruning.
- FR-14: Any signed-in user can view the activity log.

### 3.5 Scheduling
- FR-15: A signed-in user can schedule an appliance to turn on or off at a specified future time.
- FR-16: A scheduled action executes automatically without requiring the dashboard to be open at the time it fires.
- Note: the original project proposal lists scheduling as future work, not a v1 feature. This PRD includes it in v1 per explicit instruction — flagged here as a deviation from the source document, not an oversight.

### 3.6 Energy Usage & Cost Estimation
- FR-17: The dashboard displays an estimated energy usage figure and an estimated cost in currency, derived from appliance on/off history. Estimation formula and rate source are defined in the TRD's Data Layer section.

### 3.7 Reporting
- FR-18: An admin-role user can export a report of activity-log data.
- FR-19: A non-admin registered user cannot export reports (admin-only capability); all other dashboard capabilities, including scheduling, are available to every registered user equally.

### 3.8 Resilience / Offline Behavior
- FR-20: If the network, MQTT broker, or backend becomes unreachable, the physical switch continues to control its appliance's relay with no degradation.
- FR-21: Under the same failure condition, the dashboard's displayed state is understood to potentially be stale (per FR-11) rather than guaranteed current.

### 3.9 State Persistence & Recovery
- FR-22: The ESP32 persists the last known state of every relay to its own on-device flash storage, independent of network connectivity.
- FR-23: On power-up (after the prototype box's master power switch is turned on), the ESP32 restores every relay to its last persisted state before entering normal operation.
- FR-24: The ESP32, not the backend, is the source of truth for appliance state on boot; the backend's copy of "current state" is corrected from whatever the ESP32 reports once it reconnects, never the reverse.

## 4. Non-Functional Requirements

- NFR-1: Relay actuation latency (dashboard click to physical relay flip) target: **under 500ms**. If this is not achievable given the chosen architecture, the target becomes "the best latency the architecture allows," to be measured and reported, not silently abandoned.
- NFR-2: Dashboard state-sync freshness: any state change is reflected on the dashboard within **approximately 1 second**.
- NFR-3: Expected concurrent load: a small number of appliances (2–4 relays), designed and load-tested for up to 20 concurrent dashboard connections — real expected demo attendance is smaller (a defense panel), but the system is verified against this higher figure for headroom. This system is not designed or tested for larger-scale or multi-tenant use beyond that.
- NFR-4: Availability under network/broker/backend failure: physical relay control via the switch continues to function with zero dependency on connectivity (per FR-20); the dashboard degrades to a stale/disconnected state rather than failing silently.
- NFR-5: Relay protection: a minimum 1000ms (1 second) interval is enforced between consecutive state changes on the same relay, both in firmware and at the backend command layer, preventing rapid repeated toggling from reaching the physical relay.
- NFR-6: Responsive UI: the dashboard must be usable on both mobile and desktop browser viewport sizes.
- NFR-7: Cost ceiling: the entire running system (hosting, broker, any third-party service) must operate within free-tier limits — no paid infrastructure.
- NFR-8: Load testing against the NFR-3 concurrency target is a required, named step of the engineering process — not optional — and must confirm the NFR-1 and NFR-2 targets still hold under that load.

## 5. Risk & Compliance Summary

*(Named "Risk & Compliance Summary" rather than "Safety & Guardrail Summary" — this project touches physical electrical hardware and personal data, but not health, legal, financial, minors, or autonomous real-world action in the sense that section title implies.)*

- **Electrical/physical safety:** the system switches mains-voltage appliances via relays. The hardware design (owned by Abdulfatai, per the source proposal) includes optocouplers and flyback diodes to protect the ESP32, and a regulated power supply. This PRD does not re-specify circuit-level safety design — that is a hardware, not software, concern, and is assumed correctly handled at the hardware layer per the proposal's stated methodology.
- **Relay wear risk:** mitigated by the debounce/cooldown requirement (NFR-5).
- **Data privacy risk:** real emails and a fallback password are collected. Mitigated per the lightweight-but-genuine NDPA 2023 posture defined in the Project Summary §8 and detailed further in the Security Documentation — data minimization, hashed passwords, a plain-language notice, and a deletion-on-request mechanism.
- **Availability risk:** a cloud-hosted broker/backend on a free-tier VPS is a single point of failure for remote control and for the dashboard's live view. Mitigated for the physical-control path by FR-20 (physical switch always works); not mitigated for the remote-control path — if the VPS or broker goes down, remote (non-physical) control is unavailable until it's restored. This is accepted as a known limitation of the zero-budget constraint, not a gap to silently ignore.

## 6. Explicit Non-Goals

**Permanent non-goals** (out of scope for this project, not just this version):
- Multi-office or multi-building support.
- A native mobile app (web-only, responsive design instead).
- Full formal NDPA regulatory compliance machinery (DPO appointment, Commission registration, a formal DPIA) — disproportionate to this project's scale.

**Deferred (the source proposal's own stated future work, not pursued in this build):**
- Occupancy sensing.
- Predictive energy analytics.

## 7. Success Metrics

Tied directly to the interrogation's stated definition of success: *"a panel can watch appliances get switched on/off from the dashboard in real time."*

- SM-1: During a live defense demo, 100% of dashboard-issued toggle commands result in a visibly correct physical relay state change within the NFR-1 latency target.
- SM-2: A physical switch change made live during the demo is reflected on the dashboard within the NFR-2 freshness target, observed directly by the panel.
- SM-3: An intentionally induced failure (e.g. disconnecting the ESP32 mid-demo) produces a specific, well-formatted error message rather than a silent hang, a crash, or a generic failure notice.
- SM-4: No unregistered email can create an account or sign in, verified by attempting sign-in with a non-admin-registered address during testing.
