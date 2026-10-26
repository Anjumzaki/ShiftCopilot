export type ZoneTag =
  | 'airport'
  | 'nightlife'
  | 'hotels'
  | 'business'
  | 'mall'
  | 'residential'
  | 'tourist'
  | 'exhibition';

export interface Zone {
  id: string;
  name: string;
  /** Zone centre, used for distance/ETA hints and event matching. */
  lat: number;
  lng: number;
  /** Rough radius of the zone in km, for matching events/venues to zones. */
  radiusKm: number;
  tags: ZoneTag[];
}

export interface FlightArrival {
  flight: string;
  origin: string;
  /** Scheduled/estimated arrival time, ISO string (local Dubai time). */
  arrivalTime: string;
  /** Rough passenger estimate derived from aircraft model. */
  paxEstimate: number;
  airportZoneId: string;
}

export interface CityEvent {
  name: string;
  venue: string;
  lat: number;
  lng: number;
  /** ISO datetime strings (Asia/Dubai). endTime is when the demand spike happens. */
  startTime: string;
  endTime: string;
  /** Optional crowd-size hint: 1 = small, 2 = medium, 3 = arena-scale. */
  magnitude?: 1 | 2 | 3;
}

export interface WeatherSnapshot {
  rainingNow: boolean;
  rainExpectedWithin2h: boolean;
  tempC: number;
}

export interface SignalContribution {
  source: 'baseline' | 'flights' | 'events' | 'weather' | 'personal';
  points: number;
  reason: string;
}

export interface ZoneScore {
  zone: Zone;
  score: number;
  contributions: SignalContribution[];
  /** Human line shown to the driver, e.g. "Arrival wave 23:10–00:40 (≈1,900 pax)". */
  headline: string;
}

export interface ScoringResult {
  generatedAt: string;
  ranked: ZoneScore[];
  /** Top recommendation plus the next-best alternative. */
  recommendation: {
    now: ZoneScore;
    alternative?: ZoneScore;
    avoid?: ZoneScore;
  };
}

/** A trip captured from an Uber driver-app notification (or entered manually). */
export interface Trip {
  id?: number;
  timestamp: string;
  fareAed: number | null;
  zoneId: string | null;
  source: 'notification' | 'manual';
  rawText: string;
}
