# AI Handoff — Vocab Journey Current State

Updated: 2026-07-03  
Workspace: `/Users/distinycate/Desktop/vj`

## Read this first

The repository is being edited by more than one AI. Always run `git status --short` and inspect
the diff before changing files. Preserve unrelated uncommitted work.

Never run `SUPABASE_SCHEMA.sql`; it drops existing production tables.

## Current uncommitted work

The latest uncommitted patch fixes the admin individual-student dashboard:

- `src/components/admin/IndividualStudentProfile.tsx`
  - Uses real `attempts`, `wrong_words`, `analytics_summary`, `learning_paths`,
    `pre_tests`, and `post_tests`.
  - Removes fabricated retention values, hard-coded dates, and fake graph fallback data.
  - Shows real attempt accuracy, pass rate, time on task, error patterns, and frequent errors.
  - Displays explicit no-data states.
- `src/app/admin/page.tsx`
  - Embeds `classrooms(class_name)` in student queries.
  - Fixes object/array handling for `learning_paths`.
  - Shows the selected classroom Team Battle beside the school Team Battle.
- `src/lib/adminProfileContracts.test.ts`
  - Protects real-data profile and classroom-team contracts.
- `src/components/PreTest.tsx`
  - Contains a type-only fix required for the current build.

Other uncommitted scripts and changes may belong to another AI:

- `scripts/add_reset_rpc.sql`
- `scripts/deduct_m2.sql`
- `scripts/partial_reset_2026.sql`
- `scripts/update_m2_and_gacha.sql`
- `src/components/Game.tsx`

Do not remove or rewrite those without inspecting ownership and intent.

## Latest verified checks

- `npm test`: 26/26 passing.
- `npm run typecheck`: passing.
- `npm run build`: passing.
- Routes generated: `/`, `/admin`, `/admin/audit`, `/admin/cards`, `/card-teacher`,
  `/card-teacher/dashboard`, `/executive`.

## Production database facts verified read-only

### Student analytics

- Supabase embeds `analytics_summary` and `learning_paths` as objects, not arrays.
- Real historical gameplay is primarily in `attempts`.
- `stage_results` and `user_review_words` are still empty for many existing students.
- Some students have substantial `attempts` history, e.g. 53 or 92 attempts, while their
  `analytics_summary.attempt_count` is still zero.
- Therefore individual history charts must use `attempts`; do not switch back to
  `stage_results`.
- Existing frequent-error history is in `wrong_words`; use `student_id` and `error_count`.

### Team Battle

- Production currently has 18 teams: 12 classroom teams and 6 school teams.
- There are active classroom teams for ม.1, ม.2, and ม.3.
- Production has 176 memberships and 184 score events.
- Real classroom scores were verified. Example totals:
  - ม.3: Lion 350, Eagle 125, Dragon 55, Tiger 160.
  - ม.1: Lion 15, Eagle 0, Dragon 15, Tiger 150.
  - ม.2: Lion 50, Eagle 15, Dragon 10, Tiger 35.
- Admin Team Battle must render:
  - `<TeamLeaderboard scope="class" classroomId={selectedClassroom} />`
  - `<TeamLeaderboard scope="school" />`

### Card system

- Production has 6 cards, 21 inventory rows, 146 gacha pulls, and 8 card logs.
- Gacha cost: 500 coins.
- Every tenth coin-paid pull excludes `DUD`; ticket pulls do not increment pity.
- Counter window: 30 minutes.
- Drop weights: N 55, R 20, R 15, SR 5, SSR 4, UR 1.

### Card administration schema status

- `card_admin_actions` exists and has existing history.
- The deployed version is the first schema version: it does not yet have
  `behavior_category`.
- `register_card_teacher` was not found in the PostgREST schema cache at last verification.
- Re-run the latest additive `MIGRATION_CARD_ADMIN_DASHBOARD.sql` to upgrade in place.
  It now uses `ADD COLUMN IF NOT EXISTS`, replaces constraints safely, and does not drop
  history.

## Card Teacher separation

- Card-teacher login/registration: `/card-teacher`.
- Card-teacher dashboard: `/card-teacher/dashboard`.
- Admin card dashboard: `/admin/cards`.
- Card-teacher session key: `vocab_journey_card_teacher`.
- Admin session key: `vocab_journey_teacher`.
- Self-registered teachers use role `CARD_TEACHER`.
- `CARD_TEACHER` must not be accepted by `/admin` learning analytics.
- Card teachers may only manage cards, tickets, coins, and behavior records.
- Coin changes affect the student’s real `learning_paths.coins`, but must not change stage,
  rank, learning analytics, or assessment data.

Every teacher mutation must go through an audited RPC:

- `teacher_adjust_student_coins`
- `teacher_adjust_student_tickets`
- `teacher_remove_student_card_categorized`

Every mutation must store teacher ID, student ID, action, category, reason, amount,
balance before, balance after, and timestamp in `card_admin_actions`. The history UI must show
the teacher name.

## Important data invariants

- Student identity: `public.students`.
- Teacher identity: `public.teachers`.
- Coins: `public.learning_paths.coins`.
- Free tickets: `public.learning_paths.free_pull_tickets`.
- Do not create a replacement `users` table.
- Do not mutate coins or inventory using multiple client-side updates.
- Do not confiscate reserved cards:
  `available = quantity - reserved_quantity`.
- Team scoring remains event-sourced in `team_score_events` and must be filtered by season.

## SQL execution order

Only run a migration when its corresponding schema is missing or outdated:

1. `MIGRATION_TEAM_BATTLE_FIX.sql`
2. `MIGRATION_CARD_BATTLE.sql`
3. `MIGRATION_CARD_ADMIN_DASHBOARD.sql`

Production already has the team and core card data. The currently required upgrade is step 3.

Do not run:

- `SUPABASE_SCHEMA.sql`
- `scripts/setup_teams.sql`
- `scripts/setup_teams.cjs`
- `scripts/add_teacher_card_management.sql`

The setup-team scripts delete/reassign memberships. The legacy teacher-card script has no
complete audit/category handling and can conflict with reserved cards.

## Next recommended verification

1. Re-run `MIGRATION_CARD_ADMIN_DASHBOARD.sql` in Supabase SQL Editor.
2. Refresh the PostgREST schema cache if Supabase does not expose new RPCs immediately.
3. Register one test `CARD_TEACHER` through `/card-teacher`.
4. Confirm the account can open `/card-teacher/dashboard` but is rejected by `/admin`.
5. Award and deduct coins/tickets; confiscate one available card.
6. Confirm every action appears with the correct teacher name, category, reason, and
   before/after balance.
7. In `/admin`, open a student with real attempts and confirm both charts render.
8. Change the selected classroom and confirm the classroom Team Battle changes with it.
9. Run `npm test`, `npm run typecheck`, and `npm run build`.
