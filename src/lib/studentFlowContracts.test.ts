import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
const game = readFileSync('src/components/Game.tsx', 'utf8');
const appStore = readFileSync('src/store/useAppStore.ts', 'utf8');
const cardCenter = readFileSync('src/components/CardCenterModal.tsx', 'utf8');

test('student dashboard opens exactly one card center modal', () => {
  const modalRenderCount = (dashboard.match(/<CardCenterModal/g) || []).length;
  assert.equal(modalRenderCount, 1);
  assert.match(dashboard, /showCardCenter && !isExternalUser && <CardCenterModal/);
});

test('completed stages are clickable replay buttons without changing current progress', () => {
  assert.match(appStore, /selectedStageNumber: number \| null/);
  assert.match(appStore, /setSelectedStageNumber: \(stageNumber: number \| null\) => void/);
  assert.match(dashboard, /stageState === 'completed' \? 'เล่นซ้ำ'/);
  assert.match(dashboard, /setSelectedStageNumber\(stageState === 'current' \? null : stageNum\)/);
  assert.match(dashboard, /setScreen\('game'\)/);
});

test('game uses the selected replay stage and clears it when returning to the map', () => {
  assert.match(game, /selectedStageNumber \|\| progress\?\.current_stage \|\| 1/);
  assert.match(game, /setSelectedStageNumber\(null\)/);
  assert.match(game, /const handleFinishGame = \(\) => \{/);
});

test('card center shows loading and query errors instead of failing silently', () => {
  assert.match(cardCenter, /const \[loading, setLoading\] = useState\(true\)/);
  assert.match(cardCenter, /โหลดศูนย์การ์ดไม่สำเร็จ/);
  assert.match(cardCenter, /Array\.isArray\(row\.cards\) \? row\.cards\[0\] : row\.cards/);
  assert.match(cardCenter, /กำลังโหลดคลังการ์ดของคุณ/);
});

test('card center demo mode uses mock data and does not write real card actions', () => {
  assert.match(cardCenter, /student\.is_demo_account \|\| useDemoStore\.getState\(\)\.isDemoMode/);
  assert.match(cardCenter, /demo-card-shield/);
  assert.match(cardCenter, /โหมดสาธิต: สุ่มการ์ดตัวอย่างสำเร็จ/);
  assert.match(cardCenter, /โหมดสาธิต: ส่งคำขอใช้การ์ดตัวอย่างแล้ว/);
});
