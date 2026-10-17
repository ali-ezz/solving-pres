// The 3D "set pieces" — one per station — built only from code primitives.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import { COLORS } from './world.js';
import * as sfx from './audio.js';

const SPACING = 34;
const CAM_OFFSET = new THREE.Vector3(0, 1.2, 21);

// ── small building blocks ───────────────────────────────────
const basic = (color, opacity = 1, extra = {}) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: opacity >= 1, ...extra });

let _dot = null;
function dotTexture() {
  if (_dot) return _dot;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  _dot = new THREE.CanvasTexture(c);
  return _dot;
}

function rectFrame(w, h, t, mat) {
  const g = new THREE.Group();
  const hb = new THREE.BoxGeometry(w + t, t, t);
  const vb = new THREE.BoxGeometry(t, h - t, t);
  [[0, h / 2], [0, -h / 2]].forEach(([x, y]) => {
    const m = new THREE.Mesh(hb, mat);
    m.position.set(x, y, 0);
    g.add(m);
  });
  [[-w / 2, 0], [w / 2, 0]].forEach(([x, y]) => {
    const m = new THREE.Mesh(vb, mat);
    m.position.set(x, y, 0);
    g.add(m);
  });
  return g;
}

// A glowing browser window: frame, title bar, three dots, content rows.
function browserWindow(w, h, color = COLORS.safe, { rows = true } = {}) {
  const g = new THREE.Group();
  const frameMat = basic(color, 1);
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(0x0a1630, 0.82));
  fill.position.z = -0.05;
  g.add(fill);
  g.add(rectFrame(w, h, 0.09, frameMat));
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.05), frameMat);
  bar.position.y = h / 2 - 0.75;
  g.add(bar);
  const dotGeo = new THREE.CircleGeometry(0.13, 20);
  [0, 1, 2].forEach((i) => {
    const d = new THREE.Mesh(dotGeo, frameMat);
    d.position.set(-w / 2 + 0.45 + i * 0.4, h / 2 - 0.38, 0.02);
    g.add(d);
  });
  const url = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.55, 0.32), basic(color, 0.18));
  url.position.set(0.3, h / 2 - 0.38, 0.01);
  g.add(url);
  if (rows) {
    const rowMat = basic(color, 0.22);
    const rowsTop = h / 2 - 1.3;
    for (let i = 0; i < 5; i++) {
      const rw = (w - 1.2) * [0.9, 0.7, 0.8, 0.55, 0.75][i];
      const r = new THREE.Mesh(new THREE.PlaneGeometry(rw, 0.18), rowMat);
      r.position.set(-w / 2 + 0.6 + rw / 2, rowsTop - i * ((h - 1.8) / 5), 0.01);
      if (rowsTop - i * ((h - 1.8) / 5) > -h / 2 + 0.3) g.add(r);
    }
  }
  g.userData.frameMat = frameMat;
  return g;
}

function label(html, cls = '') {
  const el = document.createElement('div');
  el.className = `lbl ${cls}`;
  el.innerHTML = html;
  return new CSS2DObject(el);
}

// Particles travelling from a source to a target, respawning forever.
function stream({ count = 40, color = COLORS.threat, size = 0.35, from, to, speed = 0.5, curve = 0 }) {
  const pos = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  const parts = Array.from({ length: count }, () => ({ p: Math.random(), a: from(), b: to(), s: 0.6 + Math.random() * 0.8 }));
  const v = new THREE.Vector3();
  pts.userData.update = (dt) => {
    if (mat.opacity <= 0.001) return;
    parts.forEach((q, i) => {
      q.p += dt * speed * q.s;
      if (q.p >= 1) {
        q.p = 0;
        q.a = from();
        q.b = to();
      }
      v.lerpVectors(q.a, q.b, q.p);
      v.y += Math.sin(q.p * Math.PI) * curve;
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    });
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

const rand = (a, b) => a + Math.random() * (b - a);
const fade = (mat, opacity, duration = 0.8, delay = 0) => gsap.to(mat, { opacity, duration, delay, ease: 'power2.out' });

// Wrap a set piece into a station with the shared lifecycle.
function station(index, build, { camOffset = CAM_OFFSET, lookOffset = new THREE.Vector3() } = {}) {
  const anchor = new THREE.Vector3(index * SPACING, 0, index % 2 ? -10 : 0);
  const group = new THREE.Group();
  group.position.copy(anchor);
  const s = {
    anchor,
    group,
    labels: [],
    cam: {
      pos: anchor.clone().add(camOffset),
      look: anchor.clone().add(lookOffset),
      frame: 'left',
    },
    beatCams: [],
    enter() {},
    leave() {},
    step() {},
    beat() {},
    update() {},
    addLabel(obj) {
      s.labels.push(obj);
      return obj;
    },
    showLabels(on) {
      s.labels.forEach((l) => l.element.classList.toggle('show', on));
    },
  };
  build(s, group);
  // hand-off: the set we leave settles back a little, the one we reach grows into place
  const enter = s.enter;
  const leave = s.leave;
  // only the current set is shown, so nothing from a neighbour drifts into view
  let hideLater = null;
  s.enter = () => {
    hideLater?.kill();
    group.visible = true;
    gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 1.4, ease: 'power3.out' });
    enter();
  };
  s.leave = () => {
    gsap.to(group.scale, { x: 0.9, y: 0.9, z: 0.9, duration: 1.2, ease: 'power2.inOut' });
    hideLater = gsap.delayedCall(1.3, () => (group.visible = false));
    leave();
  };
  group.scale.setScalar(0.9);
  group.visible = false;
  return s;
}

