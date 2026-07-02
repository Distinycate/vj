# AI Handoff: Vocab Journey Card Battle

Updated: 2026-07-03  
Workspace: `/Users/distinycate/Desktop/vj`

## Objective

Add an internal-school card gacha and asynchronous teacher-approved card workflow without
replacing the existing student, teacher, progression, shop, or team systems.

Current O2O balance specification:

- Pull cost: 500 coins.
- Pity: every 10th coin-paid pull excludes `DUD`; free tickets do not increment pity.
- Counter window: 30 minutes, measured using database time.
- Drop weights: N 55, R-cleaning 20, R-meditation 15, SR-defense 5,
  SSR-reflect 4, UR-early-home 1.

## Important ownership boundaries

- Do not create a new `users` table. Student identity remains `public.students`; teacher
  identity remains `public.teachers`.
- Do not move coins. The source of truth remains `public.learning_paths.coins`.
- Do not replace `public.teams`, `public.team_members`, `public.team_battle_seasons`, or
  `public.team_score_events`.
- Do not change login/authentication in this workstream.
- Do not edit the quiz answer contract or Vocab Journey stage flow as part of this feature.
- Do not run `SUPABASE_SCHEMA.sql`: it is destructive and drops existing tables.
- Only run the additive `MIGRATION_CARD_BATTLE.sql` for this feature.

## Files owned by this feature

- `MIGRATION_CARD_BATTLE.sql`
- `src/utils/cardBattle.ts`
- `src/components/CardCenterModal.tsx`
- `src/components/admin/CardWorkflowPanel.tsx`
- `src/lib/cardBattleContracts.test.ts`
- `AI_HANDOFF_CARD_BATTLE.md`

Integration points intentionally changed:

- `src/components/StudentHero.tsx`
- `src/components/Dashboard.tsx`
- `src/app/admin/page.tsx`
- `src/components/admin/SeasonManager.tsx`
- `package.json` test glob

## Database mapping

The supplied conceptual schema was adapted to the existing database:

| Concept | Vocab Journey implementation |
|---|---|
| `User` | `students` and `teachers` remain separate |
| `User.coins` | `learning_paths.coins` |
| `User.freePullTickets` | `learning_paths.free_pull_tickets` |
| paid pity counter | `learning_paths.paid_gacha_pulls` |
| `Card` | `cards` |
| `Inventory` | `card_inventory` |
| `CardLog` | `card_logs` |
| notifications | `card_notifications` |
| monthly team score | existing `team_score_events` grouped by `season_id` |
| reward audit | `season_reward_distributions` |

## Workflow invariants

All balance and inventory mutations must continue to use the SQL RPC functions. Do not
reimplement them as a sequence of client-side updates.

1. `pull_gacha_card`
   - Locks the student's `learning_paths` row.
   - Consumes a free ticket before coins.
   - Costs 500 coins only when no ticket exists.
   - Increments `paid_gacha_pulls` only for coin-paid pulls.
   - Every tenth paid pull excludes cards whose effect is `DUD`.
   - Uses weighted selection from active cards.
   - Upserts inventory quantity and writes `gacha_pulls`.
2. `create_card_action`
   - Validates target/effect.
   - `DEFENSE` may be submitted without a target as a teacher-approved school-ban exemption;
     `REFLECT` can only be used during a counter window.
   - Reserves one inventory unit but does not consume it.
   - Creates one `PENDING` card log.
3. `announce_card_action`
   - Moves `PENDING` to `COUNTER_PHASE`.
   - Sets a server-side deadline of 30 minutes.
   - Creates a target notification.
4. `counter_card_action`
   - Only the target can counter.
   - Deadline is checked by database time.
   - Only `DEFENSE` or `REFLECT` is accepted.
   - Updates the existing log and reserves the counter card.
5. `resolve_card_action`
   - On approval: consumes the played card and optional counter card.
   - On rejection: releases reservations and leaves quantities unchanged.
   - Writes teacher, final status, result text, and notifications.
6. `close_and_reward_team_season`
   - Calculates the winner from `team_score_events` for that exact season.
   - Adds tickets to active members of the winning team.
   - Uses a unique `(season_id, student_id)` distribution record to prevent duplicate rewards.

## Deployment steps for the next AI

1. Review `git diff` and preserve unrelated user changes.
2. Run `MIGRATION_CARD_BATTLE.sql` once in the Supabase SQL editor or migration runner.
   This migration has intentionally not been applied by the current agent; the UI depends on
   it and must not be smoke-tested against production before this step succeeds.
3. Verify these tables exist: `cards`, `card_inventory`, `card_logs`, `gacha_pulls`,
   `card_notifications`, `season_reward_distributions`.
4. Verify `learning_paths.free_pull_tickets` exists.
5. Verify seeded cards total 6 and their total `drop_weight` is 100.
6. Verify Realtime includes `card_logs` and `card_notifications`.
7. Run:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
8. Smoke test with two students in the same classroom and one teacher:
   - award ticket,
   - pull card,
   - submit attack,
   - announce,
   - counter within 60 seconds,
   - resolve,
   - confirm both quantities and reservations.
9. Create an active school season and confirm stage completion creates score events with that
   season before testing the reward button.
10. Confirm the student classroom leaderboard shows badges for owned SR, SSR, and UR cards.

## Coordination warning

The repository already has unrelated runtime-consistency defects in analytics, wrong-word
tables, and dashboard relationship shapes. Do not “fix while nearby” in the card migration.
Those changes need their own patch because they overlap `adaptiveEngine.ts` and admin metrics.

The current app intentionally uses an internal direct-login model and anon Supabase client.
The migration mirrors that existing access model. A future authentication project should
tighten RPC authorization and RLS as a separate coordinated migration.
