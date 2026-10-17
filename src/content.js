// ─────────────────────────────────────────────────────────────
//  ALL THE WORDS OF THE PRESENTATION LIVE IN THIS FILE.
//  Edit text here — no need to touch any other code.
// ─────────────────────────────────────────────────────────────

export const config = {
  title: 'Heros Shell',
  presenters: ['Ahmed Abobakr', 'Ali Ezz'],
  course: 'Problem Solving',

  // Public URL of the fingerprint test page (fp.html) — the QR code points here.
  // After GitHub Pages is enabled it will be:
  testPageUrl: 'https://ali-ezz.github.io/solving-pres/fp.html',

  // Links opened from the "Live demo" station.
  demoLinks: [
    { label: 'Our fingerprint test', url: 'https://ali-ezz.github.io/solving-pres/fp.html' },
    { label: 'EFF · Cover Your Tracks', url: 'https://coveryourtracks.eff.org/' },
  ],
};

// Each station = one stop of the camera in the 3D world.
// `items` with `step: true` are revealed one at a time with → / Space.
export const stations = [
  {
    id: 'intro',
    layout: 'left',
    kicker: 'Problem Solving · Cyber Security',
    title: 'Your browser knows<br>who you are.',
    sub: 'Even when you think you are invisible.',
    notes:
      'Pause. Let the line sit. Then: "Today we will show you how — live — and what we built to stop it."',
  },
  {
    id: 'fingerprint',
    layout: 'left',
    kicker: '01 · Define the problem',
    title: 'Meet this laptop’s<br>fingerprint.',
    sub: 'Read live, right now. No login. No cookies. Just the browser.',
    footnote: 'Everything is computed on this device. Nothing is stored or uploaded.',
    notes:
      'Point at the card. GPU, screen, fonts, time zone, canvas hash — together they form an ID that is almost unique. Any website can run this code silently.',
  },
  {
    id: 'audience',
    layout: 'left',
    kicker: 'Your turn',
    title: 'Now check yours.',
    sub: 'Scan the code. Your phone shows what any website can learn about you — in two seconds.',
    items: [
      { h: 'Then reload the page.', p: 'Same ID again? That is exactly how sites recognise you — no cookies needed.' },
    ],
    notes:
      'Give them ~30 seconds. Ask: "Who got the same ID after reloading?" — almost everyone. That is the problem.',
  },
  {
    id: 'chromium',
    layout: 'left',
    kicker: '01 · Define the problem',
    title: 'Cyber security',
    sub: 'Protecting devices, networks and data from being stolen, damaged or misused.',
    items: [
      { step: true, h: 'One engine runs most of the web.', p: 'Chrome, Edge, Brave, Opera, Vivaldi, Samsung Internet — all built on <b>Chromium</b>, Google’s open-source browser project.' },
      { step: true, h: 'One weakness, billions of users.', p: 'A flaw in Chromium is a flaw in most browsers people use.' },
    ],
    notes:
      'Chromium = the open-source project that Chrome and most other browsers are built on. So the browser is the front door for almost everyone.',
  },
  {
    id: 'threats',
    layout: 'left',
    kicker: '02 · Gather the facts',
    title: 'Four ways you are watched',
    sub: 'Hacking is not only breaking in. Often it is quietly watching.',
    items: [
      { step: true, tone: 'threat', h: 'Trackers', p: 'Hidden scripts that follow you from site to site.' },
      { step: true, tone: 'threat', h: 'Fingerprinting', p: 'Recognise your device from its GPU, fonts and screen — no cookies needed.' },
      { step: true, tone: 'threat', h: 'Cookie theft', p: 'Steal your session cookie and they are logged in as you.' },
      { step: true, tone: 'threat', h: 'WebRTC leak', p: 'A video-call feature that can reveal your real IP — even behind a VPN.' },
    ],
    notes:
      'Tracker = a script from another company embedded in the page. Fingerprint = what we just saw. Cookie = your login ticket. WebRTC = the feature that powers Meet/Zoom in the browser.',
  },
  {
    id: 'gaps',
    layout: 'left',
    kicker: '02 · Gather the facts',
    title: 'The usual answers<br>miss the browser.',
    items: [
      { step: true, h: 'Antivirus', p: 'Built to catch malicious files and programs. Trackers are ordinary web scripts running inside the page.' },
      { step: true, h: 'VPN', p: 'Hides your IP from websites — but your fingerprint stays the same, and WebRTC can leak the real IP.' },
      { step: true, h: 'Incognito', p: 'Forgets your history on this device. Websites still see the same fingerprint.' },
    ],
    notes:
      'The point: these tools protect the device or the network. The attack happens inside the browser tab — a place none of them watch.',
  },
  {
    id: 'matrix',
    layout: 'center',
    kicker: '03 · Compare alternatives',
    title: 'Same criteria. Four options.',
    sub: 'Click an option to score it.',
    footnote: '✓ protects  ·  ~ partly  ·  ✗ does not protect',
    notes:
      'This is the decision matrix from the lecture: define criteria, score every alternative against them, then decide. Click each column from left to right.',
  },
  {
    id: 'heros',
    layout: 'left',
    kicker: '04 · The decision',
    title: 'Heros Shell',
    sub: 'Security that lives inside the browser.',
    items: [
      { step: true, tone: 'safe', h: 'Perimeter', p: 'Every request is checked first. Trackers are dropped before they load.' },
      { step: true, tone: 'safe', h: 'Sandbox', p: 'Untrusted scripts run isolated — no access to cookies, keystrokes or tokens.' },
      { step: true, tone: 'safe', h: 'Barrier', p: 'Camera, mic and location need your consent. WebRTC leaks are blocked. Canvas fingerprints get random noise.' },
    ],
    notes:
      'Three zones: network → page scripts → hardware. Watch the attacks from before: now they bounce off.',
  },
  {
    id: 'local',
    layout: 'left',
    kicker: '04 · The decision',
    title: 'Local-first.<br>Zero cloud.',
    items: [
      { tone: 'threat', h: 'Cloud security', p: 'Your data travels to a server to be judged — then the verdict comes back.' },
      { tone: 'safe', h: 'Heros Shell', p: 'Every decision runs on your device. No telemetry. No external APIs. No CDN.' },
    ],
    footnote: 'Built on Manifest V3 — Chrome’s modern extension platform.',
    notes:
      'If the protection itself sends your data to the cloud, you have just moved the problem. Heros keeps everything on the machine.',
  },
  {
    id: 'hub',
    layout: 'left',
    kicker: 'Nevai Hub',
    title: '150+ controls.<br>One dashboard.',
    sub: 'Every switch runs locally and applies instantly. Try one.',
    notes:
      'Nevai Hub is the control centre for Heros Shell and the other Nevai modules. Flip a few switches on screen.',
  },
  {
    id: 'demo',
    layout: 'center',
    kicker: 'Prove it',
    title: 'Live demo',
    sub: 'Same test. Same laptop. <span class="threat">Chrome alone</span> vs <span class="safe">Chrome + Heros</span>.',
    items: [
      { h: 'Fingerprint ID', p: 'Changes on every reload — the tracker can’t recognise you.' },
      { h: 'WebRTC IP', p: 'Blocked — your real address stays hidden.' },
      { h: 'Canvas fingerprint', p: 'Randomised — every read returns a different hash.' },
    ],
    notes:
      'Switch to Chrome. Run the test with Heros OFF, then ON. Reload twice to show the ID changing.',
  },
  {
    id: 'outro',
    layout: 'center',
    kicker: 'Heros Shell · Nevai',
    title: 'Control your browser.<br>Reclaim your data.',
    sub: 'Thank you — questions?',
    notes: 'Thank the audience. Invite questions.',
  },
];

