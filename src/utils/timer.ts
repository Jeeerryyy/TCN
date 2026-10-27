import { TableSession } from '../types/table.types';

/**
 * Calculates accurate active elapsed seconds for a table session.
 * Excludes paused intervals.
 */
export function calculateElapsedSeconds(session: TableSession): number {
  if (!session || !session.startTime) return 0;

  const startMs = new Date(session.startTime).getTime();
  const nowMs = session.endTime ? new Date(session.endTime).getTime() : Date.now();
  
  // Total raw duration between start and now (or end)
  let rawElapsedMs = nowMs - startMs;

  // Subtract already finalized paused duration
  rawElapsedMs -= (session.totalPausedDurationMs || 0);

  // If currently paused, subtract the time spent in the active pause state
  if (session.status === 'paused' && session.pausedAt) {
    const currentPauseMs = nowMs - new Date(session.pausedAt).getTime();
    if (currentPauseMs > 0) {
      rawElapsedMs -= currentPauseMs;
    }
  }

  const seconds = Math.floor(rawElapsedMs / 1000);
  return seconds > 0 ? seconds : 0;
}

/**
 * Calculates game charges on an exact per-minute basis:
 * - Table charge = total active minutes * price per minute.
 * - Price per minute is either customRatePerMinute or derived from ratePerHour / 60
 *   (e.g., ₹150/hr = ₹2.50/min, ₹180/hr = ₹3.00/min, ₹300/hr = ₹5.00/min).
 * - Minimum duration threshold (minMinutes) is applied if configured (default 0).
 * - Total bill is rounded to the nearest integer rupee using Math.round.
 *
 * Examples:
 *   Rate ₹150/hr (₹2.50/min):
 *     10 mins -> 10 * 2.50 = ₹25
 *     24 mins -> 24 * 2.50 = ₹60
 *     45 mins -> 45 * 2.50 = ₹112.50 -> ₹113
 *     60 mins -> 60 * 2.50 = ₹150
 *     75 mins -> 75 * 2.50 = ₹187.50 -> ₹188
 *
 *   Rate ₹300/hr (₹5.00/min):
 *     30 mins -> 30 * 5.00 = ₹150
 *     75 mins -> 75 * 5.00 = ₹375
 */
export function calculateSessionCharge(
  elapsedSeconds: number,
  ratePerHour: number,
  minMinutes: number = 0,
  customRatePerMinute?: number
): {
  billedMinutes: number;
  billedHours: number;
  ratePerMinute: number;
  amount: number;
} {
  const safeSeconds = Math.max(0, elapsedSeconds);
  const elapsedMinutes = Math.floor(safeSeconds / 60);

  const effectiveMinMinutes = minMinutes > 0 ? minMinutes : 0;
  const billedMinutes = Math.max(effectiveMinMinutes, elapsedMinutes);

  // Derive per-minute rate (e.g., 150 / 60 = 2.50)
  const ratePerMinute =
    typeof customRatePerMinute === 'number' && customRatePerMinute > 0
      ? customRatePerMinute
      : Number((ratePerHour / 60).toFixed(2));

  // Total bill = total time in minutes multiplied by price per minute
  const amount = Math.round(billedMinutes * ratePerMinute);
  const billedHours = Number((billedMinutes / 60).toFixed(1));

  return { billedMinutes, billedHours, ratePerMinute, amount };
}
