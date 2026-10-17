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
// A station with `beats` shows its beats one after another, in the same place:
// each beat has its own title, sub, items and footnote.
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
    id: 'problem',
    layout: 'left',
    kicker: '01 · The problem',
    title: 'Cyber security',
    sub: 'Protecting devices, networks and data from being stolen, damaged or misused.',
    items: [
      { step: true, h: 'Life runs in a browser', p: 'Banks, schools, hospitals, government — all through a web page.' },
      { step: true, h: 'One engine, billions of users', p: 'Chrome, Edge, Brave, Opera and Vivaldi are all built on <b>Chromium</b>. One flaw reaches most of us.' },
      { step: true, tone: 'threat', h: '2017 · WannaCry & Equifax', p: 'Ransomware cancelled NHS hospital operations. One unpatched web app exposed ~147 million people.' },
    ],
    notes:
      'Cyber security is public safety now. Chromium = the open-source project most browsers are built on, so the browser is everyone’s front door. WannaCry (May 2017) hit the UK’s NHS; Equifax (2017) was breached through an unpatched Apache Struts web app.',
  },
  {
    id: 'threats',
    layout: 'left',
    kicker: '02 · How you are watched',
    title: 'Four ways<br>you are watched',
    sub: 'Hacking is not only breaking in. Often it is quietly watching.',
    items: [
      { step: true, tone: 'threat', h: 'Trackers', p: 'Hidden scripts that follow you from site to site.' },
      { step: true, tone: 'threat', h: 'Fingerprinting', p: 'Recognise your device from its GPU, fonts and screen — no cookies needed.' },
      { step: true, tone: 'threat', h: 'Cookie theft', p: 'Steal your session cookie and they are logged in as you.' },
      { step: true, tone: 'threat', h: 'WebRTC leak', p: 'A video-call feature that can reveal your real IP — even behind a VPN.' },
    ],
    notes:
      'Tracker = a script from another company embedded in the page. Fingerprint = your device’s unique combination of settings. Cookie = your login ticket. WebRTC = the feature that powers Meet/Zoom in the browser.',
  },
  {
    id: 'audience',
    layout: 'left',
    kicker: '03 · Test the problem',
    title: 'Now check yours.',
    sub: 'Scan the code. Your phone shows what any website can learn about you — in two seconds.',
    items: [
      { h: 'Then reload the page.', p: 'Same ID again? That is how sites recognise you — no cookies, no login.' },
    ],
    notes:
      'Give them ~30 seconds. Ask: "Who got the same ID after reloading?" — almost everyone. That is the problem. (Keep Heros OFF on the laptop until the demo.)',
  },
  {
    id: 'heros',
    layout: 'left',
    kicker: '04 · Our solution',
    beats: [
      {
        title: 'Heros Shell',
        sub: 'A browser extension built by Ahmed Abobakr.',
        items: [
          { step: true, tone: 'safe', h: 'Perimeter', p: 'Every request is checked first. Trackers are dropped before they load.' },
          { step: true, tone: 'safe', h: 'Sandbox', p: 'Untrusted scripts run isolated — no access to cookies, keystrokes or tokens.' },
          { step: true, tone: 'safe', h: 'Barrier', p: 'Camera and mic need consent. WebRTC leaks are blocked. Fingerprints get random noise.' },
          { step: true, tone: 'safe', h: '100% local', p: 'Every decision runs on your device — no cloud, no telemetry.' },
        ],
      },
      {
        title: '200+ controls.<br>One extension.',
        sub: 'Every switch runs locally and applies instantly. Try one.',
      },
    ],
    notes:
      'Three zones: network → page scripts → hardware, and nothing is sent to a cloud. Watch the attacks bounce off. Next press: the Heros dashboard — flip a few switches, then "Enable all".',
  },
  {
    id: 'demo',
    layout: 'center',
    kicker: '05 · Test the solution',
    title: 'Live demo',
    sub: 'Same test. Same laptop. <span class="threat">Chrome alone</span> vs <span class="safe">Chrome + Heros</span>.',
    items: [
      { h: 'Spoofed values', p: 'The tracker reads a fake GPU, screen and time zone.' },
      { h: 'Canvas noise', p: 'The canvas hash is randomised — useless for tracking.' },
      { h: 'From the first moment', p: 'Protected before the page’s first script runs.' },
    ],
    notes:
      'Switch to Chrome. Our test with Heros OFF: real values, red "trackable". Heros ON: green "Protected from the first moment". Backup: press B for screenshots.',
  },
  {
    id: 'compare',
    layout: 'center',
    kicker: '06 · Compare & measure',
    beats: [
      {
        title: 'Same criteria.<br>Five options.',
        sub: 'Browser-level protection — click an option to score it.',
        footnote: '✓ protects  ·  ~ partly  ·  ✗ does not protect',
      },
      {
        title: 'Measured, not claimed.',
        sub: 'Same laptop. Same test: EFF <b>Cover Your Tracks</b>.',
      },
    ],
    notes:
      'Decision matrix from the lecture: define criteria, score every alternative, then decide. Antivirus guards files, a VPN guards the network — neither works inside the browser tab. Next press: the measured results. uBlock Origin Lite + Proton VPN still leaves a unique fingerprint (real GPU, time zone, cores). Heros randomises it. Lesson: blocking trackers is not the same as stopping fingerprinting.',
  },
  {
    id: 'outro',
    layout: 'center',
    kicker: 'Cyber security is everyone’s job',
    title: 'Control your browser.<br>Reclaim your data.',
    chips: ['Update your browser', 'Block trackers', 'VPN on public Wi-Fi', 'Trust your extensions'],
    sub: 'Thank you — questions?',
    notes: 'One line of advice the audience can use tonight, then thank them and invite questions.',
  },
];

// Decision matrix (station "compare", first beat): ✓ = 2, ~ = 1, ✗ = 0
export const matrix = {
  criteria: [
    'Blocks trackers & ads',
    'Stops fingerprinting',
    'Stops WebRTC IP leaks',
    'Your data stays on your device',
  ],
  options: [
    { name: 'Chrome alone', scores: [0, 0, 0, 1] },
    { name: 'Antivirus', scores: [1, 0, 0, 1] },
    { name: 'VPN', scores: [0, 0, 1, 0] },
    { name: 'uBlock Origin Lite', scores: [2, 0, 0, 2] },
    { name: 'Heros Shell', scores: [2, 2, 2, 2], hero: true },
  ],
};

// Test results (station "compare", second beat) — measured with EFF Cover Your Tracks.
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

// Heros control panel (station "heros", second beat)
export const controls = {
  total: '200+',
  domains: [
    { name: 'Network', examples: ['Request filter', 'Tracker block', 'DNS control', 'Ad block'] },
    { name: 'Privacy', examples: ['Fingerprint guard', 'Cookie isolation', 'Referrer strip', 'URL cleaner'] },
    { name: 'Scripts', examples: ['Script sandbox', 'Event guard', 'Keystroke shield', 'Iframe lock'] },
    { name: 'Hardware', examples: ['Canvas noise', 'WebRTC lock', 'Camera gate', 'Mic gate'] },
  ],
};
