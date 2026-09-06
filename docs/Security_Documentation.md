# Security Documentation — Smart Office Appliance Control System

**Document Governance:** Governed by the Project Summary, PRD, and TRD — nothing here may contradict any of them. Tie-break on same-level conflict: most recent revision governs, and any conflict is flagged, never silently resolved.

## 1. Threat Model

Ranked by likelihood × impact, specific to this system's actual attack surface — not a generic checklist.

1. **Accidental secret exposure via the GitHub repository** (high likelihood × high impact). The build uses GitHub Actions for CI/CD, meaning a real GitHub repo exists holding deploy configuration; the JWT signing key, Google OAuth client secret, and MQTT broker credentials are exactly the kind of values that get accidentally committed in a `.env` file during a fast, multi-week solo build. This is ranked highest because it's a common, easy mistake with a large blast radius — a leaked broker credential doesn't just expose data, it grants remote control over physical relays.
2. **Unauthorized relay command injection via a compromised broker credential** (medium likelihood × high impact). If the backend's MQTT credential leaks (most plausibly via scenario 1), an attacker could publish directly to a device's command topic, bypassing the backend's own command-rate throttle entirely, causing rapid relay toggling beyond the firmware's 1-second cooldown protection — a physical hardware-wear risk, not just a software one.
3. **Fallback-password brute-forcing against a known registered email** (medium likelihood × medium impact). Since the fallback password is a fully independent, standing credential (not just a one-time Google check), a known or guessed registered email becomes a standing target for repeated password attempts.
4. **Automated internet scanning against the public OCI VPS** (high likelihood × low-to-medium impact). Any VM with a public IP is scanned continuously by internet-wide bots probing for open ports and outdated services. Impact is low if the broker and backend stay patched and only their intended ports (443, and the MQTT TLS port) are exposed; it rises if dependencies are left stale.
5. **Exposure of the SQLite database file** (low likelihood × medium impact). A misconfigured volume mount, backup, or debug endpoint accidentally serving the database file would expose every registered user's email and password hash at once — low likelihood given a deliberately simple deployment, but worth naming explicitly since the impact is a full, one-shot exposure rather than a gradual one.

## 2. Authentication & Authorization

- **Identity establishment:** no self-service signup exists. An admin registers an email; that person's first sign-in must be via Google OAuth, which verifies they control that email address; they then set a fallback password for future sign-ins (per PRD FR-1–FR-4).
- **Session/token lifetime:** a JWT access token, valid for 60 minutes, plus a refresh token valid for 7 days, rotated on every use — a refresh token is invalidated the moment a newer one is issued from it, so a stolen refresh token has a narrow window of use before rotation locks it out.
- **Authorization model:** flat between registered users, with exactly two admin-only capabilities: registering a new user's email, and exporting reports (per PRD FR-19). No other capability differs by role.
- **Login rate limiting** (mitigating Threat 3): five failed password attempts against a given account within 15 minutes locks that account and requires the account holder to reset their password via the Google sign-in path before the fallback password can be used again.
- **Device-layer authorization** (mitigating Threat 2): each ESP32 device has its own broker credential, ACL-scoped so it can only publish/subscribe on its own three topics (per TRD §2); the backend's separate credential is the only one with cross-device access, and it is precisely this credential's exposure that Threat 2 depends on — reinforcing why Threat 1 is ranked highest.

## 3. Data Classification & Handling

Every entity from the TRD's Data Layer, classified:

| Data category | Sensitivity | Regulatory regime | Handling |
|---|---|---|---|
| `users` (email, hashed password, Google subject ID, admin flag) | Sensitive PII | NDPA 2023 — lightweight-but-genuine posture (Project Summary §8) | Passwords hashed with bcrypt or argon2, never stored or logged in plaintext; emails visible only to the account holder and to admins performing user management; deletable on request |
| `appliances` (name, device ID, relay channel) | Non-sensitive, operational metadata | Not personal data | No special handling |
| `appliance_state` (current state mirror) | Non-sensitive, operational/telemetry | Not personal data | No special handling |
| `activity_log` (event type, source, `actor_user_id`, timestamp) | Low-to-moderate — the `actor_user_id` field links a person to an action | NDPA 2023, same posture as `users` | Retained indefinitely per PRD FR-13; deletion-on-request for a user's data extends to redacting their `actor_user_id` from historical entries, not deleting the operational record itself, since the appliance-event history has standalone value independent of who's named in it |
| `schedules` (action, time, `created_by`) | Low-to-moderate — `created_by` links a person to a scheduled action | NDPA 2023, same posture | Same deletion approach as `activity_log` |

