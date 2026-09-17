export const STUDENT_SESSION_KEY = 'vocab_journey_student';

export type StudentSession = {
  id: string;
  username?: string;
  student_name?: string;
  name?: string;
  classroom_id?: string | null;
  user_type?: 'INTERNAL' | 'EXTERNAL';
  school_name?: string | null;
  is_verified?: boolean;
};

export function saveStudentSession(student: StudentSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify({
    id: student.id,
    username: student.username,
    student_name: student.student_name || student.name,
    name: student.name || student.student_name,
    classroom_id: student.classroom_id ?? null,
    user_type: student.user_type || 'INTERNAL',
    school_name: student.school_name ?? null,
    is_verified: student.is_verified ?? false,
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
