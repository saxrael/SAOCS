# UI/UX Documentation — Smart Office Appliance Control System

**Document Governance:** Governed by the Project Summary, PRD, and TRD — nothing here may contradict any of them. Read alongside the Frontend Documentation, which covers implementation; this document covers design and flow decisions. Tie-break on same-level conflict: most recent revision governs, and any conflict is flagged, never silently resolved.

## 1. Personas → Flows Mapping

| Persona | Role | Flows used |
|---|---|---|
| Registered user (embodied by Jesutoyin during the defense demo) | Non-admin | Sign-in, appliance toggle, viewing live status, viewing activity log, scheduling |
| Admin user | Admin | Everything a registered user can do, plus registering new users and exporting reports |

There is no anonymous/public persona — no flow in this system is reachable without an account, per PRD FR-1.

## 2. Information Architecture

Single-page application, client-side routed. Screen inventory:

- **Login** — Google sign-in button, plus an email/password fallback form.
- **First-Time Password Setup** — shown once, immediately after a user's first successful Google sign-in.
- **Dashboard** (home) — one tile per appliance, showing live on/off state.
- **Schedule** — list of existing schedules, plus a form to create a new one.
- **Activity Log** — timestamped history of every appliance event.
- **Reports** — admin-only. Report export control.
- **Manage Users** — admin-only. Form to register a new user's email.

Navigation: a persistent top or side nav listing Dashboard, Schedule, Activity Log — with Reports and Manage Users appearing only for admin accounts. A global, persistent connection-status indicator (per Accessibility/Connectivity Targets, §4) is visible from every screen, not just the Dashboard.

## 3. Core Flows, at Wireframe Level

Each flow below traces directly to the PRD's Core Journey and Functional Requirements — none are invented here.

**3.1 Sign-in (PRD §2, steps 1–2)**
1. Login screen loads. User taps "Sign in with Google" or enters email/password.
2. On first-ever sign-in: Google flow only, then routed to First-Time Password Setup.
3. On subsequent sign-ins: either path works; successful auth routes to Dashboard.
4. Failure (wrong password, unregistered email, Google error): an inline, specific error message on the Login screen — never a silent failure or generic "something went wrong."

**3.2 Appliance Toggle (PRD §2, steps 3–5; FR-5, FR-8, FR-10)**
1. Dashboard shows an appliance tile with its current state and a toggle control.
2. User taps the toggle. The tile immediately enters a brief "pending" visual state (not a false "already changed" state — the PRD's real latency target is under 500ms, so this is a short, honest transition, not an optimistic lie).
3. On confirmation (state echoed back via WebSocket), the tile updates to the new confirmed state.
4. On failure (PRD's failure branch: ~2 seconds, no confirmation), the tile shows a specific error naming the appliance and the nature of the failure, and reverts to its last confirmed state — never left stuck on "pending."

**3.3 Physical-Switch-Driven Update (PRD §2, step 6; FR-6–FR-8)**
1. No user action on the dashboard triggers this — a physical switch flip on the prototype box is the trigger.
2. The affected tile updates to reflect the new state via the same WebSocket channel as an app-originated change, with no visual distinction from an app-originated update — from the dashboard's perspective, "most-recent-change-wins" means there is exactly one current state, regardless of source, so the UI does not need to explain "why" it changed.

**3.4 Stale/Disconnected State (PRD FR-11, FR-21)**
1. If the WebSocket connection drops or the backend reports the broker/device as offline, the global connection-status indicator (§2) changes to a clearly visible "may be out of date" state.
2. Appliance tiles are not hidden or blanked — they show their last-known state, visually marked as potentially stale (e.g. a muted/greyed treatment), so the user is never misled into thinking a stale value is current.

**3.5 Admin Registers a New User (PRD FR-1)**
1. Admin opens Manage Users, enters an email address, submits.
2. On success, a confirmation is shown; the new user can now begin the Sign-in flow (§3.1) with that email.
3. On failure (e.g. malformed email, duplicate), a specific inline error — no silent failure.

**3.6 Scheduling (PRD FR-15–FR-16)**
1. User opens Schedule, taps "New Schedule," selects an appliance, an action (on/off), and a time.
2. On save, the new schedule appears in the list immediately.
3. When a scheduled action fires, it appears in the Activity Log (FR-12) like any other event, and the affected tile updates via the same live-sync path as §3.2 — the dashboard does not need to be open for the action to fire, but if it is open, the update is visible.

**3.7 Report Export (PRD FR-18–FR-19, admin only)**
1. Admin opens Reports, taps "Export."
2. A downloadable report of activity-log data is produced.
3. This control is not rendered at all for non-admin users — not shown-then-disabled, simply absent, consistent with FR-19's "flat except for this one admin capability" model.

## 4. Accessibility & Connectivity Targets

- **Standard targeted:** WCAG 2.1 AA — sufficient color contrast (critical here, since on/off states are communicated with color and must also be communicated with text/icon, never color alone), full keyboard operability, and proper labeling for screen readers on every control, including the toggle switches.
- **Connectivity-driven requirement, from Domain 3 of interrogation:** the dashboard must remain usable on a mobile browser over a personal hotspot, which may be slower or less stable than office Wi-Fi. This directly shapes §3.4 (an explicit stale-state indicator rather than silent staleness) and the pending-state honesty in §3.2 (never show false confirmation ahead of the real one). There is no low-literacy or older-adult-specific requirement identified in interrogation.

## 5. Design System Reference

No design tokens, palette, or typography have been separately established for this project. Frontend Documentation §1 and the `ui-ux-pro-max` skill (if enabled for this build) are the pointer for wherever those get defined — this document does not specify colors or fonts.