// a camera pose relative to a station
const camAt = (s, offset, look = new THREE.Vector3()) => ({
  pos: s.anchor.clone().add(offset),
  look: s.anchor.clone().add(look),
  frame: s.cam.frame,
});

// ── 1 · intro: a browser that watches you ───────────────────
function intro(i) {
  return station(i, (s, g) => {
    const win = browserWindow(13, 8.2, COLORS.safe);
    g.add(win);

    // the eye inside the browser
    const eye = new THREE.Group();
    eye.position.set(0, -0.6, 0.1);
    const lidMat = basic(COLORS.white, 0.9);
    const lidShape = (sign) => {
      const pts = [];
      for (let k = 0; k <= 48; k++) {
        const x = -2.6 + (5.2 * k) / 48;
        pts.push(new THREE.Vector3(x, sign * 1.25 * Math.cos((x / 2.6) * (Math.PI / 2)), 0));
      }
      return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.05, 6), lidMat);
    };
    const lids = new THREE.Group();
    lids.add(lidShape(1), lidShape(-1));
    eye.add(lids);
    const iris = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 48), basic(COLORS.threat, 1));
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.32, 32), basic(COLORS.threat, 1));
    const look = new THREE.Group();
    look.add(iris, pupil);
    eye.add(look);
    g.add(eye);

    // scanning line sweeping the page
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 0.06), basic(COLORS.threat, 0.9));
    g.add(scan);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(10, 0.02, 6, 160), basic(COLORS.safe, 0.25));
    ring.rotation.x = Math.PI / 2.3;
    g.add(ring);

    let blinkT = 0;
    s.update = (t, dt) => {
      scan.position.set(0, 3 - ((t * 0.35) % 1) * 6.8, 0.12);
      scan.material.opacity = 0.25 + 0.5 * Math.abs(Math.sin(t * 2));
      // the eye follows a slow wandering target
      look.position.set(Math.sin(t * 0.7) * 0.7, Math.sin(t * 0.9) * 0.25, 0.01);
      blinkT += dt;
      const b = blinkT % 4.2;
      eye.scale.y = b < 0.14 ? Math.abs(Math.cos((b / 0.14) * Math.PI)) * 0.95 + 0.05 : 1;
      ring.rotation.z = t * 0.05;
      win.rotation.y = Math.sin(t * 0.3) * 0.08;
    };
  });
}

