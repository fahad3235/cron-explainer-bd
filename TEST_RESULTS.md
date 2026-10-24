# TEST_RESULTS.md - cron-explainer-bd (factory run #120, 2026-10-24)

All numbers below are real, produced by running the commands shown. Nothing is invented.

## Unit tests (Node, no dependencies)

Command: `node tests/run-node-tests.js`
Result: **57 passed, 0 failed**

Coverage: parser valid shapes (lists, ranges, steps, names, all 7 @macros, `@reboot`
valid-but-unschedulable flag, dow-7 normalization, empty input), parser invalid
shapes (12 cases: out-of-range per field, illegal chars, step of 0, reversed range,
bad range, unknown name, unknown macro, wrong field count), next-run engine with
injected deterministic "now" = Sat 2026-10-24T09:00:00+06:00, countdown formatting
(EN + Bengali digits), and explanation assertions (EN/BN summaries, 5 field chips,
`bnDigits`).

### Hand-verified next-run cases (exact values)

| Expression | Now (Dhaka) | First run (Dhaka) | Notes |
|---|---|---|---|
| `*/15 9-17 * * 1-5` | 2026-10-24 09:00 (Sat) | **Mon 2026-10-26 09:00**, then 09:15 | See honest-correction note below |
| `0 9 * * *` | 2026-10-24 09:00 | **2026-10-25 09:00** | exactly 24h later (strictly-after-now) |
| `0 0 29 2 *` | 2026-10-24 09:00 | **2028-02-29 00:00** | leap-day search, scanned in 149ms |
| `0 0 1 * 0` | 2026-10-24 09:00 | **2026-10-25 00:00**, then 2026-11-01 00:00 | OR semantics: nearer match wins |
| `0 12 * * MON,WED,FRI` | 2026-10-24 09:00 | **Mon 2026-10-26 12:00** | case-insensitive day names |
| `0 0 30 2 *` | 2026-10-24 09:00 | **no runs, capped=true** | parser accepts; full 4-year scan in 365ms |
| `0 9 * * 1-5` (10 runs) | 2026-10-24 09:00 | 10 runs, all strictly after now, all 09:00 Mon-Fri | uncapped |

**Honest correction on the first row:** the brief expected "09:15 same day" for
`*/15 9-17 * * 1-5`, which assumed a weekday "now". Verified with
`TZ=Asia/Dhaka date -d 2026-10-24` that 2026-10-24 is a **Saturday**, and the
expression restricts day-of-week to 1-5 (Mon-Fri), so under standard cron
semantics there is no run on Oct 24 or Oct 25. The engine correctly returns
Monday 2026-10-26 09:00. The unit test asserts the real value, with this note.

Explanation assertions: `0 9 * * 1-5` EN summary is exactly
"Runs at 09:00, Monday to Friday." (contains "09:00" and "Monday to Friday");
BN summary renders Bengali digits including the Bengali-digit form of 09:00.
`* * * * *` summary mentions "every minute"; `0 0 1 1 *` mentions "January"
and "1st".

## Headless-Chrome smoke tests (raw CDP, /opt/meta-chromium/chrome, file://)

Command: `node tests/smoke.mjs`
Result: **34 passed, 0 failed** - **0 console errors, 0 page errors**

Assertions covered: title/h1 render; zero console/page errors on load and in the
final sweep; zero network requests (every performance resource entry is
`file://`); input prefilled with `0 9 * * 1-5` and default summary rendered;
5 field chips; 10 next-run rows with countdown text; no horizontal overflow on
desktop; preset click fills `* * * * *` and the summary updates; invalid
`99 * * * *` shows an inline error naming the minute field and hides the runs;
empty input shows the friendly hint with no error; `@reboot` shows the
valid-but-unschedulable note; OR-trap warning appears for `0 0 1 * 0` and not
for `0 9 * * 1-5`; copy button produces a status message (clipboard fallback
path exercised headless); BN toggle switches chips/summary to Bengali with
Bengali digits and persists across reload via localStorage; 5 pitfall cards;
390px mobile viewport with no horizontal overflow and 10 run rows.

## Repairs

- 1 test-side expectation fix (no app bug): the countdown test expected
  `"in 3d 0h"` for +3 days, but the engine intentionally trims zero components
  and returns `"in 3d"`. Expectation corrected; engine behavior kept.
- App bugs found: **0**. Console/page errors: **0**.

## Source hygiene

`grep -rP '[^\x00-\x7F]'` over all `.js`/`.html`/`.css`/`.svg` sources returns
**zero matches** - Bengali strings are `\uXXXX` escapes in JS only, UI text is
rendered from the i18n dictionary, no network requests by design.
