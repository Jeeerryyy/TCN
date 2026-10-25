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
 * Calculates game charges on an hourly basis:
 * - Rates are strictly hourly. Even if a player plays 40 minutes (or any duration <= 60 mins),
 *   they are charged 1 full hourly rate.
 * - If the elapsed time exceeds the completed hour(s) by MORE THAN 20 minutes (> 20 mins grace),
 *   a new full hour's rate is added to the bill.
 * - If the excess time is 20 minutes or less (<= 20 mins), only the completed hour(s) are charged.
 *
 * Examples:
 *   10 mins  -> 1 hour
 *   40 mins  -> 1 hour
 *   60 mins  -> 1 hour
 *   75 mins (1h 15m) -> 1 hour (excess 15m <= 20m)
 *   80 mins (1h 20m) -> 1 hour (excess 20m <= 20m)
 *   81 mins (1h 21m) -> 2 hours (excess 21m > 20m, new hour rate added)
 *   120 mins (2h 00m) -> 2 hours
 *   140 mins (2h 20m) -> 2 hours (excess 20m <= 20m)
 *   141 mins (2h 21m) -> 3 hours (excess 21m > 20m, new hour rate added)
 */
export function calculateSessionCharge(
  elapsedSeconds: number,
  ratePerHour: number,
  _minMinutes: number = 60
): { billedMinutes: number; billedHours: number; amount: number } {
  const safeSeconds = Math.max(0, elapsedSeconds);
  const elapsedMinutes = Math.floor(safeSeconds / 60);

  let billedHours = 1;

  if (elapsedMinutes <= 60) {
    // 0 to 60 minutes: minimum charge is 1 full hour
    billedHours = 1;
  } else {
    // Over 60 minutes: calculate completed hours and extra minutes into the next hour
    const completedHours = Math.floor(elapsedMinutes / 60);
    const excessMinutes = elapsedMinutes % 60;

    // If time exceeds completed hour(s) by more than 20 minutes, add the new hour's rate
    if (excessMinutes > 20) {
      billedHours = completedHours + 1;
    } else {
      billedHours = completedHours;
    }
  }

  const billedMinutes = billedHours * 60;
  const amount = billedHours * ratePerHour;

  return { billedMinutes, billedHours, amount };
}
