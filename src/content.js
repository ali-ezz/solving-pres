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
// `itemStyle`: 'grid' shows items as a 2×2 grid of cards, 'numbered' as numbered steps.
// A station with `beats` shows its beats one after another, in the same place:
// each beat has its own title, sub, items and footnote.
export const stations = [
  {
    id: 'intro',
    layout: 'left',
    kicker: 'Cyber security · Problem solving',
    title: 'Your browser knows<br>who you are.',
    sub: 'No login. No cookies. It still recognises you — and so can every site you visit.',
    notes:
      'Pause. Let the line sit. Then: "We treated this as a problem-solving case, using the decision process from our course: define the problem, gather the facts, compare the alternatives, then decide and test."',
  },
  {
    id: 'problem',
    layout: 'left',
    kicker: '01 · Define the problem',
    title: 'Cyber security<br>is public safety.',
    sub: 'Protecting devices, networks and data from theft, damage and misuse. Today most of that data passes through one door: the browser.',
    itemStyle: 'grid',
    items: [
      { step: true, h: 'Everything runs in a tab', p: 'Banking, school portals, hospital records, government services.' },
      { step: true, h: 'One engine, everywhere', p: '<b>Chromium</b> runs Chrome, Edge, Brave and Opera — and apps like VS Code, Slack and Discord.' },
      { step: true, tone: 'threat', h: 'WannaCry · 2017', p: 'Ransomware hit 200,000+ computers in 150 countries. UK hospitals cancelled operations.' },
      { step: true, tone: 'threat', h: 'Equifax · 2017', p: 'A web-app flaw that already had a fix exposed ~147 million people.' },
    ],
    footnote: 'One weak point in software everyone uses becomes everyone’s problem.',
    notes:
      'Step 1 of the decision process: define the problem. Chromium is the open-source engine under most browsers — and under desktop apps built with Electron, like VS Code, Slack and Discord. One flaw there reaches almost everyone. WannaCry (May 2017) disrupted the UK’s NHS. Equifax (2017) was breached through an Apache Struts flaw whose fix had been out for two months.',
  },
  {
    id: 'threats',
    layout: 'left',
    kicker: '02 · Gather the facts',
    title: 'Four ways<br>you are watched',
    sub: 'Most attacks don’t break in. They quietly watch, collect and follow.',
    itemStyle: 'grid',
    items: [
      { step: true, tone: 'threat', h: 'Trackers', p: 'Third-party scripts that follow you from site to site.' },
      { step: true, tone: 'threat', h: 'Fingerprinting', p: 'GPU, screen, fonts and time zone add up to an ID — no cookies needed.' },
      { step: true, tone: 'threat', h: 'Cookie theft', p: 'Steal one session cookie and they are logged in as you.' },
      { step: true, tone: 'threat', h: 'WebRTC leak', p: 'A video-call feature that can expose your real IP — even behind a VPN.' },
    ],
    notes:
      'Step 2: gather the facts. Tracker = a script from another company embedded in the page. Fingerprint = your device’s unique combination of settings. Cookie = your login ticket. WebRTC = the feature that powers Meet/Zoom in the browser.',
  },
  {
    id: 'audience',
    layout: 'left',
    kicker: '03 · Test the problem',
    title: 'Your turn.<br>Scan and see.',
    itemStyle: 'numbered',
    items: [
      { h: 'Scan the code', p: 'It opens our test page. Nothing is stored or sent.' },
      { h: 'Read your ID', p: 'Built only from what your phone reveals to any website.' },
      { h: 'Reload the page', p: 'Same ID again? Then any site can recognise you.' },
    ],
    notes:
      'Give them ~30 seconds. Ask: "Who got the same ID after reloading?" — almost everyone. That is the problem, measured on their own phones. (Keep Heros OFF on the laptop until the demo.)',
  },
  {
    id: 'heros',
    layout: 'left',
    kicker: '04 · Our solution',
    beats: [
      {
        title: 'Heros Shell',
        sub: 'A browser extension that guards you in three layers — before anything reaches you.',
        itemStyle: 'grid',
        items: [
          { step: true, tone: 'safe', h: 'Perimeter', p: 'Checks every request. Trackers and ads are dropped before they load.' },
          { step: true, tone: 'safe', h: 'Sandbox', p: 'Untrusted scripts run isolated, away from your cookies and keystrokes.' },
          { step: true, tone: 'safe', h: 'Barrier', p: 'Camera, mic and WebRTC locked down. Fingerprints get random noise.' },
          { step: true, tone: 'safe', h: '100% local', p: 'Every decision happens on your device. No cloud, no telemetry.' },
        ],
      },
      {
        title: '200+ switches.<br>Your rules.',
        sub: 'Every setting runs on your device and applies instantly. Try one.',
      },
    ],
    notes:
      'Three layers: network → page scripts → hardware, and nothing is sent to a cloud. Watch the attacks bounce off. Next press: the Heros control panel — flip a few switches, then "Enable all".',
  },
  {
    id: 'demo',
    layout: 'center',
    kicker: '05 · Test the solution',
    title: 'Live demo',
    sub: 'Same laptop, same test — first <span class="threat">Chrome alone</span>, then <span class="safe">Chrome + Heros</span>.',
    items: [
      { h: 'Without Heros', p: 'The tracker reads the real GPU, screen and time zone.' },
      { h: 'With Heros', p: 'Fake values, and a canvas hash that changes every visit.' },
      { h: 'From the first moment', p: 'Protected before the page’s first script runs.' },
    ],
    notes:
      'Switch to Chrome. Our test with Heros OFF: real values, red "trackable". Heros ON: green "Protected from the first moment". Backup: press B for screenshots.',
  },
  {
    id: 'compare',
    layout: 'center',
    kicker: '06 · Compare & decide',
    beats: [
      {
        title: 'Same criteria.<br>Five options.',
        sub: 'Protection inside the browser — click an option to score it.',
        footnote: '✓ protects  ·  ~ partly  ·  ✗ does not protect  ·  Maximin = the best worst case',
      },
      {
        title: 'Measured, not claimed.',
        sub: 'Same laptop, same independent test: EFF <b>Cover Your Tracks</b>.',
      },
    ],
    notes:
      'Step 3: compare the alternatives against the same criteria. Choosing protection is a decision under uncertainty — we don’t know which attack comes next — so we use the Maximin rule from the lecture: pick the option whose worst case is best. Every other option has a ✗ somewhere; Heros’ worst case is still ✓. Next press: the measured results. uBlock Origin Lite + Proton VPN still leaves a unique fingerprint (real GPU, time zone, cores). Heros randomises it.',
  },
  {
    id: 'outro',
    layout: 'center',
    kicker: 'Cyber security is everyone’s job',
    title: 'Control your browser.<br>Reclaim your data.',
    items: [
      { step: true, h: 'Facts before opinions', p: 'We measured the problem on your phones before choosing anything.' },
      { step: true, h: 'The best worst case', p: 'We picked the option that still protects when things go wrong.' },
      { step: true, h: 'A decision you can check', p: 'Every claim was tested live — by you and by an independent test.' },
    ],
    chips: ['Update your browser', 'Block trackers', 'VPN on public Wi-Fi', 'Trust your extensions'],
    closing: 'Thank you — questions?',
    notes:
      'Close the loop quietly: we defined the problem and gathered facts (your phones), compared options on the same criteria and chose by the best worst case (Maximin), and shared the decision with you and an independent test instead of deciding alone. Then the four habits, then thank them and invite questions.',
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
