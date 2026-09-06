# CI/CD Documentation — Smart Office Appliance Control System

**Document Governance:** Governed by the Project Summary, PRD, TRD, and Security Documentation — nothing here may contradict any of them. Tie-break on same-level conflict: most recent revision governs, and any conflict is flagged, never silently resolved.

**Scope note:** this document covers the backend, frontend, and broker deployment to the OCI VPS. Firmware is explicitly out of scope for this pipeline — the ESP32 is flashed directly via PlatformIO from Antigravity during development, and updated afterward via the OTA mechanism defined in the TRD (§6); it is not built or deployed by GitHub Actions.

## 1. Pipeline Stages

Lint → Test → Build → Deploy, in that order, each gating the next:

1. **Lint** — `ruff` for the backend, `eslint` for the frontend. Must pass to proceed.
2. **Test** — `pytest` for the backend, `vitest` for the frontend. Must pass to proceed.
3. **Build** — Docker images built for the backend (FastAPI) and for Caddy (which bakes in the frontend's static output, produced by `npm run build` invoking `vite build`). A failed build stops the pipeline before deploy is ever attempted.
4. **Deploy** — only runs on a push to `main`, never on a pull request. Requires manual approval (§3) before it executes, even after every automated stage passes.

## 2. CI Workflow Structure

- **On `pull_request` targeting `main`:** runs Lint, Test, and Build only — no deploy. These three are configured as required status checks in branch protection, so a PR cannot merge until all three pass.
- **On `push` to `main`:** runs the full pipeline, Lint through Deploy.
- **Matrix strategy:** none. A single Python 3.12 and a single Node.js LTS version are targeted — this is a small, two-person project with one fixed production environment, so there's no cross-version compatibility surface worth testing against.
- **Manual re-run capability:** any past successful workflow run can be re-run from the GitHub Actions UI, which is the primary mechanism the Rollback Strategy (§6) depends on.

## 3. Environment Promotion

Two environments only — local development and production — no separate staging environment. This is a deliberate scope decision matching the project's zero-budget, small-team, single-VM constraints, not an oversight: a staging environment would mean either a second paid/free-tier VM to manage or a shared resource that complicates the already-tight timeline, for a project with one real production target and a two-person team who can verify changes locally first.

- **Local development:** each contributor runs the same Docker Compose structure locally, against a local Mosquitto instance, per the TRD's stated dev/prod parity approach (TRD §1).
- **Production:** the single OCI VPS. Promotion from local to production happens by merging a pull request to `main`, which triggers the Deploy stage — gated by manual approval, not fully automatic.

**Manual approval gate:** the Deploy job runs against a GitHub Environment named `production`, configured with Israel as a required reviewer. Every automated check can pass and the deploy still waits for an explicit human approval click before it touches the live VM — a deliberately cheap safeguard against an accidental bad merge reaching the demo box unattended, especially valuable in the days immediately before a defense.

## 4. Deployment Targets

**OCI (Oracle Cloud Infrastructure) — the only confirmed target.** No Vercel, Cloudflare, or Render is used in this project.

What deploys there: the full Docker Compose stack defined in the TRD — Caddy (serving the built frontend and reverse-proxying to the backend), the FastAPI backend, and the Mosquitto broker — all as containers on a single OCI Ampere A1 (always-free tier) VM instance.

Why: this is the zero-budget, publicly-reachable host both the ESP32 (on a mobile hotspot) and browsers need to reach, as established in the TRD's Build & Runtime Environment (§1) and Deployment Architecture (§5).

**How the Deploy stage reaches it:** GitHub's hosted runners cannot directly reach a private OCI VM, so the Deploy job connects out to the VM via SSH (using an SSH-action step) rather than running a self-hosted runner on the VM itself. A self-hosted runner was considered and rejected: it would mean the production VM itself executes arbitrary workflow code on every CI run, meaningfully widening the attack surface documented in the Security Documentation's threat model, for no real benefit at this project's scale. The SSH-based approach keeps build and test execution entirely on GitHub's infrastructure and limits the production VM's exposure to a single, narrowly-scoped deploy step.

Once connected, the Deploy step pulls the newly built images (tagged with the triggering commit's SHA, not `latest`) and runs `docker compose up -d` on the VM, replacing the running containers with the new versions.

## 5. Secrets & Environment Variables in CI

Stored as GitHub Actions encrypted repository secrets, scoped to the `production` GitHub Environment (§3) so they're only injected into the Deploy job, never into Lint/Test/Build:

- A dedicated SSH deploy key (private key in the secret; the corresponding public key is the only one authorized for the deploy user on the OCI VM) — not any contributor's personal SSH key.
- The OCI VM's host address.
- The JWT signing key, Google OAuth client ID and secret, and the backend's MQTT broker credential — the same inventory defined in the Security Documentation (§4), injected into the backend container's environment at deploy time rather than baked into the image.

None of these are ever printed to workflow logs; GitHub automatically masks registered secret values in log output, and no step in this pipeline echoes them explicitly.

## 6. Rollback Strategy

Concrete enough to execute under pressure — no step here requires figuring anything out in the moment:

1. **Identify the last known-good commit SHA.** Every deployed image is tagged with the git SHA that built it (§4) — the GitHub Actions run history for the `production` environment shows exactly which SHA is currently live and which prior SHA was last confirmed working.
2. **Re-run that prior successful workflow run** from the GitHub Actions UI (the same mechanism named in §2), rather than reverting the commit and waiting for a fresh build — this redeploys the exact previously-built images immediately, without rebuilding.
3. **Verify the rollback took effect** by checking the backend's `/version` endpoint (returning the git SHA baked in at build time) — added specifically so a rollback is verifiable in seconds rather than assumed.
4. **Check for a database migration mismatch.** If the bad deploy included an Alembic migration, redeploying the old code alone is not sufficient — the schema must be rolled back too, via `alembic downgrade -1` run against the production database, executed *before* confirming the rollback as complete. This step is easy to forget under pressure, which is exactly why it's written down explicitly here rather than left implicit.
