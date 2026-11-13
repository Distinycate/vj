import test from 'node:test';
import assert from 'node:assert/strict';
import { GRAMMAR_TEACHING_UNITS } from '../data/grammar/grammarPresentationData.ts';

test('GRAMMAR_TEACHING_UNITS contains 10 sequential units with complete slides, questions, and keys', () => {
  assert.equal(GRAMMAR_TEACHING_UNITS.length, 10);

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

