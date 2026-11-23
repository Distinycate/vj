import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { toLiveGameQuestion, gradeLiveGameAnswer } from './liveGameQuestions.ts';

const question = {
  id: 'private-vocabulary-id', public_id: 'public-question-id',
  word: 'ability', prompt: 'ฟังคำศัพท์', meaning: 'ความสามารถ',
  correct_answer: 'ability', correct_word_id: 'private-vocabulary-id',
  qType: 'LISTENING_MC', question_type: 'listening_mc', answer_language: 'en',
  audio_url: 'https://example.com/ability.mp3',
  choices: [
    { word_id: 'private-vocabulary-id', public_id: 'option-a', text: 'ability', is_correct: true },
    { word_id: 'another-vocabulary-id', public_id: 'option-b', text: 'able', is_correct: false },
  ],
};

test('live question returns a strict public allowlist and opaque choice IDs', () => {
  assert.deepEqual(toLiveGameQuestion(question, 'NORMAL'), {
    id: 'public-question-id', qType: 'LISTENING_MC', question_type: 'listening_mc',
    answer_language: 'en', prompt: 'ฟังคำศัพท์', stageType: 'NORMAL', serverGraded: true,
    choices: [{ word_id: 'option-a', text: 'ability' }, { word_id: 'option-b', text: 'able' }],
  });
});

test('server grades only a presented opaque option, not the raw expected word', () => {
  assert.equal(gradeLiveGameAnswer(question, 'option-a'), true);
  assert.equal(gradeLiveGameAnswer(question, 'option-b'), false);
  assert.equal(gradeLiveGameAnswer(question, 'ability'), false);
  assert.equal(gradeLiveGameAnswer(question, 'private-vocabulary-id'), false);
  assert.equal(gradeLiveGameAnswer(question, ''), false);
  assert.equal(gradeLiveGameAnswer({ ...question, question_type: 'spelling' }, ' Ability '), true);
});

test('new live attempts never use uncommitted browser answers for final scoring', () => {
  const start = readFileSync('src/app/api/game/start/route.ts', 'utf8');
  const complete = readFileSync('src/app/api/game/complete/route.ts', 'utf8');
  assert.match(start, /toLiveGameQuestion\(question, stageType\)/);
  assert.match(complete, /complete_private_game_stage/);
  assert.ok(existsSync('src/app/api/game/answer/route.ts'));
});
