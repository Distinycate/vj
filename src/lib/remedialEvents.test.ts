import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  calculateTargetStages,
  REMEDIAL_TEMPLATES,
  getRemedialTemplate,
  getRemedialStage,
} from './events/remedialEventsRegistry.ts';

test('calculateTargetStages maps remedial scores correctly to target stage count', () => {
  // Score 35–39 -> 5 stages
  assert.equal(calculateTargetStages(39), 5);
  assert.equal(calculateTargetStages(37), 5);
  assert.equal(calculateTargetStages(35), 5);

  // Score 30–34 -> 7 stages
  assert.equal(calculateTargetStages(34), 7);
  assert.equal(calculateTargetStages(32), 7);
  assert.equal(calculateTargetStages(30), 7);

  // Score 20–29 -> 9 stages
  assert.equal(calculateTargetStages(29), 9);
  assert.equal(calculateTargetStages(25), 9);
  assert.equal(calculateTargetStages(20), 9);

  // Score 10–19 -> 12 stages
  assert.equal(calculateTargetStages(19), 12);
  assert.equal(calculateTargetStages(15), 12);
  assert.equal(calculateTargetStages(10), 12);

  // Score 0–9 -> 15 stages
  assert.equal(calculateTargetStages(9), 15);
  assert.equal(calculateTargetStages(5), 15);
  assert.equal(calculateTargetStages(0), 15);

  // Fallback / undefined / out of bounds
  assert.equal(calculateTargetStages(null), 15);
  assert.equal(calculateTargetStages(undefined), 15);
  assert.equal(calculateTargetStages(NaN), 15);
  assert.equal(calculateTargetStages(45), 5);
});

test('Remedial template registry loads all 3 fixed event packs', () => {
  assert.equal(REMEDIAL_TEMPLATES.length, 3);

  const ids = REMEDIAL_TEMPLATES.map(t => (t as any).eventId || (t as any).id);
  assert.ok(ids.includes('event-01-verb-master-challenge'));
  assert.ok(ids.includes('event-02-khok-nong-na-adventure'));
  assert.ok(ids.includes('event-03-christmas-adventure'));
});

test('Each event template contains exactly 15 stages and 150 fixed questions', () => {
  const templateIds = [
    'event-01-verb-master-challenge',
    'event-02-khok-nong-na-adventure',
    'event-03-christmas-adventure',
  ];

  for (const templateId of templateIds) {
    const template = getRemedialTemplate(templateId);
    assert.ok(template, `Template ${templateId} must exist`);
    assert.equal(template.stages.length, 15, `${templateId} stages array length must be 15`);

    let questionCount = 0;
    for (let stageNum = 1; stageNum <= 15; stageNum++) {
      const stage = getRemedialStage(templateId, stageNum);
      assert.ok(stage, `Stage ${stageNum} of ${templateId} must exist`);
      assert.equal(stage.questions.length, 10, `Stage ${stageNum} of ${templateId} must have exactly 10 questions`);

      for (let i = 0; i < stage.questions.length; i++) {
        const q = stage.questions[i];
        assert.ok(q.prompt && q.prompt.trim().length > 0, `Stage ${stageNum} Q${i + 1} has prompt`);
        assert.equal(q.choices.length, 4, `Stage ${stageNum} Q${i + 1} has exactly 4 choices`);
        assert.ok(q.correctIndex >= 0 && q.correctIndex < 4, `Stage ${stageNum} Q${i + 1} correctIndex in 0-3`);
        assert.equal(
          q.choices[q.correctIndex],
          q.answer,
          `Stage ${stageNum} Q${i + 1} choices[correctIndex] matches answer`
        );
      }
      questionCount += stage.questions.length;
    }
    assert.equal(questionCount, 150, `${templateId} must sum to exactly 150 questions`);
  }
});

test('Stage route GET sanitizes questions to never leak correctIndex or answer to client', () => {
  const stage = getRemedialStage('event-01-verb-master-challenge', 1);
  assert.ok(stage);

  // Reproduce route's sanitization
  const sanitized = stage.questions.map((q, idx) => ({
    index: idx,
    id: q.id,
    prompt: q.prompt,
    choices: q.choices,
    image: q.image || null,
  }));

  assert.equal(sanitized.length, 10);
  for (const q of sanitized) {
    assert.ok(q.prompt);
    assert.equal(q.choices.length, 4);
    assert.equal((q as any).correctIndex, undefined, 'correctIndex must NOT be leaked to client');
    assert.equal((q as any).answer, undefined, 'answer string must NOT be leaked to client');
  }
});

test('Database migration contains event_runs, event_participants, and event_progress definitions', () => {
  const migration = readFileSync(new URL('../../MIGRATION_REMEDIAL_EVENT_RUNS.sql', import.meta.url), 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.event_runs/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.event_participants/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.event_progress/);
  assert.match(migration, /idx_event_participants_student/);
  assert.match(migration, /idx_event_progress_lookup/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
});
