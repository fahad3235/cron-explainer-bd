'use strict';
/* cron-explainer-bd - cron parser, plain-language explainer, next-run engine.
 * Pure logic, no DOM. Runs in browsers and in Node (module.exports guarded).
 * Source is pure ASCII: all Bengali is written as \uXXXX escapes. */

var DHAKA_OFFSET_MS = 6 * 3600 * 1000; // Asia/Dhaka is UTC+6 year-round (no DST)

var MONTH_NAME_TO_NUM = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6,
  jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
var DOW_NAME_TO_NUM = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
var MONTH_FULL = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
var DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
/* Bengali weekday names, index 0=Sunday. Pure-ASCII source via escapes. */
var DOW_BN = [
  '\u09b0\u09ac\u09bf\u09ac\u09be\u09b0',       // Sunday
  '\u09b8\u09cb\u09ae\u09ac\u09be\u09b0',       // Monday
  '\u09ae\u0999\u09cd\u0917\u09b2\u09ac\u09be\u09b0', // Tuesday
  '\u09ac\u09c1\u09a7\u09ac\u09be\u09b0',       // Wednesday
  '\u09ac\u09c3\u09b9\u09b8\u09cd\u09aa\u09a4\u09bf\u09ac\u09be\u09b0', // Thursday
  '\u09b6\u09c1\u0995\u09cd\u09b0\u09ac\u09be\u09b0', // Friday
  '\u09b6\u09a8\u09bf\u09ac\u09be\u09b0'        // Saturday
];

var MACROS = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *', '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *'
};

var FIELD_SPECS = [
  { key: 'minute',        label: 'minute',        min: 0, max: 59, names: null },
  { key: 'hour',          label: 'hour',          min: 0, max: 23, names: null },
  { key: 'dom',           label: 'day of month',  min: 1, max: 31, names: null },
  { key: 'month',         label: 'month',         min: 1, max: 12, names: MONTH_NAME_TO_NUM },
  { key: 'dow',           label: 'day of week',   min: 0, max: 7,  names: DOW_NAME_TO_NUM, isDow: true }
];

/* ---------- small helpers ---------- */

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function bnDigits(s) {
  var map = { '0':'\u09e6','1':'\u09e7','2':'\u09e8','3':'\u09e9','4':'\u09ea',
              '5':'\u09eb','6':'\u09ec','7':'\u09ed','8':'\u09ee','9':'\u09ef' };
  return String(s).replace(/[0-9]/g, function (d) { return map[d]; });
}

function joinListEn(items) {
  if (items.length === 1) return String(items[0]);
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

function uniformStep(values) {
  if (values.length < 2) return null;
  var k = values[1] - values[0];
  if (k <= 0) return null;
  for (var i = 2; i < values.length; i++) {
    if (values[i] - values[i - 1] !== k) return null;
  }
  return k;
}

function isFullRange(values, min, max) {
  return values.length === (max - min + 1) && values[0] === min &&
    values[values.length - 1] === max;
}

/* ---------- field parser ---------- */

function parseField(token, spec) {
  if (!/^[0-9A-Za-z*,\/-]+$/.test(token)) {
    return { values: [], error: 'Illegal character in the ' + spec.label +
      ' field: only digits, month/day names, and * , - / are allowed.' };
  }
  var work = token;
  if (spec.names) {
    var bad = [];
    work = token.toLowerCase().replace(/[a-z]+/g, function (m) {
      if (spec.names[m] !== undefined) return String(spec.names[m]);
      bad.push(m);
      return m;
    });
    if (bad.length) {
      return { values: [], error: 'Unknown name "' + bad[0] + '" in the ' +
        spec.label + ' field.' };
    }
  }
  var vals = {};
  var parts = work.split(',');
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var rangePart = part, step = null;
    var slash = part.indexOf('/');
    if (slash >= 0) {
      rangePart = part.slice(0, slash);
      var stepStr = part.slice(slash + 1);
      if (!/^[0-9]+$/.test(stepStr) || parseInt(stepStr, 10) <= 0) {
        return { values: [], error: 'Invalid step in "' + part + '" in the ' +
          spec.label + ' field: the step must be a positive number (steps of 0 are not allowed).' };
      }
      step = parseInt(stepStr, 10);
    }
    var start, end;
    if (rangePart === '*') {
      start = spec.min; end = spec.max;
    } else if (rangePart.indexOf('-') >= 0) {
      var b = rangePart.split('-');
      if (b.length !== 2 || !/^[0-9]+$/.test(b[0]) || !/^[0-9]+$/.test(b[1])) {
        return { values: [], error: 'Bad range "' + part + '" in the ' +
          spec.label + ' field.' };
      }
      start = parseInt(b[0], 10); end = parseInt(b[1], 10);
      if (start > end) {
        return { values: [], error: 'Reversed range "' + part + '" in the ' +
          spec.label + ' field: the range start must be <= the range end.' };
      }
    } else if (/^[0-9]+$/.test(rangePart)) {
      start = end = parseInt(rangePart, 10);
    } else {
      return { values: [], error: 'Cannot parse "' + part + '" in the ' +
        spec.label + ' field.' };
    }
    if (start < spec.min || end > spec.max) {
      return { values: [], error: 'Value out of range in the ' + spec.label +
        ' field: ' + start + (start === end ? '' : '-' + end) +
        ' is outside the allowed ' + spec.min + '-' + spec.max + '.' };
    }
    var st = step === null ? 1 : step;
    for (var v = start; v <= end; v += st) {
      vals[spec.isDow ? (v % 7) : v] = true; // day-of-week 7 == Sunday (0)
    }
  }
  var values = Object.keys(vals).map(Number).sort(function (a, b) { return a - b; });
  return { values: values, error: null };
}

