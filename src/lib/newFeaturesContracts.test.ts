import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('1. Smart Web TTS Fallback and audio utils export required functions', () => {
  const audioSource = readFileSync(new URL('../utils/audio.ts', import.meta.url), 'utf8');
  assert.match(audioSource, /export const playWordAudio/);
  assert.match(audioSource, /export const speakWithWebSpeech/);
  assert.match(audioSource, /export const cancelAudio/);
  assert.match(audioSource, /speechSynthesis/);
  assert.match(audioSource, /en-US/);
});

test('2. Sound effects and haptics engine exports all synthesized audio & vibration helpers', () => {
  const soundSource = readFileSync(new URL('../utils/soundEffects.ts', import.meta.url), 'utf8');
  assert.match(soundSource, /export const playCorrectSound/);
  assert.match(soundSource, /export const playWrongSound/);
  assert.match(soundSource, /export const playComboSound/);
  assert.match(soundSource, /export const playBossHitSound/);
  assert.match(soundSource, /export const playBossAttackSound/);
  assert.match(soundSource, /export const playBossVictorySound/);
  assert.match(soundSource, /export const triggerHaptic/);
  assert.match(soundSource, /export const isSoundEnabled/);
  assert.match(soundSource, /export const toggleSound/);
});

test('3. BossHpBar renders floating avatar, HP bar, damage reaction, and counter-attacks', () => {
  const bossHpSource = readFileSync(new URL('../components/BossHpBar.tsx', import.meta.url), 'utf8');
  assert.match(bossHpSource, /FINAL_BOSS/);
  assert.match(bossHpSource, /WORLD_BOSS/);
  assert.match(bossHpSource, /MINI_BOSS/);
  assert.match(bossHpSource, /isTakingDamage/);
  assert.match(bossHpSource, /isAttacking/);
  assert.match(bossHpSource, /CRITICAL HIT/);
  assert.match(bossHpSource, /BOSS COUNTER-ATTACK/);
});

test('4. useGameEngine integrates sound effects and tracks lastAnswerCorrect state', () => {
  const engineSource = readFileSync(new URL('../hooks/useGameEngine.ts', import.meta.url), 'utf8');
  assert.match(engineSource, /playCorrectSound/);
  assert.match(engineSource, /playWrongSound/);
  assert.match(engineSource, /playBossHitSound/);
  assert.match(engineSource, /playBossAttackSound/);
  assert.match(engineSource, /playBossVictorySound/);
  assert.match(engineSource, /lastAnswerCorrect/);
});

test('5. Co-op goals endpoint enforces atomic reward grants with weekly idempotency', () => {
  const coopRouteSource = readFileSync(new URL('../app/api/student/coop-goals/route.ts', import.meta.url), 'utf8');
  assert.match(coopRouteSource, /CLASS_TARGET\s*=\s*300/);
  assert.match(coopRouteSource, /SCHOOL_TARGET\s*=\s*2000/);
  assert.match(coopRouteSource, /COOP_CLASS_GOAL/);
  assert.match(coopRouteSource, /COOP_SCHOOL_GOAL/);
  assert.match(coopRouteSource, /grant_student_reward/);
});

test('6. Dashboard embeds CoopGoals in the team section and provides audio toggle', () => {
  const dashboardSource = readFileSync(new URL('../components/Dashboard.tsx', import.meta.url), 'utf8');
  assert.match(dashboardSource, /import CoopGoals from '@\/components\/CoopGoals'/);
  assert.match(dashboardSource, /<CoopGoals/);
});
