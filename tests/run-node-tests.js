/* cron-explainer-bd - Node unit tests (plain node:assert, no dependencies).
 * Run: node tests/run-node-tests.js
 * "now" is injected as epoch ms so every run is deterministic. */
'use strict';
const assert = require('node:assert');
const L = require('../js/logic.js');

/* Dhaka wall-clock -> epoch ms (Asia/Dhaka = UTC+6, no DST). */
function dh(y, mo, d, h, mi) { return Date.UTC(y, mo - 1, d, h - 6, mi, 0); }

let pass = 0, fail = 0;
const failures = [];
function check(cond, label) {
  if (cond) { pass++; }
  else { fail++; failures.push(label); console.log('FAIL - ' + label); }
}
function isoDhaka(ms) {
  const p = L.dhakaParts(ms);
  return p.y + '-' + L.pad2(p.mo) + '-' + L.pad2(p.day) + ' ' +
    L.pad2(p.h) + ':' + L.pad2(p.mi) + ' dow=' + p.dow;
}

/* All mandated "now" values: Sat 2026-10-24 09:00:00 +06:00. */
const NOW = dh(2026, 10, 24, 9, 0);
check(L.dhakaParts(NOW).dow === 6, 'sanity: 2026-10-24 is a Saturday (dow=6)');

/* ---------- parser: valid shapes ---------- */
{
  const p = L.parseCron('*/15 9-17 * * 1-5');
  check(p.valid === true, 'parse: "*/15 9-17 * * 1-5" is valid');
  check(JSON.stringify(p.fields.minute.values) === '[0,15,30,45]', 'parse: minute values [0,15,30,45]');
  check(p.fields.hour.values.length === 9 && p.fields.hour.values[0] === 9 && p.fields.hour.values[8] === 17,
    'parse: hour values 9..17');
  check(p.domRestricted === false && p.dowRestricted === true, 'parse: dom unrestricted, dow restricted');
}
check(L.parseCron('@daily').expanded === '0 0 * * *', 'parse: @daily expands to "0 0 * * *"');
check(L.parseCron('@yearly').expanded === '0 0 1 1 *', 'parse: @yearly expands to "0 0 1 1 *"');
check(L.parseCron('@hourly').expanded === '0 * * * *', 'parse: @hourly expands to "0 * * * *"');
check(L.parseCron('@monthly').expanded === '0 0 1 * *', 'parse: @monthly expands to "0 0 1 * *"');
check(L.parseCron('@weekly').expanded === '0 0 * * 0', 'parse: @weekly expands to "0 0 * * 0"');
{
  const p = L.parseCron('@reboot');
  check(p.valid === true && p.reboot === true, 'parse: @reboot is valid-but-unschedulable');
}
{
  const p = L.parseCron('0 9 * * 1-5');
  check(p.valid && JSON.stringify(p.fields.dow.values) === '[1,2,3,4,5]', 'parse: dow 1-5 -> [1,2,3,4,5]');
}
{
  const p = L.parseCron('0 6 * * 7');
  check(p.valid && JSON.stringify(p.fields.dow.values) === '[0]', 'parse: dow 7 normalizes to Sunday [0]');
}
{
  const p = L.parseCron('0 0 * JAN *');
  check(p.valid && JSON.stringify(p.fields.month.values) === '[1]', 'parse: month name JAN -> [1]');
}
{
  const p = L.parseCron('0 12 * * mon,wed,fri');
  check(p.valid && JSON.stringify(p.fields.dow.values) === '[1,3,5]', 'parse: lowercase dow names mon,wed,fri -> [1,3,5]');
}
check(L.parseCron('').empty === true, 'parse: empty string -> empty flag');
check(L.parseCron('   ').empty === true, 'parse: whitespace-only -> empty flag');

