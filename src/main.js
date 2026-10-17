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

// Wrap every word of a title in two spans so it can rise into place.
// Titles are plain text with optional <br> line breaks.
const splitWords = (html) =>
  html
    .split(/<br\s*\/?>/i)
    .map((line) => line.trim().split(/\s+/).map((w) => `<span class="w"><span class="wi">${w}</span></span>`).join(' '))
    .join('<br>');

// Decode a line of text from random glyphs, left to right.
const GLYPHS = '█▓▒░<>/\\|_-=+*#01';
function scramble(el, text, { duration = 0.9, delay = 0 } = {}) {
  const state = { p: 0 };
  return gsap.to(state, {
    p: 1, duration, delay, ease: 'none',
    onUpdate: () => {
      const n = Math.floor(state.p * text.length);
      let out = text.slice(0, n);
      for (let k = n; k < text.length; k++) {
        out += text[k] === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
    },
    onComplete: () => (el.textContent = text),
  });
}

const world = createWorld(document.getElementById('world'), document.getElementById('labels'));
const stations = createStations(world, content);
const ui = document.getElementById('ui');

// ── build one text panel per station ────────────────────────
const panels = data.map((d, i) => {
  const el = document.createElement('section');
  el.className = `panel ${d.layout === 'center' ? 'center' : 'left'} st-${d.id}`;
  const items = (d.items || [])
    .map((it) => `<li class="item ${it.step ? 'step' : ''} ${it.tone || ''}"><b>${it.h}</b><span>${it.p}</span></li>`)
    .join('');
  el.innerHTML = `
    <div class="kicker">${d.kicker || ''}</div>
    <h1 class="title">${splitWords(d.title)}</h1>
    ${d.sub ? `<p class="sub">${d.sub}</p>` : ''}
    ${items ? `<ul class="items">${items}</ul>` : ''}
    <div class="extra"></div>
    ${d.footnote ? `<p class="footnote">${d.footnote}</p>` : ''}`;
  ui.appendChild(el);

  const st = stations[i];
  const custom = panelBuilders[d.id]?.(el.querySelector('.extra'), st, content) || {};
  const stepEls = [...el.querySelectorAll('.item.step')];
  let shown = 0;

  // default controller: reveal `step` items one by one
  const ctl = {
    hasMore: () => (custom.hasMore ? custom.hasMore() : shown < stepEls.length),
    advance() {
      if (custom.advance) return custom.advance();
      const it = stepEls[shown];
      gsap.to(it, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' });
      st.step(shown);
      shown += 1;
    },
    revealAll() {
      if (custom.revealAll) return custom.revealAll();
      while (shown < stepEls.length) {
        gsap.set(stepEls[shown], { opacity: 1, y: 0, filter: 'blur(0px)' });
        st.step(shown);
        shown += 1;
      }
    },
    reset() {
      shown = 0;
      gsap.set(stepEls, { opacity: 0, y: 18, filter: 'blur(6px)' });
    },
    onEnter: custom.onEnter,
  };
  return { el, ctl, data: d };
});

// ── navigation ──────────────────────────────────────────────
let current = -1;
let busy = false;
let started = false;

function showPanel(i, delay) {
  const { el, data: d } = panels[i];
  el.classList.add('active');
  const kicker = el.querySelector('.kicker');
  const title = el.querySelector('.title');
  const words = title.querySelectorAll('.wi');
  const rest = el.querySelectorAll('.sub, .items, .extra, .footnote');

  gsap.set(title, { opacity: 1 });
  gsap.fromTo(kicker, { opacity: 0 }, { opacity: 1, duration: 0.3, delay });
  scramble(kicker, d.kicker || '', { duration: 0.8, delay });
  gsap.fromTo(words,
    { yPercent: 110, rotateX: -70, opacity: 0 },
    { yPercent: 0, rotateX: 0, opacity: 1, duration: 0.9, delay: delay + 0.1, stagger: 0.06, ease: 'power4.out' });
  gsap.fromTo(rest,
    { opacity: 0, y: 30, filter: 'blur(10px)' },
    {
      opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, delay: delay + 0.35, stagger: 0.1, ease: 'power3.out',
      // a leftover transform would make each part a positioning context
      clearProps: 'transform,filter',
    });
}

function hidePanel(i) {
  const { el } = panels[i];
  const words = el.querySelectorAll('.title .wi');
  const rest = el.querySelectorAll('.kicker, .sub, .items, .extra, .footnote');
  gsap.to(words, { yPercent: -110, opacity: 0, duration: 0.35, stagger: 0.02, ease: 'power2.in' });
  gsap.to(rest, {
    opacity: 0, y: -20, filter: 'blur(8px)', duration: 0.35, stagger: 0.03, ease: 'power2.in',
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

  const flight = world.flyTo(st.cam, { instant, duration: prev < 0 ? 2.6 : 1.6 });
  if (!instant) sfx.whoosh(prev < 0 ? 2.4 : 1.5);
  showPanel(i, instant ? 0 : prev < 0 ? 1.6 : 0.95);
  setTimeout(() => st.showLabels(true), instant ? 0 : 1000);
  p.ctl.onEnter?.();
  if (full) p.ctl.revealAll();
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
