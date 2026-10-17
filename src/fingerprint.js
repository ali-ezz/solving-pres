// Browser fingerprint collection — the same techniques real trackers use.
// Everything runs locally; the only network call is the optional WebRTC
// STUN request, which is exactly the leak we want to demonstrate.

// cyrb53: small, fast, non-cryptographic 53-bit hash
export function hash(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export const shortId = (h) => h.slice(-8).toUpperCase().replace(/(.{4})(.{4})/, '$1-$2');

function canvasHash() {
  try {
    const c = document.createElement('canvas');
    c.width = 280;
    c.height = 60;
    const g = c.getContext('2d');
    g.textBaseline = 'top';
    g.font = '16px "Arial"';
    g.fillStyle = '#f60';
    g.fillRect(100, 1, 62, 20);
    g.fillStyle = '#069';
    g.fillText('Heros Shell, fingerprint 😃', 2, 15);
    g.fillStyle = 'rgba(102, 204, 0, 0.7)';
    g.fillText('Heros Shell, fingerprint 😃', 4, 17);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = 'rgb(255,0,255)';
    g.beginPath();
    g.arc(50, 30, 30, 0, Math.PI * 2);
    g.fill();
    return hash(c.toDataURL());
  } catch {
    return 'blocked';
  }
}

function webgl() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return { vendor: 'unavailable', renderer: 'unavailable' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return { vendor: String(vendor), renderer: String(renderer) };
  } catch {
    return { vendor: 'blocked', renderer: 'blocked' };
  }
}

async function audioHash() {
  try {
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Ctx) return 'unavailable';
    const ctx = new Ctx(1, 5000, 44100);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 10000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -50;
    comp.knee.value = 40;
    comp.ratio.value = 12;
    comp.attack.value = 0;
    comp.release.value = 0.25;
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buf = await Promise.race([
      ctx.startRendering(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500)),
    ]);
    const data = buf.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
    return hash(sum.toString());
  } catch {
    return 'blocked';
  }
}

const FONT_LIST = [
  'Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas',
  'Constantia', 'Corbel', 'Courier New', 'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Georgia',
  'Helvetica', 'Helvetica Neue', 'Impact', 'Lucida Console', 'Lucida Grande', 'Menlo', 'Monaco',
  'MS Gothic', 'Palatino', 'Segoe UI', 'Segoe Print', 'SF Pro', 'Tahoma', 'Times New Roman',
  'Trebuchet MS', 'Verdana', 'Ubuntu', 'DejaVu Sans', 'Liberation Sans', 'Noto Sans', 'Roboto',
  'Cantarell', 'Fira Sans', 'Droid Sans', 'Arabic Typesetting', 'Traditional Arabic', 'Simplified Arabic',
  'Geeza Pro', 'Avenir', 'Futura', 'Gill Sans', 'Optima', 'Baskerville',
];

function fonts() {
  try {
    const bases = ['monospace', 'sans-serif', 'serif'];
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const text = 'mmmmmmmmmmlli1WQ@#';
    const width = (f) => {
      g.font = `72px ${f}`;
      return g.measureText(text).width;
    };
    const baseW = bases.map(width);
    return FONT_LIST.filter((font) => bases.some((b, i) => width(`"${font}", ${b}`) !== baseW[i]));
  } catch {
    return [];
  }
}

function browserName() {
  const ua = navigator.userAgent;
  const brands = navigator.userAgentData?.brands?.map((b) => b.brand) || [];
  const pick = ['Microsoft Edge', 'Opera', 'Brave', 'Google Chrome', 'Chromium'].find((b) => brands.includes(b));
  if (pick) return pick;
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown';
}

function osName() {
  const p = navigator.userAgentData?.platform || navigator.platform || '';
  const ua = navigator.userAgent;
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Win/.test(p)) return 'Windows';
  if (/Mac/.test(p)) return 'macOS';
  if (/Linux/.test(p)) return 'Linux';
  return p || 'Unknown';
}