## 4. Secrets Management

**Inventory:** JWT signing key, Google OAuth client ID and secret, the backend's MQTT broker credential, each device's MQTT broker credential, the ArduinoOTA update password.

**Where they live:** `.env` files on the OCI VPS (never committed — excluded via `.gitignore` from the first commit of the repository, not added later) and GitHub Actions' encrypted repository secrets, which inject them into the deploy step at CI/CD time. A separate `.env.template` file, committed to the repository, lists every required variable name with placeholder values only — never real secrets — and is the living reference for what configuration the system needs. The coding agent maintains `.env.template` as new variables are introduced, but is never permitted to create, read, or modify the actual `.env` file; that file is populated manually, by Israel, by copying the template and filling in real values. No secret is ever hardcoded in source, in the firmware binary as a plaintext string, or logged by the backend or firmware.

**Rotation:** given the project's short build life and small blast radius, rotation is manual and event-triggered — immediate rotation of any secret suspected of exposure (see Incident Response §6), rather than a fixed calendar cadence that would add process overhead disproportionate to this project's scale.

## 5. Dependency & Supply-Chain Posture

- **Backend (Python):** dependencies declared in `pyproject.toml` and pinned via `uv.lock` (managed with `uv`, not `requirements.txt`). GitHub's Dependabot alerts are enabled on the repository — Dependabot's `uv` ecosystem support covers both version updates and security alerts, so this is fully covered despite `uv` being a newer entrant than `pip`.
- **Frontend (React):** dependencies locked via `package-lock.json`. Dependabot alerts enabled.
- **Firmware (PlatformIO):** libraries pinned to exact versions in `platformio.ini`'s `lib_deps`, not left on "latest" — an unreviewed library update changing behavior in the days before a defense is a risk this project cannot absorb.
- **Update cadence:** Dependabot alerts are reviewed manually, at least weekly during active development, and are never auto-merged — a two-person team at this scale reviews every dependency bump rather than trusting automated merges.

## 6. Incident Response Basics

**Incident: a secret is exposed** (e.g. an accidental commit of a `.env` file) — first three actions: (1) immediately rotate or revoke the specific exposed credential (regenerate the broker password, rotate the JWT signing key — which invalidates every existing session — or regenerate the Google OAuth client secret, as applicable); (2) purge the secret from git history and force-push, treating the credential as compromised even after removal, since it may already have been cloned or cached; (3) review backend and broker logs for the exposure window for any activity inconsistent with known user sessions.

**Incident: unexplained appliance activity** (a relay toggling with no corresponding known user session or physical switch event) — first three actions: (1) rotate the affected device's broker credential immediately, cutting off any unauthorized remote command path while leaving physical-switch control intact per the system's own resilience design; (2) review the `activity_log`'s `actor_user_id` and `source` fields for the timeframe to establish scope; (3) confirm with the relevant account holder(s) whether the logged action was legitimate.

**Incident: suspected account compromise** (repeated failed logins, or a login from behavior inconsistent with the known account holder) — first three actions: (1) lock the account (this also happens automatically per the rate-limiting rule in §2 once the failure threshold is hit); (2) notify the account holder directly; (3) require a password reset via the Google sign-in path before fallback-password login is re-enabled for that account.

**Notification scope:** given the project's two-person build team, "notified" means Israel (and Abdulfatai, for anything with a hardware dimension) — there is no separate security or operations team at this project's scale, and this document treats that honestly rather than assuming one.
