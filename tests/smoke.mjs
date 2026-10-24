/* Headless-Chrome smoke test (raw CDP) for cron-explainer-bd.
 * Run: node tests/smoke.mjs
 * Loads file://index.html, drives the UI, counts real assertions. */
import { spawn } from 'node:child_process';

const CHROME = '/opt/meta-chromium/chrome';
const PAGE = 'file:///home/hatch/workspace/muse-project-factory/builds/cron-explainer-bd/index.html';

let pass = 0, fail = 0;
const failures = [];
function check(cond, label) {
  if (cond) { pass++; }
  else { fail++; failures.push(label); console.log('FAIL - ' + label); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=0', '--user-data-dir=/tmp/ceb-chrome-profile',
    'about:blank'
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let wsUrl = null, httpPort = null;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('no DevTools URL in stderr')), 15000);
    chrome.stderr.on('data', d => {
      const m = String(d).match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        wsUrl = m[1];
        httpPort = new URL(wsUrl.replace(/^ws:\/\//, 'http://')).port;
        clearTimeout(t); resolve();
      }
    });
    chrome.on('error', reject);
  });

  const res = await fetch(`http://127.0.0.1:${httpPort}/json/new?${encodeURIComponent(PAGE)}`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res2, rej) => { ws.onopen = res2; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const consoleErrors = [], pageErrors = [];
  function onConsole(p) {
    if (p.type === 'error') {
      const txt = (p.args || []).map(a => a.value ?? a.description ?? '').join(' ');
      consoleErrors.push(txt);
    }
  }
  function onException(p) { pageErrors.push(p.exceptionDetails.text || JSON.stringify(p.exceptionDetails)); }
  function onLog(p) { if (p.entry.level === 'error') pageErrors.push(p.entry.text); }

  let loadResolve = null;
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method === 'Runtime.consoleAPICalled') onConsole(m.params);
    else if (m.method === 'Runtime.exceptionThrown') onException(m.params);
    else if (m.method === 'Log.entryAdded') onLog(m.params);
    else if (m.method === 'Page.loadEventFired' && loadResolve) { loadResolve(); loadResolve = null; }
  };
  function send(method, params = {}) {
    return new Promise(resolve => {
      const myId = ++id;
      pending.set(myId, resolve);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  }
  const waitLoad = () => new Promise(r => { loadResolve = r; setTimeout(r, 8000); });

  async function ev(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
    if (r.result && r.result.result) return r.result.result.value;
    return undefined;
  }
  const text = sel => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent`);
  const visible = sel => ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});return !!(e&&!e.hidden);})()`);
  async function setInput(v) {
    await ev(`(function(){var i=document.getElementById('cronInput');i.value=${JSON.stringify(v)};i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await sleep(450); // debounce 220ms + next-run scan headroom
  }

  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  const loaded = waitLoad();
  await send('Page.navigate', { url: PAGE });
  await loaded; await sleep(600);

  // 1. loads clean, default state rendered
  check(await ev('document.title') === 'Cron Explainer BD', 'title is Cron Explainer BD');
  check(consoleErrors.length === 0, 'zero console errors on load (got ' + consoleErrors.length + ')');
  check(pageErrors.length === 0, 'zero page errors on load (got ' + pageErrors.length + ')');
  const resNames = await ev(`performance.getEntriesByType('resource').map(r=>r.name).join('|')`);
  check(String(resNames).split('|').filter(Boolean).every(n => n.indexOf('file://') === 0),
    'zero network requests (all resources file://; got "' + String(resNames).slice(0, 80) + '")');
  check((await text('h1')).indexOf('Cron Explainer BD') >= 0, 'h1 renders brand title');
  check(await ev("document.getElementById('cronInput').value") === '0 9 * * 1-5', 'input prefilled with 0 9 * * 1-5');
  const sum0 = String(await text('#summary'));
  check(sum0.indexOf('09:00') >= 0 && sum0.indexOf('Monday to Friday') >= 0,
    'default summary contains "09:00" and "Monday to Friday" (got "' + sum0 + '")');
  check(await ev("document.querySelectorAll('#chips .chip').length") === 5, '5 field chips render');
  check(await ev("document.querySelectorAll('#runsList .run-row').length") === 10, '10 next-run rows render');
  check(/in \d/.test(String(await text('#runsList .run-row .run-cd'))), 'run rows show countdown text');
  check(await ev('document.documentElement.scrollWidth') <= await ev('window.innerWidth'), 'no horizontal overflow on desktop load');

  // 2. preset click fills input + updates explanation
  await ev(`document.querySelector('.preset-btn[data-expr="* * * * *"]').click()`);
  await sleep(450);
  check(await ev("document.getElementById('cronInput').value") === '* * * * *', 'preset click fills "* * * * *"');
  check(String(await text('#summary')).indexOf('every minute') >= 0, 'summary updates to "every minute" after preset');

  // 3. invalid input shows inline error naming the field
  await setInput('99 * * * *');
  check(await visible('#errorBox') === true, 'inline error box visible for "99 * * * *"');
  check(String(await text('#errorBox')).indexOf('minute') >= 0, 'error names the minute field');
  check(await visible('#runsWrap') === false, 'runs hidden while input is invalid');

  // 4. empty input shows friendly hint, no error
  await setInput('');
  check(await visible('#emptyHint') === true, 'friendly hint visible on empty input');
  check(await visible('#errorBox') === false, 'no error shown on empty input');

  // 5. @reboot: valid-but-unschedulable note
  await setInput('@reboot');
  check(await visible('#rebootNote') === true, '@reboot shows valid-but-unschedulable note');
  check(await visible('#runsWrap') === false, 'no next-runs section for @reboot');

  // 6. back to a good expression: OR-trap warning appears for dom+dow restricted
  await setInput('0 0 1 * 0');
  check(await visible('#orTrapWarn') === true, 'OR-trap warning shown for "0 0 1 * 0"');
  await setInput('0 9 * * 1-5');
  check(await visible('#orTrapWarn') === false, 'no OR-trap warning for "0 9 * * 1-5"');

  // 7. copy button: message appears (clipboard may fall back headless - either path must message)
  await ev(`document.getElementById('copyCronBtn').click()`);
  await sleep(400);
  check(String(await text('#copyMsg')).length > 2, 'copy button shows a status message');

  // 8. BN toggle: chips + summary switch to Bengali, persists across reload
  await ev(`document.getElementById('langBtn').click()`);
  await sleep(400);
  check(await ev('document.documentElement.lang') === 'bn', 'html lang switches to bn');
  const bnChip = String(await text('#chips .chip .chip-value'));
  check(/[\u0980-\u09FF]/.test(bnChip), 'BN mode chip renders Bengali (got "' + bnChip.slice(0, 30) + '")');
  const bnSum = String(await text('#summary'));
  check(/[\u09E6-\u09EF]/.test(bnSum), 'BN mode summary uses Bengali digits');
  check((await text('#brandName, h1')).length > 0, 'h1 present in BN mode');
  const rl = waitLoad();
  await send('Page.reload');
  await rl; await sleep(600);
  check(await ev('document.documentElement.lang') === 'bn', 'BN mode restored after reload (localStorage)');
  check(await ev("document.getElementById('cronInput').value") === '0 9 * * 1-5', 'input value intact after reload');

  // 9. pitfalls: 5 static cards
  check(await ev("document.querySelectorAll('#pitfallCards .pitfall-card').length") === 5, '5 pitfall cards render');

  // 10. 390px viewport: no horizontal overflow
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const rl2 = waitLoad();
  await send('Page.reload');
  await rl2; await sleep(600);
  const sw = await ev('document.documentElement.scrollWidth');
  const iw = await ev('window.innerWidth');
  check(sw <= iw, 'mobile viewport: no horizontal overflow (scrollWidth=' + sw + ' innerWidth=' + iw + ')');
  check(await ev("document.querySelectorAll('#runsList .run-row').length") === 10, '10 run rows render at 390px');

  // final error sweep
  check(consoleErrors.length === 0, 'zero console errors overall (got ' + consoleErrors.length + ': ' + consoleErrors.slice(0, 2).join(' | ') + ')');
  check(pageErrors.length === 0, 'zero page errors overall (got ' + pageErrors.length + ')');

  console.log(`\nsmoke: ${pass} passed, ${fail} failed`);
  if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log(' - ' + f)); }
  ws.close(); chrome.kill();
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error('smoke harness error:', e.message); process.exit(2); });