/* ---------- parser: invalid shapes ---------- */
{
  const p = L.parseCron('60 * * * *');
  check(!p.valid && /minute/.test(p.errors[0]), 'invalid: "60 * * * *" errors naming the minute field');
}
{
  const p = L.parseCron('* * * *');
  check(!p.valid && /5 fields/.test(p.errors[0]), 'invalid: 4 fields -> "expected 5 fields" error');
}
{
  const p = L.parseCron('*/0 * * * *');
  check(!p.valid && /step/i.test(p.errors[0]), 'invalid: "*/0" -> step-of-0 error');
}
{
  const p = L.parseCron('0 24 * * *');
  check(!p.valid && /hour/.test(p.errors[0]), 'invalid: hour 24 -> hour field error');
}
{
  const p = L.parseCron('0 0 * 13 *');
  check(!p.valid && /month/.test(p.errors[0]), 'invalid: month 13 -> month field error');
}
{
  const p = L.parseCron('0 0 * * 8');
  check(!p.valid && /day of week/.test(p.errors[0]), 'invalid: dow 8 -> day-of-week field error');
}
{
  const p = L.parseCron('0 0 * * MONDAY');
  check(!p.valid && /Unknown name/.test(p.errors[0]), 'invalid: "MONDAY" -> unknown-name error');
}
{
  const p = L.parseCron('1-2-3 * * * *');
  check(!p.valid && /Bad range/.test(p.errors[0]), 'invalid: "1-2-3" -> bad-range error');
}
{
  const p = L.parseCron('5-1 * * * *');
  check(!p.valid && /Reversed range/.test(p.errors[0]), 'invalid: "5-1" -> reversed-range error');
}
{
  const p = L.parseCron('@nope');
  check(!p.valid && /macro/i.test(p.errors[0]), 'invalid: "@nope" -> unknown-macro error');
}
{
  const p = L.parseCron('0 9 * * 1-5 extra');
  check(!p.valid && /5 fields/.test(p.errors[0]), 'invalid: 6 fields -> field-count error');
}
{
  const p = L.parseCron('0 0 30 2 *');
  check(p.valid === true, 'parse: "0 0 30 2 *" is accepted by the parser (Feb 30 is the pitfall example)');
}

/* ---------- next-run engine (mandated hand-verified cases) ---------- */
{
  /* From Sat 2026-10-24 09:00, dow is restricted to 1-5, so Saturday and
   * Sunday produce no runs: the first run is Monday 2026-10-26 09:00.
   * (A "09:15 same day" result would require a weekday "now".) */
  const p = L.parseCron('*/15 9-17 * * 1-5');
  const r = L.nextRuns(p, 3, NOW);
  check(r.runs.length === 3, 'next: "*/15 9-17 * * 1-5" returns 3 runs');
  check(r.runs[0].ms === dh(2026, 10, 26, 9, 0),
    'next: "*/15 9-17 * * 1-5" first run is Mon 2026-10-26 09:00 Dhaka (got ' + isoDhaka(r.runs[0].ms) + ')');
  check(r.runs[1].ms === dh(2026, 10, 26, 9, 15),
    'next: second run is 09:15 same Monday');
}
{
  const p = L.parseCron('0 9 * * *');
  const r = L.nextRuns(p, 1, NOW);
  check(r.runs[0].ms === dh(2026, 10, 25, 9, 0),
    'next: "0 9 * * *" -> 2026-10-25 09:00, exactly 24h after now (got ' + isoDhaka(r.runs[0].ms) + ')');
}
{
  const p = L.parseCron('0 0 29 2 *');
  const t0 = Date.now();
  const r = L.nextRuns(p, 1, NOW);
  const scanMs = Date.now() - t0;
  check(r.runs[0].ms === dh(2028, 2, 29, 0, 0),
    'next: "0 0 29 2 *" -> leap day 2028-02-29 00:00 Dhaka (got ' + isoDhaka(r.runs[0].ms) + ')');
  check(scanMs < 5000, 'next: Feb-29 leap search scans in ' + scanMs + 'ms (<5s)');
}
{
  /* OR semantics: dom=1 and dow=0 are BOTH restricted -> run when EITHER
   * matches. From Sat Oct 24: Sun Oct 25 00:00 beats Sun Nov 1 00:00. */
  const p = L.parseCron('0 0 1 * 0');
  const r = L.nextRuns(p, 2, NOW);
  check(r.runs[0].ms === dh(2026, 10, 25, 0, 0),
    'next: "0 0 1 * 0" OR semantics -> Sun 2026-10-25 00:00 (got ' + isoDhaka(r.runs[0].ms) + ')');
  check(r.runs[1].ms === dh(2026, 11, 1, 0, 0),
    'next: "0 0 1 * 0" second run is Sun 2026-11-01 00:00 (got ' + isoDhaka(r.runs[1].ms) + ')');
}
{
  const p = L.parseCron('0 12 * * MON,WED,FRI');
  const r = L.nextRuns(p, 1, NOW);
  check(r.runs[0].ms === dh(2026, 10, 26, 12, 0),
    'next: "0 12 * * MON,WED,FRI" -> Mon 2026-10-26 12:00 (got ' + isoDhaka(r.runs[0].ms) + ')');
}
{
  const p = L.parseCron('0 0 30 2 *');
  const t0 = Date.now();
  const r = L.nextRuns(p, 1, NOW);
  const scanMs = Date.now() - t0;
  check(r.runs.length === 0 && r.capped === true,
    'next: "0 0 30 2 *" -> no runs, capped=true (Feb 30 never exists)');
  check(scanMs < 5000, 'next: Feb-30 full 4-year scan finishes in ' + scanMs + 'ms (<5s)');
}
{
  const p = L.parseCron('0 9 * * 1-5');
  const r = L.nextRuns(p, 10, NOW);
  check(r.runs.length === 10 && r.capped === false, 'next: "0 9 * * 1-5" returns 10 uncapped runs');
  const allWeekday9am = r.runs.every(function (x) {
    return x.parts.h === 9 && x.parts.mi === 0 && x.parts.dow >= 1 && x.parts.dow <= 5 && x.ms > NOW;
  });
  check(allWeekday9am, 'next: all 10 runs are strictly after now, at 09:00 on Mon-Fri');
}
check(L.countdownText(NOW + (2 * 3600 + 15 * 60) * 1000, NOW, 'en') === 'in 2h 15m',
  'countdown: +2h15m -> "in 2h 15m"');
