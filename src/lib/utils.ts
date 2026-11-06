import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(year, month - 1, day));
  } catch {
    return dateStr;
  }
}

export function formatPeriod(period: string): string {
  if (!period) return '—';
  try {
    const [year, month] = period.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
    }).format(new Date(year, month - 1, 1));
  } catch {
    return period;
  }
}