// A procedural fingertip: concentric, gently wobbling ridges.
function makeFingerprint({ color = COLORS.safe, ridges = 26, spacing = 0.19, seed = 0 } = {}) {
  const group = new THREE.Group();
  const lines = [];
  for (let r = 0; r < ridges; r++) {
    const base = 0.3 + r * spacing;
    const pts = [];
    const gap = rand(0.2, 0.8);
    const start = rand(0, Math.PI * 2);
    const N = 180;
    for (let k = 0; k <= N; k++) {
      const th = start + (k / N) * (Math.PI * 2 - gap);
      // gentle, low-frequency wobble keeps ridges roughly parallel
      const rr = base * (1 + 0.025 * Math.sin(3 * th + r * 0.4 + seed) + 0.012 * Math.sin(7 * th - r * 0.3));
      // oval fingertip: narrower sides, taller top, centre pushed down a bit
      const y = rr * Math.sin(th) * 1.12 - (1 - r / ridges) * 0.5 * (spacing / 0.19);
      pts.push(new THREE.Vector3(rr * 0.8 * Math.cos(th), y, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 + (1 - r / ridges) * 0.45 });
    const line = new THREE.Line(geo, mat);
    line.userData.n = pts.length;
    lines.push(line);
    group.add(line);
  }
  return {
    group,
    lines,
    // draw the ridges in, innermost first
    draw(delay = 0.3) {
      lines.forEach((l, k) => {
        const p = { n: 0 };
        l.geometry.setDrawRange(0, 0);
        gsap.to(p, {
          n: l.userData.n, duration: 1.6, delay: delay + k * 0.035, ease: 'power2.out',
          onUpdate: () => l.geometry.setDrawRange(0, Math.floor(p.n)),
        });
      });
    },
  };
}

// ── 2 · the problem: a city that lives online, on one engine ─
function problem(i) {
  return station(i, (s, g) => {
    const city = new THREE.Group();
    city.position.y = -5.2;
    g.add(city);
    const buildings = [];
    const edgeMat = () => new THREE.LineBasicMaterial({ color: COLORS.dim, transparent: true, opacity: 0.9 });
    for (let x = -4; x <= 4; x++) {
      for (let z = -2; z <= 1; z++) {
        if (Math.abs(x) + Math.abs(z) > 5 || rand(0, 1) < 0.15) continue;
        const h = rand(1.6, 5.2) * (1 - Math.abs(x) * 0.07);
        // origin at the base so buildings grow up out of the ground
        const geo = new THREE.BoxGeometry(1.3, h, 1.3).translate(0, h / 2, 0);
        const b = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat());
        b.position.set(x * 1.9, 0, z * 1.9);
        // lit windows
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, h * 0.8), basic(COLORS.safe, 0.0));
        win.position.set(0, h / 2, 0.66);
        b.add(win);
        b.userData = { h, win, x, z };
        city.add(b);
        buildings.push(b);
      }
    }
    // roof of a building in station space
    const roof = (b) => b.position.clone().add(city.position).add(new THREE.Vector3(0, b.userData.h, 0));
    const pickB = () => buildings[Math.floor(rand(0, buildings.length))];
    // data arcs between buildings
    const arcs = stream({ count: 50, color: COLORS.safe, size: 0.28, speed: 0.45, curve: 3, from: () => roof(pickB()), to: () => roof(pickB()) });
    g.add(arcs);

    // Chromium: one engine above the whole city
    const CORE = new THREE.Vector3(0, 3.4, -1);
    const core = new THREE.Group();
    core.position.copy(CORE);
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 1), basic(COLORS.safe, 0.55, { wireframe: true }));
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.45, 32, 16), basic(COLORS.safe, 0.9));
    core.add(shell, inner);
    g.add(core);
    const coreLabel = s.addLabel(label('Chromium · browsers & apps', 'big hidden'));
    coreLabel.position.copy(CORE).add(new THREE.Vector3(0, 2, 0));
    g.add(coreLabel);
    const links = stream({ count: 60, color: COLORS.safe, size: 0.24, speed: 0.6, from: () => CORE.clone(), to: () => roof(pickB()) });
    g.add(links);
    const crack = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.04, 8, 96), basic(COLORS.threat, 0));
    crack.position.copy(CORE);
    g.add(crack);

    // the two real incidents: which buildings turn red
    const pick = (fx, fz) => buildings.reduce((best, b) =>
      (Math.hypot(b.userData.x - fx, b.userData.z - fz) < Math.hypot(best.userData.x - fx, best.userData.z - fz) ? b : best));
    const markers = [
      [pick(-3, 0), 'WannaCry · NHS'],
      [pick(3, 0), 'Equifax · 147M'],
    ].map(([b, text]) => {
      const l = s.addLabel(label(text, 'threat hidden'));
      l.position.copy(roof(b)).add(new THREE.Vector3(0, 1, 0));
      g.add(l);
      const leak = stream({
        count: 18, color: COLORS.threat, size: 0.32, speed: 0.4,
        from: () => roof(b).add(new THREE.Vector3(rand(-0.4, 0.4), 0, 0)),
        to: () => roof(b).add(new THREE.Vector3(rand(-2, 2), rand(3, 5), rand(-1, 1))),
      });
      g.add(leak);
      return { b, l, leak };
    });

    const tint = (c, color, d = 0.6) => {
      const to = new THREE.Color(color);
      gsap.to(c, { r: to.r, g: to.g, b: to.b, duration: d });
    };
    const light = (b, color, opacity) => {
      tint(b.material.color, color);
      tint(b.userData.win.material.color, color);
      gsap.to(b.userData.win.material, { opacity, duration: 0.6 });
    };
    let broken = false;

    s.enter = () => {
      arcs.material.opacity = 0;
      links.material.opacity = 0;
      links.material.color.set(COLORS.safe);
      broken = false;
      gsap.killTweensOf(crack.scale);
      core.scale.setScalar(0.001);
      [inner.material.color, shell.material.color].forEach((c) => c.set(COLORS.safe));
      coreLabel.element.classList.add('hidden');
      buildings.forEach((b) => {
        b.material.color.set(COLORS.dim);
        b.userData.win.material.color.set(COLORS.safe);
        b.userData.win.material.opacity = 0;
        b.scale.y = 0.001;
        gsap.to(b.scale, { y: 1, duration: 1.2, delay: 0.4 + rand(0, 0.6), ease: 'power3.out' });
      });
      markers.forEach((m) => {
        m.l.element.classList.add('hidden');
        m.leak.material.opacity = 0;
      });
    };
    s.step = (k) => {
      if (k === 0) {
        sfx.blip(660);
        buildings.forEach((b, n) => setTimeout(() => light(b, COLORS.safe, 0.06), n * 25));
        fade(arcs.material, 0.9, 0.8, 0.4);
      } else if (k === 1) {
        sfx.impact();
        gsap.to(core.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'back.out(1.8)' });
        fade(arcs.material, 0.25, 0.6);
        fade(links.material, 0.9, 0.8, 0.5);
        coreLabel.element.classList.remove('hidden');
      } else if (k === 2 || k === 3) {
        // WannaCry, then Equifax: the engine everyone shares turns red, one incident at a time
        sfx.alarm();
        if (k === 2) {
          [inner.material.color, shell.material.color, links.material.color].forEach((c) => tint(c, COLORS.threat));
          broken = true;
          gsap.fromTo(crack.scale, { x: 0.7, y: 0.7, z: 0.7 }, { x: 1.5, y: 1.5, z: 1.5, duration: 1.4, repeat: -1, ease: 'power1.out' });
        }
        const m = markers[k - 2];
        light(m.b, COLORS.threat, 0.22);
        m.l.element.classList.remove('hidden');
        fade(m.leak.material, 0.95, 0.6, 0.2);
      }
    };
    s.update = (t, dt) => {
      arcs.userData.update(dt);
      links.userData.update(dt);
      markers.forEach((m) => m.leak.userData.update(dt));
      shell.rotation.set(t * 0.2, t * 0.3, 0);
      inner.scale.setScalar(1 + Math.sin(t * 2.2) * 0.05);
      crack.lookAt(s.cam.pos);
      crack.material.opacity = broken ? Math.max(0, (0.9 * (1.5 - crack.scale.x)) / 0.8) : 0;
      // sway the whole scene so labels and particles stay attached to their buildings
      g.rotation.y = Math.sin(t * 0.15) * 0.1 - 0.08;
    };
  }, { camOffset: new THREE.Vector3(0, 2.2, 25), lookOffset: new THREE.Vector3(0, -0.6, 0) });
}

