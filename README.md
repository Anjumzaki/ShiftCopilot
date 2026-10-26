# ShiftCopilot

Android app for a Dubai ride-hailing driver: tells him **where to position, when, and why** — from public demand signals and his own trip history. Everything runs on-device; the only "backend" is a free GitHub Action that publishes a static events feed.

> This app never touches Uber's systems. It reads public APIs, plus the phone's **own** notifications (with the user's explicit Notification Access grant) to log completed trips. No GPS spoofing, no automation of the driver app.

## What it does

- **GO NOW card** — top zone right now, with the reasons ("≈1,900 pax landing from 23:10", "Concert ends 22:30 at Coca-Cola Arena", "Rain — city-wide spike").
- **Shift mode** — a foreground service re-scores every 30 min in the background and pushes a notification *only when the plan changes*. A WorkManager job is the fallback if Android kills the process; both survive reboot.
- **Auto trip capture** — a `NotificationListenerService` parses the Uber driver app's trip/fare notifications into a local SQLite log. After ~10 trips, his personal AED-per-zone-per-hour history starts reweighting the recommendations (Bayesian shrinkage, so one lucky fare doesn't dominate).
- **Signals**: hand-tuned Dubai time patterns (weekday/weekend-night curves, Friday lull, salary week) → flight arrival waves (AeroDataBox) → events feed → rain (OpenWeatherMap) → personal history.

## Project layout

```
src/config/zones.ts        # the 20 Dubai zones — edit freely, everything keys off this
src/engine/                # scoring: timePattern, flights, events, weather, personal, scoring
src/data/                  # SQLite (trips + raw notifications)
src/native/                # JS bridges: UberNotifications, ShiftService
src/background/            # headless scoring task + notify-on-change logic
src/screens/               # Now / Zones / Earnings / Settings
android/.../notifications/ # UberNotificationListenerService + bridge (Kotlin)
android/.../background/    # ScoringWorker (WorkManager), headless task svc, boot receiver
scripts/scrape_events.py   # daily events scraper (runs in GitHub Actions)
.github/workflows/events.yml
events/manual-events.json  # hand-add big events; merged into the feed daily
```

## Build & run

```bash
npm install
npx react-native run-android     # device connected or emulator running
```

Release APK: `cd android && ./gradlew assembleRelease` (set up a real keystore first — see RN docs on signed APKs).

## One-time setup (5 minutes)

1. **Push this repo to GitHub** and enable **Pages** (Settings → Pages → deploy from branch, root). Enable Actions. The workflow refreshes `events/events.json` daily.
2. In `src/config/constants.ts`, set `EVENTS_FEED_URL` to `https://<user>.github.io/<repo>/events/events.json` (or paste the URL in the app's Settings screen — it overrides the constant).
3. **AeroDataBox key** (flight arrivals): free at rapidapi.com → AeroDataBox → paste in Settings.
4. **OpenWeatherMap key** (rain alert): free at openweathermap.org → paste in Settings.
5. On the driver's phone: Settings tab → **Grant notification access** (Android system screen opens; toggle ShiftCopilot on). Also disable battery optimization for the app (Settings → Apps → ShiftCopilot → Battery → Unrestricted) so shift mode survives long nights.

The app works with **zero keys** too — baseline time patterns are fully offline; each signal just adds on top.

## Tuning after the first week (important)

- **Notification parsing** (`src/utils/parseUberNotification.ts`): Uber's wording varies by app version/language. Every captured notification is stored raw in the `notifications_raw` table — pull a few real samples (`adb shell "run-as com.shiftcopilot ..."` or add a debug export), adjust the regexes, done.
- **Uber package name** (`UberNotificationListenerService.kt` → `WATCHED_PACKAGES`): confirm with `adb shell pm list packages | grep uber`; add Careem/Bolt packages later for multi-app capture.
- **Zones** (`src/config/zones.ts`): add/trim to match where he actually works. Abu Dhabi list TODO is noted in the file.
- **Zone stamping for trips** is `null` for now (`src/native/UberNotifications.ts` TODO): wire last-known location → `zoneForPoint()` when you add location tracking, and the personal signal gets much sharper.

## Tests

```bash
npm test        # engine unit tests (time patterns, flights, events, parser, zone lookup)
npx tsc --noEmit
```

## Roadmap ideas

- Location tracking while shift mode on → stamp trips with zones + "you're idle in a dead zone" nudges
- Cruise-ship calls at Port Rashid in the scraper (published schedules)
- Careem/Bolt notification capture for multi-app earnings in one place
- If it works for him: multi-driver version is a product, not a favor
