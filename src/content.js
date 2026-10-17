// ─────────────────────────────────────────────────────────────
//  ALL THE WORDS OF THE PRESENTATION LIVE IN THIS FILE.
//  Edit text here — no need to touch any other code.
// ─────────────────────────────────────────────────────────────

export const config = {
  title: 'Who’s Watching Your Browser?',
  topic: 'Cyber security in a connected society',
  presenters: ['Ahmed Abobakr', 'Ali Ezz'],
  course: 'Problem Solving',

  // Public URL of the fingerprint test page (fp.html) — the QR code points here.
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
    kicker: 'Cyber security · Problem solving',
    title: 'Your browser knows<br>who you are.',
    sub: 'Even when you think you are invisible.',
    notes:
      'Pause. Let the line sit. Then: "Today: what the browser gives away, why it matters for all of us, and how to fix it — live."',
  },
  {
    id: 'society',
    layout: 'left',
    kicker: 'Why it matters',
    title: 'Life now runs<br>in a browser.',
    items: [
      { step: true, h: 'Banks, schools, hospitals', p: 'Most of daily life now passes through a web browser.' },
      { step: true, tone: 'threat', h: '2017 · WannaCry', p: 'Ransomware disrupted hospitals across the UK’s NHS — appointments and operations were cancelled.' },
      { step: true, tone: 'threat', h: '2017 · Equifax', p: 'One unpatched web application exposed the data of about 147 million people.' },
    ],
    notes:
      'Cyber security is not an IT topic any more — it is public safety. WannaCry (May 2017) hit the NHS; Equifax (2017) was breached through an unpatched Apache Struts web app.',
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
    id: 'fingerprint',
    layout: 'left',
    kicker: '01 · Define the problem',
    title: 'Meet this laptop’s<br>fingerprint.',
    sub: 'Read live, right now. No login. No cookies. Just the browser.',
    footnote: 'Computed on this device. Nothing is stored or uploaded.',
    notes:
      'Point at the card. GPU, screen, fonts, time zone, canvas hash — together they form an ID that is almost unique. Any website can run this code silently. (Keep Heros OFF here so the real values show.)',
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
      { step: true, h: 'VPN', p: 'Hides your IP from websites — but your fingerprint stays the same.' },
      { step: true, h: 'Incognito', p: 'Forgets your history on this device. Websites still see the same fingerprint.' },
    ],
    notes:
      'These tools protect the device or the network. The tracking happens inside the browser tab — a place none of them watch.',
  },
  {
    id: 'matrix',
    layout: 'center',
    kicker: '03 · Compare alternatives',
    title: 'Same criteria.<br>Five options.',
    sub: 'Click an option to score it.',
    footnote: '✓ protects  ·  ~ partly  ·  ✗ does not protect',
    notes:
      'The decision matrix from the lecture: define criteria, score every alternative, then decide. Point out that no single tool wins every row — Heros does not hide your IP; a VPN does. That is why we combine them.',
  },
  {
    id: 'results',
    layout: 'center',
    kicker: '03 · Test the alternatives',
    title: 'We tested it.',
    sub: 'Same laptop. Same test: EFF <b>Cover Your Tracks</b>.',
    notes:
      'Left: a popular combination — uBlock Origin Lite + Proton VPN. Trackers blocked, IP hidden… but the fingerprint is still unique: real GPU, real time zone, real cores. Right: Heros Shell — the fingerprint is randomized. Lesson: blocking trackers is not the same as stopping fingerprinting.',
  },
  {
    id: 'heros',
    layout: 'left',
    kicker: '04 · One solution',
    title: 'Heros Shell',
    sub: 'A browser shield built by Ahmed Abobakr (Nevai).',
    items: [
      { step: true, tone: 'safe', h: 'Perimeter', p: 'Every request is checked first. Trackers are dropped before they load.' },
      { step: true, tone: 'safe', h: 'Sandbox', p: 'Untrusted scripts run isolated — no access to cookies, keystrokes or tokens.' },
      { step: true, tone: 'safe', h: 'Barrier', p: 'Camera, mic and location need your consent. WebRTC leaks are blocked. Fingerprints get random noise.' },
    ],
    notes:
      'Three zones: network → page scripts → hardware. Watch the attacks from before: now they bounce off.',
  },
  {
    id: 'local',
    layout: 'left',
    kicker: '04 · One solution',
    title: 'Local-first.<br>Zero cloud.',
    items: [
      { tone: 'threat', h: 'Cloud security', p: 'Your data travels to a server to be judged — then the verdict comes back.' },
      { tone: 'safe', h: 'Heros Shell', p: 'Every decision runs on your device. No telemetry. No external APIs.' },
    ],
    footnote: 'Built on Manifest V3 — Chrome’s modern extension platform.',
    notes:
      'If the protection itself sends your data to the cloud, you have just moved the problem. Heros keeps the decisions on the machine.',
  },
  {
    id: 'hub',
    layout: 'left',
    kicker: '04 · One solution · Nevai Hub',
    title: '200+ controls.<br>One dashboard.',
    sub: 'Every switch runs locally and applies instantly. Try one.',
    notes:
      'Nevai Hub is the control centre for Heros Shell and the other Nevai modules. Flip a few switches, then "Enable all".',
  },
  {
    id: 'demo',
    layout: 'center',
    kicker: '05 · Prove it',
    title: 'Live demo',
    sub: 'Same test. Same laptop. <span class="threat">Chrome alone</span> vs <span class="safe">Chrome + Heros</span>.',
    items: [
      { h: 'Spoofed values', p: 'The tracker reads a fake GPU, screen and time zone.' },
      { h: 'Canvas noise', p: 'The canvas hash is randomised — useless for tracking.' },
      { h: 'From the first moment', p: 'Protected before the page’s first script runs.' },
    ],
    notes:
      'Switch to Chrome. Our test with Heros OFF: real Mac values, red "trackable". Heros ON: green "Protected from the first moment".',
  },
  {
    id: 'takeaways',
    layout: 'left',
    kicker: '06 · What you can do today',
    title: 'Four habits.<br>Big difference.',
    items: [
      { step: true, tone: 'safe', h: 'Update your browser', p: 'Most attacks use flaws that are already fixed.' },
      { step: true, tone: 'safe', h: 'Block trackers', p: 'Use a tracker blocker or a protective extension.' },
      { step: true, tone: 'safe', h: 'Hide your IP when it matters', p: 'Use a VPN on public Wi-Fi.' },
      { step: true, tone: 'safe', h: 'Choose extensions carefully', p: 'An extension can read every page you open — install only ones you trust.' },
    ],
    notes:
      'End on something the audience can do tonight. The last habit applies to Heros too — that honesty matters.',
  },
  {
    id: 'outro',
    layout: 'center',
    kicker: 'Cyber security is everyone’s job',
    title: 'Control your browser.<br>Reclaim your data.',
    sub: 'Thank you — questions?',
    notes: 'Thank the audience. Invite questions.',
  },
];

