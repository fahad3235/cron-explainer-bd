/* cron-explainer-bd - UI glue: i18n, rendering, presets, copy buttons.
 * Classic script; uses the globals from js/logic.js (parseCron, summarize,
 * fieldChips, nextRuns, dhakaParts, countdownText, bnDigits, pad2, DOW_BN,
 * DOW_FULL, MONTH_FULL). Source is pure ASCII; Bengali via \uXXXX escapes. */
(function () {
'use strict';

var MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

var I18N = {
  en: {
    title: 'Cron Explainer BD',
    subtitle: 'Understand any cron expression and see the next runs - 100% offline.',
    langBtn: 'Bangla toggle',
    inputLabel: 'Cron expression',
    inputPlaceholder: 'e.g. */15 9-17 * * 1-5',
    emptyHint: 'Type a cron expression above - or tap a preset below - to see a plain-language explanation and the next 10 runs.',
    errorTitle: 'That expression has a problem:',
    chipsTitle: 'Field by field',
    summaryTitle: 'Plain-language summary',
    runsTitle: 'Next 10 runs',
    nowLabel: 'Now (Asia/Dhaka):',
    presetsTitle: 'Quick presets',
    pitfallsTitle: 'Common pitfalls',
    copyCron: 'Copy expression',
    copyExpl: 'Copy explanation',
    copiedCron: 'Expression copied.',
    copiedExpl: 'Explanation copied (English + Bangla).',
    copyFail: 'Copy failed - select the text and press Ctrl+C (or long-press on mobile).',
    rebootNote: '@reboot is valid, but it is not a schedule: the command runs once when the machine boots, so there are no "next runs" to list.',
    noRuns: 'No runs found within the next 4 years. (Example: 30 February never exists.)',
    orTrap: 'Heads up: both day-of-month and day-of-week are restricted, so this runs when EITHER matches - the classic cron OR trap. See the pitfalls below.',
    monthBadge: 'next month',
    yearBadge: 'next year',
    macroExpanded: 'Expanded from {m}: {e}',
    footer: 'Educational parser for the standard 5-field cron (Vixie/ISC style) plus @macros. Quartz and other flavors use 6 or 7 fields - check your system\'s cron flavor before relying on a schedule. Runs 100% offline in your browser; nothing is sent anywhere.',
    fieldNames: ['Minute', 'Hour', 'Day of month', 'Month', 'Day of week']
  },
  bn: {
    title: '\u0995\u09cd\u09b0\u09a8 \u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b2\u09c7\u0987\u09a8\u09be\u09b0 \u09ac\u09bf\u09a1\u09bf',
    subtitle: '\u09af\u09c7\u0995\u09cb\u09a8\u09cb \u0995\u09cd\u09b0\u09a8 \u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b2\u09c7\u09b6\u09a8 \u09ac\u09c1\u099d\u09c1\u09a8 \u0993 \u09aa\u09b0\u09ac\u09b0\u09cd\u09a4\u09c0 \u09b0\u09be\u09a8 \u09a6\u09c7\u0996\u09c1\u09a8 - \u09e7\u09e6\u09e6% \u0985\u09ab\u09b2\u09be\u0987\u09a8\u0964',
    langBtn: 'English toggle',
    inputLabel: '\u0995\u09cd\u09b0\u09a8 \u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b2\u09c7\u09b6\u09a8',
    inputPlaceholder: 'e.g. */15 9-17 * * 1-5',
    emptyHint: '\u0989\u09aa\u09b0\u09c7 \u098f\u0995\u099f\u09bf \u0995\u09cd\u09b0\u09a8 \u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b2\u09c7\u09b6\u09a8 \u09b2\u09bf\u0996\u09c1\u09a8 - \u0985\u09a5\u09ac\u09be \u09a8\u09bf\u099a\u09c7\u09b0 \u09aa\u09cd\u09b0\u09bf\u09b8\u09c7\u099f\u09c7 \u099f\u09cd\u09af\u09be\u09aa \u0995\u09b0\u09c1\u09a8 - \u09b8\u09b9\u099c \u09ac\u09cd\u09af\u09be\u0996\u09cd\u09af\u09be \u0993 \u09aa\u09b0\u09c7\u09b0 \u09e7\u09e6\u099f\u09bf \u09b0\u09be\u09a8 \u09a6\u09c7\u0996\u09a4\u09c7\u0964',
    errorTitle: '\u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b2\u09c7\u09b6\u09a8\u09c7 \u09b8\u09ae\u09b8\u09cd\u09af\u09be \u0986\u099b\u09c7:',
    chipsTitle: '\u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u0998\u09b0',
    summaryTitle: '\u09b8\u09b9\u099c \u09ac\u09cd\u09af\u09be\u0996\u09cd\u09af\u09be',
    runsTitle: '\u09aa\u09b0\u09c7\u09b0 \u09e7\u09e6\u099f\u09bf \u09b0\u09be\u09a8',
    nowLabel: '\u098f\u0996\u09a8 (\u098f\u09b6\u09bf\u09af\u09bc\u09be/\u09a2\u09be\u0995\u09be):',
    presetsTitle: '\u09a6\u09cd\u09b0\u09c1\u09a4 \u09aa\u09cd\u09b0\u09bf\u09b8\u09c7\u099f',
    pitfallsTitle: '\u09b8\u09be\u09a7\u09be\u09b0\u09a3 \u09ad\u09c1\u09b2',
    copyCron: '\u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b2\u09c7\u09b6\u09a8 \u0995\u09aa\u09bf \u0995\u09b0\u09c1\u09a8',
    copyExpl: '\u09ac\u09cd\u09af\u09be\u0996\u09cd\u09af\u09be \u0995\u09aa\u09bf \u0995\u09b0\u09c1\u09a8',
    copiedCron: '\u098f\u0995\u09cd\u09b8\u09aa\u09cd\u09b2\u09c7\u09b6\u09a8 \u0995\u09aa\u09bf \u09b9\u09af\u09bc\u09c7\u099b\u09c7\u0964',
    copiedExpl: '\u09ac\u09cd\u09af\u09be\u0996\u09cd\u09af\u09be \u0995\u09aa\u09bf \u09b9\u09af\u09bc\u09c7\u099b\u09c7 (\u0987\u0982\u09b0\u09c7\u099c\u09bf + \u09ac\u09be\u0982\u09b2\u09be)\u0964',
    copyFail: '\u0995\u09aa\u09bf \u09ac\u09cd\u09af\u09b0\u09cd\u09a5 - \u099f\u09c7\u0995\u09cd\u09b8\u09cd\u099f \u09b8\u09bf\u09b2\u09c7\u0995\u09cd\u099f \u0995\u09b0\u09c7 Ctrl+C \u099a\u09be\u09aa\u09c1\u09a8\u0964',
    rebootNote: '@reboot \u09ac\u09c8\u09a7, \u0995\u09bf\u09a8\u09cd\u09a4\u09c1 \u098f\u099f\u09bf \u0995\u09cb\u09a8\u09cb \u09b8\u09ae\u09af\u09bc\u09b8\u09c2\u099a\u09bf \u09a8\u09af\u09bc: \u09ae\u09c7\u09b6\u09bf\u09a8 \u099a\u09be\u09b2\u09c1 \u09b9\u09b2\u09c7 \u0995\u09ae\u09be\u09a3\u09cd\u09a1 \u098f\u0995\u09ac\u09be\u09b0 \u099a\u09b2\u09c7, \u09a4\u09be\u0987 "\u09aa\u09b0\u09c7\u09b0 \u09b0\u09be\u09a8" \u09a8\u09c7\u0987\u0964',
    noRuns: '\u09aa\u09b0\u09c7\u09b0 \u09ea \u09ac\u099b\u09b0\u09c7 \u0995\u09cb\u09a8\u09cb \u09b0\u09be\u09a8 \u09aa\u09be\u0993\u09af\u09bc\u09be \u09af\u09be\u09af\u09bc\u09a8\u09bf\u0964 (\u09af\u09c7\u09ae\u09a8: \u09e9\u09e6 \u09ab\u09c7\u09ac\u09cd\u09b0\u09c1\u09af\u09bc\u09be\u09b0\u09bf \u0995\u0996\u09a8\u09cb \u0986\u09b8\u09c7 \u09a8\u09be\u0964)',
    orTrap: '\u09b8\u09a4\u09b0\u09cd\u0995\u09a4\u09be: \u09a4\u09be\u09b0\u09bf\u0996 \u0993 \u09ac\u09be\u09b0 - \u09a6\u09c1\u099f\u09cb\u0987 \u09a8\u09bf\u09b0\u09cd\u09a6\u09bf\u09b7\u09cd\u099f, \u09a4\u09be\u0987 \u09af\u09c7\u0995\u09cb\u09a8\u09cb \u098f\u0995\u099f\u09bf \u09ae\u09bf\u09b2\u09b2\u09c7\u0987 \u09b0\u09be\u09a8 \u09b9\u09ac\u09c7\u0964 \u098f\u099f\u09bf \u0995\u09cd\u09b0\u09a8\u09c7\u09b0 \u09aa\u09b0\u09bf\u099a\u09bf\u09a4 OR \u09ab\u09be\u0981\u09a6\u0964',
    monthBadge: '\u09aa\u09b0\u09c7\u09b0 \u09ae\u09be\u09b8',
    yearBadge: '\u09aa\u09b0\u09c7\u09b0 \u09ac\u099b\u09b0',
    macroExpanded: '{m} \u09a5\u09c7\u0995\u09c7 \u09b8\u09ae\u09cd\u09aa\u09cd\u09b0\u09b8\u09be\u09b0\u09bf\u09a4: {e}',
    footer: '\u09b6\u09bf\u0995\u09cd\u09b7\u09be\u09ae\u09c2\u09b2\u0995 \u09aa\u09be\u09b0\u09cd\u09b8\u09be\u09b0: \u09b8\u09cd\u099f\u09cd\u09af\u09be\u09a8\u09cd\u09a1\u09be\u09b0\u09cd\u09a1 \u09eb-\u0998\u09b0\u09c7\u09b0 \u0995\u09cd\u09b0\u09a8 (Vixie/ISC \u09a7\u09b0\u09a3) + @\u09ae\u09cd\u09af\u09be\u0995\u09cd\u09b0\u09cb\u0964 Quartz \u0993 \u0985\u09a8\u09cd\u09af\u09be\u09a8\u09cd\u09af \u09ab\u09cd\u09b2\u09c7\u09ad\u09be\u09b0\u09c7 \u09ec \u09ac\u09be \u09ed\u099f\u09bf \u0998\u09b0 \u09a5\u09be\u0995\u09c7 - \u09b8\u09ae\u09af\u09bc\u09b8\u09c2\u099a\u09bf \u09ac\u09cd\u09af\u09ac\u09b9\u09be\u09b0\u09c7\u09b0 \u0986\u0997\u09c7 \u0986\u09aa\u09a8\u09be\u09b0 \u09b8\u09bf\u09b8\u09cd\u099f\u09c7\u09ae\u09c7\u09b0 \u0995\u09cd\u09b0\u09a8 \u09a7\u09b0\u09a3 \u09af\u09be\u099a\u09be\u0987 \u0995\u09b0\u09c1\u09a8\u0964 \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u0985\u09ab\u09b2\u09be\u0987\u09a8\u09c7 \u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09cd\u09b0\u09be\u0989\u099c\u09be\u09b0\u09c7\u0987 \u099a\u09b2\u09c7\u0964',
    fieldNames: ['\u09ae\u09bf\u09a8\u09bf\u099f', '\u0998\u09a3\u09cd\u099f\u09be', '\u09ae\u09be\u09b8\u09c7\u09b0 \u09a4\u09be\u09b0\u09bf\u0996', '\u09ae\u09be\u09b8', '\u09b8\u09aa\u09cd\u09a4\u09be\u09b9\u09c7\u09b0 \u09ac\u09be\u09b0']
  }
};

var PRESETS = [
  { expr: '* * * * *',   en: 'Every minute',      bn: '\u09aa\u09cd\u09b0\u09a4\u09bf \u09ae\u09bf\u09a8\u09bf\u099f\u09c7' },
  { expr: '0 * * * *',   en: 'Hourly',            bn: '\u09aa\u09cd\u09b0\u09a4\u09bf \u0998\u09a3\u09cd\u099f\u09be\u09af\u09bc' },
  { expr: '0 9 * * *',   en: 'Daily 09:00',       bn: '\u09aa\u09cd\u09b0\u09a4\u09bf\u09a6\u09bf\u09a8 09:00' },
  { expr: '0 18 * * 1-5', en: 'Weekdays 18:00',   bn: '\u09b8\u09cb\u09ae-\u09b6\u09c1\u0995\u09cd\u09b0 18:00' },
  { expr: '0 0 1 * *',   en: 'Monthly 1st 00:00', bn: '\u09ae\u09be\u09b8\u09c7\u09b0 \u09e7 \u09a4\u09be\u09b0\u09bf\u0996 00:00' },
  { expr: '0 6 * * 0',   en: 'Sundays 06:00',     bn: '\u09b0\u09ac\u09bf\u09ac\u09be\u09b0 06:00' }
];

var PITFALLS = [
  {
    enTitle: 'Day-of-month + day-of-week = OR, not AND',
    enBody: '`0 0 1 * 0` does NOT mean "the 1st of the month AND a Sunday". When both fields are restricted, cron fires when EITHER matches - so this runs on the 1st of every month AND on every Sunday.',
    bnTitle: '\u09a4\u09be\u09b0\u09bf\u0996 + \u09ac\u09be\u09b0 = OR, AND \u09a8\u09af\u09bc',
    bnBody: '`0 0 1 * 0` \u09ae\u09be\u09a8\u09c7 "\u09e7 \u09a4\u09be\u09b0\u09bf\u0996 \u098f\u09ac\u0982 \u09b0\u09ac\u09bf\u09ac\u09be\u09b0" \u09a8\u09af\u09bc\u0964 \u09a6\u09c1\u099f\u09cb \u0998\u09b0\u0987 \u09a8\u09bf\u09b0\u09cd\u09a6\u09bf\u09b7\u09cd\u099f \u09a5\u09be\u0995\u09b2\u09c7 \u09af\u09c7\u0995\u09cb\u09a8\u09cb \u098f\u0995\u099f\u09bf \u09ae\u09bf\u09b2\u09b2\u09c7\u0987 \u09b0\u09be\u09a8 \u09b9\u09ac\u09c7 - \u09a4\u09be\u0987 \u09aa\u09cd\u09b0\u09a4\u09bf \u09ae\u09be\u09b8\u09c7\u09b0 \u09e7 \u09a4\u09be\u09b0\u09bf\u0996\u09c7\u0993 \u099a\u09b2\u09c7, \u09aa\u09cd\u09b0\u09a4\u09bf \u09b0\u09ac\u09bf\u09ac\u09be\u09b0\u09c7\u0993 \u099a\u09b2\u09c7\u0964'
  },
  {
    enTitle: '`*` and `*/1` are the same - `*/2` is not',
    enBody: '`*` in the minute field means every minute, exactly like `*/1`. But `*/2` means every 2 minutes (0, 2, 4, ...), and `2-59/2` starts at minute 2 instead of 0.',
    bnTitle: '`*` \u0986\u09b0 `*/1` \u098f\u0995\u0987 - `*/2` \u0986\u09b2\u09be\u09a6\u09be',
    bnBody: '\u09ae\u09bf\u09a8\u09bf\u099f\u09c7\u09b0 \u0998\u09b0\u09c7 `*` \u09ae\u09be\u09a8\u09c7 \u09aa\u09cd\u09b0\u09a4\u09bf \u09ae\u09bf\u09a8\u09bf\u099f - \u09a0\u09bf\u0995 `*/1`-\u098f\u09b0 \u09ae\u09a4\u09cb\u0987\u0964 \u0995\u09bf\u09a8\u09cd\u09a4\u09c1 `*/2` \u09ae\u09be\u09a8\u09c7 \u09aa\u09cd\u09b0\u09a4\u09bf \u09e8 \u09ae\u09bf\u09a8\u09bf\u099f\u09c7 (\u09e6, \u09e8, \u09ea, ...), \u0986\u09b0 `2-59/2` \u09b6\u09c1\u09b0\u09c1 \u09b9\u09af\u09bc \u09ae\u09bf\u09a8\u09bf\u099f \u09e8 \u09a5\u09c7\u0995\u09c7\u0964'
  },
  {
    enTitle: '30 February never runs',
    enBody: '`0 0 30 2 *` parses fine, but the calendar never has a 30 February - this schedule silently never fires. Try it above: the next-run list will say "no runs within 4 years".',
    bnTitle: '\u09e9\u09e6 \u09ab\u09c7\u09ac\u09cd\u09b0\u09c1\u09af\u09bc\u09be\u09b0\u09bf \u0995\u0996\u09a8\u09cb \u0986\u09b8\u09c7 \u09a8\u09be',
    bnBody: '`0 0 30 2 *` \u09aa\u09a1\u09bc\u09a4\u09c7 \u09a0\u09bf\u0995 \u0986\u099b\u09c7, \u0995\u09bf\u09a8\u09cd\u09a4\u09c1 \u0995\u09cd\u09af\u09be\u09b2\u09c7\u09a3\u09cd\u09a1\u09be\u09b0\u09c7 \u09e9\u09e6 \u09ab\u09c7\u09ac\u09cd\u09b0\u09c1\u09af\u09bc\u09be\u09b0\u09bf \u0995\u0996\u09a8\u09cb\u0987 \u0986\u09b8\u09c7 \u09a8\u09be - \u098f\u0987 \u09b8\u09ae\u09af\u09bc\u09b8\u09c2\u099a\u09bf \u0995\u0996\u09a8\u09cb \u099a\u09b2\u09ac\u09c7 \u09a8\u09be\u0964'
  },
  {
    enTitle: '`@reboot` is not a schedule',
    enBody: '`@reboot` runs your command once when the machine boots - there is no minute/hour/day pattern and no "next run". This tool marks it valid-but-unschedulable.',
    bnTitle: '`@reboot` \u0995\u09cb\u09a8\u09cb \u09b8\u09ae\u09af\u09bc\u09b8\u09c2\u099a\u09bf \u09a8\u09af\u09bc',
    bnBody: '`@reboot` \u09ae\u09c7\u09b6\u09bf\u09a8 \u099a\u09be\u09b2\u09c1 \u09b9\u09b2\u09c7 \u098f\u0995\u09ac\u09be\u09b0 \u0995\u09ae\u09be\u09a3\u09cd\u09a1 \u099a\u09be\u09b2\u09be\u09af\u09bc - \u098f\u09b0 \u0995\u09cb\u09a8\u09cb \u09ae\u09bf\u09a8\u09bf\u099f/\u0998\u09a3\u09cd\u099f\u09be/\u09a6\u09bf\u09a8\u09c7\u09b0 \u09a7\u09b0\u09a3 \u09a8\u09c7\u0987, "\u09aa\u09b0\u09c7\u09b0 \u09b0\u09be\u09a8"\u0993 \u09a8\u09c7\u0987\u0964'
  },
  {
    enTitle: '`0 9 * * 1-5` = weekdays at 9 AM',
    enBody: 'Day-of-week 1-5 means Monday to Friday (0 and 7 both mean Sunday). So this runs at 09:00 on working days - not on weekends.',
    bnTitle: '`0 9 * * 1-5` = \u0995\u09b0\u09cd\u09ae\u09a6\u09bf\u09ac\u09b8\u09c7 \u09b8\u0995\u09be\u09b2 \u09ef\u099f\u09be',
    bnBody: '\u09b8\u09aa\u09cd\u09a4\u09be\u09b9\u09c7\u09b0 \u09ac\u09be\u09b0 \u09e7-\u09eb \u09ae\u09be\u09a8\u09c7 \u09b8\u09cb\u09ae\u09ac\u09be\u09b0 \u09a5\u09c7\u0995\u09c7 \u09b6\u09c1\u0995\u09cd\u09b0\u09ac\u09be\u09b0 (\u09e6 \u0986\u09b0 \u09ed \u09a6\u09c1\u099f\u09cb\u0987 \u09b0\u09ac\u09bf\u09ac\u09be\u09b0)\u0964 \u0985\u09b0\u09cd\u09a5\u09be\u09ce \u0995\u09b0\u09cd\u09ae\u09a6\u09bf\u09ac\u09b8\u09c7 \u09b8\u0995\u09be\u09b2 \u09e6\u09ef:\u09e6\u09e6-\u099f\u09be\u09af\u09bc \u099a\u09b2\u09c7 - \u099b\u09c1\u099f\u09bf\u09b0 \u09a6\u09bf\u09a8\u09c7 \u09a8\u09af\u09bc\u0964'
  }
];

var lang = 'en';
try {
  var saved = window.localStorage.getItem('ceb-lang');
  if (saved === 'bn' || saved === 'en') lang = saved;
} catch (e) { /* storage unavailable - default to English */ }

function t(key) { return I18N[lang][key]; }
function $(id) { return document.getElementById(id); }

function applyStaticI18n() {
  document.documentElement.lang = lang;
  var els = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < els.length; i++) {
    var key = els[i].getAttribute('data-i18n');
    if (I18N[lang][key] !== undefined) els[i].textContent = I18N[lang][key];
  }
  var ph = $('cronInput').getAttribute('data-i18n-ph');
  if (ph) $('cronInput').placeholder = I18N[lang][ph];
  $('langBtn').textContent = lang === 'en' ? '\u09ac\u09be\u0982\u09b2\u09be' : 'English';
  $('langBtn').setAttribute('aria-label', I18N[lang].langBtn);
}

function renderPresets() {
  var wrap = $('presetBtns');
  wrap.innerHTML = '';
  PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset-btn';
    b.textContent = lang === 'bn' ? p.bn : p.en;
    b.setAttribute('data-expr', p.expr);
    b.addEventListener('click', function () {
      $('cronInput').value = p.expr;
      renderParse();
      $('cronInput').focus();
    });
    wrap.appendChild(b);
  });
}

