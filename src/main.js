import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles.css';

import gsap from 'gsap';
import * as content from './content.js';
import { createWorld } from './world.js';
import { createStations } from './stations3d.js';
import { panelBuilders } from './panels.js';
import * as sfx from './audio.js';
import { viewport } from './viewport.js';

const { stations: data, config } = content;
// keep animations on real time even if a frame stutters
gsap.ticker.lagSmoothing(0);
document.title = `${config.title} — ${config.course}`;

// start screen
document.querySelector('.start-kicker').textContent = config.topic;
document.querySelector('.start-title').textContent = config.title;
document.querySelector('.start-names').textContent = config.presenters.join('  ·  ');

// Split a title into lines so each line can rise into place.
// Titles are plain text with optional <br> line breaks.
const splitLines = (html) =>
  html.split(/<br\s*\/?>/i).map((line) => `<span class="ln">${line.trim()}</span>`).join('');

// Type a line of text out, left to right, with a block cursor.
function typeOut(el, text, { duration = 0.4, delay = 0 } = {}) {
  const state = { n: 0 };
  el.textContent = '';
  return gsap.to(state, {
    n: text.length, duration, delay, ease: 'none',
    onUpdate: () => {
      const n = Math.round(state.n);
      el.innerHTML = `${text.slice(0, n)}<span class="cursor">▍</span>`;
    },
    onComplete: () => (el.textContent = text),
  });
}

const world = createWorld(document.getElementById('world'), document.getElementById('labels'), document.getElementById('scene3d'));
const stations = createStations(world, content);
const ui = document.getElementById('ui');

// the parts of a beat that fade in after its title
const REST = ':scope > .sub, :scope > .items, :scope > .chips, :scope > .extra, :scope > .footnote';

