#!/usr/bin/env python3
"""
Daily Dubai events scraper → events/events.json

Runs in GitHub Actions (see .github/workflows/events.yml). Best-effort by
design: each source is wrapped so one broken site never empties the feed, and
events/manual-events.json is always merged in so you can hand-add anything
(concert someone mentioned, a cruise call, a big wedding at a known venue).

Output schema (what the app's src/engine/events.ts expects):
{
  "generatedAt": "...",
  "events": [
    {"name", "venue", "lat", "lng", "startTime", "endTime", "magnitude"}
  ]
}
Times are ISO strings in Asia/Dubai local time.
"""
import json
import re
import sys
import datetime as dt
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

DUBAI = ZoneInfo("Asia/Dubai")
OUT = Path(__file__).resolve().parent.parent / "events" / "events.json"
MANUAL = OUT.parent / "manual-events.json"

HEADERS = {"User-Agent": "Mozilla/5.0 (ShiftCopilot events bot; personal use)"}

# Known venues → coordinates + default crowd magnitude. Events matched to a
# venue inherit its location; unknown venues are skipped (no location = the
# app can't map them to a zone anyway).
VENUES = {
    "coca-cola arena": (25.2075, 55.2627, 3),
    "dubai world trade centre": (25.2250, 55.2880, 3),
    "dwtc": (25.2250, 55.2880, 3),
    "dubai opera": (25.1941, 55.2735, 2),
    "expo city": (24.9612, 55.1519, 3),
    "global village": (25.0689, 55.3070, 2),
    "madinat jumeirah": (25.1327, 55.1850, 2),
    "dubai media city amphitheatre": (25.0931, 55.1561, 3),
    "meydan": (25.1575, 55.3030, 3),
    "atlantis": (25.1304, 55.1171, 2),
    "festival arena": (25.2222, 55.3522, 2),
    "etihad arena": (24.4645, 54.6020, 3),  # Abu Dhabi — used if he works AUH
}


def match_venue(text: str):
    t = text.lower()
    for name, (lat, lng, mag) in VENUES.items():
        if name in t:
            return name.title(), lat, lng, mag
    return None


def scrape_platinumlist(days_ahead: int = 7):
    """Platinumlist Dubai listing — HTML structure changes sometimes; selectors
    below are intentionally loose (grab event cards, read title/venue/date)."""
    events = []
    try:
        r = requests.get("https://dubai.platinumlist.net/", headers=HEADERS, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        # Loose pass: any anchor that mentions a known venue in its text block.
        for a in soup.find_all("a"):
            text = " ".join(a.get_text(" ", strip=True).split())
            if len(text) < 15:
                continue
            venue = match_venue(text)
            if not venue:
                continue
            vname, lat, lng, mag = venue
            date = guess_date(text, days_ahead)
            if not date:
                continue
            title = text[:80]
            start = date.replace(hour=19, minute=30)  # typical doors; TODO refine per event page
            end = date.replace(hour=22, minute=30)
            events.append(
                {
                    "name": title,
                    "venue": vname,
                    "lat": lat,
                    "lng": lng,
                    "startTime": start.isoformat(),
                    "endTime": end.isoformat(),
                    "magnitude": mag,
                }
            )
    except Exception as e:  # noqa: BLE001
        print(f"platinumlist scrape failed: {e}", file=sys.stderr)
    return events


MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split()


def guess_date(text: str, days_ahead: int):
    """Find a 'DD Mon' style date within the next `days_ahead` days."""
    m = re.search(r"\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)", text.lower())
    if not m:
        return None
    day, mon = int(m.group(1)), MONTHS.index(m.group(2)) + 1
    now = dt.datetime.now(DUBAI)
    year = now.year if (mon, day) >= (now.month, now.day) else now.year + 1
    try:
        d = dt.datetime(year, mon, day, tzinfo=DUBAI)
    except ValueError:
        return None
    if 0 <= (d - now).days <= days_ahead:
        return d
    return None


def load_manual():
    if MANUAL.exists():
        try:
            data = json.loads(MANUAL.read_text())
            return data.get("events", [])
        except Exception as e:  # noqa: BLE001
            print(f"manual-events.json invalid: {e}", file=sys.stderr)
    return []


def main():
    events = scrape_platinumlist() + load_manual()
    # De-dup on (name, startTime)
    seen = set()
    unique = []
    for ev in events:
        key = (ev.get("name"), ev.get("startTime"))
        if key in seen:
            continue
        seen.add(key)
        unique.append(ev)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {"generatedAt": dt.datetime.now(DUBAI).isoformat(), "events": unique},
            indent=2,
            ensure_ascii=False,
        )
    )
    print(f"wrote {len(unique)} events to {OUT}")


if __name__ == "__main__":
    main()