/* ---------- expression parser ---------- */

function parseCron(expr) {
  var trimmed = String(expr == null ? '' : expr).trim();
  if (trimmed === '') {
    return { valid: false, empty: true, errors: [], fields: null };
  }
  var macro = null, body = trimmed;
  if (trimmed.charAt(0) === '@') {
    var low = trimmed.toLowerCase();
    if (low === '@reboot') {
      return { valid: true, empty: false, reboot: true, macro: '@reboot',
        expanded: null, errors: [], fields: null,
        domRestricted: false, dowRestricted: false };
    }
    if (MACROS[low] !== undefined) {
      macro = trimmed;
      body = MACROS[low];
    } else {
      return { valid: false, empty: false, reboot: false, errors:
        ['Unknown schedule macro "' + trimmed + '". Supported macros: @yearly @monthly ' +
         '@weekly @daily @hourly (@reboot is valid, but it has no schedule).'],
        fields: null };
    }
  }
  var tokens = body.split(/\s+/).filter(function (t) { return t.length > 0; });
  if (tokens.length !== 5) {
    return { valid: false, empty: false, reboot: false,
      errors: ['Expected 5 fields (minute hour day-of-month month day-of-week), got ' +
        tokens.length + '.'], fields: null };
  }
  var fields = {}, errors = [];
  for (var i = 0; i < 5; i++) {
    var spec = FIELD_SPECS[i];
    var r = parseField(tokens[i], spec);
    if (r.error) errors.push(r.error);
    fields[spec.key] = { values: r.values, raw: tokens[i] };
  }
  if (errors.length) {
    return { valid: false, empty: false, reboot: false, errors: errors, fields: null };
  }
  return {
    valid: true, empty: false, reboot: false, macro: macro,
    expanded: macro ? body : null, errors: [], fields: fields,
    domRestricted: tokens[2] !== '*',
    dowRestricted: tokens[4] !== '*'
  };
}

/* ---------- plain-language explanation ---------- */

function describeMinute(f, lang) {
  var v = f.values, bn = lang === 'bn';
  if (isFullRange(v, 0, 59)) return bn ? '\u09aa\u09cd\u09b0\u09a4\u09bf \u09ae\u09bf\u09a8\u09bf\u099f\u09c7' : 'every minute';
  var k = uniformStep(v);
  if (k && v[0] === 0) return bn ? '\u09aa\u09cd\u09b0\u09a4\u09bf ' + bnDigits(k) + ' \u09ae\u09bf\u09a8\u09bf\u099f\u09c7' : 'every ' + k + ' minutes';
  if (k) return bn ? bnDigits(v[0]) + ' \u09ae\u09bf\u09a8\u09bf\u099f \u09a5\u09c7\u0995\u09c7 \u09aa\u09cd\u09b0\u09a4\u09bf ' + bnDigits(k) + ' \u09ae\u09bf\u09a8\u09bf\u099f\u09c7'
                   : 'every ' + k + ' minutes starting at minute ' + v[0];
  if (v.length === 1) return bn ? bnDigits(v[0]) + ' \u09ae\u09bf\u09a8\u09bf\u099f\u09c7' : 'at minute ' + v[0];
  return bn ? bnDigits(v.join(', ')) + ' \u09ae\u09bf\u09a8\u09bf\u099f\u09c7' : 'at minutes ' + joinListEn(v);
}

