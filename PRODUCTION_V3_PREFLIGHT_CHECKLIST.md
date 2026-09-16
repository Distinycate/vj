# PRODUCTION_V3_PREFLIGHT_CHECKLIST

## 0. Top-Level State Detection (V3 Objects)
- **PASS (PRE_V3)**: This is the normal, expected state before the first deployment. All V3-specific tables, columns, and functions must be `EXPECTED_ABSENT_PRE_V3`.
- **WARNING (V3_PRESENT)**: All V3 objects exist. This means the migration has already run. Do not run it again unless instructed.
- **BLOCKER (PARTIAL_V3)**: Some V3 objects exist while others do not. This indicates a previous failed or partial migration. Manual intervention is required before proceeding.

## 1. PostgreSQL objects expected by V3
- **PASS**: All required tables (`stages`, `students`, `learning_paths`, `stage_results`, `stage_attempts`, `economy_transactions`, `vocabulary`, `attempts`) are present.
- **BLOCKER**: Any table is missing.

## 2. Required columns and exact data types used by V3
- **PASS**: All expected columns match expected types (e.g. `stage_attempts.question_ids` exists and is `jsonb`).
- **BLOCKER**: Missing columns or type mismatches that would cause migration SQL to fail.

## 3. Existing constraints
- **PASS**: `stages.stage_number` unique constraint exists and relevant primary keys/foreign keys are intact.
- **BLOCKER**: Missing `stages.stage_number` uniqueness or other FK prerequisites.

## 4. Existing RPC/function prerequisites
- **PASS**: `record_word_attempt_v2` exists, is `SECURITY DEFINER`, and has correct signature.
- **BLOCKER**: Missing `record_word_attempt_v2`.

## 5. Existing RLS state and policies
- **PASS**: RLS enabled on base tables, appropriate policies exist for access.
- **WARNING**: Permissive RLS that might expose new columns unintentionally (though migration defines strict policies for new tables).

## 6. Existing grants
- **PASS**: Standard role grants (anon, authenticated, service_role) present as expected.
- **BLOCKER**: Missing `service_role` grants on critical tables.

## 7. Legacy data compatibility
- **PASS**: `stages` 1-105 exist, no duplicate `stage_number`, no orphan results/attempts, `stars` within [0, 3], no `current_stage` > 100.
- **BLOCKER**: Duplicate `stage_number`, orphan data that breaks FK constraints, or `current_stage` > 100 (violates invariant).

## 8. Backfill impact preview
- **PASS**: Queries return sensible numbers (>0 STAGE_RESULT, LEGACY_ATTEMPT rows). Number of conflict rows is known.
- **WARNING**: Unusual data distribution (e.g., millions of inferred rows with zero stage results).

## 9. Economy/mastery compatibility
- **PASS**: No existing constraints that would prevent `economy_transactions` inserts for rewards.
- **BLOCKER**: Unexpected unique constraints on `economy_transactions` that fail on duplicate `reference_id` + `source`.

## 10. Migration collision audit (Object Presence)
- **PASS**: None of the V3 tables/columns/functions (`student_stage_progress`, `attempt_hint_events`, `stage_attempts.hint_count`, etc.) exist yet. They are logged as `[EXPECTED_ABSENT_PRE_V3]`.
- **BLOCKER**: Any target object already exists while others do not (`PARTIAL_V3` state).

## 11. SECURITY DEFINER hardening
- **PASS**: Any existing RPC checked uses `SET search_path = pg_catalog, public`.
- **BLOCKER**: Missing `search_path` configuration on `SECURITY DEFINER` functions.
