# Frontend Documentation — Smart Office Appliance Control System

**Document Governance:** Governed by the Project Summary, PRD, and TRD — nothing here may contradict any of them. Read alongside the UI/UX Documentation, which covers design and flow decisions; this document covers implementation. Tie-break on same-level conflict: most recent revision governs, and any conflict is flagged, never silently resolved.

## 1. Framework & Rendering Strategy

React, built with Vite, written in **TypeScript** rather than plain JavaScript — decided here as the realistic engineering choice given the project consumes two typed contracts (the REST API and the WebSocket message shapes defined in the TRD) under a tight few-weeks timeline; catching a shape mismatch at compile time is worth the small setup cost. Rendering strategy is pure client-side rendering (CSR) — this is an authenticated internal dashboard with no public/SEO surface, so there's no reason to take on SSR complexity.

## 2. Component Architecture

Organized by feature, not by type:

```
src/
  pages/          # Login, PasswordSetup, Dashboard, Schedule, ActivityLog, Reports, ManageUsers
  components/     # shared, reusable: ApplianceTile, ConnectionStatusBanner, ScheduleForm,
                  #   ActivityLogTable, ErrorInline
  hooks/          # useAppliances, useWebSocket, useAuth
  api/            # typed REST client functions, one module per resource
  context/        # AuthContext (current user, role, session)
```

Page components own layout and data-fetching orchestration; shared components are presentation-focused and receive data via props, not by fetching it themselves — this keeps `ApplianceTile` reusable across the Dashboard and any future screen without duplicating fetch logic.

## 3. State Management Approach

- **Server state** (appliance status, activity log, schedules, users): TanStack Query. It owns caching, loading/error states, and refetch-on-reconnect behavior — this maps directly onto the UI/UX doc's requirement (§3.4 there) that a reconnect must correct stale data rather than leave it silently wrong.
- **Live updates:** a single WebSocket connection, managed by a `useWebSocket` hook, pushes appliance-state messages into the TanStack Query cache directly (via `queryClient.setQueryData`) rather than triggering a full refetch — this is what makes the near-real-time sync target (TRD §2, PRD NFR-2) actually feel instant in the UI rather than polling-delayed.
- **Local/UI state** (form inputs, a tile's brief "pending" visual state from UI/UX §3.2): plain `useState`, scoped to the component that needs it — no global store for this.
- **Auth/session state:** a single `AuthContext` holding the current user, role (admin/non-admin), and session-validity status, consumed wherever role-based rendering is needed (e.g. hiding Reports and Manage Users from non-admins, per UI/UX §3.7).

No Redux or other global-store library — the combination of TanStack Query (server state) and Context (auth) covers this project's actual state surface without added complexity.

## 4. API Contract Consumption

The frontend consumes the REST and WebSocket contract established in the TRD's Core Architecture (§2) and Data Layer (§3) sections — REST for commands, scheduling, auth, and report export; a single WebSocket connection for live appliance-state push. This document does not restate or re-derive that contract; the `api/` and `hooks/useWebSocket` modules are implemented directly against it.

## 5. Frontend Build & Deploy

Build and deploy pipeline mechanics (how running `npm run build` — which invokes `vite build` under the hood — produces output that reaches the Caddy container on the OCI VPS via GitHub Actions) are defined in the CI/CD Documentation — not restated here. Frontend-specific constraint worth naming at this layer: given the confirmed requirement that the dashboard must work over a mobile hotspot (UI/UX §4), the initial JS bundle is budgeted to stay under roughly 250KB gzipped, so first load remains reasonable on a slower cellular connection rather than only being tested on office Wi-Fi.
