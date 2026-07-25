import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const demoPage = readFileSync('src/app/demo/page.tsx', 'utf8');
const preTest = readFileSync('src/components/PreTest.tsx', 'utf8');
const studyCamp = readFileSync('src/components/StudyCamp.tsx', 'utf8');

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

test('demo bottom navigation leaves safe space for Study Camp controls', () => {
  assert.match(demoPage, /--demo-bottom-nav-space/);
  assert.match(demoPage, /max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(studyCamp, /min-h-\[calc\(100vh-var\(--demo-bottom-nav-space,0px\)\)\]/);
  assert.match(studyCamp, /useDemoStore\(\(state\) => state\.isDemoMode\)/);
  assert.match(studyCamp, /isDemoMode \? 'fixed left-1\/2 bottom-\[calc\(0\.75rem\+var\(--demo-bottom-nav-space,0px\)\)\]/);
  assert.match(studyCamp, /isDemoMode \? 'absolute top-4 right-4 w-12 h-12' : 'w-16 h-16'/);
  assert.match(studyCamp, /flex-1 min-h-0 flex flex-col/);
});
