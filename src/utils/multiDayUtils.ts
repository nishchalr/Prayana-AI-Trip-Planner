import { MonolithStop } from '../types';

/**
 * Computes total trip days from ISO check-in / check-out date strings.
 * Always returns at least 1 day.
 */
export function computeTotalDays(
  checkInDate?: string,
  checkOutDate?: string,
  fallbackDays = 3
): number {
  if (!checkInDate || !checkOutDate) return Math.max(1, fallbackDays);
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diffMs = end.getTime() - start.getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) return Math.max(1, fallbackDays);
  return Math.max(1, Math.round(diffMs / 86400000));
}

/**
 * Formats minutes from midnight into `HH:MM AM/PM` (e.g. `510` -> `08:30 AM`).
 */
export function formatSlotTime(minutesFromMidnight: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutesFromMidnight)));
  const h24 = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
}

/**
 * Recalculates sequential timings starting at `08:30 AM` and sequential `index`
 * for every stop on the specified `targetDay`, leaving other days untouched.
 */
export function recalculateDayTimings(
  stops: MonolithStop[],
  targetDay: number
): MonolithStop[] {
  let currentMins = 8 * 60 + 30; // 08:30 AM
  let dayIdx = 0;

  return stops.map((stop) => {
    const stopDay = stop.day ?? 1;
    if (stopDay !== targetDay) return stop;

    dayIdx += 1;
    const updated: MonolithStop = {
      ...stop,
      day: targetDay,
      index: dayIdx,
      optimalTime: formatSlotTime(currentMins),
    };
    const dwell = stop.dwellMinutes > 0 ? stop.dwellMinutes : 60;
    const transitBuffer = 25;
    currentMins += dwell + transitBuffer;
    return updated;
  });
}

/**
 * Equally distributes `selectedStops` across `1..totalDays` (e.g. 8 stops over 3 days -> 3, 3, 2;
 * 8 stops over 4 days -> 2, 2, 2, 2), auto-filling from `allCorridorStops` if `totalDays > selectedStops.length`,
 * and recalculates sequential timings per day from 08:30 AM.
 */
export function distributeStopsAcrossDays(
  selectedStops: MonolithStop[],
  totalDays: number,
  allCorridorStops?: MonolithStop[]
): MonolithStop[] {
  const days = Math.max(1, Math.floor(totalDays));
  const pool: MonolithStop[] = [...selectedStops];

  if (pool.length < days && Array.isArray(allCorridorStops)) {
    const existingIds = new Set(pool.map((s) => s.id));
    for (const candidate of allCorridorStops) {
      if (pool.length >= days) break;
      if (!existingIds.has(candidate.id)) {
        pool.push(candidate);
        existingIds.add(candidate.id);
      }
    }
  }

  if (pool.length === 0) return [];

  const base = Math.floor(pool.length / days);
  const remainder = pool.length % days;
  const distributed: MonolithStop[] = [];
  let cursor = 0;

  for (let d = 1; d <= days; d++) {
    const count = base + (d <= remainder ? 1 : 0);
    let currentMins = 8 * 60 + 30; // 08:30 AM
    for (let i = 0; i < count && cursor < pool.length; i++) {
      const stop = pool[cursor++];
      distributed.push({
        ...stop,
        day: d,
        index: i + 1,
        optimalTime: formatSlotTime(currentMins),
      });
      const dwell = stop.dwellMinutes > 0 ? stop.dwellMinutes : 60;
      currentMins += dwell + 25;
    }
  }

  return distributed;
}

/**
 * Normalizes stops loaded from cache/Firestore so every stop has a valid `day` in `1..totalDays`.
 */
export function normalizeStopsWithDays(
  stops: MonolithStop[],
  totalDays: number,
  allCorridorStops?: MonolithStop[]
): MonolithStop[] {
  const days = Math.max(1, Math.floor(totalDays));
  const hasMissingDay = stops.some((s) => typeof s.day !== 'number' || s.day < 1 || s.day > days);
  if (hasMissingDay) {
    return distributeStopsAcrossDays(stops, days, allCorridorStops);
  }
  return stops;
}
