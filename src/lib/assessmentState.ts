export interface AssessmentRecord {
  score: number;
  total_questions: number;
  created_at: string;
}

// Reports use a 25-point baseline, including short tests caused by a small vocabulary pool.
export function summarizePretests(rows: AssessmentRecord[], required = 5) {
  const valid = rows.filter(row => Number.isFinite(row.score) && row.total_questions > 0 && row.score >= 0 && row.score <= row.total_questions);
  const latest = [...valid].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, required);
  return {
    count: valid.length,
    score: latest.length ? Math.round(latest.reduce((sum, row) => sum + row.score / row.total_questions * 25, 0) / latest.length * 10000) / 10000 : null,
    completed: valid.length >= required,
    completedAt: valid.length >= required ? latest[0].created_at : null,
  };
}
