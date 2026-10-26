import dayjs from 'dayjs';
import type {CityEvent, SignalContribution, Zone} from './types';
import {distanceKm} from '../config/zones';

/**
 * Fetch the static events feed (events.json) produced daily by the GitHub
 * Action. No server to maintain — it's a plain file on GitHub Pages.
 */
export async function fetchEvents(feedUrl: string): Promise<CityEvent[]> {
  const res = await fetch(feedUrl, {headers: {'Cache-Control': 'no-cache'}});
  if (!res.ok) throw new Error(`events feed ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.events) ? (data.events as CityEvent[]) : [];
}

/**
 * An event contributes to the zone containing its venue, strongest in the
 * 45 minutes around its end time (the exodus) and mildly before its start
 * (the arrivals).
 */
export function eventContributions(
  events: CityEvent[],
  zones: Zone[],
): Map<string, SignalContribution> {
  const out = new Map<string, SignalContribution>();
  const now = dayjs();

  for (const ev of events) {
    // Nearest zone whose radius covers the venue (zones overlap in dense areas).
    let zone = null as (typeof zones)[number] | null;
    let bestD = Infinity;
    for (const z of zones) {
      const d = distanceKm(ev.lat, ev.lng, z.lat, z.lng);
      if (d <= z.radiusKm + 1 && d < bestD) {
        zone = z;
        bestD = d;
      }
    }
    if (!zone) continue;

    const start = dayjs(ev.startTime);
    const end = dayjs(ev.endTime);
    const mag = ev.magnitude ?? 2;

    let points = 0;
    let reason = '';
    const minsToEnd = end.diff(now, 'minute');
    const minsToStart = start.diff(now, 'minute');

    if (minsToEnd >= -20 && minsToEnd <= 45) {
      points = mag * 3; // exodus — the real payday
      reason = `${ev.name} ends ${end.format('HH:mm')} at ${ev.venue}`;
    } else if (minsToStart >= 0 && minsToStart <= 60) {
      points = mag * 1; // arrivals
      reason = `${ev.name} starts ${start.format('HH:mm')} at ${ev.venue}`;
    } else {
      continue;
    }

    const existing = out.get(zone.id);
    if (!existing || existing.points < points) {
      out.set(zone.id, {source: 'events', points, reason});
    }
  }
  return out;
}
