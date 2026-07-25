import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const demoPage = readFileSync('src/app/demo/page.tsx', 'utf8');
const preTest = readFileSync('src/components/PreTest.tsx', 'utf8');

test('demo pretest exit returns to the demo dashboard instead of logging out', () => {
  assert.match(demoPage, /<PreTest[\s\S]*onExit=\{\(\) => switchView\('dashboard'\)\}/);
  assert.match(demoPage, /onDashboard=\{\(\) => switchView\('dashboard'\)\}/);
  assert.match(preTest, /onExit\?: \(\) => void/);
  assert.match(preTest, /useDemoStore\.getState\(\)\.isDemoMode[\s\S]*onExit\?\.\(\)/);
  assert.doesNotMatch(preTest, /onClick=\{\(\) => useAppStore\.getState\(\)\.logout\(\)\}/);
});

test('real pretest still uses the normal logout and dashboard navigation fallbacks', () => {
  assert.match(preTest, /logout\(\);/);
  assert.match(preTest, /setScreen\('dashboard'\);/);
});
