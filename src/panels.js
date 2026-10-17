// Interactive DOM panels that sit on top of specific stations.
// Each builder returns an optional controller:
//   { onEnter(), hasMore(), advance(), revealAll() }
import gsap from 'gsap';
import QRCode from 'qrcode';
import * as sfx from './audio.js';

const h = (tag, cls, html = '') => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.innerHTML = html;
  return el;
};

// ── QR code for the audience ────────────────────────────────
// Drawn by hand from the QR matrix: soft rounded modules, rounded "eyes" and a shield
// logo in the middle. Error correction H keeps it readable with the logo.
function qrSvg(text) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const dark = (x, y) => qr.modules.get(y, x);
  const m = 2; // quiet zone, in modules
  const total = n + m * 2;
  const isEye = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  // keep the centre clear for the logo
  const logo = Math.round(n * 0.24) | 1;
  const lo = (n - logo) / 2;
  const inLogo = (x, y) => x >= lo - 0.5 && x < lo + logo - 0.5 && y >= lo - 0.5 && y < lo + logo - 0.5;

  let dots = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!dark(x, y) || isEye(x, y) || inLogo(x, y)) continue;
      dots += `<rect x="${x + m + 0.05}" y="${y + m + 0.05}" width="0.9" height="0.9" rx="0.3"/>`;
    }
  }
  const eye = (x, y) => `
    <rect x="${x + m + 0.5}" y="${y + m + 0.5}" width="6" height="6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1"/>
    <rect x="${x + m + 2}" y="${y + m + 2}" width="3" height="3" rx="0.9"/>`;
  const c = m + n / 2;
  const L = logo - 1;
  return `
  <svg viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR code: ${text}">
    <g class="qr-dots">${dots}</g>
    <g class="qr-eyes">${eye(0, 0)}${eye(n - 7, 0)}${eye(0, n - 7)}</g>
    <g class="qr-logo" transform="translate(${c - L / 2} ${c - L / 2}) scale(${L / 24})">
      <rect x="0" y="0" width="24" height="24" rx="6" class="qr-logo-bg"/>
      <path d="M12 3.2 19 5.8v5.4c0 4.4-3 8-7 9.6-4-1.6-7-5.2-7-9.6V5.8z" class="qr-shield"/>
      <path d="M7.6 12c1.3-2 2.8-3 4.4-3s3.1 1 4.4 3c-1.3 2-2.8 3-4.4 3s-3.1-1-4.4-3z" class="qr-eye-lid"/>
      <circle cx="12" cy="12" r="1.45" class="qr-pupil"/>
    </g>
  </svg>`;
}

// The card is not part of the text panel: the station stands it up in the 3D world.
function audiencePanel(hosts, st, { config }) {
  const card = h('div', 'qr-card');
  const url = config.testPageUrl;
  card.innerHTML = `
    <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
    <div class="qr-plate">${qrSvg(url)}<div class="qr-scan"></div></div>
    <div class="qr-url mono">${url.replace(/^https?:\/\//, '')}</div>`;
  st.mountCard(card);
  return [];
}

