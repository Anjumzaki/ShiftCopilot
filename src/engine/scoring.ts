import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ScoringResult, SignalContribution, Trip, ZoneScore} from './types';
import {ZONES} from '../config/zones';
import {SETTINGS_KEYS, EVENTS_FEED_URL} from '../config/constants';
import {baselineScore} from './timePattern';
import {fetchArrivals, flightContributions} from './flights';
import {fetchEvents, eventContributions} from './events';
import {fetchWeather, weatherContribution} from './weather';
import {personalContributions} from './personal';
import {getRecentTrips} from '../data/tripsRepo';

/**
 * The full scoring pass. Every signal is best-effort: a failed API call logs
 * and drops out, it never blocks the recommendation (baseline always works,
 * fully offline).
 */
export async function runScoring(): Promise<ScoringResult> {
  const [rapidKey, owmKey, feedUrlOverride, airportIata] = await Promise.all([
    AsyncStorage.getItem(SETTINGS_KEYS.rapidApiKey),
    AsyncStorage.getItem(SETTINGS_KEYS.openWeatherKey),
    AsyncStorage.getItem(SETTINGS_KEYS.eventsFeedUrl),
    AsyncStorage.getItem(SETTINGS_KEYS.airportIata),
  ]);

  const [flights, events, weather, trips] = await Promise.all([
    rapidKey
      ? fetchArrivals(rapidKey, airportIata || 'DXB').catch(e => {
          console.warn('flights signal failed', e);
          return [];
        })
      : Promise.resolve([]),
    fetchEvents(feedUrlOverride || EVENTS_FEED_URL).catch(e => {
      console.warn('events signal failed', e);
      return [];
    }),
    owmKey
      ? fetchWeather(owmKey).catch(e => {
          console.warn('weather signal failed', e);
          return null;
        })
      : Promise.resolve(null),
    getRecentTrips(90).catch((): Trip[] => []),
  ]);

  const flightC = flightContributions(flights, ZONES);
  const eventC = eventContributions(events, ZONES);
  const personalC = personalContributions(trips, ZONES);
  const weatherC = weatherContribution(weather);

  const scored: ZoneScore[] = ZONES.map(zone => {
    const contributions: SignalContribution[] = [baselineScore(zone)];
    const f = flightC.get(zone.id);
    const e = eventC.get(zone.id);
    const p = personalC.get(zone.id);
    if (f) contributions.push(f);
    if (e) contributions.push(e);
    if (p) contributions.push(p);
    if (weatherC) contributions.push(weatherC);

    const score = contributions.reduce((s, c) => s + c.points, 0);
    const headline =
      [e, f, p].find(Boolean)?.reason ?? contributions[0].reason;
    return {zone, score: Math.round(score * 10) / 10, contributions, headline};
  }).sort((a, b) => b.score - a.score);

  return {
    generatedAt: dayjs().toISOString(),
    ranked: scored,
    recommendation: {
      now: scored[0],
      alternative: scored[1],
      avoid: scored[scored.length - 1],
    },
  };
}

const LAST_RESULT_KEY = 'scoring.lastResult';

export async function saveResult(r: ScoringResult): Promise<void> {
  await AsyncStorage.setItem(LAST_RESULT_KEY, JSON.stringify(r));
}

export async function loadLastResult(): Promise<ScoringResult | null> {
  const raw = await AsyncStorage.getItem(LAST_RESULT_KEY);
  return raw ? (JSON.parse(raw) as ScoringResult) : null;
}
