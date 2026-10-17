import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import './fp.css';
import { collect, compareWithLast, detectProtection, webrtcIPs, maskIP } from './fingerprint.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const setCheck = (id, state, text) => {
  const el = $(id);
  el.className = `check ${state}`;
  el.querySelector('span').textContent = text;
};
const setVerdict = (text, tone = '') => {
  $('fp-verdict').textContent = text;
  $('fp-verdict').className = `verdict ${tone}`;
};

// The values a tracker reads, in display order.
const FIELDS = [
  ['Browser', (f) => `${f.browser} · ${f.os}`],
  ['Graphics card', (f) => f.gpu],
  ['GPU vendor', (f) => f.gpuVendor],
  ['Screen', (f) => `${f.screen} · ${f.colorDepth}`],
  ['Time zone', (f) => f.timezone],
  ['Languages', (f) => f.language],
  ['CPU cores', (f) => f.cores],
  ['Memory', (f) => f.memory],
  ['Touch points', (f) => f.touch],
  ['Canvas hash', (f) => f.canvas],
  ['Audio hash', (f) => f.audio],
  ['Fonts found', (f) => (f.fonts.length ? f.fonts.join(', ') : 'none detected')],
];

function renderRows(fp, first) {
  $('fp-rows').innerHTML = FIELDS.map(([k, get]) => {
    const v = get(fp);
    const was = first ? get(first) : v;
    const changed = String(v) !== String(was);
    return `<div class="row ${changed ? 'moved' : ''}"><span class="k">${k}</span><span class="v">${esc(v)}${
      changed ? `<em>at load: ${esc(was)}</em>` : ''
    }</span></div>`;
  }).join('');
}

function renderProtection(p) {
  setCheck('c-canvas', p.noise || p.unstable ? 'good' : 'bad', p.noise || p.unstable ? 'noise detected' : 'exposed');
  setCheck('c-patched', p.patched.length ? 'good' : 'bad', p.patched.length ? `${p.patched.length} spoofed` : 'none');
  $('fp-patched').textContent = p.patched.length ? `Spoofed: ${p.patched.join(', ')}` : '';
}

async function scan() {
  setVerdict('Reading your browser…');
  const atLoad = detectProtection();
  const first = await collect();
  $('fp-id').textContent = first.id;
  const reload = compareWithLast(first);
  renderRows(first);
  renderProtection(atLoad);
  setCheck('c-cookies', first.cookies === 'readable' ? 'bad' : 'good', first.cookies);

  webrtcIPs().then((rtc) => {
    if (rtc.status === 'leaked') setCheck('c-webrtc', 'bad', `exposed · ${rtc.ips.map(maskIP).join(', ')}`);
    else setCheck('c-webrtc', 'good', rtc.status === 'blocked' ? 'blocked' : 'not exposed');
  });

  // Scan again a few seconds later. Protection that is injected late lets
  // scripts that run immediately (like most trackers) see the real device.
  setVerdict('Checking again in 3 seconds…');
  await new Promise((r) => setTimeout(r, 3000));
  const later = detectProtection();
  const second = await collect();
  const moved = FIELDS.some(([, get]) => String(get(first)) !== String(get(second)));
  renderRows(second, moved && !atLoad.active ? first : null);
  renderProtection(later);
  $('fp-id').textContent = second.id;

  // values moving between scans is just noise when protection was already there
  if (atLoad.active) {
    setVerdict('Protected from the first moment — this page only sees fake or noisy values.', 'good');
  } else if (later.active || moved) {
    setVerdict('Protection switched on late — scripts that ran first still saw your real device.', 'warn');
    $('fp-timing').textContent = 'Values marked "at load" were read before the protection started.';
  } else if (reload.status === 'same') {
    setVerdict('No protection detected and the same ID as last visit — you are trackable.', 'bad');
  } else if (reload.status === 'changed') {
    setVerdict(`No protection detected. The ID changed only because your ${reload.labels.join(', ').toLowerCase()} changed.`, 'bad');
  } else {
    setVerdict('No protection detected. Reload — the same ID will come back.', 'bad');
  }
}

$('fp-reload').addEventListener('click', () => location.reload());
$('fp-rescan').addEventListener('click', () => scan());
scan();
