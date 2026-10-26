import dayjs from 'dayjs';
import type {SignalContribution, Trip, Zone} from './types';

/**
 * Personal-history signal: how THIS driver's earnings in each zone, in this
 * hour-block, compare with his overall average. Starts silent (no trips) and
 * becomes the dominant signal after a few weeks of auto-captured trips.
 *
 * Buckets: zone × dayType (weekday / Thu–Sat night / weekend day) × 4-hour block.
 * A Bayesian-ish shrink keeps one lucky trip from dominating: observed mean is
 * blended toward the global mean by weight n / (n + K).
 */
const K = 4; // shrinkage — needs ~4 trips in a bucket before we trust it fully
const MAX_POINTS = 4;

type BucketKey = string;

function bucketKey(zoneId: string, t: dayjs.Dayjs): BucketKey {
  const dow = t.day();
  const h = t.hour();
  const night = h >= 18 || h < 4;
  const dayType =
    (dow >= 4 && night) || (dow === 6 && night) ? 'wkndNight' : dow === 6 || dow === 0 ? 'wknd' : 'wkday';
  const block = Math.floor(h / 4);
  return `${zoneId}|${dayType}|${block}`;
}

export function personalContributions(
  trips: Trip[],
  zones: Zone[],
  at?: Date,
): Map<string, SignalContribution> {
  const out = new Map<string, SignalContribution>();
  const usable = trips.filter(t => t.fareAed != null && t.zoneId != null);
  if (usable.length < 10) return out; // not enough history yet

  const globalMean =
    usable.reduce((s, t) => s + (t.fareAed as number), 0) / usable.length;

  const buckets = new Map<BucketKey, {sum: number; n: number}>();
  for (const t of usable) {
    const key = bucketKey(t.zoneId as string, dayjs(t.timestamp));
    const b = buckets.get(key) ?? {sum: 0, n: 0};
    b.sum += t.fareAed as number;
    b.n += 1;
    buckets.set(key, b);
  }

  const now = dayjs(at ?? new Date());
  for (const z of zones) {
    const b = buckets.get(bucketKey(z.id, now));
    if (!b || b.n === 0) continue;
    const observed = b.sum / b.n;
    const weight = b.n / (b.n + K);
    const blended = weight * observed + (1 - weight) * globalMean;
    const ratio = blended / globalMean; // 1.0 = average zone-hour for this driver
    const points = Math.max(-MAX_POINTS, Math.min(MAX_POINTS, (ratio - 1) * 6));
    if (Math.abs(points) < 0.5) continue;
    out.set(z.id, {
      source: 'personal',
      points: Math.round(points * 10) / 10,
      reason:
        points > 0
          ? `Your history: ~AED ${Math.round(blended)}/trip here at this time (${b.n} trips)`
          : `Your history: below-average here at this time (${b.n} trips)`,
    });
  }
  return out;
}
