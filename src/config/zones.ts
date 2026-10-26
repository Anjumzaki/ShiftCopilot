import type {Zone} from '../engine/types';

/**
 * The working zones for a Dubai-based driver. Tune freely — the whole engine
 * keys off this list, so adding/removing a zone needs no other change.
 *
 * TODO(abu-dhabi): if the driver works Abu Dhabi, swap this list (AUH airport,
 * Corniche, Yas Island, ADNEC, Reem Island, Khalifa City...).
 */
export const ZONES: Zone[] = [
  {id: 'dxb_t1', name: 'DXB Airport T1/T2', lat: 25.2528, lng: 55.3644, radiusKm: 2.5, tags: ['airport']},
  {id: 'dxb_t3', name: 'DXB Airport T3', lat: 25.2468, lng: 55.3598, radiusKm: 2.5, tags: ['airport']},
  {id: 'deira', name: 'Deira / Al Rigga', lat: 25.2661, lng: 55.3176, radiusKm: 3, tags: ['residential', 'hotels']},
  {id: 'bur_dubai', name: 'Bur Dubai / Karama', lat: 25.2497, lng: 55.2963, radiusKm: 3, tags: ['residential', 'tourist']},
  {id: 'downtown', name: 'Downtown / Dubai Mall', lat: 25.1972, lng: 55.2744, radiusKm: 2.5, tags: ['mall', 'tourist', 'hotels', 'nightlife']},
  {id: 'difc', name: 'DIFC / Financial Centre', lat: 25.2138, lng: 55.2824, radiusKm: 2, tags: ['business', 'nightlife']},
  {id: 'business_bay', name: 'Business Bay', lat: 25.1850, lng: 55.2650, radiusKm: 2.5, tags: ['business', 'residential']},
  {id: 'dwtc', name: 'World Trade Centre / DWTC', lat: 25.2250, lng: 55.2880, radiusKm: 2, tags: ['exhibition', 'business']},
  {id: 'jumeirah', name: 'Jumeirah / La Mer', lat: 25.2096, lng: 55.2466, radiusKm: 4, tags: ['residential', 'tourist']},
  {id: 'al_barsha', name: 'Al Barsha / Mall of the Emirates', lat: 25.1181, lng: 55.2005, radiusKm: 3, tags: ['mall', 'residential', 'hotels']},
  {id: 'marina', name: 'Dubai Marina / JBR', lat: 25.0772, lng: 55.1335, radiusKm: 3, tags: ['nightlife', 'tourist', 'hotels', 'residential']},
  {id: 'jlt', name: 'JLT / Jebel Ali gateway', lat: 25.0683, lng: 55.1420, radiusKm: 2.5, tags: ['business', 'residential']},
  {id: 'palm', name: 'Palm Jumeirah hotels', lat: 25.1124, lng: 55.1390, radiusKm: 4, tags: ['hotels', 'tourist', 'nightlife']},
  {id: 'festival_city', name: 'Festival City / Creek', lat: 25.2222, lng: 55.3522, radiusKm: 3, tags: ['mall', 'residential']},
  {id: 'silicon_oasis', name: 'Silicon Oasis / Academic City', lat: 25.1279, lng: 55.3863, radiusKm: 4, tags: ['residential']},
  {id: 'expo_city', name: 'Expo City / Dubai South', lat: 24.9612, lng: 55.1519, radiusKm: 5, tags: ['exhibition']},
  {id: 'global_village', name: 'Global Village', lat: 25.0689, lng: 55.3070, radiusKm: 2.5, tags: ['tourist']},
  {id: 'meydan', name: 'Meydan / Nad Al Sheba', lat: 25.1575, lng: 55.3030, radiusKm: 4, tags: ['residential']},
  {id: 'coca_cola_arena', name: 'City Walk / Coca-Cola Arena', lat: 25.2075, lng: 55.2627, radiusKm: 1.5, tags: ['nightlife', 'tourist']},
  {id: 'port_rashid', name: 'Port Rashid / Cruise Terminal', lat: 25.2697, lng: 55.2755, radiusKm: 2, tags: ['tourist']},
];

export function zoneById(id: string): Zone | undefined {
  return ZONES.find(z => z.id === id);
}

const EARTH_R = 6371;
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

/** Zone whose centre is nearest to a point and within its radius (plus slack). */
export function zoneForPoint(lat: number, lng: number): Zone | null {
  let best: Zone | null = null;
  let bestD = Infinity;
  for (const z of ZONES) {
    const d = distanceKm(lat, lng, z.lat, z.lng);
    if (d < bestD && d <= z.radiusKm + 1.5) {
      best = z;
      bestD = d;
    }
  }
  return best;
}
