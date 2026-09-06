# Project Summary — Smart Office Appliance Control System

**Document Governance:** This is the most authoritative document in this project's set. It governs the PRD, TRD, all specialized architecture docs, Security & CI/CD docs, the Execution Strategy Handbook, and the coding-agent files. Nothing downstream may silently contradict what's stated here — an override must be written explicitly in both documents, dated, with a one-line reason. Tie-break rule for same-level conflicts: most recent revision governs, and the conflict is flagged, never silently resolved.

---

## 1. Project Identity

- **Name:** Smart Office Appliance Control System
- **Tagline:** Remote, near-real-time monitoring and control of office appliances through an ESP32-based IoT hardware layer and a Python/React web dashboard.
- **Project type:** Academic capstone project — a working IoT hardware + software prototype, built to demonstrate the design and objectives of a university project proposal.
- **Current stage:** Greenfield. Nothing has been built yet; this document set is the first artifact produced.

## 2. The Problem

Office appliances — lighting, fans, air conditioners — are routinely left running when no one is present: overnight, over weekends, after hours. Facility managers have no way to check appliance status remotely, so waste goes uncorrected until someone physically inspects the space. This is a real, documented problem in office energy management (source: the underlying academic proposal, *Design and Implementation of a Smart Office Appliance Control System*, ABU Dept. of Computer Science, April 2026).

**This build is a demonstration of that problem, not a live deployment.** The system runs in a physical prototype box wired with real relays and LED bulbs to simulate an office, built to be defended academically rather than installed in a working office.

## 3. The Solution

An ESP32 microcontroller drives relay modules that switch simulated appliances (LED bulbs) on and off, both from physical switches wired to the box and from remote commands sent through a web dashboard. The ESP32 never accepts inbound network connections — since it may run on a mobile hotspot rather than a fixed office LAN, it connects outbound to a cloud-hosted MQTT broker, which a Python (FastAPI) backend also connects to; commands and state updates flow through that broker in both directions. A React-based web dashboard, reachable from mobile or desktop browsers, lets an admin-registered, Google-authenticated user view live appliance state, issue on/off commands, schedule appliances, and review a time-stamped activity log — all synced to within about one second of any change, whether that change came from the app or from someone flipping a physical switch on the box.

## 4. Core Features

1. Admin-gated user onboarding: only an admin can register a new user's email; that user then verifies via Google sign-in and sets a fallback password for future logins.
2. Remote on/off control of each simulated appliance from the web dashboard.
3. Live appliance status that reflects both dashboard commands and physical switch changes, synced in near real-time (target: under 500ms, best-effort).
4. Automatic conflict resolution between the physical switch and the app: whichever input changed most recently determines the appliance's actual state, and that state is always reflected back to the dashboard.
5. Time-stamped activity log of every power-on, power-off, and manual-override event.
6. Scheduling: appliances can be set to turn on or off at a specified time.
7. Estimated energy usage and cost (in currency) shown on the dashboard.
8. Exportable usage reports — admin-only capability.
9. Resilient offline behavior: physical switches keep working even if Wi-Fi, the MQTT broker, or the backend is unreachable; only the dashboard's live view is affected.
10. Automatic state recovery: the ESP32 persists the last known state of every relay to its own flash and restores it on power-up, without depending on the network.

## 5. Target Platform

- **User-facing:** a responsive web dashboard, used on both mobile and desktop browsers. No native mobile app.
- **Physical hardware:** a self-contained prototype box — ESP32 dev board, relay modules, LED bulbs standing in for appliances, physical toggle switches per appliance, standard parts throughout (no custom or unusual hardware).
- **Hard platform constraint:** the ESP32 must operate correctly on a mobile personal hotspot, not just a fixed office Wi-Fi network — this rules out any design relying on the ESP32 having a stable local IP or accepting inbound connections.

## 6. System Architecture at a Glance

| Component | Role | Connects to |
|---|---|---|
| ESP32 firmware (C/C++, Arduino framework, built via PlatformIO from within Antigravity) | Reads physical switches, drives relays, persists state to flash, resolves switch/app conflicts | Outbound MQTT connection only, to the broker |
| Mosquitto MQTT broker (self-hosted) | Message bus between device and backend — device publishes state, subscribes to commands | ESP32 (outbound from device) and FastAPI backend |
| FastAPI backend (Python, async) | Publishes commands, subscribes to state updates, owns auth/users/schedules/logs, serves the API to the frontend | Mosquitto broker, SQLite, React frontend |
| SQLite database | Stores user accounts, schedules, and the full historical activity log | FastAPI backend only |
| React frontend | Dashboard UI: toggles, live status, log, scheduling, reports | FastAPI backend, over HTTPS |
| OCI Ampere A1 VPS (Docker) | Hosts the FastAPI backend and Mosquitto broker as containers, publicly reachable | All of the above except the physical ESP32 hardware |

Full detail — API contracts, schemas, deployment specifics — lives in the TRD, not here.

## 7. Data Strategy

*(Renamed from "Data & Localization Strategy" — no meaningful language/localization dimension; the dashboard is English-only and no multilingual requirement was raised.)*

Data handled: user account records (email, hashed fallback password, Google identity reference), appliance state and its full change history, and schedules. All of it lives in a single SQLite database on the OCI VPS — no third-party data processor, no cross-border transfer beyond normal cloud hosting on OCI's infrastructure. All history is retained indefinitely; no pruning policy, given the small expected data volume.

## 8. Legal & Regulatory Posture

Nigeria's Data Protection Act (NDPA) 2023 applies in principle, since real emails and passwords are collected from real people, even at small scale. Given this is a zero-budget, few-weeks academic prototype with a handful of registered users, the applicable posture is **lightweight but genuine**, not full formal regulatory machinery (no DPO appointment, no Commission registration, no DPIA — those apply to data controllers/processors of major importance, which this project is not). Concretely: data minimization, a plain-language notice of what's collected and why, secure storage (hashed passwords, no plaintext secrets), and a real mechanism to delete a user's data on request. Full detail in the Security Documentation.

## 9. Team & Roles

- **Israel** — builds the ESP32 firmware and the full web application (backend + frontend). Holds final decision authority on any contested technical or product choice.
- **Abdulfatai** — handles the physical hardware wiring (relays, switches, power supply, enclosure).
- **Jesutoyin Adeshina (U21CS1119)** — the credited author of record for the academic submission. Presents and defends the project; has no role in building or testing it.

## 10. Context & Constraints

- **Academic context:** defended under general project-defense norms (functionality, documentation, ability to answer questions) — no named scoring rubric exists. The five objectives (i–v) stated in the original written proposal must remain visibly met, even where the underlying technology has changed from what the proposal specifies.
- **Known deviations from the written proposal**, flagged for awareness at defense time: backend is Python/FastAPI, not Node.js/Express; firmware is built via PlatformIO from Antigravity, not manually in the Arduino IDE; scheduling — listed as *future work* in the proposal's conclusion — is included in this build's v1 scope; multi-office/multi-building support, mentioned only as problem-framing in the proposal, is explicitly out of scope.
- **Budget:** zero/near-zero. Everything must run on free tiers (OCI Ampere A1 free tier, self-hosted broker rather than a paid MQTT service).
- **Timeline:** no fixed external deadline; working toward a rough target of a few weeks.
- **Hardware constraints:** none beyond standard parts — a standard ESP32 dev board, standard relay modules, a breadboard/prototype enclosure.
