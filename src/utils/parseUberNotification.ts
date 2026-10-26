/**
 * Best-effort parser for Uber driver-app notifications.
 *
 * IMPORTANT: Uber's notification wording varies by app version and language.
 * We always store the raw title/text in notifications_raw, so when you have
 * real samples from the driver's phone, tune the patterns below and backfill.
 *
 * What we try to detect:
 *  - a fare amount:   "AED 34.50", "34.50 AED", "د.إ 34.50"
 *  - trip completion: "trip completed", "you earned", "payment", "fare"
 */
const FARE_PATTERNS = [
  /AED\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
  /([0-9]+(?:[.,][0-9]{1,2})?)\s*AED/i,
  /د\.إ\s*([0-9]+(?:[.,][0-9]{1,2})?)/,
];

const COMPLETION_HINTS = /trip (completed|ended)|you earned|fare breakdown|payment of|earnings/i;

export interface ParsedNotification {
  looksLikeCompletedTrip: boolean;
  fareAed: number | null;
}

export function parseUberNotification(title: string, text: string): ParsedNotification {
  const blob = `${title} ${text}`;
  let fare: number | null = null;
  for (const re of FARE_PATTERNS) {
    const m = blob.match(re);
    if (m) {
      fare = parseFloat(m[1].replace(',', '.'));
      break;
    }
  }
  const completed = COMPLETION_HINTS.test(blob) || (fare != null && /trip|ride/i.test(blob));
  return {looksLikeCompletedTrip: completed && fare != null, fareAed: fare};
}