// ── 4 · audience: the QR code stands in the world, phones read their IDs ─
function audience(i) {
  return station(i, (s, g) => {
    // the card is a real DOM element (built in panels.js) pinned to this spot in the world;
    // it turns with the camera, and the cursor tilts the view less here so the code stays easy to scan
    s.cam.parallax = 0.5;
    const CARD = new THREE.Vector3(0, 0.3, 0);
    s.mountCard = (el) => {
      const holder = document.createElement('div');
      holder.className = 'qr-holder';
      holder.appendChild(el);
      const obj = new CSS2DObject(holder);
      obj.position.copy(CARD);
      g.add(obj);
      s.card = el;
    };
    const view = new THREE.Vector3();

    // four phones beside the card; each one reads its own ID
    const spots = [[-7, 1.9, -1.5], [-7, -2.1, -1], [7, 1.9, -1.5], [7, -2.1, -1]];
    const hex = () => Math.floor(rand(0, 0xffff)).toString(16).padStart(4, '0');
    const phones = spots.map(([x, y, z], k) => {
      const p = new THREE.Group();
      p.position.set(x, y, z);
      const frameMat = basic(COLORS.safe, 0.7);
      p.add(rectFrame(1.1, 2, 0.05, frameMat));
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.85), basic(COLORS.warn, 0));
      screen.position.z = -0.02;
      p.add(screen);
      const notch = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.05), frameMat);
      notch.position.y = 0.82;
      p.add(notch);
      const l = s.addLabel(label(`<span class="mono">ID ${hex()}</span>`, 'small id hidden'));
      l.position.set(0, -1.45, 0);
      p.add(l);
      g.add(p);
      // the test travels from the code to this phone
      const side = Math.sign(x);
      const beam = stream({
        count: 12, color: COLORS.safe, size: 0.22, speed: 0.6, curve: 0.5,
        from: () => new THREE.Vector3(side * 3.6, rand(-2, 2.5), 0),
        to: () => new THREE.Vector3(x - side * 0.5, y + rand(-0.6, 0.6), z),
      });
      g.add(beam);
      return { p, screen, frameMat, l, beam, base: y, seed: k };
    });

    const timers = [];
    s.enter = () => {
      s.card?.classList.add('on');
      timers.splice(0).forEach(clearTimeout);
      phones.forEach((ph, k) => {
        ph.beam.material.opacity = 0;
        ph.screen.material.opacity = 0;
        ph.frameMat.color.set(COLORS.safe);
        ph.l.element.classList.add('hidden');
        fade(ph.beam.material, 0.85, 0.6, 1 + k * 0.35);
        // a moment later the phone has read its fingerprint
        timers.push(setTimeout(() => {
          fade(ph.screen.material, 0.16, 0.5);
          const c = new THREE.Color(COLORS.warn);
          gsap.to(ph.frameMat.color, { r: c.r, g: c.g, b: c.b, duration: 0.5 });
          ph.l.element.classList.remove('hidden');
          fade(ph.beam.material, 0.25, 0.8, 0.4);
          sfx.blip(880 + k * 60);
        }, 2200 + k * 350));
      });
    };
    s.leave = () => {
      s.card?.classList.remove('on');
      timers.splice(0).forEach(clearTimeout);
    };
    s.update = (t, dt) => {
      if (s.card && s.camera) {
        // the card faces +z; seen from the side it turns, like a real plate in space
        view.copy(s.camera.position).sub(g.position).sub(CARD);
        const yaw = Math.atan2(view.x, view.z);
        const pitch = Math.atan2(view.y, Math.hypot(view.x, view.z));
        s.card.style.transform = `perspective(1100px) rotateY(${yaw}rad) rotateX(${-pitch}rad)`;
      }
      phones.forEach((ph) => {
        ph.p.position.y = ph.base + Math.sin(t * 0.8 + ph.seed) * 0.15;
        ph.p.lookAt(s.cam.pos);
        ph.beam.userData.update(dt);
      });
    };
  }, { lookOffset: new THREE.Vector3(0, -0.2, 0), camOffset: new THREE.Vector3(0, 0.4, 22) });
}

