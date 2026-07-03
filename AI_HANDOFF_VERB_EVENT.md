# AI Handoff: Verb Master Event

Updated: 2026-07-03

## Scope and ownership

This is uncommitted work in a shared workspace. Do not reset, checkout, or overwrite
these files. Preserve unrelated Card Battle, Team Battle, analytics, and anti-translation
changes.

The user has run `MIGRATION_EVENT_CENTER.sql`. A read-only production check immediately
before this handoff showed that all Event tables exist, but there was not yet an
`events.slug = 'verb-master'` row and there were zero active Event verbs.

## What is implemented

- `/events` Event Center.
- `/events/verb-master` real student progress and active verb count.
- `/events/verb-master/play` playable typed-answer challenge.
- `/events/verb-master/review` real weak-verb list.
- `/events/verb-master/leaderboard` real completed-attempt ranking.
- Admin tab `กิจกรรม (Events)`.
- Admin button `สร้าง/ซ่อม Verb Master` is always visible in the Event tab.
- Admin can switch an Event between `upcoming` and `active`.
- Student identity persists between `/` and `/events` using
  `vocab_journey_student`.
- The Event workflow matches this project's internal-school login model and does not
  require Supabase Auth.
- Attempt ownership is checked on answer submission and completion.
- Correct, wrong, total question, score, accuracy, mastery, coin, and EXP updates are
  wired to real tables.
- Two-answer questions accept comma/newline/pipe separated answers.
- Dictation V2 and V3 are separate types and use browser speech synthesis.
- Phase selection uses practiced/mastery progress rather than a fixed phase.
- Landing, review, and leaderboard no longer show fabricated results.

## Files in this patch

- `MIGRATION_EVENT_CENTER.sql`
- `scripts/seed-event-verbs.ts`
- `src/app/admin/page.tsx`
- `src/app/page.tsx`
- `src/store/useAppStore.ts`
- `src/app/events/**`
- `src/components/admin/EventAnalyticsTab.tsx`
- `src/data/verb-master-words.json`
- `src/lib/eventUtilities.test.ts`
- `src/services/verbEventService.ts`
- `src/utils/answerCheck.ts`
- `src/utils/eventScoring.ts`
- `src/utils/levenshtein.ts`
- `src/utils/studentSession.ts`
- `src/utils/verbQuestionGenerator.ts`

## Important deployment steps

1. Confirm the latest `MIGRATION_EVENT_CENTER.sql` was run, including the internal-app
   RLS policies and GRANT statements at the end. Re-running it is safe because tables,
   indexes, and policies use `IF NOT EXISTS` or `DROP POLICY IF EXISTS`.
2. Deploy the current source patch. The production UI cannot show the new button until
   this source code is deployed.
3. Log in as Admin and open `กิจกรรม (Events)`.
4. Click `สร้าง/ซ่อม Verb Master`. This upserts the Event and its verb records.
5. The Event starts as `upcoming`. Click `เปิดกิจกรรม` to change it to `active`.
6. Log in as a student from `/`, open `/events`, and complete one challenge.
7. Verify the completed attempt appears in Leaderboard and the student's weak answers
   appear in Review.

## Current content limitation

`src/data/verb-master-words.json` currently contains 10 verbs, not 83. The UI now shows
the real count and does not claim that 83 are available. Add the remaining reviewed
verb records to this JSON and click `สร้าง/ซ่อม Verb Master` again to upsert them.

## Verification already completed

- `npm test`: 41/41 passed.
- `npm run typecheck`: passed.
- ESLint for all Event files plus touched login/store files: passed.
- `npm run build`: passed with Next.js 16.2.9.
- Generated routes include `/events`, landing, play, review, and leaderboard.

## Do not do

- Do not run `SUPABASE_SCHEMA.sql`.
- Do not delete Event tables to reseed.
- Do not replace this project's internal student login with Supabase Auth as part of
  this patch.
- Do not hardcode 83 verbs, progress, accuracy, leaderboard, or review data.
- Do not commit unrelated files without reviewing the shared dirty worktree first.
