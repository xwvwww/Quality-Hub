export function parseDuration(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 0;
  const compact = normalized.replace(/\s+/g, '');
  const matches = [...compact.matchAll(/(\d+)(h|m|s)/g)];
  if (!matches.length || matches.map(match => match[0]).join('') !== compact) return null;
  const seen = new Set<string>(); let total = 0;
  for (const [, raw, unit] of matches) {
    if (seen.has(unit)) return null; seen.add(unit);
    const amount = Number(raw); total += unit === 'h' ? amount * 3600 : unit === 'm' ? amount * 60 : amount;
  }
  return total <= 31_536_000 ? total : null;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600); const minutes = Math.floor(seconds % 3600 / 60); const rest = seconds % 60;
  return [hours ? `${hours}h` : '', minutes ? `${minutes}m` : '', rest || (!hours && !minutes) ? `${rest}s` : ''].filter(Boolean).join(' ');
}