function describeHour(f, lang) {
  var v = f.values, bn = lang === 'bn';
  if (isFullRange(v, 0, 23)) return bn ? '\u09aa\u09cd\u09b0\u09a4\u09bf \u0998\u09a3\u09cd\u099f\u09be\u09af\u09bc' : 'every hour';
  if (v.length === 1) return bn ? bnDigits(v[0]) + ' \u0998\u09a3\u09cd\u099f\u09be\u09af\u09bc' : 'during hour ' + v[0];
  var k = uniformStep(v);
  if (k === 1) return bn ? bnDigits(v[0]) + ' \u09a5\u09c7\u0995\u09c7 ' + bnDigits(v[v.length - 1]) + ' \u0998\u09a3\u09cd\u099f\u09be \u09aa\u09b0\u09cd\u09af\u09a8\u09cd\u09a4'
                         : 'during hours ' + v[0] + ' to ' + v[v.length - 1];
  return bn ? bnDigits(v.join(', ')) + ' \u0998\u09a3\u09cd\u099f\u09be\u09af\u09bc' : 'during hours ' + joinListEn(v);
}

function ordinalEn(n) {
  var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function describeDom(f, lang) {
  var v = f.values, bn = lang === 'bn';
  if (isFullRange(v, 1, 31)) return bn ? '\u09aa\u09cd\u09b0\u09a4\u09bf\u09a6\u09bf\u09a8' : 'every day of the month';
  if (v.length === 1) return bn ? '\u09ae\u09be\u09b8\u09c7\u09b0 ' + bnDigits(v[0]) + ' \u09a4\u09be\u09b0\u09bf\u0996\u09c7'
                                : 'on the ' + ordinalEn(v[0]) + ' of the month';
  return bn ? '\u09ae\u09be\u09b8\u09c7\u09b0 ' + bnDigits(v.join(', ')) + ' \u09a4\u09be\u09b0\u09bf\u0996\u09c7'
            : 'on the ' + v.map(ordinalEn).join(', ') + ' of the month';
}

function describeMonth(f, lang) {
  var v = f.values, bn = lang === 'bn';
  if (isFullRange(v, 1, 12)) return bn ? '\u09aa\u09cd\u09b0\u09a4\u09bf \u09ae\u09be\u09b8\u09c7' : 'every month';
  if (bn) return '\u09ae\u09be\u09b8 ' + bnDigits(v.join(', '));
  if (v.length === 1) return 'in ' + MONTH_FULL[v[0] - 1];
  return 'in ' + joinListEn(v.map(function (x) { return MONTH_FULL[x - 1]; }));
}

function describeDow(f, lang) {
  var v = f.values, bn = lang === 'bn';
  if (isFullRange(v, 0, 6)) return bn ? '\u09b8\u09aa\u09cd\u09a4\u09be\u09b9\u09c7\u09b0 \u09af\u09c7\u0995\u09cb\u09a8\u09cb \u09a6\u09bf\u09a8' : 'any day of the week';
  if (bn) {
    if (v.length === 1) return DOW_BN[v[0]];
    var k = uniformStep(v);
    if (k === 1) return DOW_BN[v[0]] + ' \u09a5\u09c7\u0995\u09c7 ' + DOW_BN[v[v.length - 1]];
    return v.map(function (x) { return DOW_BN[x]; }).join(', ');
  }
  if (v.length === 1) return 'on ' + DOW_FULL[v[0]] + 's';
  var kk = uniformStep(v);
  if (kk === 1) return DOW_FULL[v[0]] + ' to ' + DOW_FULL[v[v.length - 1]];
  return 'on ' + joinListEn(v.map(function (x) { return DOW_FULL[x] + 's'; }));
}

function describeTime(minF, hourF, lang) {
  var m = minF.values, h = hourF.values, bn = lang === 'bn';
  if (m.length === 1 && h.length === 1) {
    var t = pad2(h[0]) + ':' + pad2(m[0]);
    return bn ? bnDigits(t) + ' \u099f\u09be\u09af\u09bc' : 'at ' + t;
  }
  return describeMinute(minF, lang) + ', ' + describeHour(hourF, lang);
}

/* One-sentence summary, e.g. "Runs at 09:00, Monday to Friday." */
function summarize(parsed, lang) {
  var f = parsed.fields, bn = lang === 'bn';
  var time = describeTime(f.minute, f.hour, lang);
  var tails = [];
  if (parsed.domRestricted && parsed.dowRestricted) {
    tails.push(describeDom(f.dom, lang) + (bn ? ' \u0985\u09a5\u09ac\u09be ' : ' or ') + describeDow(f.dow, lang));
  } else if (parsed.dowRestricted) {
    tails.push(describeDow(f.dow, lang));
  } else if (parsed.domRestricted) {
    tails.push(describeDom(f.dom, lang));
  }
  if (f.month.raw !== '*') tails.push(describeMonth(f.month, lang));
  var body = time + (tails.length ? ', ' + tails.join(', ') : '');
  return bn ? '\u099a\u09b2\u09ac\u09c7 ' + body + '\u0964' : 'Runs ' + body + '.';
}

/* Per-field chips: [{key, en, bn}] */
function fieldChips(parsed) {
  var f = parsed.fields;
  return [
    { key: 'minute', en: describeMinute(f.minute, 'en'), bn: describeMinute(f.minute, 'bn') },
    { key: 'hour', en: describeHour(f.hour, 'en'), bn: describeHour(f.hour, 'bn') },
    { key: 'dom', en: describeDom(f.dom, 'en'), bn: describeDom(f.dom, 'bn') },
    { key: 'month', en: describeMonth(f.month, 'en'), bn: describeMonth(f.month, 'bn') },
    { key: 'dow', en: describeDow(f.dow, 'en'), bn: describeDow(f.dow, 'bn') }
  ];
}

/* ---------- next-run engine (Asia/Dhaka wall clock) ---------- */

function dhakaParts(ms) {
  var d = new Date(ms + DHAKA_OFFSET_MS);
  return {
    y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, day: d.getUTCDate(),
    h: d.getUTCHours(), mi: d.getUTCMinutes(), dow: d.getUTCDay()
  };
}

function matchesCron(parsed, p) {
  var f = parsed.fields;
  if (!f.minute.values || f.minute.values.indexOf(p.mi) < 0) return false;
  if (f.hour.values.indexOf(p.h) < 0) return false;
  if (f.month.values.indexOf(p.mo) < 0) return false;
  var domOk = f.dom.values.indexOf(p.day) >= 0;
  var dowOk = f.dow.values.indexOf(p.dow) >= 0;
  // Classic cron rule: if BOTH dom and dow are restricted, a run happens when
  // EITHER matches; otherwise both must match.
  if (parsed.domRestricted && parsed.dowRestricted) return domOk || dowOk;
  return domOk && dowOk;
}

/* membership via Set would be nicer; values arrays are tiny so indexOf is fine,
 * but the minute-by-minute scan calls this ~2M times for pathological inputs,
 * so build lookup objects once. */
function compileMatcher(parsed) {
  function setOf(a) { var o = {}; for (var i = 0; i < a.length; i++) o[a[i]] = true; return o; }
  var f = parsed.fields;
  return {
    minute: setOf(f.minute.values), hour: setOf(f.hour.values),
    dom: setOf(f.dom.values), month: setOf(f.month.values), dow: setOf(f.dow.values),
    domRestricted: parsed.domRestricted, dowRestricted: parsed.dowRestricted
  };
}

function matchesCompiled(c, p) {
  if (!c.minute[p.mi] || !c.hour[p.h] || !c.month[p.mo]) return false;
  var domOk = !!c.dom[p.day], dowOk = !!c.dow[p.dow];
  if (c.domRestricted && c.dowRestricted) return domOk || dowOk;
  return domOk && dowOk;
}

/* nowMs: epoch ms (inject for deterministic tests). Returns {runs:[{ms,parts}], capped}.
 * capped=true means the 4-year search window was exhausted before `count` runs. */
function nextRuns(parsed, count, nowMs) {
  var c = compileMatcher(parsed);
  var runs = [];
  var t = Math.floor(nowMs / 60000) * 60000 + 60000; // strictly after now
  var maxT = nowMs + 4 * 366 * 24 * 3600 * 1000;      // 4-year cap (covers leap cycles)
  while (runs.length < count && t <= maxT) {
    var p = dhakaParts(t);
    if (matchesCompiled(c, p)) runs.push({ ms: t, parts: p });
    t += 60000;
  }
  return { runs: runs, capped: runs.length < count };
}

function countdownText(ms, nowMs, lang) {
  var s = Math.max(0, Math.round((ms - nowMs) / 1000));
  var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  var m = Math.ceil((s % 3600) / 60);
  var parts = [];
  if (d > 0) parts.push([d, 'd']);
  if (h > 0) parts.push([h, 'h']);
  if (m > 0 || parts.length === 0) parts.push([m, 'm']);
  parts = parts.slice(0, 2);
  if (lang === 'bn') {
    var u = { d: '\u09a6\u09bf\u09a8', h: '\u0998\u09a3\u09cd\u099f\u09be', m: '\u09ae\u09bf\u09a8\u09bf\u099f' };
    return parts.map(function (x) { return bnDigits(x[0]) + u[x[1]]; }).join(' ') + ' \u09aa\u09b0\u09c7';
  }
  return 'in ' + parts.map(function (x) { return x[0] + x[1]; }).join(' ');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCron: parseCron, parseField: parseField, FIELD_SPECS: FIELD_SPECS,
    summarize: summarize, fieldChips: fieldChips,
    dhakaParts: dhakaParts, matchesCron: matchesCron, nextRuns: nextRuns,
    countdownText: countdownText, bnDigits: bnDigits, pad2: pad2,
    MACROS: MACROS, DOW_BN: DOW_BN, DOW_FULL: DOW_FULL, MONTH_FULL: MONTH_FULL,
    DHAKA_OFFSET_MS: DHAKA_OFFSET_MS
  };
}