// WebRTC leak test: ask a public STUN server which IP we come from.
// Resolves with { status: 'leaked' | 'blocked' | 'none', ips: [] }
export function webrtcIPs(timeout = 3000) {
  return new Promise((resolve) => {
    const PC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (!PC) return resolve({ status: 'blocked', ips: [] });
    const ips = new Set();
    let pc;
    try {
      pc = new PC({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    } catch {
      return resolve({ status: 'blocked', ips: [] });
    }
    const done = () => {
      try { pc.close(); } catch { /* already closed */ }
      const list = [...ips];
      resolve({ status: list.length ? 'leaked' : 'none', ips: list });
    };
    pc.onicecandidate = (e) => {
      if (!e.candidate) return done();
      // candidate:<foundation> <component> <proto> <priority> <address> <port> typ <type> ...
      const addr = e.candidate.candidate.split(' ')[4] || '';
      if (addr && !addr.endsWith('.local') && addr !== '0.0.0.0') ips.add(addr);
    };
    try {
      pc.createDataChannel('x');
      pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => resolve({ status: 'blocked', ips: [] }));
    } catch {
      return resolve({ status: 'blocked', ips: [] });
    }
    setTimeout(done, timeout);
  });
}

export const maskIP = (ip) =>
  ip.includes('.') ? ip.replace(/^(\d+)\.\d+\.\d+\.(\d+)$/, '$1.•••.•••.$2') : ip.replace(/:[^:]+:[^:]+:/, ':••••:••••:');

function cookieTest() {
  try {
    document.cookie = 'heros_test=1; SameSite=Lax; path=/';
    const ok = document.cookie.includes('heros_test=1');
    document.cookie = 'heros_test=; Max-Age=0; path=/';
    return ok ? 'readable' : 'blocked';
  } catch {
    return 'blocked';
  }
}

// Collect everything. Returns a flat object plus the combined fingerprint ID.
export async function collect() {
  const gl = webgl();
  const fontList = fonts();
  const [audio] = await Promise.all([audioHash()]);
  const fp = {
    browser: browserName(),
    os: osName(),
    screen: `${screen.width} × ${screen.height} @${window.devicePixelRatio}x`,
    colorDepth: `${screen.colorDepth}-bit`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    language: (navigator.languages || [navigator.language]).slice(0, 3).join(', '),
    cores: navigator.hardwareConcurrency || '?',
    memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'hidden',
    gpuVendor: gl.vendor,
    gpu: gl.renderer,
    canvas: canvasHash(),
    audio,
    fonts: fontList,
    cookies: cookieTest(),
    touch: navigator.maxTouchPoints || 0,
  };
  const stable = [
    fp.browser, fp.os, fp.screen, fp.colorDepth, fp.timezone, fp.language, fp.cores, fp.memory,
    fp.gpuVendor, fp.gpu, fp.canvas, fp.audio, fp.fonts.join(','), fp.touch,
  ].join('|');
  fp.id = shortId(hash(stable));
  return fp;
}

// Remember the last reading so a reload can show what changed.
// With Heros Shell's canvas noise the canvas hash (and so the ID) should
// change on every load while the hardware stays the same.
// every input of the ID, so a changed ID always names its cause
const TRACKED = {
  canvas: 'Canvas hash', audio: 'Audio hash', gpu: 'Graphics card', gpuVendor: 'GPU vendor',
  screen: 'Screen', colorDepth: 'Colour depth', fonts: 'Fonts', timezone: 'Time zone',
  language: 'Languages', browser: 'Browser', os: 'OS', cores: 'CPU cores', memory: 'Memory',
  touch: 'Touch points',
};

export function compareWithLast(fp) {
  const now = Object.fromEntries(Object.keys(TRACKED).map((k) => [k, String(fp[k])]));
  let last = null;
  try {
    last = JSON.parse(localStorage.getItem('heros_last_fp') || 'null');
    localStorage.setItem('heros_last_fp', JSON.stringify({ id: fp.id, ...now }));
  } catch { /* storage blocked */ }
  if (!last) return { status: 'first', changed: [] };
  const changed = Object.keys(TRACKED).filter((k) => last[k] !== now[k]);
  return {
    status: last.id === fp.id ? 'same' : 'changed',
    changed,
    labels: changed.map((k) => TRACKED[k]),
  };
}
