import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePuzzleStars,
  scrambleWordLetters,
  PUZZLE_MISSION_LEVEL,
  PUZZLE_TOTAL_STAGES,
} from './puzzleEngine.ts';
import { getStagePuzzle, STAGE_PUZZLES_DATA } from '../../data/puzzles/stagePuzzlesData.ts';

test('1. Puzzle Engine constants and dataset integrity', () => {
  assert.equal(PUZZLE_MISSION_LEVEL, 50);
  assert.equal(PUZZLE_TOTAL_STAGES, 100);
  assert.equal(Object.keys(STAGE_PUZZLES_DATA).length, 100);

  for (let s = 1; s <= 100; s++) {
    const puzzle = getStagePuzzle(s);
    assert.ok(puzzle, `Stage ${s} puzzle must exist`);
    assert.ok(puzzle.rows >= 3 && puzzle.rows <= 20, `Stage ${s} valid row bounds`);
    assert.ok(puzzle.cols >= 3 && puzzle.cols <= 20, `Stage ${s} valid col bounds`);
    assert.ok(puzzle.words.length >= 3, `Stage ${s} must have at least 3 words`);

    // Verify word bounds inside grid
    for (const w of puzzle.words) {
      assert.ok(w.word.length >= 3, `Word ${w.word} in stage ${s} has valid length`);
      assert.ok(w.row >= 0 && w.row < puzzle.rows, `Word row within grid`);
      assert.ok(w.col >= 0 && w.col < puzzle.cols, `Word col within grid`);
      if (w.direction === 'across') {
        assert.ok(w.col + w.word.length <= puzzle.cols, `Across word stays in bounds`);
      } else {
        assert.ok(w.row + w.word.length <= puzzle.rows, `Down word stays in bounds`);
      }
    }
  }
});

test('2. calculatePuzzleStars rules', () => {
  assert.equal(calculatePuzzleStars(0), 3);
  assert.equal(calculatePuzzleStars(1), 2);
  assert.equal(calculatePuzzleStars(2), 2);
  assert.equal(calculatePuzzleStars(3), 1);
  assert.equal(calculatePuzzleStars(5), 1);
});

test('3. scrambleWordLetters produces valid uppercase multiset of letters', () => {
  const letters = scrambleWordLetters('heart');
  assert.equal(letters.length, 5);
  assert.deepEqual([...letters].sort(), ['A', 'E', 'H', 'R', 'T']);
});
