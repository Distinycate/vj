# PRODUCTION_V3_ROLLBACK_PLAN

## What V3 creates:
- Table: `attempt_hint_events`
- Table: `student_stage_progress`
- Function: `record_attempt_hint_v3`
- Function: `complete_stage_with_progression_v3`
- Constraint: `stages_id_stage_number_unique` on `stages`

## What V3 alters:
- `stage_attempts` (Adds `hint_count`, `stars`, `stage_id`)
- `learning_paths` (Adds `campaign_completed_at`)
- `economy_transactions` (Adds `primary_reason`, `bonus_flags`)

## What can safely be rolled back (if caught BEFORE real student writes):
If the migration ran, but real traffic hasn't started yet, all DDL changes can be reversed using the `DROP` and `ALTER TABLE ... DROP COLUMN` commands documented in the migration file header.

## What must NOT be automatically rolled back after real student writes begin:
Do NOT drop `student_stage_progress`, `attempt_hint_events`, or the new columns if real users have started interacting with the V3 API. Doing so will permanently destroy authoritative progress data and economy rewards for those sessions. The old `stage_results` is no longer the progression authority, so rolling back would mean data loss.

## Recovery strategy if migration succeeds but application deployment fails:
If the database migration succeeds but the V3 application deployment fails (requiring a rollback to the V2 application):
1. The V2 application code is compatible with the new V3 columns (it will simply ignore them).
2. The V2 API does not call the V3 RPCs, so no new `student_stage_progress` or `attempt_hint_events` rows will be created.
3. Therefore, DO NOT roll back the database migration. Leave the V3 schema in place. The V2 application can safely run against the V3 schema.
4. When the V3 application is fixed, redeploy it. The migration is already done.
