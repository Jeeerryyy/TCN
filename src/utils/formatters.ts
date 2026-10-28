/**
 * Utility functions for currency, time display, and formatting.
 */

// Formats number into Indian Rupee format (e.g. ₹ 1,450)
export function formatINR(amount: number): string {
  if (isNaN(amount)) return '₹ 0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Converts elapsed milliseconds into human-readable HH:MM:SS
export function formatDurationHMS(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

// Formats short date and time (e.g., 25 Oct, 03:15 PM)
export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

// Formats time only in 12-hour format with AM/PM (e.g., 03:15 PM)
export function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

// Returns YYYY-MM-DD string in local device time without timezone drift
export function getLocalDateString(dateInput: Date | string | number = new Date()): string {
  try {
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      // If already YYYY-MM-DD format (like manual entry dates)
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      const d = new Date(trimmed);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const d = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

// Extracts the local YYYY-MM-DD date string from a bill
export function getBillDateString(bill: { settledAt?: string; createdAt?: string }): string {
  const raw = bill.settledAt || bill.createdAt;
  if (!raw) return '';
  return getLocalDateString(raw);
}

// Formats a YYYY-MM-DD or ISO string into a clean Indian/British formatted date (e.g., 28 Oct 2026)
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