// Decision matrix (station "matrix"): ✓ = 2, ~ = 1, ✗ = 0
export const matrix = {
  criteria: [
    'Blocks trackers & ads',
    'Stops fingerprinting',
    'Stops WebRTC IP leak',
    'Hides your IP address',
    'Your data stays on your device',
  ],
  options: [
    { name: 'Chrome alone', scores: [0, 0, 0, 0, 1] },
    { name: 'Antivirus', scores: [1, 0, 0, 0, 1] },
    { name: 'VPN', scores: [0, 0, 1, 2, 0] },
    { name: 'uBlock Origin Lite', scores: [2, 0, 0, 0, 2] },
    { name: 'Heros Shell', scores: [2, 2, 2, 0, 2], hero: true },
  ],
};

// "We tested it" (station "results") — measured with EFF Cover Your Tracks.
export const results = {
  source: 'EFF Cover Your Tracks · tested October 2026 on the same MacBook',
  runs: [
    {
      name: 'uBlock Origin Lite + Proton VPN',
      tone: 'threat',
      verdict: 'Unique fingerprint',
      bits: 18.49,
      rows: [
        ['Trackers & ads', 'blocked'],
        ['Graphics card', 'Apple M4 Pro · real'],
        ['Time zone', 'Africa/Cairo · real'],
        ['CPU cores', '12 · real'],
      ],
    },
    {
      name: 'Heros Shell',
      tone: 'safe',
      verdict: 'Randomized fingerprint',
      bits: 16.17,
      rows: [
        ['Trackers & ads', 'blocked'],
        ['Graphics card', 'Intel UHD 620 · fake'],
        ['Time zone', 'New York · fake'],
        ['CPU cores', 'randomized'],
      ],
    },
  ],
  lesson: 'Blocking trackers ≠ stopping fingerprinting.',
};

// Nevai Hub control domains (station "hub")
export const hub = {
  total: '200+',
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