// ── decision matrix ─────────────────────────────────────────
function matrixPanel(host, st, { matrix }) {
  const glyph = ['✗', '~', '✓'];
  const tone = ['no', 'part', 'yes'];
  const wrap = h('div', 'matrix interactive');
  const max = matrix.criteria.length * 2;
  wrap.innerHTML = `
    <table>
      <thead><tr><th></th>${matrix.options
        .map((o, j) => `<th><button class="opt ${o.hero ? 'hero' : ''}" data-j="${j}">${o.name}</button></th>`)
        .join('')}</tr></thead>
      <tbody>${matrix.criteria
        .map((c, i) => `<tr><td class="crit">${c}</td>${matrix.options
          .map((o, j) => `<td class="cell" data-j="${j}"><span class="g ${tone[o.scores[i]]}">${glyph[o.scores[i]]}</span></td>`)
          .join('')}</tr>`)
        .join('')}</tbody>
      <tfoot><tr><td class="crit">Score</td>${matrix.options
        .map((o, j) => `<td data-j="${j}"><div class="meter"><i></i></div><span class="total mono">–</span></td>`)
        .join('')}</tr>
      <tr class="maximin"><td class="crit">Worst case (Maximin)</td>${matrix.options
        .map((o, j) => {
          const w = Math.min(...o.scores);
          return `<td class="mmc" data-j="${j}"><span class="mm ${tone[w]}">${glyph[w]}</span></td>`;
        })
        .join('')}</tr></tfoot>
    </table>`;
  host.appendChild(wrap);
  const revealed = new Set();

  function reveal(j, quick = false) {
    if (revealed.has(j)) return;
    revealed.add(j);
    const o = matrix.options[j];
    const total = o.scores.reduce((a, b) => a + b, 0);
    wrap.querySelector(`.opt[data-j="${j}"]`).classList.add('on');
    const cells = wrap.querySelectorAll(`.cell[data-j="${j}"] .g`);
    const foot = wrap.querySelector(`tfoot tr:first-child td[data-j="${j}"]`);
    if (quick) {
      cells.forEach((c) => c.classList.add('show'));
      foot.querySelector('i').style.width = `${(total / max) * 100}%`;
      foot.querySelector('.total').textContent = `${total}/${max}`;
      foot.classList.toggle('hero', !!o.hero);
      wrap.querySelector(`.mmc[data-j="${j}"] .mm`).classList.add('show');
      markBest();
      return;
    }
    cells.forEach((c, i) => setTimeout(() => {
      c.classList.add('show');
      sfx.blip(o.scores[i] === 2 ? 1046 : o.scores[i] === 1 ? 784 : 392);
    }, i * 140));
    setTimeout(() => {
      foot.querySelector('i').style.width = `${(total / max) * 100}%`;
      const t = { v: 0 };
      gsap.to(t, { v: total, duration: 0.6, onUpdate: () => (foot.querySelector('.total').textContent = `${Math.round(t.v)}/${max}`) });
      foot.classList.toggle('hero', !!o.hero);
      wrap.querySelector(`.mmc[data-j="${j}"] .mm`).classList.add('show');
      if (o.hero) sfx.impact();
      markBest();
    }, matrix.criteria.length * 140 + 80);
  }

  // once every option is scored, highlight the one with the best worst case
  function markBest() {
    if (revealed.size < matrix.options.length) return;
    const worst = matrix.options.map((o) => Math.min(...o.scores));
    const best = worst.indexOf(Math.max(...worst));
    wrap.querySelector(`.mmc[data-j="${best}"]`).classList.add('best');
  }

  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (b) reveal(Number(b.dataset.j));
  });

  return {
    onEnter() {
      revealed.clear();
      wrap.querySelectorAll('.opt').forEach((b) => b.classList.remove('on'));
      wrap.querySelectorAll('.g, .mm').forEach((g) => g.classList.remove('show'));
      wrap.querySelectorAll('.mmc').forEach((td) => td.classList.remove('best'));
      wrap.querySelectorAll('tfoot tr:first-child td[data-j]').forEach((td) => {
        td.classList.remove('hero');
        td.querySelector('i').style.width = '0';
        td.querySelector('.total').textContent = '–';
      });
    },
    hasMore: () => revealed.size < matrix.options.length,
    advance: () => reveal(matrix.options.findIndex((_, j) => !revealed.has(j))),
    revealAll: () => matrix.options.forEach((_, j) => reveal(j, true)),
  };
}

// ── Heros control panel ──────────────────────────────────
function controlsPanel(host, st, { controls: hub }) {
  const board = h('div', 'hub interactive');
  board.innerHTML = `
    ${hub.domains.map((d, k) => `
      <div class="hub-row" data-k="${k}">
        <div class="hub-name">${d.name}</div>
        <div class="hub-toggles">${d.examples
          .map((ex) => `<button class="tg" aria-pressed="false"><span class="knob"></span><span class="tg-l">${ex}</span></button>`)
          .join('')}</div>
      </div>`).join('')}
    <div class="hub-foot">
      <button class="all">Enable all</button>
      <span class="count mono"><b>0</b> on · ${hub.total} in Heros</span>
    </div>`;
  host.appendChild(board);

  const countEl = board.querySelector('.count b');
  const update = () => {
    let total = 0;
    board.querySelectorAll('.hub-row').forEach((r, k) => {
      const on = r.querySelectorAll('.tg[aria-pressed="true"]').length;
      total += on;
      st.setDomain?.(k, on / r.querySelectorAll('.tg').length);
    });
    countEl.textContent = total;
  };
  const flip = (btn, force) => {
    const on = force ?? btn.getAttribute('aria-pressed') !== 'true';
    if ((btn.getAttribute('aria-pressed') === 'true') === on) return;
    btn.setAttribute('aria-pressed', String(on));
    sfx.click(on);
    update();
  };
  board.addEventListener('click', (e) => {
    const tg = e.target.closest('.tg');
    if (tg) return flip(tg);
    if (e.target.closest('.all')) {
      const all = [...board.querySelectorAll('.tg')];
      const anyOff = all.some((b) => b.getAttribute('aria-pressed') !== 'true');
      all.forEach((b, k) => setTimeout(() => flip(b, anyOff), k * 70));
      board.querySelector('.all').textContent = anyOff ? 'Disable all' : 'Enable all';
    }
  });
  return {};
}

