import type {SignalContribution, WeatherSnapshot} from './types';
import {DUBAI_LAT, DUBAI_LNG, OPENWEATHER_URL} from '../config/constants';

export async function fetchWeather(apiKey: string): Promise<WeatherSnapshot> {
  const url = `${OPENWEATHER_URL}?lat=${DUBAI_LAT}&lon=${DUBAI_LNG}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeather ${res.status}`);
  const data = await res.json();
  const id: number = data?.weather?.[0]?.id ?? 800; // 2xx/3xx/5xx = rain-ish
  const raining = id < 700;
  return {
    rainingNow: raining,
    rainExpectedWithin2h: raining, // current-weather endpoint only; forecast = v2
    tempC: data?.main?.temp ?? 35,
  };
}

/**
 * Rain in Dubai is rare and reliably spikes demand everywhere — a flat,
 * city-wide uplift rather than a per-zone one.
 */
export function weatherContribution(w: WeatherSnapshot | null): SignalContribution | null {
  if (!w || !w.rainingNow) return null;
  return {
    source: 'weather',
    points: 4,
    reason: 'Rain — city-wide demand spike',
  };
}
