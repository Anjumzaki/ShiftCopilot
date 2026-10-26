import dayjs from 'dayjs';
import type {Trip} from '../engine/types';
import {getDb} from './db';

export async function insertTrip(trip: Trip): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    'INSERT INTO trips (timestamp, fare_aed, zone_id, source, raw_text) VALUES (?, ?, ?, ?, ?)',
    [trip.timestamp, trip.fareAed, trip.zoneId, trip.source, trip.rawText],
  );
}

export async function getRecentTrips(days: number): Promise<Trip[]> {
  const db = await getDb();
  const since = dayjs().subtract(days, 'day').toISOString();
  const [res] = await db.executeSql(
    'SELECT * FROM trips WHERE timestamp >= ? ORDER BY timestamp DESC',
    [since],
  );
  const out: Trip[] = [];
  for (let i = 0; i < res.rows.length; i++) {
    const r = res.rows.item(i);
    out.push({
      id: r.id,
      timestamp: r.timestamp,
      fareAed: r.fare_aed,
      zoneId: r.zone_id,
      source: r.source,
      rawText: r.raw_text,
    });
  }
  return out;
}

export async function updateTrip(id: number, fareAed: number | null, zoneId: string | null): Promise<void> {
  const db = await getDb();
  await db.executeSql('UPDATE trips SET fare_aed = ?, zone_id = ? WHERE id = ?', [
    fareAed,
    zoneId,
    id,
  ]);
}

export async function deleteTrip(id: number): Promise<void> {
  const db = await getDb();
  await db.executeSql('DELETE FROM trips WHERE id = ?', [id]);
}

export async function logRawNotification(pkg: string, title: string, text: string): Promise<void> {
  const db = await getDb();
  await db.executeSql(
    'INSERT INTO notifications_raw (captured_at, package, title, text) VALUES (?, ?, ?, ?)',
    [dayjs().toISOString(), pkg, title, text],
  );
}

export interface EarningsSummary {
  todayAed: number;
  todayTrips: number;
  weekAed: number;
  weekTrips: number;
}

export async function earningsSummary(): Promise<EarningsSummary> {
  const trips = await getRecentTrips(7);
  const startOfDay = dayjs().startOf('day');
  let todayAed = 0;
  let todayTrips = 0;
  let weekAed = 0;
  let weekTrips = 0;
  for (const t of trips) {
    const fare = t.fareAed ?? 0;
    weekAed += fare;
    weekTrips += 1;
    if (dayjs(t.timestamp).isAfter(startOfDay)) {
      todayAed += fare;
      todayTrips += 1;
    }
  }
  return {todayAed, todayTrips, weekAed, weekTrips};
}
