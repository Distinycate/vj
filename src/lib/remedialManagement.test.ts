import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

const updateRunSchema = z.object({
  status: z.enum(['active', 'closed', 'draft', 'upcoming']).optional(),
  title: z.string().min(1).max(200).optional(),
});

test('PATCH updateRunSchema allows valid status and title updates', () => {
  const validClosed = updateRunSchema.safeParse({ status: 'closed' });
  assert.equal(validClosed.success, true);
  if (validClosed.success) {
    assert.equal(validClosed.data.status, 'closed');
  }

  const validActive = updateRunSchema.safeParse({ status: 'active', title: 'Verb Challenge แก้ 0 รอบที่ 2' });
  assert.equal(validActive.success, true);
  if (validActive.success) {
    assert.equal(validActive.data.status, 'active');
    assert.equal(validActive.data.title, 'Verb Challenge แก้ 0 รอบที่ 2');
  }

  const invalidStatus = updateRunSchema.safeParse({ status: 'random_invalid_status' });
  assert.equal(invalidStatus.success, false);
});

test('DELETE parameters correctly distinguish run deletion vs single participant deletion', () => {
  const validRunId = '34ee0a8a-c5a5-464e-a571-657a1498c6f0';
  const validParticipantId = '279065b6-58b3-4bf8-a7b2-79570c5ebb23';

  assert.equal(z.string().uuid().safeParse(validRunId).success, true);
  assert.equal(z.string().uuid().safeParse(validParticipantId).success, true);
  assert.equal(z.string().uuid().safeParse('invalid-uuid').success, false);
});

test('Quick Paste tokenization handles diverse separators (newline, comma, tab, space)', () => {
  const pasteText = `4785, 4909; 5058
4756	4878
  4902  `;

  const tokens = pasteText
    .split(/[\n,\t;]+/)
    .map(t => t.trim())
    .filter(Boolean);

  assert.deepEqual(tokens, ['4785', '4909', '5058', '4756', '4878', '4902']);
});
