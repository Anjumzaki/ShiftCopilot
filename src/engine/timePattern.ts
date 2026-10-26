import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type {SignalContribution, Zone, ZoneTag} from './types';
import {DUBAI_TZ} from '../config/constants';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Baseline demand curves per zone tag, 0..10 for each hour of day.
 * Hand-tuned starting points for Dubai; the personal-history signal
 * corrects these per driver over time. UAE weekend = Sat/Sun; Thursday
 * evening behaves like a weekend night, Friday has the Jumu'ah lull
 * around midday.
 */
type Curve = number[]; // 24 values

const curve = (...pairs: Array<[number, number, number]>): Curve => {
  // pairs: [fromHour, toHourExclusive, value]
  const c = new Array(24).fill(1);
  for (const [from, to, v] of pairs) {
    for (let h = from; h !== to; h = (h + 1) % 24) {
      c[h] = v;
      if (h === (to + 23) % 24) break;
    }
  }
  return c;
};

const WEEKDAY: Record<ZoneTag, Curve> = {
  airport: curve([5, 9, 6], [9, 16, 4], [16, 20, 5], [20, 2, 8], [2, 5, 5]),
  business: curve([6, 10, 8], [10, 16, 3], [16, 20, 8], [20, 23, 4], [23, 6, 1]),
  mall: curve([10, 17, 3], [17, 21, 5], [21, 0, 7], [0, 10, 1]),
  nightlife: curve([18, 22, 4], [22, 3, 6], [3, 18, 1]),
  hotels: curve([6, 10, 6], [10, 18, 4], [18, 23, 5], [23, 6, 2]),
  residential: curve([6, 10, 7], [10, 16, 3], [16, 20, 6], [20, 0, 4], [0, 6, 1]),
  tourist: curve([9, 13, 5], [13, 18, 4], [18, 23, 6], [23, 9, 1]),
  exhibition: curve([8, 11, 6], [11, 16, 3], [16, 19, 7], [19, 8, 1]),
};

const WEEKEND_NIGHT: Partial<Record<ZoneTag, Curve>> = {
  nightlife: curve([18, 22, 6], [22, 4, 9], [4, 18, 1]),
  mall: curve([10, 17, 5], [17, 0, 8], [0, 2, 6], [2, 10, 1]),
  tourist: curve([9, 23, 6], [23, 2, 5], [2, 9, 1]),
  hotels: curve([8, 12, 6], [12, 18, 5], [18, 1, 6], [1, 8, 2]),
  business: curve([0, 24, 2]),
};

function isWeekendNight(d: dayjs.Dayjs): boolean {
  const dow = d.day(); // 0 Sun .. 6 Sat
  const h = d.hour();
  // Thu night, Fri night, Sat night count as weekend nights.
  if ((dow === 4 || dow === 5 || dow === 6) && h >= 18) return true;
  // Early hours after those nights.
  if ((dow === 5 || dow === 6 || dow === 0) && h < 5) return true;
  return false;
}

function isFridayMiddayLull(d: dayjs.Dayjs): boolean {
  return d.day() === 5 && d.hour() >= 11 && d.hour() < 14;
}

export function baselineScore(zone: Zone, at?: Date): SignalContribution {
  const d = dayjs(at ?? new Date()).tz(DUBAI_TZ);
  const h = d.hour();
  const weekendNight = isWeekendNight(d);

  let best = 0;
  let bestTag: ZoneTag = zone.tags[0];
  for (const tag of zone.tags) {
    const c = (weekendNight && WEEKEND_NIGHT[tag]) || WEEKDAY[tag];
    if (c[h] > best) {
      best = c[h];
      bestTag = tag;
    }
  }

  if (isFridayMiddayLull(d)) best *= 0.5;

  // End-of-month salary week: broad mild uplift.
  if (d.date() >= 25 || d.date() <= 3) best *= 1.15;

  return {
    source: 'baseline',
    points: Math.round(best * 10) / 10,
    reason: `${labelForTag(bestTag)} pattern for ${d.format('ddd HH:mm')}`,
  };
}

function labelForTag(tag: ZoneTag): string {
  const labels: Record<ZoneTag, string> = {
    airport: 'Airport',
    business: 'Office commute',
    mall: 'Mall traffic',
    nightlife: 'Nightlife',
    hotels: 'Hotel guests',
    residential: 'Residential',
    tourist: 'Tourist',
    exhibition: 'Exhibition',
  };
  return labels[tag];
}