// ── live demo: links + optional backup screenshots ──────────
function demoPanel([host], st, { config }) {
  const box = h('div', 'demo interactive');
  box.innerHTML = `
    <div class="demo-links">${config.demoLinks
      .map((l) => `<a class="btn" href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`)
      .join('')}</div>
    <div class="backup" hidden>
      <figure><img data-src="demo/chrome.png" alt=""><figcaption class="threat">Chrome alone</figcaption></figure>
      <figure><img data-src="demo/heros.png" alt=""><figcaption class="safe">Chrome + Heros</figcaption></figure>
    </div>`;
  host.appendChild(box);
  // backup screenshots: B toggles them; loaded only on demand, shown only if both exist
  const backup = box.querySelector('.backup');
  const imgs = [...backup.querySelectorAll('img')];
  const load = () => Promise.all(imgs.map((img) => new Promise((ok, fail) => {
    if (img.complete && img.naturalWidth) return ok();
    img.onload = ok;
    img.onerror = fail;
    img.src = img.dataset.src;
  })));
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'b' || !st.active) return;
    load().then(() => (backup.hidden = !backup.hidden), () => {});
  });
  return [];
}

// ── "We tested it": two measured results side by side ─────
function resultsPanel(host, st, { results }) {
  const wrap = h('div', 'results');
  wrap.innerHTML = `
    <div class="result-cards">${results.runs
      .map((r) => `
        <article class="result ${r.tone}">
          <header>${r.name}</header>
          <div class="verdict-line">${r.verdict}</div>
          <div class="bits"><b class="mono" data-bits="${r.bits}">0.00</b><span>bits of identifying information</span></div>
          <dl>${r.rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
        </article>`)
      .join('')}</div>
    <p class="lesson">${results.lesson}</p>
    <p class="source mono">${results.source}</p>`;
  host.appendChild(wrap);
  const cards = [...wrap.querySelectorAll('.result')];
  const lesson = wrap.querySelector('.lesson');
  let shown = 0;
  const steps = cards.length + 1;

  function show(k, quick) {
    if (k < cards.length) {
      const card = cards[k];
      const b = card.querySelector('[data-bits]');
      const target = Number(b.dataset.bits);
      if (quick) {
        gsap.set(card, { opacity: 1, y: 0, rotateX: 0 });
        b.textContent = target.toFixed(2);
        return;
      }
      gsap.fromTo(card, { opacity: 0, y: 40, rotateX: -25 }, { opacity: 1, y: 0, rotateX: 0, duration: 0.8, ease: 'power3.out' });
      const n = { v: 0 };
      gsap.to(n, { v: target, duration: 1.2, delay: 0.3, ease: 'power2.out', onUpdate: () => (b.textContent = n.v.toFixed(2)) });
      if (card.classList.contains('threat')) sfx.alarm();
      else sfx.impact();
    } else {
      if (quick) return gsap.set(lesson, { opacity: 1, scale: 1 });
      gsap.fromTo(lesson, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' });
      sfx.blip(1046);
    }
  }
  return {
    onEnter() {
      shown = 0;
      gsap.set([...cards, lesson], { opacity: 0 });
    },
    hasMore: () => shown < steps,
    advance: () => show(shown++),
    revealAll: () => {
      while (shown < steps) show(shown++, true);
    },
  };
}

export const panelBuilders = {
  audience: audiencePanel,
  // first beat: the three zones (plain step items); second beat: the switch board
  heros: ([, controlsHost], st, content) => [null, controlsPanel(controlsHost, st, content)],
  demo: demoPanel,
  // first beat: the decision matrix; second beat: the measured results
  compare: ([matrixHost, resultsHost], st, content) => [
    matrixPanel(matrixHost, st, content),
    resultsPanel(resultsHost, st, content),
  ],
};