function renderPitfalls() {
  var wrap = $('pitfallCards');
  wrap.innerHTML = '';
  PITFALLS.forEach(function (p) {
    var card = document.createElement('article');
    card.className = 'pitfall-card';
    var h = document.createElement('h3');
    h.textContent = lang === 'bn' ? p.bnTitle : p.enTitle;
    var body = document.createElement('p');
    body.textContent = lang === 'bn' ? p.bnBody : p.enBody;
    card.appendChild(h);
    card.appendChild(body);
    wrap.appendChild(card);
  });
}

function show(id, on) { $(id).hidden = !on; }

function formatRunDate(p) {
  if (lang === 'bn') {
    return bnDigits(p.day + '/' + p.mo + '/' + p.y) + ' ' + DOW_BN[p.dow] +
      ', ' + bnDigits(pad2(p.h) + ':' + pad2(p.mi));
  }
  return DOW_FULL[p.dow].slice(0, 3) + ', ' + p.day + ' ' + MONTH_SHORT[p.mo - 1] +
    ' ' + p.y + ' \u00b7 ' + pad2(p.h) + ':' + pad2(p.mi);
}

function formatNow(p) {
  if (lang === 'bn') {
    return t('nowLabel') + ' ' + bnDigits(p.day + '/' + p.mo + '/' + p.y) +
      ', ' + bnDigits(pad2(p.h) + ':' + pad2(p.mi));
  }
  return t('nowLabel') + ' ' + DOW_FULL[p.dow].slice(0, 3) + ', ' + p.day + ' ' +
    MONTH_SHORT[p.mo - 1] + ' ' + p.y + ', ' + pad2(p.h) + ':' + pad2(p.mi);
}