// ── 3 · threats attacking a browser ─────────────────────────
function threats(i) {
  return station(i, (s, g) => {
    const win = browserWindow(7, 4.6, COLORS.safe);
    g.add(win);
    const spots = [
      [-5.7, 4.2], [5.7, 4.2], [-5.7, -3.8], [5.7, -3.8],
    ];
    const names = ['Tracker', 'Fingerprint', 'Cookie theft', 'WebRTC leak'];
    const items = spots.map(([x, y], k) => {
      const node = new THREE.Group();
      node.position.set(x, y, 1);
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), basic(COLORS.threat, 0.95, { wireframe: k % 2 === 1 }));
      node.add(m);
      const l = s.addLabel(label(names[k], 'threat'));
      l.position.set(0, -1.35, 0);
      node.add(l);
      node.scale.setScalar(0.001);
      g.add(node);
      const st = stream({
        count: 26, color: COLORS.threat, size: 0.32, speed: 0.55, curve: 0.8,
        from: () => new THREE.Vector3(x, y, 1),
        to: () => new THREE.Vector3(rand(-3, 3), rand(-1.8, 1.6), 0.2),
      });
      g.add(st);
      return { node, m, st, label: l };
    });
    s.enter = () => {
      items.forEach((it) => {
        it.node.scale.setScalar(0.001);
        it.st.material.opacity = 0;
        it.label.element.classList.add('hidden');
      });
      win.userData.frameMat.color.set(COLORS.safe);
    };
    s.step = (k) => {
      const it = items[k];
      if (!it) return;
      sfx.alarm();
      it.label.element.classList.remove('hidden');
      gsap.to(it.node.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(2)' });
      fade(it.st.material, 0.95, 0.6, 0.3);
      if (k === 3) {
        const c = new THREE.Color(COLORS.threat);
        gsap.to(win.userData.frameMat.color, { r: c.r, g: c.g, b: c.b, duration: 1 });
      }
    };
    s.update = (t, dt) => {
      items.forEach((it, k) => {
        it.m.rotation.set(t * 0.8 + k, t * 1.1, 0);
        it.st.userData.update(dt);
      });
      win.position.x = Math.sin(t * 13) * 0.02 * (items.filter((x) => x.node.scale.x > 0.5).length / 4);
    };
  });
}

// ── 7 · compare & measure: score cubes, then two fingerprints ─
function compare(i) {
  return station(i, (s, g) => {
    const cubes = [];
    for (let k = 0; k < 20; k++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        basic(k % 5 === 0 ? COLORS.safe : COLORS.dim, k % 5 === 0 ? 0.5 : 0.35, { wireframe: true }),
      );
      c.position.set(rand(-16, 16), rand(-8, 9), rand(-18, -6));
      c.scale.setScalar(rand(0.6, 2.2));
      c.userData.spin = rand(0.1, 0.4);
      c.userData.base = c.material.opacity;
      g.add(c);
      cubes.push(c);
    }

    // second beat: the measured results — one fingerprint stays, one keeps changing
    const make = (x, color) => {
      const fp = makeFingerprint({ color, ridges: 18, spacing: 0.17 });
      fp.group.position.set(x, 1.5, -6);
      fp.group.scale.setScalar(1.15);
      fp.group.visible = false;
      g.add(fp.group);
      return fp;
    };
    const unique = make(-12, COLORS.threat);
    const random = make(12, COLORS.safe);
    let jitterT = 0;

    const showCubes = (on, quick) =>
      cubes.forEach((c) => gsap.to(c.material, { opacity: on ? c.userData.base : 0.06, duration: quick ? 0 : 0.8 }));
    s.enter = () => {
      unique.group.visible = random.group.visible = false;
      showCubes(true, true);
    };
    s.beat = (n, quick) => {
      if (n !== 1) return;
      showCubes(false, quick);
      unique.group.visible = random.group.visible = true;
      unique.draw(quick ? 0 : 0.3);
      random.draw(quick ? 0 : 0.6);
    };
    s.update = (t, dt) => {
      cubes.forEach((c, k) => {
        c.rotation.set(t * c.userData.spin, t * c.userData.spin * 0.7, 0);
        c.position.y += Math.sin(t * 0.6 + k) * 0.003;
      });
      unique.group.rotation.y = Math.sin(t * 0.4) * 0.25;
      // the randomized one never holds still: ridges re-shuffle every beat
      jitterT += dt;
      if (jitterT > 0.45) {
        jitterT = 0;
        random.lines.forEach((l) => {
          l.rotation.z = rand(-0.3, 0.3);
          l.scale.setScalar(rand(0.92, 1.08));
        });
      }
      random.group.rotation.y = Math.sin(t * 0.4 + 1) * 0.25;
    };
  });
}

