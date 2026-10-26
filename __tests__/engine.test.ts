import {baselineScore} from '../src/engine/timePattern';
import {flightContributions} from '../src/engine/flights';
import {eventContributions} from '../src/engine/events';
import {parseUberNotification} from '../src/utils/parseUberNotification';
import {ZONES, zoneForPoint} from '../src/config/zones';
import type {CityEvent, FlightArrival} from '../src/engine/types';
import dayjs from 'dayjs';

describe('baseline time pattern', () => {
  it('scores every zone at every hour without blowing up', () => {
    for (const zone of ZONES) {
      for (let h = 0; h < 24; h++) {
        const at = new Date(Date.UTC(2026, 9, 26, h));
        const c = baselineScore(zone, at);
        expect(c.points).toBeGreaterThanOrEqual(0);
        expect(c.points).toBeLessThanOrEqual(12);
      }
    }
  });

  it('ranks Marina nightlife above Business Bay on a Friday night', () => {
    // Friday 23:00 Dubai = 19:00 UTC
    const at = new Date(Date.UTC(2026, 9, 30, 19, 0));
    const marina = baselineScore(ZONES.find(z => z.id === 'marina')!, at);
    const bb = baselineScore(ZONES.find(z => z.id === 'business_bay')!, at);
    expect(marina.points).toBeGreaterThan(bb.points);
  });
});

describe('flights signal', () => {
  it('awards airport zones for an arrival wave', () => {
    const arrivals: FlightArrival[] = [
      {
        flight: 'EK2',
        origin: 'LHR',
        arrivalTime: dayjs().add(40, 'minute').toISOString(),
        paxEstimate: 350,
        airportZoneId: 'dxb_t3',
      },
      {
        flight: 'EK202',
        origin: 'JFK',
        arrivalTime: dayjs().add(70, 'minute').toISOString(),
        paxEstimate: 350,
        airportZoneId: 'dxb_t3',
      },
    ];
    const c = flightContributions(arrivals, ZONES);
    expect(c.get('dxb_t3')!.points).toBeGreaterThan(1.5);
  });

  it('ignores arrivals outside the window', () => {
    const arrivals: FlightArrival[] = [
      {
        flight: 'EK2',
        origin: 'LHR',
        arrivalTime: dayjs().add(8, 'hour').toISOString(),
        paxEstimate: 350,
        airportZoneId: 'dxb_t3',
      },
    ];
    expect(flightContributions(arrivals, ZONES).size).toBe(0);
  });
});

describe('events signal', () => {
  it('boosts the venue zone around the event end time', () => {
    const events: CityEvent[] = [
      {
        name: 'Big concert',
        venue: 'Coca-Cola Arena',
        lat: 25.2075,
        lng: 55.2627,
        startTime: dayjs().subtract(3, 'hour').toISOString(),
        endTime: dayjs().add(20, 'minute').toISOString(),
        magnitude: 3,
      },
    ];
    const c = eventContributions(events, ZONES);
    expect(c.get('coca_cola_arena')!.points).toBe(9);
  });
});

describe('uber notification parser', () => {
  it('extracts fares in common formats', () => {
    expect(parseUberNotification('Trip completed', 'You earned AED 34.50').fareAed).toBe(34.5);
    expect(parseUberNotification('Payment', '42,75 AED received for your trip').fareAed).toBe(42.75);
  });
  it('does not invent trips from promo notifications', () => {
    const p = parseUberNotification('Quest available', 'Complete 20 trips this weekend');
    expect(p.looksLikeCompletedTrip).toBe(false);
  });
});

describe('zone lookup', () => {
  it('maps a point near Dubai Mall to downtown', () => {
    expect(zoneForPoint(25.1985, 55.2796)?.id).toBe('downtown');
  });
});