check(L.countdownText(NOW + 3 * 86400 * 1000, NOW, 'en') === 'in 3d',
  'countdown: +3d -> "in 3d" (zero components are trimmed)');
check(/[\u09e6-\u09ef]/.test(L.countdownText(NOW + 3600 * 1000, NOW, 'bn')),
  'countdown: BN mode uses Bengali digits');

/* ---------- explanation ---------- */
{
  const p = L.parseCron('0 9 * * 1-5');
  const en = L.summarize(p, 'en');
  check(en.indexOf('09:00') >= 0, 'explain: EN summary contains "09:00" (got "' + en + '")');
  check(en.indexOf('Monday to Friday') >= 0, 'explain: EN summary contains "Monday to Friday"');
  const bn = L.summarize(p, 'bn');
  check(/[\u09e6-\u09ef]/.test(bn), 'explain: BN summary renders Bengali digits (got "' + bn + '")');
  check(bn.indexOf('\u09e6\u09ef:\u09e6\u09e6') >= 0, 'explain: BN summary contains Bengali digits for 09:00');
  const chips = L.fieldChips(p);
  check(chips.length === 5, 'explain: 5 field chips');
  check(chips[0].en === 'at minute 0', 'explain: minute chip EN is "at minute 0"');
  check(chips[4].en === 'Monday to Friday', 'explain: dow chip EN is "Monday to Friday"');
  check(/[\u09e6-\u09ef]/.test(chips[4].bn) || chips[4].bn.length > 0, 'explain: dow chip BN is non-empty');
}
{
  const p = L.parseCron('* * * * *');
  check(L.summarize(p, 'en').indexOf('every minute') >= 0, 'explain: "* * * * *" summary mentions "every minute"');
}
{
  const p = L.parseCron('*/15 9-17 * * 1-5');
  check(L.summarize(p, 'en').indexOf('every 15 minutes') >= 0,
    'explain: "*/15 9-17 * * 1-5" summary mentions "every 15 minutes"');
}
{
  const p = L.parseCron('0 0 1 1 *');
  const en = L.summarize(p, 'en');
  check(en.indexOf('January') >= 0 && en.indexOf('1st') >= 0,
    'explain: "0 0 1 1 *" summary mentions January and 1st (got "' + en + '")');
}
check(L.bnDigits('09:00') === '\u09e6\u09ef:\u09e6\u09e6', 'bnDigits: "09:00" -> "09:00"');

console.log('\nunit: ' + pass + ' passed, ' + fail + ' failed');
if (failures.length) { console.log('FAILURES:'); failures.forEach(function (f) { console.log(' - ' + f); }); }
process.exit(fail ? 1 : 0);
