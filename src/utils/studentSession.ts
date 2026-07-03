export const STUDENT_SESSION_KEY = 'vocab_journey_student';

export type StudentSession = {
  id: string;
  student_name?: string;
  classroom_id?: string | null;
};

export function saveStudentSession(student: StudentSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify({
    id: student.id,
    student_name: student.student_name,
    classroom_id: student.classroom_id ?? null,
  }));
}

export function getStudentSession(): StudentSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(localStorage.getItem(STUDENT_SESSION_KEY) || 'null');
    return value?.id ? value : null;
  } catch {
    return null;
  }
}

export function clearStudentSession() {
  if (typeof window !== 'undefined') localStorage.removeItem(STUDENT_SESSION_KEY);
}
