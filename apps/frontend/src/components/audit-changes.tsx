type Change = { from?: unknown; to?: unknown };

const fieldLabels: Record<string, string> = {
  firstName: 'Имя',
  lastName: 'Фамилия',
  role: 'Роль',
  isActive: 'Статус',
  locale: 'Язык',
  timezone: 'Часовой пояс',
  emailNotifications: 'Email-уведомления',
  password: 'Пароль',
};

function valueOf(value: unknown) {
  if (value === true) return 'Да';
  if (value === false) return 'Нет';
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function AuditChanges({ metadata }: { metadata: Record<string, unknown> | null }) {
  const changes = metadata?.changes;
  if (changes && typeof changes === 'object' && !Array.isArray(changes)) {
    const entries = Object.entries(changes as Record<string, Change>);
    if (entries.length) return <div className="space-y-1.5">{entries.map(([field, change]) => <div key={field} className="text-xs"><b>{fieldLabels[field] ?? field}:</b> <span className="text-muted">{valueOf(change.from)}</span> <span aria-hidden>→</span> {valueOf(change.to)}</div>)}</div>;
  }
  if (!metadata || !Object.keys(metadata).length) return <span className="text-muted">—</span>;
  return <code className="text-[10px] whitespace-pre-wrap break-all">{JSON.stringify(metadata, null, 1)}</code>;
}