function renderParse() {
  var expr = $('cronInput').value;
  var parsed = parseCron(expr);
  show('emptyHint', false);
  show('errorBox', false);
  show('rebootNote', false);
  show('explainWrap', false);
  show('runsWrap', false);
  show('copyWrap', false);

  if (parsed.empty) {
    show('emptyHint', true);
    return;
  }
  if (!parsed.valid) {
    var box = $('errorBox');
    box.innerHTML = '';
    var title = document.createElement('strong');
    title.textContent = t('errorTitle');
    box.appendChild(title);
    var ul = document.createElement('ul');
    parsed.errors.forEach(function (e) {
      var li = document.createElement('li');
      li.textContent = e; /* parser errors are English-only by design */
      ul.appendChild(li);
    });
    box.appendChild(ul);
    show('errorBox', true);
    return;
  }
  if (parsed.reboot) {
    show('rebootNote', true);
    return;
  }

  /* explanation */
  var chips = fieldChips(parsed);
  var names = t('fieldNames');
  var chipsEl = $('chips');
  chipsEl.innerHTML = '';
  chips.forEach(function (c, i) {
    var chip = document.createElement('div');
    chip.className = 'chip';
    var lab = document.createElement('span');
    lab.className = 'chip-label';
    lab.textContent = names[i];
    var val = document.createElement('span');
    val.className = 'chip-value';
    val.textContent = lang === 'bn' ? c.bn : c.en;
    chip.appendChild(lab);
    chip.appendChild(val);
    chipsEl.appendChild(chip);
  });
  $('summary').textContent = summarize(parsed, lang);
  if (parsed.macro) {
    var me = t('macroExpanded').replace('{m}', parsed.macro).replace('{e}', parsed.expanded);
    $('macroLine').textContent = me;
    show('macroLine', true);
  } else {
    show('macroLine', false);
  }
  show('orTrapWarn', parsed.domRestricted && parsed.dowRestricted);
  show('explainWrap', true);

  /* next runs */
  var nowMs = Date.now();
  var res = nextRuns(parsed, 10, nowMs);
  var nowP = dhakaParts(nowMs);
  $('nowLine').textContent = formatNow(nowP);
  var list = $('runsList');
  list.innerHTML = '';
  res.runs.forEach(function (r) {
    var row = document.createElement('div');
    row.className = 'run-row';
    var left = document.createElement('div');
    left.className = 'run-date';
    left.textContent = formatRunDate(r.parts);
    var right = document.createElement('div');
    right.className = 'run-cd';
    var cd = document.createElement('span');
    cd.textContent = countdownText(r.ms, nowMs, lang);
    right.appendChild(cd);
    var badge = null;
    if (r.parts.y > nowP.y) badge = t('yearBadge');
    else if (r.parts.y === nowP.y && r.parts.mo > nowP.mo) badge = t('monthBadge');
    if (badge) {
      var b = document.createElement('span');
      b.className = 'run-badge';
      b.textContent = badge;
      right.appendChild(b);
    }
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });
  show('runsEmpty', res.runs.length === 0);
  show('runsWrap', true);
  show('copyWrap', true);

  /* stash last good parse for the copy-explanation button */
  window.__cebLast = { expr: expr, parsed: parsed };
}

