import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAMMAR_TEACHING_UNITS,
  ONET_WRITING_BOOSTER_UNITS,
  QUICK_GRAMMAR_CHEAT_SHEETS,
  getGrammarUnitsByGrade,
  getGrammarUnitsByCategory,
} from '../data/grammar/grammarPresentationData.ts';

test('GRAMMAR_TEACHING_UNITS contains 25 self-contained units across M1, M2, M3, ONET and 6 topic categories', () => {
  assert.equal(GRAMMAR_TEACHING_UNITS.length, 25);

  assert.equal(getGrammarUnitsByGrade('ALL').length, 25);
  assert.equal(getGrammarUnitsByGrade('M1').length, 9);
  assert.equal(getGrammarUnitsByGrade('M2').length, 7);
  assert.equal(getGrammarUnitsByGrade('M3').length, 6);
  assert.equal(getGrammarUnitsByGrade('ONET').length, 3);

  assert.equal(getGrammarUnitsByCategory('ALL').length, 25);
  assert.equal(getGrammarUnitsByCategory('foundation').length, 6);
  assert.equal(getGrammarUnitsByCategory('tenses').length, 3);
  assert.equal(getGrammarUnitsByCategory('structures').length, 7);
  assert.equal(getGrammarUnitsByCategory('conversation').length, 3);
  assert.equal(getGrammarUnitsByCategory('vocabulary').length, 3);
  assert.equal(getGrammarUnitsByCategory('reading_writing').length, 3);

  const seenIds = new Set<string>();
  const seenQuestionIds = new Set<string>();

  for (let i = 0; i < GRAMMAR_TEACHING_UNITS.length; i++) {
    const unit = GRAMMAR_TEACHING_UNITS[i];
    assert.equal(unit.unitNumber, i + 1);
    assert.ok(unit.id.length > 0);
    assert.ok(!seenIds.has(unit.id), `Duplicate unit id: ${unit.id}`);
    seenIds.add(unit.id);

    assert.ok(unit.title.trim().length > 0);
    assert.ok(unit.goldenTrick.trim().length > 0);
    assert.ok(unit.gradeLevel, `Unit ${unit.unitNumber} must have a gradeLevel`);
    assert.ok(unit.gradeLabel, `Unit ${unit.unitNumber} must have a gradeLabel`);
    assert.ok(unit.category, `Unit ${unit.unitNumber} must have a category`);
    assert.ok(unit.categoryLabel, `Unit ${unit.unitNumber} must have a categoryLabel`);
    assert.ok(unit.durationMinutes && unit.durationMinutes > 0, `Unit ${unit.unitNumber} must have durationMinutes`);
    assert.ok(
      Array.isArray(unit.recommendedWorksheets) && unit.recommendedWorksheets.length > 0,
      `Unit ${unit.unitNumber} must have recommendedWorksheets`,
    );
    assert.ok(unit.conceptSlides.length >= 2, `Unit ${unit.unitNumber} must have at least 2 concept slides`);

    for (const slide of unit.conceptSlides) {
      assert.ok(slide.slideTitle.trim().length > 0);
      assert.ok(slide.keyFormula.trim().length > 0);
      assert.ok(slide.bulletPoints.length >= 3);
      assert.ok(slide.signalTable.length >= 2);
      assert.ok(slide.commonTrap.trap.trim().length > 0);
      assert.ok(slide.commonTrap.howToFix.trim().length > 0);
      assert.ok(slide.teacherScript.trim().length > 0);
    }

    assert.equal(unit.practiceQuestions.length, 5, `Unit ${unit.unitNumber} must have 5 practice questions`);
    assert.equal(unit.realOnetQuestions.length, 3, `Unit ${unit.unitNumber} must have 3 real O-NET questions`);

    const allQuestions = [...unit.practiceQuestions, ...unit.realOnetQuestions];
    for (const q of allQuestions) {
      assert.ok(!seenQuestionIds.has(q.id), `Duplicate question id: ${q.id}`);
      seenQuestionIds.add(q.id);
      assert.equal(q.choices.length, 4);
      assert.equal(q.choiceBreakdowns.length, 4);
      assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3);
      assert.ok(q.clueText.trim().length > 0);
      assert.ok(q.eliminatedIndices.length === 2, `Question ${q.id} should eliminate 2 wrong choices`);
      assert.ok(
        !q.eliminatedIndices.includes(q.correctIndex),
        `Question ${q.id} must not eliminate correctIndex`,
      );
      assert.ok(q.explanation.trim().length > 0);
      assert.ok(q.teacherScript.trim().length > 0);
    }
  }
});

test('ONET_WRITING_BOOSTER_UNITS contains 9 units (5 Core Writing Booster + 4 Full-Year 2565-2568 Exams) with 4-dimension deep analysis', () => {
  assert.equal(ONET_WRITING_BOOSTER_UNITS.length, 9);

  for (const unit of ONET_WRITING_BOOSTER_UNITS) {
    assert.ok(unit.unitNumber >= 101 && unit.unitNumber <= 109);
    assert.ok(unit.conceptSlides.length >= 2);
    assert.equal(unit.practiceQuestions.length, 5);
    assert.ok(unit.realOnetQuestions.length >= 4);

    for (const q of [...unit.practiceQuestions, ...unit.realOnetQuestions]) {
      assert.ok(q.clueText.trim().length > 0, `Missing clueText in ${q.id}`);
      assert.ok(Array.isArray(q.howToApproach) && q.howToApproach.length >= 2, `Missing howToApproach in ${q.id}`);
      assert.ok(q.mustKnowRule && q.mustKnowRule.trim().length > 0, `Missing mustKnowRule in ${q.id}`);
      assert.ok(Array.isArray(q.essentialVocab) && q.essentialVocab.length >= 2, `Missing essentialVocab in ${q.id}`);
      assert.equal(q.choices.length, 4);
      assert.equal(q.choiceBreakdowns.length, 4);
    }
  }
});

test('QUICK_GRAMMAR_CHEAT_SHEETS contains 8 quick-reference topics including Adjective Order, Sentence Structure, Prepositions, Collocations, and Tenses', () => {
  assert.equal(QUICK_GRAMMAR_CHEAT_SHEETS.length, 8);
  const ids = QUICK_GRAMMAR_CHEAT_SHEETS.map((s) => s.id);
  assert.deepEqual(ids, [
    'adjective-order',
    'sentence-structure',
    'prepositions',
    'collocations-phrasals',
    'tenses-overview',
    'connectors',
    'core-structures',
    'quantifiers-agreement',
  ]);

  for (const sheet of QUICK_GRAMMAR_CHEAT_SHEETS) {
    assert.ok(sheet.title.length > 0);
    assert.ok(sheet.shortTitle.length > 0);
    assert.ok(sheet.summaryFormula.length > 0);
    assert.ok(sheet.memoryTip.length > 0);
    assert.ok(sheet.sections.length >= 1);
    for (const sec of sheet.sections) {
      assert.ok(sec.heading.length > 0);
      assert.ok(sec.rows.length >= 1);
    }
    assert.ok(sheet.examTraps.length >= 1);
  }
});
