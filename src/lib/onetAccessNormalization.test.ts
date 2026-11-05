import test from 'node:test';
import assert from 'node:assert/strict';

function checkStudentYearAccess(
  openYears: Record<string, any>,
  year: number | string,
  studentClassroom: string
) {
  const cfg = openYears[String(year)];
  const isOpen = Boolean(cfg?.isOpen ?? cfg?.is_open);
  const allowedRooms = Array.isArray(cfg?.allowedClassrooms)
    ? cfg.allowedClassrooms
    : Array.isArray(cfg?.allowed_classrooms)
    ? cfg.allowed_classrooms
    : [];

  const isAllowed =
    isOpen && (allowedRooms.includes('ALL') || allowedRooms.includes(studentClassroom));

  return { isOpen, isAllowed, allowedRooms };
}

test('ONET Access Normalization: snake_case DB format (is_open, allowed_classrooms)', () => {
  const openYears = {
    '2568': {
      is_open: true,
      allowed_classrooms: ['ม.3/1'],
    },
  };

  const res31 = checkStudentYearAccess(openYears, 2568, 'ม.3/1');
  assert.equal(res31.isOpen, true, 'Year 2568 should be open');
  assert.equal(res31.isAllowed, true, 'ม.3/1 should be allowed');

  const res32 = checkStudentYearAccess(openYears, 2568, 'ม.3/2');
  assert.equal(res32.isOpen, true);
  assert.equal(res32.isAllowed, false, 'ม.3/2 should NOT be allowed when only ม.3/1 is open');
});

test('ONET Access Normalization: camelCase format (isOpen, allowedClassrooms)', () => {
  const openYears = {
    '2568': {
      isOpen: true,
      allowedClassrooms: ['ม.3/1', 'ม.3/2'],
    },
  };

  const res31 = checkStudentYearAccess(openYears, 2568, 'ม.3/1');
  assert.equal(res31.isAllowed, true);

  const res32 = checkStudentYearAccess(openYears, 2568, 'ม.3/2');
  assert.equal(res32.isAllowed, true);
});

test('ONET Access Normalization: ALL classrooms wildcard', () => {
  const openYears = {
    '2567': {
      is_open: true,
      allowed_classrooms: ['ALL'],
    },
  };

  const resAny = checkStudentYearAccess(openYears, 2567, 'ม.3/5');
  assert.equal(resAny.isAllowed, true, 'ALL should allow any classroom');
});

test('ONET Access Normalization: Closed year blocks all students', () => {
  const openYears = {
    '2566': {
      is_open: false,
      allowed_classrooms: ['ม.3/1'],
    },
  };

  const res = checkStudentYearAccess(openYears, 2566, 'ม.3/1');
  assert.equal(res.isOpen, false);
  assert.equal(res.isAllowed, false, 'Closed year must block access even if room is listed');
});
