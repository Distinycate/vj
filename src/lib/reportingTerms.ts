export const reportingTerms = {
  '1': { start: '2026-04-30T17:00:00.000Z', end: '2026-10-31T17:00:00.000Z' },
  '2': { start: '2026-10-31T17:00:00.000Z', end: '2027-04-30T17:00:00.000Z' },
} as const;

export type ReportingTerm = keyof typeof reportingTerms;

export function bangkokMonth(timestamp: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' })
    .formatToParts(new Date(timestamp));
  return parts.find(p => p.type === 'year')?.value + '-' + parts.find(p => p.type === 'month')?.value;
}