// Decision matrix (station "matrix"): ✓ = 2, ~ = 1, ✗ = 0
export const matrix = {
  criteria: ['Blocks trackers', 'Stops fingerprinting', 'Stops WebRTC IP leak', 'Your data stays on your device'],
  options: [
    { name: 'Chrome alone', scores: [1, 0, 0, 1] },
    { name: 'Antivirus', scores: [1, 0, 0, 1] },
    { name: 'VPN', scores: [0, 0, 1, 0] },
    { name: 'Heros Shell', scores: [2, 2, 2, 2], hero: true },
  ],
};

// Nevai Hub control domains (station "hub")
export const hub = {
  total: '150+',
  domains: [
    { name: 'Network', examples: ['Request filter', 'Tracker block', 'DNS control', 'Ad block'] },
    { name: 'Privacy', examples: ['Fingerprint guard', 'Cookie isolation', 'Referrer strip', 'URL cleaner'] },
    { name: 'DOM', examples: ['Script sandbox', 'Event guard', 'Keystroke shield', 'Iframe lock'] },
    { name: 'Hardware', examples: ['Canvas noise', 'WebRTC lock', 'Camera gate', 'Mic gate'] },
  ],
  modules: [
    { name: 'YouTube helper', desc: 'Strips tracking, blocks ads' },
    { name: 'Clipboard vault', desc: 'Encrypted on your device' },
    { name: 'Local radio', desc: 'Zero telemetry' },
  ],
};
