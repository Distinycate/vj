import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_WORKSHEETS,
  getWorksheetsByGrade,
  getWorksheetUnit,
  calculateWorksheetStars,
} from '../../data/worksheets/index.ts';
import {
  calculateStudentReading,
  calculateStudentTrait,
  getStudentOverallReading,
  getStudentRationale,
  isStudentTested,
} from '../../utils/pp5Evaluation.ts';

test('1. Worksheets dataset completeness (57 units across M1, M2, M3) and structure', () => {
  assert.equal(ALL_WORKSHEETS.length, 57, 'Must have all 57 units populated (18 M1 + 19 M2 + 20 M3)');

  const idSet = new Set<string>();
  const unitIdSet = new Set<string>();

  for (const unit of ALL_WORKSHEETS) {
    assert.ok(unit.unitId, 'Unit must have a unitId');
    assert.ok(!unitIdSet.has(unit.unitId), `Duplicate unitId: ${unit.unitId}`);
    unitIdSet.add(unit.unitId);

    assert.ok(unit.title, `Unit ${unit.unitId} must have a title`);
    assert.ok(unit.questions.length >= 7, `Unit ${unit.unitId} must have at least 7 questions`);

    const bankLower = unit.wordBank
      ? new Set(unit.wordBank.map((w) => w.toLowerCase().trim()))
      : null;

    for (const q of unit.questions) {
      assert.ok(!idSet.has(q.id), `Question ID ${q.id} must be unique`);
      idSet.add(q.id);
      assert.ok(q.prompt && q.prompt.length > 5, `Question ${q.id} must have a valid prompt`);
      assert.ok(q.answer && q.answer.length >= 1, `Question ${q.id} must have an answer`);
      assert.ok(
        q.thaiMeaning && q.thaiMeaning.trim().length > 0,
        `Question ${q.id} must have thaiMeaning`
      );
      assert.ok(
        q.explanationTh && q.explanationTh.trim().length > 0,
        `Question ${q.id} must have explanationTh`
      );

      // Verify wordBank / choices alignment
      if (q.choices && q.choices.length > 0) {
        const choicesLower = q.choices.map((c) => c.toLowerCase().trim());
        assert.ok(
          choicesLower.includes(q.answer.toLowerCase().trim()),
          `Question ${q.id} answer "${q.answer}" must be in choices`
        );
      } else if (bankLower) {
        const candidates = [q.answer, ...(q.acceptableAnswers || [])].map((a) =>
          a.toLowerCase().trim()
        );
        const matchesBank = candidates.some((c) => bankLower.has(c));
        assert.ok(
          matchesBank,
          `Question ${q.id} answer "${q.answer}" must match a word in ${unit.unitId} wordBank`
        );
      }
    }
  }
});

test('2. Grade filter functions return exact expected counts', () => {
  const m1 = getWorksheetsByGrade('M1');
  const m2 = getWorksheetsByGrade('M2');
  const m3 = getWorksheetsByGrade('M3');

  assert.equal(m1.length, 18, 'M1 has 18 units');
  assert.equal(m2.length, 19, 'M2 has 19 units');
  assert.equal(m3.length, 20, 'M3 has 20 units');

  assert.ok(m1.every((u) => u.grade === 'M1'));
  assert.ok(m2.every((u) => u.grade === 'M2'));
  assert.ok(m3.every((u) => u.grade === 'M3'));
});

test('3. Verification of audited fixes across M1, M2, M3', () => {
  // M1-U2: verb inflection alignment in wordBank (circles, picks, borrows)
  const m1u2 = getWorksheetUnit('M1-U2');
  assert.ok(m1u2 && m1u2.wordBank, 'M1-U2 exists with wordBank');
  assert.ok(m1u2.wordBank.includes('circles'));
  assert.ok(m1u2.wordBank.includes('picks'));
  assert.ok(m1u2.wordBank.includes('borrows'));

  // M1-U6: Adverbs 2 populated with full 10 items from PDF
  const m1u6 = getWorksheetUnit('M1-U6');
  assert.ok(m1u6, 'M1-U6 exists');
  assert.equal(m1u6.questions[0].answer, 'exactly');
  assert.equal(m1u6.questions[1].answer, 'clearly');

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

  // M2-U6: astronaut vs doctor swap fixed
  const m2u6 = getWorksheetUnit('M2-U6');
  assert.ok(m2u6, 'M2-U6 exists');
  assert.equal(m2u6.questions[11].answer, 'astronaut');
  assert.equal(m2u6.questions[12].answer, 'doctor');

  // M2-U8: button vs use swap fixed
  const m2u8 = getWorksheetUnit('M2-U8');
  assert.ok(m2u8, 'M2-U8 exists');
  assert.equal(m2u8.questions[0].answer, 'button');
  assert.equal(m2u8.questions[1].answer, 'use');
});

test('4. calculateWorksheetStars logic', () => {
  assert.equal(calculateWorksheetStars(15, 15), 3);
  assert.equal(calculateWorksheetStars(12, 15), 3); // 80%
  assert.equal(calculateWorksheetStars(10, 15), 2); // 66.6%
  assert.equal(calculateWorksheetStars(6, 15), 1);  // 40%
  assert.equal(calculateWorksheetStars(5, 15), 0);  // 33.3%
});

test('5. P.P.5 authentic assessment integration with worksheet metrics', () => {
  const untestedStudent = { id: 's0', worksheetsCompleted: 0, worksheetAccuracy: 0 };
  assert.equal(isStudentTested(untestedStudent), false);
  assert.equal(calculateStudentReading(untestedStudent, 'r1'), -1);

  const diligentWorksheetStudent = {
    id: 's1',
    worksheetsCompleted: 5,
    worksheetAccuracy: 80,
  };
  assert.equal(isStudentTested(diligentWorksheetStudent), true);
  assert.equal(calculateStudentReading(diligentWorksheetStudent, 'r1'), 3);
  assert.equal(calculateStudentReading(diligentWorksheetStudent, 'r2'), 3);
  assert.equal(calculateStudentReading(diligentWorksheetStudent, 'r3'), 3);
  assert.equal(getStudentOverallReading(diligentWorksheetStudent), 3);
  assert.equal(calculateStudentTrait(diligentWorksheetStudent, 't4'), 3);
  assert.ok(getStudentRationale(diligentWorksheetStudent).includes('ส่งใบงานคำศัพท์ครบ 5 บท'));
});