function flashCopyMsg(key) {
  var m = $('copyMsg');
  m.textContent = t(key);
  m.classList.add('show');
  window.clearTimeout(window.__cebMsgT);
  window.__cebMsgT = window.setTimeout(function () { m.classList.remove('show'); }, 2600);
}

function copyText(text, okKey) {
  function done(ok) { flashCopyMsg(ok ? okKey : 'copyFail'); }
  function legacyCopy() {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      done(!!ok);
    } catch (e) { done(false); }
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { legacyCopy(); });
    } else {
      legacyCopy();
    }
  } catch (e) { legacyCopy(); }
}

function renderAll() {
  applyStaticI18n();
  renderPresets();
  renderPitfalls();
  renderParse();
}

function init() {
  $('langBtn').addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    try { window.localStorage.setItem('ceb-lang', lang); } catch (e) {}
    renderAll();
  });
  var deb = null;
  $('cronInput').addEventListener('input', function () {
    window.clearTimeout(deb);
    deb = window.setTimeout(renderParse, 220);
  });
  $('copyCronBtn').addEventListener('click', function () {
    copyText($('cronInput').value.trim(), 'copiedCron');
  });
  $('copyExplBtn').addEventListener('click', function () {
    var last = window.__cebLast;
    if (!last) { flashCopyMsg('copyFail'); return; }
    var chips = fieldChips(last.parsed);
    var names = I18N.en.fieldNames;
    var lines = ['Cron: ' + last.expr.trim(),
      'EN: ' + summarize(last.parsed, 'en'),
      'BN: ' + summarize(last.parsed, 'bn'),
      'Fields:'];
    chips.forEach(function (c, i) {
      lines.push('- ' + names[i] + ': ' + c.en + ' / ' + c.bn);
    });
    copyText(lines.join('\n'), 'copiedExpl');
  });
  if (!$('cronInput').value) $('cronInput').value = '0 9 * * 1-5';
  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
})();
