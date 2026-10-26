/**
 * Static configuration. API keys are entered in the Settings screen and kept in
 * AsyncStorage — nothing is hardcoded here so the repo can stay public.
 */
export const DUBAI_TZ = 'Asia/Dubai';

/** AeroDataBox (via RapidAPI) — free tier is plenty for one device. */
export const AERODATABOX_HOST = 'aerodatabox.p.rapidapi.com';

/** OpenWeatherMap current weather — free tier. */
export const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
export const DUBAI_LAT = 25.2048;
export const DUBAI_LNG = 55.2708;

/**
 * Static events feed, refreshed daily by .github/workflows/events.yml and
 * served straight from the repo (no hosting). Users can override it in
 * Settings → Events feed URL.
 */
export const EVENTS_FEED_URL =
  'https://raw.githubusercontent.com/Anjumzaki/ShiftCopilot/main/events/events.json';

/** How often the background task re-scores zones while shift mode is on. */
export const SCORING_INTERVAL_MINUTES = 30;

/** Settings keys (AsyncStorage). */
export const SETTINGS_KEYS = {
  rapidApiKey: 'settings.rapidApiKey',
  openWeatherKey: 'settings.openWeatherKey',
  eventsFeedUrl: 'settings.eventsFeedUrl',
  shiftModeOn: 'settings.shiftModeOn',
  airportIata: 'settings.airportIata', // DXB by default
} as const;