// ── build one text panel per station ────────────────────────
const panels = data.map((d, i) => {
  const el = document.createElement('section');
  el.className = `panel ${d.layout === 'center' ? 'center' : 'left'} st-${d.id}`;
  const beats = d.beats || [d];
  el.innerHTML = `<div class="kicker">${d.kicker || ''}</div>${beats
    .map((b, k) => {
      const items = (b.items || [])
        .map((it) => `<li class="item ${it.step ? 'step' : ''} ${it.tone || ''}"><b>${it.h}</b><span>${it.p}</span></li>`)
        .join('');
      const chips = (b.chips || []).map((c) => `<span>${c}</span>`).join('');
      return `<div class="beat" data-b="${k}">
        <h1 class="title">${splitLines(b.title)}</h1>
        ${chips ? `<div class="chips">${chips}</div>` : ''}
        ${b.sub ? `<p class="sub">${b.sub}</p>` : ''}
        ${items ? `<ul class="items">${items}</ul>` : ''}
        <div class="extra"></div>
        ${b.footnote ? `<p class="footnote">${b.footnote}</p>` : ''}
      </div>`;
    })
    .join('')}`;
  ui.appendChild(el);

  const st = stations[i];
  const beatEls = [...el.querySelectorAll('.beat')];
  const extras = beatEls.map((b) => b.querySelector('.extra'));
  // a builder returns one optional controller per beat: { onEnter, hasMore, advance, revealAll }
  const custom = panelBuilders[d.id]?.(extras, st, content) || [];
  const stepEls = beatEls.map((b) => [...b.querySelectorAll('.item.step')]);
  const ctlOf = (b) => custom[b] || {};
  let beat = 0;
  let shown = 0; // step items shown in the current beat
  let stepNo = 0; // 3D step counter across beats

  const beatHasMore = () => {
    const c = ctlOf(beat);
    return c.hasMore ? c.hasMore() : shown < stepEls[beat].length;
  };
  const showStep = (quick) => {
    const it = stepEls[beat][shown];
    if (quick) gsap.set(it, { opacity: 1, y: 0 });
    else gsap.to(it, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
    st.step(stepNo++);
    shown += 1;
  };
  const setBeat = (n) => {
    beat = n;
    shown = 0;
  };
  const showBeat = (n) => beatEls.forEach((b, k) => b.classList.toggle('on', k === n));
  // swap the text to the next beat in place, while the 3D set re-arranges itself
  function nextBeat() {
    const out = beatEls[beat];
    const n = beat + 1;
    setBeat(n);
    gsap.to([el.querySelector('.kicker'), ...out.children], {
      opacity: 0, y: -10, duration: 0.3, stagger: 0.03, ease: 'power2.in',
      onComplete: () => {
        showBeat(n);
        showText(el, d.kicker, beatEls[n], 0);
      },
    });
    st.beat?.(n);
    if (st.beatCams?.[n]) world.flyTo(st.beatCams[n], { duration: 1.2 });
    sfx.whoosh(0.9);
  }

  const ctl = {
    hasMore: () => beatHasMore() || beat < beatEls.length - 1,
    advance() {
      if (!beatHasMore()) return nextBeat();
      const c = ctlOf(beat);
      if (c.advance) return c.advance();
      showStep(false);
    },
    revealAll() {
      for (let b = 0; b < beatEls.length; b++) {
        if (b > 0) {
          setBeat(b);
          showBeat(b);
          st.beat?.(b, true);
        }
        const c = ctlOf(b);
        if (c.revealAll) c.revealAll();
        while (shown < stepEls[b].length) showStep(true);
      }
    },
    reset() {
      setBeat(0);
      showBeat(0);
      stepNo = 0;
      stepEls.flat().forEach((it) => gsap.set(it, { opacity: 0, y: 14 }));
      custom.forEach((c) => c?.onEnter?.());
    },
  };
  return { el, ctl, data: d, beatEls };
});

// ── navigation ──────────────────────────────────────────────
let current = -1;
let busy = false;
let started = false;

function animateIn(beatEl, delay) {
  const lines = beatEl.querySelectorAll('.title .ln');
  const rest = beatEl.querySelectorAll(REST);
  gsap.set(beatEl.querySelector('.title'), { opacity: 1, y: 0 });
  gsap.fromTo(lines,
    { y: 18, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, delay, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' });
  gsap.fromTo(rest,
    { opacity: 0, y: 16 },
    {
      opacity: 1, y: 0, duration: 0.6, delay: delay + 0.2, stagger: 0.07, ease: 'power3.out',
      // a leftover transform would make each part a positioning context
      clearProps: 'transform',
    });
}

// kicker types in, then the title lines and the rest of the beat rise into place
function showText(el, kickerText = '', beatEl, delay) {
  const kicker = el.querySelector('.kicker');
  gsap.fromTo(kicker, { opacity: 0, y: 0 }, { opacity: 1, duration: 0.2, delay });
  typeOut(kicker, kickerText, { duration: Math.min(0.45, 0.012 * kickerText.length + 0.15), delay });
  animateIn(beatEl, delay + 0.05);
}

function showPanel(i, delay) {
  const { el, data: d, beatEls } = panels[i];
  el.classList.add('active');
  showText(el, d.kicker, beatEls.find((b) => b.classList.contains('on')), delay);
}

function hidePanel(i) {
  const { el } = panels[i];
  const parts = el.querySelectorAll('.kicker, .beat.on > *');
  gsap.to(parts, {
    opacity: 0, y: -10, duration: 0.25, stagger: 0.02, ease: 'power2.in',
    onComplete: () => el.classList.remove('active'),
  });
}

async function go(i, { full = false, instant = false } = {}) {
  if (i < 0 || i >= panels.length || i === current || busy) return;
  busy = true;
  const prev = current;
  if (prev >= 0) {
    hidePanel(prev);
    stations[prev].active = false;
    stations[prev].showLabels(false);
    stations[prev].leave();
  }
  current = i;
  const st = stations[i];
  const p = panels[i];
  p.ctl.reset();
  st.active = true;
  st.enter();
  updateHud();
  history.replaceState(null, '', `#${i + 1}`);

  // coming back into a station with beats: land straight on its last beat
  const cam = (full && st.beatCams?.[p.beatEls.length - 1]) || st.cam;
  const flight = world.flyTo(cam, { instant, duration: prev < 0 ? 2.4 : 1.4 });
  if (!instant) sfx.whoosh(prev < 0 ? 2.2 : 1.3);
  stations.travel?.(prev, i, instant ? 0 : prev < 0 ? 2.4 : 1.4);
  if (full) p.ctl.revealAll();
  // text lands while the camera is still settling, so the screen is never empty
  showPanel(i, instant ? 0 : prev < 0 ? 1.4 : 0.8);
  setTimeout(() => st.showLabels(true), instant ? 0 : 900);
  await flight;
  busy = false;
}

function next() {
  if (!started) return start();
  if (busy) return;
  const { ctl } = panels[current];
  if (ctl.hasMore()) return ctl.advance();
  go(current + 1);
}

function prev() {
  if (!started || busy) return;
  go(current - 1, { full: true });
}

function start() {
  started = true;
  sfx.unlock();
  document.body.classList.add('started');
  const target = Math.max(0, Math.min(panels.length - 1, (parseInt(location.hash.slice(1), 10) || 1) - 1));
  go(target, { full: target > 0 });
}

// ── HUD ─────────────────────────────────────────────────────
const hud = document.getElementById('hud');
hud.innerHTML = `
  <div class="progress">${panels.map(() => '<i></i>').join('')}</div>
  <div class="counter mono"><b>01</b> / ${String(panels.length).padStart(2, '0')}</div>`;
const notesEl = document.getElementById('notes');
let notesOn = false;
const t0 = { at: 0 };

function updateHud() {
  hud.querySelector('.counter b').textContent = String(current + 1).padStart(2, '0');
  hud.querySelectorAll('.progress i').forEach((el, k) => {
    el.classList.toggle('done', k < current);
    el.classList.toggle('now', k === current);
  });
  renderNotes();
}

function renderNotes() {
  if (!notesOn || current < 0) return;
  const mins = t0.at ? Math.floor((Date.now() - t0.at) / 60000) : 0;
  const secs = t0.at ? Math.floor(((Date.now() - t0.at) / 1000) % 60) : 0;
  notesEl.innerHTML = `<div class="mono">${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} · ${current + 1}/${panels.length} · next: ${
    panels[current + 1]?.data.id ?? 'end'
  }</div><p>${panels[current].data.notes || ''}</p>`;
}
setInterval(renderNotes, 1000);

// ── input ───────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (['ArrowRight', 'PageDown', ' ', 'Enter', 'ArrowDown'].includes(k)) {
    e.preventDefault();
    next();
  } else if (['ArrowLeft', 'PageUp', 'Backspace', 'ArrowUp'].includes(k)) {
    e.preventDefault();
    prev();
  } else if (k === 'Home') {
    go(0);
  } else if (k === 'End') {
    go(panels.length - 1, { full: true });
  } else if (k.toLowerCase() === 'n') {
    notesOn = !notesOn;
    if (notesOn && !t0.at) t0.at = Date.now();
    notesEl.classList.toggle('show', notesOn);
    renderNotes();
  } else if (k.toLowerCase() === 'm') {
    document.body.classList.toggle('muted', sfx.toggleMute());
  } else if (k.toLowerCase() === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  } else if (k.toLowerCase() === 't') {
    t0.at = Date.now();
  }
});

// click right half = forward, left half = back (ignores interactive UI)
window.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  if (e.target.closest('.interactive, a, button')) return;
  if (!started) return start();
  if (e.clientX > viewport.w / 2) next();
  else prev();
});

// edge hints follow the cursor
window.addEventListener('pointermove', (e) => {
  const x = e.clientX / viewport.w;
  document.body.classList.toggle('hint-right', x > 0.88);
  document.body.classList.toggle('hint-left', x < 0.12);
});

// initial camera: high above the first station, waiting
world.flyTo({ pos: stations[0].cam.pos.clone().add({ x: -6, y: 14, z: 30 }), look: stations[0].anchor, frame: 'center' }, { instant: true });
stations[0].enter();
