/** Night-shift friendly dark palette. */
export const theme = {
  bg: '#0E1116',
  card: '#1A1F27',
  cardAlt: '#232A35',
  border: '#2E3745',
  text: '#F2F5F9',
  textDim: '#94A1B2',
  accent: '#34C77B', // "go here" green
  warn: '#F2B134',
  bad: '#E5534B',
  radius: 14,
};

export function scoreColor(score: number): string {
  if (score >= 10) return theme.accent;
  if (score >= 6) return theme.warn;
  return theme.textDim;
}