// Glowing protective dome: icosahedron lattice + fresnel skin.
function makeShield(R, detail = 2, { lattice: latticeOpacity = 0.4, glow = 0.28, maxHit = 0.35 } = {}) {
  const group = new THREE.Group();
  const lattice = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R, detail)),
    new THREE.LineBasicMaterial({ color: COLORS.safe, transparent: true, opacity: latticeOpacity }),
  );
  const skin = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.995, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(COLORS.safe) }, uHit: { value: 0 }, uGlow: { value: glow } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uHit; uniform float uGlow;
        varying vec3 vN; varying vec3 vV;
        void main() {
          float f = pow(1.0 - abs(dot(vN, vV)), 2.6);
          gl_FragColor = vec4(uColor, f * (uGlow + uHit));
        }`,
    }),
  );
  group.add(lattice, skin);
  let hitGlow = 0;
  return {
    group,
    lattice,
    hit: () => (hitGlow = Math.min(maxHit, hitGlow + 0.05)),
    update() {
      hitGlow *= 0.94;
      skin.material.uniforms.uHit.value = hitGlow;
    },
  };
}

// Red attacks flying in; on reaching the shield they turn cyan and bounce away.
function bouncingAttacks(R, N, far, onHit) {
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.42 * (far / 22), map: dotTexture(), vertexColors: true, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  const red = new THREE.Color(COLORS.threat);
  const cyan = new THREE.Color(COLORS.safe);
  const spawn = (q) => {
    q.dir = new THREE.Vector3(rand(-1, 1), rand(-0.6, 0.8), rand(-1, 0.4)).normalize();
    q.r = rand(far * 0.7, far);
    q.v = -rand(0.23, 0.36) * far;
    q.hit = false;
  };
  const parts = Array.from({ length: N }, () => {
    const q = {};
    spawn(q);
    q.r = rand(R, far);
    return q;
  });
  return {
    points,
    mat,
    update(dt, shieldUp) {
      parts.forEach((q, k) => {
        q.r += q.v * dt;
        if (!q.hit && shieldUp && q.r <= R + 0.15) {
          q.hit = true;
          q.v = Math.abs(q.v) * 0.8;
          onHit();
        }
        if (q.r > far * 1.05 || q.r < 0.5) spawn(q);
        pos[k * 3] = q.dir.x * q.r;
        pos[k * 3 + 1] = q.dir.y * q.r;
        pos[k * 3 + 2] = q.dir.z * q.r;
        const c = q.hit ? cyan : red;
        col[k * 3] = c.r;
        col[k * 3 + 1] = c.g;
        col[k * 3 + 2] = c.b;
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

// ── 5 · Heros Shell: three layers go up, then its control panel ─
function heros(i, controls) {
  return station(i, (s, g) => {
    const win = browserWindow(6, 3.8, COLORS.safe);
    g.add(win);
    // a padlock on the page: what the shield protects
    const lock = new THREE.Group();
    const lockMat = basic(COLORS.safe, 1);
    const plate = new THREE.Mesh(new THREE.CircleGeometry(1.05, 40), basic(0x06101f, 1));
    // every part sits a little in front of the one behind it (no two in the same plane)
    const body = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.72), lockMat);
    body.position.set(0, -0.25, 0.03);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.065, 8, 24, Math.PI), lockMat);
    shackle.position.set(0, 0.35, 0.03);
    const legs = [-0.3, 0.3].map((x) => {
      const leg = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.26), lockMat);
      leg.position.set(x, 0.22, 0.03);
      return leg;
    });
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), basic(0x06101f, 1));
    hole.position.set(0, -0.2, 0.06);
    lock.add(plate, body, shackle, ...legs, hole);
    lock.position.set(0, -0.35, 0.15);
    g.add(lock);

    const R = 5.2;
    const shield = makeShield(R, 2, { lattice: 0.2, glow: 0.14, maxHit: 0.04 });
    shield.group.scale.setScalar(0.001);
    g.add(shield.group);
    // the window, the lock and the shield share one centre: give them a fixed drawing order
    // (window, then lock, then the glass) so they never swap places and flicker
    win.traverse((o) => (o.renderOrder = 1));
    lock.traverse((o) => (o.renderOrder = 2));
    shield.group.traverse((o) => (o.renderOrder = 3));

    // one orbit per layer, each at its own tilt, each with its name
    const layers = [
      { name: 'Perimeter', r: R + 0.5, tilt: [1.25, 0, 0.25], at: 0.6 },
      { name: 'Sandbox', r: R + 1.0, tilt: [1.45, 0.5, -0.4], at: 2.7 },
      { name: 'Barrier', r: R + 1.5, tilt: [1.1, -0.45, 0.1], at: 5.3 },
    ].map((L) => {
      const holder = new THREE.Group();
      holder.rotation.set(...L.tilt);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(L.r, 0.035, 8, 180), basic(COLORS.safe, 0));
      holder.add(ring);
      const l = s.addLabel(label(L.name, 'safe small hidden'));
      l.position.set(Math.cos(L.at) * L.r, Math.sin(L.at) * L.r, 0);
      holder.add(l);
      g.add(holder);
      return { ring, l };
    });
    // "100% local": a calm ring at the base of the shield
    const base = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.32, 96), basic(COLORS.safe, 0, { side: THREE.DoubleSide }));
    base.rotation.x = -Math.PI / 2;
    base.position.y = -R - 0.2;
    g.add(base);
    const baseLabel = s.addLabel(label('on your device', 'safe small hidden'));
    baseLabel.position.set(0, -R - 1.1, 0);
    g.add(baseLabel);

    const attacks = bouncingAttacks(R, 45, 20, shield.hit);
    g.add(attacks.points);

    // second beat: the control domains, outside the shield, wired into it
    const corners = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
    const domains = controls.domains.map((d, k) => {
      const [sx, sy] = corners[k];
      const n = new THREE.Group();
      n.position.set(sx * 6.6, sy * 4.4, 1);
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), basic(COLORS.dim, 1));
      n.add(m);
      const l = s.addLabel(label(d.name, 'small hidden'));
      l.position.set(0, sy > 0 ? 1 : -1, 0);
      n.add(l);
      const into = n.position.clone().normalize().multiplyScalar(R);
      const wire = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([into, n.position.clone()]),
        new THREE.LineBasicMaterial({ color: COLORS.safe, transparent: true, opacity: 0 }),
      );
      n.scale.setScalar(0.001);
      g.add(n, wire);
      return { n, m, l, wire, level: 0 };
    });
    s.beatPoses = [null, { pos: new THREE.Vector3(1.5, 1.2, 29), look: new THREE.Vector3(0, 0, 0) }];
    s.beat = (n, quick) => {
      if (n !== 1) return;
      domains.forEach((d, k) => {
        gsap.to(d.n.scale, { x: 1, y: 1, z: 1, duration: quick ? 0 : 0.8, delay: quick ? 0 : 0.3 + k * 0.1, ease: 'back.out(2)' });
        gsap.to(d.wire.material, { opacity: 0.2 + d.level * 0.6, duration: quick ? 0 : 0.6, delay: quick ? 0 : 0.5 });
        d.l.element.classList.remove('hidden');
      });
      layers.forEach((L) => L.l.element.classList.add('hidden'));
      baseLabel.element.classList.add('hidden');
      gsap.to(attacks.mat, { opacity: 0.4, duration: quick ? 0 : 0.8 });
    };
    // a switch on the panel lights its domain; the shield grows a little brighter with every control
    s.setDomain = (k, ratio) => {
      const d = domains[k];
      if (!d) return;
      d.level = ratio;
      const c = new THREE.Color(COLORS.dim).lerp(new THREE.Color(COLORS.safe), ratio);
      gsap.to(d.m.material.color, { r: c.r, g: c.g, b: c.b, duration: 0.3 });
      gsap.to(d.wire.material, { opacity: 0.2 + ratio * 0.6, duration: 0.3 });
      gsap.fromTo(d.m.scale, { x: 1.4, y: 1.4, z: 1.4 }, { x: 1, y: 1, z: 1, duration: 0.5 });
      const all = domains.reduce((a, x) => a + x.level, 0) / domains.length;
      gsap.to(shield.lattice.material, { opacity: 0.2 + all * 0.2, duration: 0.4 });
    };

    s.enter = () => {
      domains.forEach((d) => {
        d.n.scale.setScalar(0.001);
        d.wire.material.opacity = 0;
        d.l.element.classList.add('hidden');
      });
      layers.forEach((L) => {
        L.ring.material.opacity = 0;
        L.l.element.classList.add('hidden');
      });
      base.material.opacity = 0;
      baseLabel.element.classList.add('hidden');
      lock.scale.setScalar(0.001);
      shield.group.scale.setScalar(0.001);
      attacks.mat.opacity = 0;
      gsap.to(shield.group.scale, {
        x: 1, y: 1, z: 1, duration: 1.4, delay: 0.5, ease: 'elastic.out(1, 0.6)',
        onStart: () => sfx.impact(),
      });
      gsap.to(lock.scale, { x: 1, y: 1, z: 1, duration: 0.7, delay: 1.2, ease: 'back.out(2)' });
      fade(attacks.mat, 1, 1, 1.2);
    };
    s.step = (k) => {
      const L = layers[k];
      if (!L) {
        // last point (100% local): the shield pulses once and the base ring lights
        sfx.impact();
        gsap.fromTo(shield.group.scale, { x: 1.08, y: 1.08, z: 1.08 }, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
        fade(base.material, 0.8, 0.6);
        baseLabel.element.classList.remove('hidden');
        return;
      }
      sfx.blip(660 + k * 180);
      fade(L.ring.material, 0.75, 0.6);
      L.l.element.classList.remove('hidden');
      gsap.fromTo(L.ring.scale, { x: 1.2, y: 1.2, z: 1.2 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'power3.out' });
    };
    s.update = (t, dt) => {
      shield.lattice.rotation.y = t * 0.06;
      layers.forEach((L, k) => (L.ring.rotation.z = t * (0.12 + k * 0.05) * (k % 2 ? -1 : 1)));
      domains.forEach((d, k) => (d.m.rotation.y = t * (0.5 + d.level * 2) + k));
      attacks.update(dt, shield.group.scale.x > 0.9);
      shield.update();
    };
  }, { camOffset: new THREE.Vector3(0, 1.2, 25) });
}

// ── 6 · demo: Chrome alone vs Chrome + Heros ───────────────
function demo(i) {
  return station(i, (s, g) => {
    const a = browserWindow(6, 4, COLORS.threat);
    a.position.set(-14, 0, -3);
    a.rotation.y = 0.35;
    const b = browserWindow(6, 4, COLORS.safe);
    b.position.set(14, 0, -3);
    b.rotation.y = -0.35;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.06, 8, 120), basic(COLORS.safe, 0.8));
    ring.position.copy(b.position);
    ring.rotation.y = -0.35;
    g.add(a, b, ring);
    const leak = stream({
      count: 30, color: COLORS.threat, size: 0.34, speed: 0.4,
      from: () => new THREE.Vector3(-14 + rand(-2, 2), rand(-1, 1), -3),
      to: () => new THREE.Vector3(-14 + rand(-6, 6), rand(6, 10), rand(-7, -3)),
    });
    g.add(leak);
    s.enter = () => {
      leak.material.opacity = 0;
      fade(leak.material, 0.9, 0.6, 0.6);
    };
    s.update = (t, dt) => {
      leak.userData.update(dt);
      ring.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
      a.position.y = Math.sin(t * 0.8) * 0.2;
      b.position.y = Math.sin(t * 0.8 + 1) * 0.2;
    };
  });
}

// ── 8 · outro: every browser safe under one shield ────────
function outro(i) {
  return station(i, (s, g) => {
    const R = 15;
    const shield = makeShield(R, 3);
    g.add(shield.group);
    // a small city of browsers, all protected
    const city = new THREE.Group();
    for (let k = 0; k < 9; k++) {
      const w = browserWindow(3.4, 2.2, COLORS.safe, { rows: false });
      const a = (k / 9) * Math.PI * 2;
      const r = k % 3 === 0 ? 4 : 8.5;
      w.position.set(Math.cos(a) * r, -6 + (k % 3) * 1.2, Math.sin(a) * r);
      w.userData.base = w.position.y;
      city.add(w);
    }
    g.add(city);
    const attacks = bouncingAttacks(R, 120, 46, shield.hit);
    g.add(attacks.points);

    s.enter = () => {
      attacks.mat.opacity = 0;
      fade(attacks.mat, 1, 1.2, 1);
      shield.group.scale.setScalar(0.4);
      gsap.to(shield.group.scale, { x: 1, y: 1, z: 1, duration: 2.2, delay: 0.4, ease: 'power3.out', onStart: () => sfx.impact() });
    };
    s.update = (t, dt) => {
      shield.lattice.rotation.y = t * 0.05;
      city.rotation.y = t * 0.08;
      city.children.forEach((w, k) => {
        w.lookAt(s.cam.pos);
        w.position.y = w.userData.base + Math.sin(t * 0.8 + k) * 0.25;
      });
      attacks.update(dt, true);
      shield.update();
    };
  }, { camOffset: new THREE.Vector3(0, 9, 46), lookOffset: new THREE.Vector3(0, 1, 0) });
}

// A glowing road through every station — the path of the journey.
// The part already travelled glows brighter, and a light runs ahead of the camera.
function road(list) {
  const pts = list.map((s) => s.anchor.clone().add(new THREE.Vector3(0, -6.2, 0)));
  pts.unshift(pts[0].clone().add(new THREE.Vector3(-40, 0, 6)));
  pts.push(pts[pts.length - 1].clone().add(new THREE.Vector3(40, 0, 6)));
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.Group();
  const SEG = 600;
  const RADIAL = 6;
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.07, RADIAL), basic(COLORS.safe, 0.35)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.6, 8), basic(COLORS.safeDeep, 0.08, { depthWrite: false })));
  const lit = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, 0.12, RADIAL), basic(COLORS.safe, 1));
  g.add(lit);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8), basic(COLORS.safe, 0.9));
  g.add(head);
  // a node under every station
  const rings = list.map((s) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.4, 48), basic(COLORS.safe, 0.35, { side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(s.anchor).add(new THREE.Vector3(0, -6.2, 0));
    g.add(ring);
    return ring;
  });

  // curve parameter of station k (points are spread evenly along the curve's parameter)
  const at = (k) => (k + 1) / (pts.length - 1);
  const state = { u: at(0) };
  const apply = () => {
    lit.geometry.setDrawRange(0, Math.floor(state.u * SEG) * RADIAL * 6);
    head.position.copy(curve.getPoint(state.u));
  };
  apply();
  return {
    group: g,
    travel(from, to, duration) {
      gsap.killTweensOf(state);
      gsap.to(state, { u: at(to), duration, ease: 'power2.inOut', onUpdate: apply });
      rings.forEach((r, k) => gsap.to(r.material, { opacity: k === to ? 0.95 : k < to ? 0.6 : 0.35, duration: duration || 0.01 }));
    },
  };
}

export function createStations(world, content) {
  const builders = {
    intro, problem, threats, audience,
    heros: (k) => heros(k, content.controls),
    demo, compare, outro,
  };
  const list = content.stations.map((c, k) => {
    const s = builders[c.id](k);
    s.id = c.id;
    s.cam.frame = c.layout === 'center' ? 'center' : 'left';
    s.beatCams = (s.beatPoses || []).map((p) => p && camAt(s, p.pos, p.look));
    s.camera = world.camera;
    world.scene.add(s.group);
    world.onFrame((t, dt) => s.update(t, dt));
    return s;
  });
  const path = road(list);
  world.scene.add(path.group);
  list.travel = path.travel;
  return list;
}
