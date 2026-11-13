import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_WORKSHEETS,
  getWorksheetsByGrade,
  getWorksheetUnit,
  calculateWorksheetStars,
} from '../../data/worksheets/index.ts';

test('1. Worksheets dataset integrity and structure', () => {
  assert.ok(ALL_WORKSHEETS.length >= 10, 'Must have at least 10 units populated');

  const idSet = new Set<string>();
  for (const unit of ALL_WORKSHEETS) {
    assert.ok(unit.unitId, 'Unit must have an id');
    assert.ok(unit.title, 'Unit must have a title');
    assert.ok(unit.questions.length >= 3, `Unit ${unit.unitId} must have at least 3 questions`);

    for (const q of unit.questions) {
      assert.ok(!idSet.has(q.id), `Question ID ${q.id} must be unique`);
      idSet.add(q.id);
      assert.ok(q.prompt && q.prompt.length > 5, `Question ${q.id} must have a valid prompt`);
      assert.ok(q.answer && q.answer.length >= 1, `Question ${q.id} must have an answer`);
    }
  }
});

test('2. Grade filter functions', () => {
  const m1 = getWorksheetsByGrade('M1');
  const m2 = getWorksheetsByGrade('M2');
  const m3 = getWorksheetsByGrade('M3');

  assert.ok(m1.length > 0, 'M1 worksheets exist');
  assert.ok(m2.length > 0, 'M2 worksheets exist');
  assert.ok(m3.length > 0, 'M3 worksheets exist');

  assert.ok(m1.every((u) => u.grade === 'M1'));
  assert.ok(m2.every((u) => u.grade === 'M2'));
  assert.ok(m3.every((u) => u.grade === 'M3'));
});

test('3. Verification of audited fixes', () => {
  // M1-U15: sauce bug fixed
  const m1u15 = getWorksheetUnit('M1-U15');
  assert.ok(m1u15, 'M1-U15 exists');
  const sauceAnswers = m1u15.questions.filter((q) => q.answer === 'sauce');
  assert.equal(sauceAnswers.length, 0, 'No dummy sauce answers in M1-U15');
  assert.equal(m1u15.questions[0].answer, 'manner');
  assert.equal(m1u15.questions[1].answer, 'female');

  // M2-U1: employ and refuse swap fixed
  const m2u1 = getWorksheetUnit('M2-U1');
  assert.ok(m2u1, 'M2-U1 exists');
  assert.equal(m2u1.questions[11].answer, 'employ');
  assert.equal(m2u1.questions[12].answer, 'refuse');

  // M2-U2: destroy and stress swap fixed
  const m2u2 = getWorksheetUnit('M2-U2');
  assert.ok(m2u2, 'M2-U2 exists');
  assert.equal(m2u2.questions[11].answer, 'destroy');
  assert.equal(m2u2.questions[12].answer, 'stress');
});

test('4. calculateWorksheetStars logic', () => {
  assert.equal(calculateWorksheetStars(15, 15), 3);
  assert.equal(calculateWorksheetStars(12, 15), 3); // 80%
  assert.equal(calculateWorksheetStars(10, 15), 2); // 66.6%
  assert.equal(calculateWorksheetStars(6, 15), 1);  // 40%
  assert.equal(calculateWorksheetStars(5, 15), 0);  // 33.3%
});

