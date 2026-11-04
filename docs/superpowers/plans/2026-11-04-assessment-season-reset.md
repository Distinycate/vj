# Assessment Season Reset Implementation Plan

> **For agentic workers:** Use `executing-plans` to implement this plan task-by-task. Do not run a production reset without checking the target project and maintenance window.

**Goal:** Start active INTERNAL students at stage 1 with a fresh five-round Pre-test, archive previous assessments, and never report an unsaved assessment as successful.

**Architecture:** Keep current tables as the current campaign interface so unrelated consumers do not require rewrites. A service-role-only SQL transaction archives assessments, analytics and campaign state before moving the selected students to a new assessment epoch. Assessment submission uses one atomic, retry-safe RPC; identity always comes from the server session.

**Tech Stack:** Next.js 16, React 19, existing Supabase clients, PostgreSQL, Node tests; no new runtime dependencies.

**Spec:** User request in this chat, 4 November 2026: reset Pre-test and stage, separate old data, fix missing scores, preserve the core system.

## Global Constraints

- Only active INTERNAL students participate. Inactive historical accounts and EXTERNAL students remain unchanged.
- Preserve coins, tickets, inventory, rank, XP, SRS and Team Battle. Do not merge duplicate-name accounts.
- Semester 2 begins 1 November 2026 Bangkok time, but this reset is a later campaign cutover, NOT a retroactive semester boundary.
- Label archive as "ก่อนเริ่มรอบใหม่" with actual capture time; do not mislabel November assessments as term 1.
- Keep post-test optional every ten stages. Do not assign rank or stage from assessment scores.
- New schema installation must not itself reset live students. Reset is a separate ADMIN operation, fixed to campaign `2569-T2-restart-1` and idempotent.
- Existing uncommitted changes must be preserved. No automatic deploy, push or live student test submissions.

## Evidence / Root causes

- Production OpenAPI: `analytics_summary.pretest_score` is integer. The API submits fractional averages and ignores the summary write error.
- One reported active student has five saved scores totalling 64/125 (mean 12.8/25), no analytics row, and current_stage 21. Another inactive account has the same name; keep identities separate.
- Login, session refresh and browser login use different completion rules; a default summary value of zero can bypass Pre-test.
- Assessment result screen renders before persistence; Post-test ignores HTTP failure. Independent inserts and summary updates can partially succeed.
- Old admin reset clears summary but leaves pre_tests and modifies all users/Team Battle without a transaction or archive.

## Review Focus

- Retry and concurrent duplicate submission must save once and add time once.
- Old tabs crossing a reset must be rejected by epoch, not saved into the new season.
- Missing path or failed archive must roll back the entire reset.
- Real score zero differs from "not tested"; five raw rows, not summary defaults, establish completion.
- Archive API exposes only assessment/progress fields, never raw student/password/session records.

### Task 1: Regression tests and shared assessment state

- [ ] Add executable tests for mean 12.8, zero, partial five rounds, and empty history.
- [ ] Add a shared read helper for login/session/assessment state and remove duplicate browser read.
- [ ] Verify no stage/rank placement remains.

### Task 2: Atomic assessment and season reset

- [ ] Install numeric pretest summary, per-path epoch, protected archive/reset tables and RPCs.
- [ ] Test actual SQL against disposable PostgreSQL-compatible fixtures: archive, isolation, rollback, idempotency, decimal score, stale epoch and repeated submission.
- [ ] Replace unsafe admin reset endpoint with same-origin ADMIN-only RPC.
- [ ] Make previous draft stage-only migration schema-only so installing migrations never silently resets students.

### Task 3: UI and archive access

- [ ] Pre/Post-test wait for successful persistence; show saving/error/retry without losing answers.
- [ ] Load authenticated assessment history and epoch; retain Demo isolation.
- [ ] Add read-only sanitized archive comparison under admin term archive, with empty/error/retry states.
- [ ] Update reset confirmation: active INTERNAL only, new Pre-test, assets preserved, Team Battle untouched.

### Task 4: Verification and release

- [ ] Run Node tests, focused ESLint, typecheck, production build, and browser checks if available.
- [ ] Write handoff with SQL installation, maintenance/cutover, verification and recovery instructions.
- [ ] Production: connect correct Supabase project, install schema, deploy matching code, trigger reset once in maintenance, verify counts and student login flow. Do not claim these steps occurred until verified.

## Rollback

Before cutover, revert application code; added tables/columns are additive and numeric scores accept old integer values. After cutover, do not automatically restore snapshots over new activity. Pause writes, export current data, and recover selected rows from the archive with an operator-reviewed transaction. Keep archive permanently available. Existing stage attempts are cancelled (not deleted) at cutover; old tests move into protected JSON archives with original IDs/timestamps.
