export type ClassValue = string | false | null | undefined;

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ');
}

export function formatDate(value?: string | null, locale = 'en') {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function capitalizeWords(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getStatusLabel(status: string) {
  return capitalizeWords(status);
}

export function getPriorityLabel(priority: string) {
  return capitalizeWords(priority);
}

export function excerpt(value: string, maxLength = 140) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}…`;
}

export function getInitials(name?: string | null) {
  if (!name) {
    return 'US';
  }

  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

export function toSearchPattern(value?: string | null) {
  if (!value) {
    return undefined;
  }

  return `%${value.replace(/[,%]/g, ' ').trim()}%`;
}
