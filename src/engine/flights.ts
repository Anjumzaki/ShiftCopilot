import dayjs from 'dayjs';
import type {FlightArrival, SignalContribution, Zone} from './types';
import {AERODATABOX_HOST} from '../config/constants';

/**
 * Rough passengers-looking-for-a-ride per aircraft model. Wide-bodies from
 * long-haul origins produce far more ride-hailing demand than regional hops.
 */
const PAX_BY_MODEL: Array<[RegExp, number]> = [
  [/A38|388/, 350],
  [/77[7W9]|B77/, 250],
  [/78[789]|B78/, 200],
  [/A35|35[09K]/, 220],
  [/A33|33[023]/, 180],
  [/32[01N]|A32|73[6-9H]|B73/, 110],
  [/E(17|19|29)|AT[R7]|DH/, 50],
];

function paxEstimate(model: string | undefined): number {
  if (!model) return 90;
  for (const [re, pax] of PAX_BY_MODEL) {
    if (re.test(model.toUpperCase())) return pax;
  }
  return 90;
}

/**
 * Fetch arrivals for the next `windowHours` at an airport via AeroDataBox
 * (RapidAPI). Called directly from the device — no server involved.
 */
export async function fetchArrivals(
  rapidApiKey: string,
  airportIata: string,
  windowHours = 3,
): Promise<FlightArrival[]> {
  const from = dayjs();
  const to = from.add(windowHours, 'hour');
  const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DDTHH:mm');
  const url =
    `https://${AERODATABOX_HOST}/flights/airports/iata/${airportIata}` +
    `/${fmt(from)}/${fmt(to)}?direction=Arrival&withCancelled=false&withCodeshared=false&withLeg=false`;

  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': AERODATABOX_HOST,
    },
  });
  if (!res.ok) {
    throw new Error(`AeroDataBox ${res.status}`);
  }
  const data = await res.json();
  const arrivals: FlightArrival[] = [];
  for (const f of data?.arrivals ?? []) {
    const t =
      f?.movement?.revisedTime?.local ??
      f?.movement?.scheduledTime?.local ??
      null;
    if (!t) continue;
    arrivals.push({
      flight: f?.number ?? '?',
      origin: f?.movement?.airport?.iata ?? f?.movement?.airport?.name ?? '?',
      arrivalTime: t,
      paxEstimate: paxEstimate(f?.aircraft?.model),
      airportZoneId: airportIata === 'DXB' ? 'dxb_t3' : 'dxb_t1',
    });
  }
  return arrivals;
}

/**
 * Convert an arrivals list into per-zone score contributions. Airport zones get
 * points proportional to passengers landing in the next ~2.5 hours (people take
 * 30–60 min to clear immigration and bags, so flights landing "now" still pay).
 */
export function flightContributions(
  arrivals: FlightArrival[],
  zones: Zone[],
): Map<string, SignalContribution> {
  const out = new Map<string, SignalContribution>();
  const airportZones = zones.filter(z => z.tags.includes('airport'));
  if (airportZones.length === 0 || arrivals.length === 0) return out;

  const now = dayjs();
  const relevant = arrivals.filter(a => {
    const t = dayjs(a.arrivalTime);
    return t.isAfter(now.subtract(45, 'minute')) && t.isBefore(now.add(150, 'minute'));
  });
  const totalPax = relevant.reduce((s, a) => s + a.paxEstimate, 0);
  if (totalPax === 0) return out;

  // 0 pax -> 0 pts, ~1500 pax -> ~6 pts, caps at 9.
  const points = Math.min(9, (totalPax / 1500) * 6);
  const first = relevant
    .map(a => dayjs(a.arrivalTime))
    .sort((a, b) => a.valueOf() - b.valueOf())[0];

  for (const z of airportZones) {
    out.set(z.id, {
      source: 'flights',
      points: Math.round(points * 10) / 10,
      reason: `≈${Math.round(totalPax / 50) * 50} pax landing from ${first.format('HH:mm')} (${relevant.length} flights)`,
    });
  }
  return out;
}
