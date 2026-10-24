# cron-explainer-bd

An offline, bilingual (English / Bangla) cron expression explainer and next-run calculator for Bangladesh students and developers learning Linux scheduling. Type any standard 5-field cron expression and get a plain-language explanation - field by field plus a one-sentence summary - and the next 10 actual run times in Asia/Dhaka, with zero network requests by design.

Live: https://fahad3235.github.io/cron-explainer-bd/

## Problem

Cron's terse `minute hour day-of-month month day-of-week` syntax is easy to get subtly wrong: the classic day-of-month/day-of-week OR trap, `*/2` vs `*` confusion, February 30 schedules that silently never fire, and `@reboot` being mistaken for a schedule. Existing explainers are English-only and online. This tool explains cron in both English and Bangla, computes real next-run times, and runs 100% offline in the browser.

## Features

1. **Strict 5-field parser** - lists (`1,5,10`), ranges (`9-17`), steps (`*/15`, `2-59/5`), month/day names (`JAN-DEC`, `MON-SUN`, case-insensitive), and `@macros` (`@yearly @monthly @weekly @daily @hourly`). `@reboot` is parsed as valid-but-unschedulable with a clear note, never silently dropped. Every error names the offending field and reason (range violations, illegal characters, step of 0, bad macro names, wrong field count).
2. **Plain-language explanation** - per-field chips plus a one-sentence summary, in English and Bangla (toggle persisted to localStorage; Bengali digits throughout).
3. **Next-10-run engine** - computed from "now" in Asia/Dhaka with correct standard-cron day-of-month/day-of-week OR semantics (a pitfall warning is shown when both are restricted). Each run shows local date-time, weekday, a countdown ("in 2h 15m"), and a badge when it crosses into next month/year. Leap-aware: `0 0 29 2 *` correctly yields 2028-02-29; impossible schedules report "no runs within 4 years".
4. **Pitfalls panel** - 5 static bilingual cards: the DOM+DOW OR trap, `*` vs `*/1` vs `*/2`, Feb 30 never runs, `@reboot` is not a schedule, `0 9 * * 1-5` means weekdays at 9 AM.
5. **6 quick presets** - Every minute, Hourly, Daily 09:00, Weekdays 18:00, Monthly 1st 00:00, Sundays 06:00.
6. **Copy buttons** - copy the expression, or copy the full explanation as plain text (English + Bangla in one block), with a graceful fallback when the clipboard API is unavailable.

## Stack

Pure static site, no dependencies, no build step, no network requests:

- `index.html` - structure (all UI text rendered from the i18n dictionary)
- `js/logic.js` - parser, explainer, next-run engine (works in browsers and Node)
- `js/app.js` - UI glue: EN/BN i18n dictionary, rendering, presets, copy buttons
- `css/style.css` - dark slate + teal theme, responsive down to 390px
- `favicon.svg`

Bengali text is stored as `\uXXXX` escapes in JS (sources stay pure ASCII); digits use Bengali numerals via a digit map.

## Prerequisites

Any modern browser. For tests: Node.js 18+ and headless Chromium (the smoke test uses `/opt/meta-chromium/chrome`; adapt the `CHROME` constant in `tests/smoke.mjs` if yours lives elsewhere).

## Install / run

No install needed - it is a static site:

```sh
# serve locally (any static server), or just open the file:
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Dev commands

```sh
node tests/run-node-tests.js   # 57 unit assertions (parser, next-run engine, explainer)
node tests/smoke.mjs           # 34 headless-Chrome UI assertions via raw CDP
```

## Testing

See `TEST_RESULTS.md` for the full recorded results: 57/57 Node unit tests and 34/34 headless-Chrome smoke assertions passing, with 0 console/page errors. Hand-verified cases include `*/15 9-17 * * 1-5`, `0 9 * * *` (exactly 24h later), `0 0 29 2 *` (leap day 2028-02-29), `0 0 1 * 0` (OR semantics), `0 12 * * MON,WED,FRI`, all invalid-input shapes, and the Feb-30 never-runs case.

## Deployment (GitHub Pages)

The site is static: push the repo and enable Pages on the `main` branch (root). No build step, no environment variables.

## Limitations

- Standard **5-field cron only** (Vixie/ISC style). Quartz-style 6/7-field expressions are rejected with a field-count error - check your system's cron flavor before relying on a schedule.
- `@reboot` is reported as valid-but-unschedulable: it runs once at boot, so there are no "next runs" to compute.
- Next-run search is capped at **4 years** ahead (covers leap cycles); schedules that never match report "no runs within 4 years".
- Parser error messages are English-only by design; explanations, UI, and results are fully bilingual.
- Educational tool: verify critical schedules against your system's actual cron implementation.

## Status

Built and fully tested 2026-10-24 (factory run #120). All 57 unit + 34 smoke assertions green, 0 console/page errors, pure-ASCII sources, total payload well under 120KB.
