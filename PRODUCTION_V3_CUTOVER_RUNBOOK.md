# PRODUCTION_V3_CUTOVER_RUNBOOK.md

## Step 1: Preflight Validation (Read-Only)
* **USER ACTION:** Execute preflight script against Production DB.
* **FILE/COMMAND:** `psql -f PRODUCTION_V3_PREFLIGHT_READONLY.sql`
* **EXPECTED RESULT:** Output states `Migration Authorized: YES`.
* **STOP CONDITION:** If `BLOCKER` is reported, STOP. Do not proceed to Step 2.
* **NEXT STEP:** Step 2.

## Step 2: V3 Schema & Backfill Migration
* **USER ACTION:** Execute V3 DB migration script against Production DB.
* **FILE/COMMAND:** `psql -f MIGRATION_GAME_PROGRESSION_V3.sql`
* **EXPECTED RESULT:** Tables `student_stage_progress`, `attempt_hint_events` created; RPCs created; backfill completes.
* **STOP CONDITION:** If transaction fails or rolls back, STOP. Existing OLD APP continues to function safely.
* **NEXT STEP:** Step 3.

## Step 3: Deploy New Application (V3)
* **USER ACTION:** Deploy the latest verified V3 application code to production.
* **FILE/COMMAND:** Deployment pipeline (e.g., Vercel, Docker).
* **EXPECTED RESULT:** Application boots successfully. Server actions utilize new V3 RPCs and `service_role`.
* **STOP CONDITION:** If application health checks fail, Rollback deployment to OLD APP. (OLD APP + V3 DB is safe).
* **NEXT STEP:** Step 4.

## Step 4: Post-Migration Verification (Read-Only)
* **USER ACTION:** Verify V3 schema exists correctly.
* **FILE/COMMAND:** `psql -f PRODUCTION_V3_POST_MIGRATION_VERIFY.sql`
* **EXPECTED RESULT:** Returns `PASS` for all V3 schema checks.
* **STOP CONDITION:** If verification fails, STOP. Determine if schema drift occurred.
* **NEXT STEP:** Step 5.

## Step 5: Enforce RLS Security Hardening
* **USER ACTION:** Execute RLS hardening script.
* **FILE/COMMAND:** `psql -f MIGRATION_V3_PRODUCTION_RLS_HARDENING.sql`
* **EXPECTED RESULT:** Transaction completes successfully.
* **STOP CONDITION:** If script fails (e.g., due to missing V3 prerequisites), it explicitly raises an exception and rolls back without mutations.
* **NEXT STEP:** Step 6.

## Step 6: Final Security Audit Verification (Read-Only)
* **USER ACTION:** Execute the final security postverifier.
* **FILE/COMMAND:** `psql -f PRODUCTION_V3_SECURITY_POSTVERIFY_READONLY.sql`
* **EXPECTED RESULT:** OVERALL_SECURITY_POSTVERIFY reports `PASS`. All sensitive tables report `SAFE_SERVER_ONLY` (no over-grants for SELECT, INSERT, UPDATE, DELETE to anon/authenticated/public).
* **STOP CONDITION:** If `BLOCKER` is reported, investigate the specific table/RPC.
* **NEXT STEP:** Complete.
