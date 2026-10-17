import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import './fp.css';
import { collect, compareWithLast, webrtcIPs, maskIP } from './fingerprint.js';

const $ = (id) => document.getElementById(id);
const setCheck = (id, state, text) => {
  const el = $(id);
  el.className = `check ${state}`;
  el.querySelector('span').textContent = text;
};

$('fp-reload').addEventListener('click', () => location.reload());

async function run() {
  const fp = await collect();
  $('fp-id').textContent = fp.id;

  const vs = compareWithLast(fp);
  const noise = vs.changed.includes('canvas') || vs.changed.includes('audio');
  const verdict = $('fp-verdict');
  if (vs.status === 'first') {
    verdict.textContent = 'Now reload the page — does the ID stay the same?';
    verdict.className = 'verdict';
  } else if (vs.status === 'same') {
    verdict.textContent = 'Same ID as last time — you are trackable.';
    verdict.className = 'verdict bad';
  } else if (noise) {
    verdict.textContent = 'The ID changed — trackers cannot link your visits.';
    verdict.className = 'verdict good';
  } else {
    verdict.textContent = `The ID changed because your ${vs.labels.join(', ').toLowerCase()} changed.`;
    verdict.className = 'verdict';
  }
  if (vs.changed.length) $('fp-changed').textContent = `Changed since last load: ${vs.labels.join(', ')}`;

  const canvasState = fp.canvas === 'blocked' ? 'blocked' : vs.changed.includes('canvas') ? 'randomised' : null;
  setCheck('c-canvas', canvasState ? 'good' : vs.status === 'first' ? '' : 'bad',
    canvasState || `exposed · ${fp.canvas.slice(-8)}`);
  setCheck('c-cookies', fp.cookies === 'readable' ? 'bad' : 'good', fp.cookies);

  const rows = [
    ['Browser', `${fp.browser} · ${fp.os}`],
    ['Graphics card', fp.gpu],
    ['GPU vendor', fp.gpuVendor],
    ['Screen', `${fp.screen} · ${fp.colorDepth}`],
    ['Time zone', fp.timezone],
    ['Languages', fp.language],
    ['CPU cores', fp.cores],
    ['Memory', fp.memory],
    ['Touch points', fp.touch],
    ['Canvas hash', fp.canvas],
    ['Audio hash', fp.audio],
    ['Fonts found', fp.fonts.length ? fp.fonts.join(', ') : 'none detected'],
  ];
  $('fp-rows').innerHTML = rows
    .map(([k, v]) => `<div class="row"><span class="k">${k}</span><span class="v">${String(v).replace(/</g, '&lt;')}</span></div>`)
    .join('');

  const rtc = await webrtcIPs();
  if (rtc.status === 'leaked') setCheck('c-webrtc', 'bad', `exposed · ${rtc.ips.map(maskIP).join(', ')}`);
  else setCheck('c-webrtc', 'good', rtc.status === 'blocked' ? 'blocked' : 'not exposed');
}

run();
