// The 3D "set pieces" — one per station — built only from code primitives.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import { COLORS } from './world.js';
import * as sfx from './audio.js';

const SPACING = 52;
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
    enter() {},
    leave() {},
    step() {},
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
  return s;
}

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

// ── 2 · fingerprint ─────────────────────────────────────────
function fingerprint(i) {
  return station(i, (s, g) => {
    const fp = new THREE.Group();
    g.add(fp);
    const lines = [];
    const RIDGES = 26;
    for (let r = 0; r < RIDGES; r++) {
      const base = 0.3 + r * 0.19;
      const pts = [];
      const gap = rand(0.2, 0.8);
      const start = rand(0, Math.PI * 2);
      const N = 180;
      for (let k = 0; k <= N; k++) {
        const th = start + (k / N) * (Math.PI * 2 - gap);
        // gentle, low-frequency wobble keeps ridges roughly parallel
        const rr = base * (1 + 0.025 * Math.sin(3 * th + r * 0.4) + 0.012 * Math.sin(7 * th - r * 0.3));
        // oval fingertip: narrower sides, taller top, centre pushed down a bit
        const y = rr * Math.sin(th) * 1.12 - (1 - r / RIDGES) * 0.5;
        pts.push(new THREE.Vector3(rr * 0.8 * Math.cos(th), y, 0));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      geo.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({ color: COLORS.safe, transparent: true, opacity: 0.55 + (1 - r / RIDGES) * 0.45 });
      const line = new THREE.Line(geo, mat);
      line.userData.n = pts.length;
      lines.push(line);
      fp.add(line);
    }
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 0.07), basic(COLORS.safe, 0.9));
    g.add(scan);
    const halo = new THREE.Mesh(new THREE.RingGeometry(6.2, 6.26, 128), basic(COLORS.safe, 0.35));
    g.add(halo);

    const idLabel = s.addLabel(label('<span class="mono">ID ····-····</span>', 'big'));
    idLabel.position.set(0, -6.9, 0);
    g.add(idLabel);
    s.setId = (id) => {
      idLabel.element.innerHTML = `<span class="mono">ID ${id}</span>`;
    };

    s.enter = () => {
      lines.forEach((l, k) => {
        const p = { n: 0 };
        l.geometry.setDrawRange(0, 0);
        gsap.to(p, {
          n: l.userData.n, duration: 1.6, delay: 0.3 + k * 0.035, ease: 'power2.out',
          onUpdate: () => l.geometry.setDrawRange(0, Math.floor(p.n)),
        });
      });
    };
    s.update = (t) => {
      fp.rotation.y = Math.sin(t * 0.5) * 0.35;
      fp.rotation.x = Math.sin(t * 0.37) * 0.12;
      scan.position.set(0, Math.sin(t * 1.3) * 5.4, 0.3);
      scan.material.opacity = 0.35 + 0.35 * Math.cos(t * 2.6);
      halo.rotation.z = t * 0.1;
    };
  });
}

// ── 3 · audience: phones orbiting the QR code ───────────────
function audience(i) {
  return station(i, (s, g) => {
    const orbit = new THREE.Group();
    g.add(orbit);
    const PHONES = 12;
    const phoneMat = basic(COLORS.safe, 0.85);
    for (let k = 0; k < PHONES; k++) {
      const p = new THREE.Group();
      p.add(rectFrame(1.3, 2.5, 0.06, phoneMat));
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 32), basic(k % 3 ? COLORS.safe : COLORS.warn, 0.9));
      ring.position.y = 0.2;
      p.add(ring);
      const a = (k / PHONES) * Math.PI * 2;
      p.position.set(Math.cos(a) * 7.2, Math.sin(a * 2) * 0.6, Math.sin(a) * 7.2);
      orbit.add(p);
    }
    orbit.rotation.x = 0.28;
    s.update = (t) => {
      orbit.rotation.y = t * 0.12;
      orbit.children.forEach((p) => p.lookAt(s.cam.pos));
    };
  });
}

// ── 4 · Chromium: browsers converge into one engine ─────────
function chromium(i) {
  return station(i, (s, g) => {
    const coreMat = basic(COLORS.safe, 1);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), basic(COLORS.safe, 0.5, { wireframe: true }));
    const inner = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 16), coreMat);
    g.add(core, inner);
    const coreLabel = s.addLabel(label('Chromium', 'big'));
    coreLabel.position.set(0, -2.9, 0);
    g.add(coreLabel);

    const names = ['Chrome', 'Edge', 'Brave', 'Opera', 'Vivaldi', 'Samsung Internet'];
    const nodes = names.map((n, k) => {
      const node = new THREE.Group();
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12), basic(COLORS.white, 1));
      node.add(sphere);
      const l = s.addLabel(label(n, 'hidden'));
      l.position.set(0, -0.95, 0);
      node.add(l);
      node.userData.label = l;
      const a = (k / names.length) * Math.PI * 2 + 0.3;
      node.userData.home = new THREE.Vector3(Math.cos(a) * 6.2, Math.sin(a) * 4.4, 0);
      node.userData.far = new THREE.Vector3(Math.cos(a) * 15 + rand(-2, 2), Math.sin(a) * 9 + rand(-2, 2), rand(-6, 3));
      node.position.copy(node.userData.far);
      g.add(node);
      return node;
    });

    const beamMat = new THREE.LineBasicMaterial({ color: COLORS.safe, transparent: true, opacity: 0 });
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(names.length * 6), 3));
    const beams = new THREE.LineSegments(beamGeo, beamMat);
    g.add(beams);

    const crack = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.04, 8, 96), basic(COLORS.threat, 0));
    g.add(crack);

    let broken = false;
    const reset = () => {
      broken = false;
      gsap.killTweensOf(crack.scale);
      nodes.forEach((n) => {
        n.position.copy(n.userData.far);
        n.userData.label.element.classList.add('hidden');
      });
      beamMat.opacity = 0;
      beamMat.color.set(COLORS.safe);
      coreMat.color.set(COLORS.safe);
      core.material.color.set(COLORS.safe);
      crack.material.opacity = 0;
    };
    s.enter = reset;
    s.step = (k) => {
      if (k === 0) {
        nodes.forEach((n, j) =>
          gsap.to(n.position, { ...n.userData.home, duration: 1.4, delay: j * 0.07, ease: 'power3.inOut' }));
        fade(beamMat, 0.6, 0.8, 1.1);
        setTimeout(() => nodes.forEach((n) => n.userData.label.element.classList.remove('hidden')), 1200);
        sfx.whoosh(1.2);
      }
      if (k === 1) {
        sfx.alarm();
        const red = new THREE.Color(COLORS.threat);
        [coreMat.color, core.material.color, beamMat.color].forEach((c) =>
          gsap.to(c, { r: red.r, g: red.g, b: red.b, duration: 0.6 }));
        broken = true;
        gsap.fromTo(crack.scale, { x: 0.6, y: 0.6, z: 0.6 }, { x: 1.4, y: 1.4, z: 1.4, duration: 1.4, repeat: -1, ease: 'power1.out' });
      }
    };
    s.update = (t) => {
      core.rotation.set(t * 0.2, t * 0.3, 0);
      inner.scale.setScalar(1 + Math.sin(t * 2.2) * 0.05);
      const arr = beamGeo.attributes.position.array;
      nodes.forEach((n, k) => {
        n.position.z += Math.sin(t * 0.8 + k) * 0.003;
        arr.set([0, 0, 0, n.position.x, n.position.y, n.position.z], k * 6);
      });
      beamGeo.attributes.position.needsUpdate = true;
      crack.material.opacity = broken ? Math.max(0, (0.9 * (1.4 - crack.scale.x)) / 0.8) : 0;
    };
  });
}

// ── 5 · threats attacking a browser ─────────────────────────
function threats(i) {
  return station(i, (s, g) => {
    const win = browserWindow(8, 5.2, COLORS.safe);
    g.add(win);
    const spots = [
      [-6.6, 4.3], [6.6, 4.3], [-6.6, -3.9], [6.6, -3.9],
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
        to: () => new THREE.Vector3(rand(-3.4, 3.4), rand(-2, 1.8), 0.2),
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

// ── 6 · antivirus / VPN / incognito miss the browser ───────
function gaps(i) {
  return station(i, (s, g) => {
    const pedestals = [];
    const X = [-6.5, 0, 6.5];

    // Antivirus: a watchtower guarding the disk
    {
      const p = new THREE.Group();
      const mat = basic(COLORS.safe, 1);
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.5, 40, 1, true), basic(COLORS.safe, 0.5, { wireframe: true }));
      disk.position.y = -2.8;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 4, 8), basic(COLORS.safe, 0.6, { wireframe: true }));
      tower.position.y = -1;
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 1.1), mat);
      top.position.y = 1.2;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4, 24, 1, true), basic(COLORS.safe, 0.06, { side: THREE.DoubleSide, depthWrite: false }));
      const beamPivot = new THREE.Group();
      beamPivot.position.y = 1.2;
      cone.position.set(0, -2, 0);
      const tilt = new THREE.Group();
      tilt.rotation.z = 0.3;
      tilt.add(cone);
      beamPivot.add(tilt);
      p.add(disk, tower, top, beamPivot);
      p.userData.spin = beamPivot;
      pedestals.push(p);
    }
    // VPN: an encrypted tunnel with a leak
    {
      const p = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 5, 12, 4, true), basic(COLORS.safe, 0.22, { wireframe: true }));
      tube.rotation.z = Math.PI / 2;
      tube.position.y = -1;
      p.add(tube);
      const inside = stream({
        count: 30, color: COLORS.safe, size: 0.3, speed: 0.6,
        from: () => new THREE.Vector3(-2.5, -1 + rand(-0.5, 0.5), rand(-0.5, 0.5)),
        to: () => new THREE.Vector3(2.5, -1 + rand(-0.5, 0.5), rand(-0.5, 0.5)),
      });
      const leak = stream({
        count: 14, color: COLORS.threat, size: 0.38, speed: 0.45,
        from: () => new THREE.Vector3(rand(-0.3, 0.3), -0.2, 0),
        to: () => new THREE.Vector3(rand(-1.5, 1.5), 3.4, rand(-0.5, 0.5)),
      });
      p.add(inside, leak);
      p.userData.streams = [inside, leak];
      pedestals.push(p);
    }
    // Incognito: a dark window — the fingerprint still shows
    {
      const p = new THREE.Group();
      const win = browserWindow(4.2, 3, COLORS.dim, { rows: false });
      win.position.y = -0.6;
      p.add(win);
      const hat = new THREE.Group();
      const brim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 6, 40), basic(COLORS.white, 0.9));
      brim.rotation.x = Math.PI / 2;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 20, 1, true), basic(COLORS.white, 0.6, { wireframe: true }));
      crown.position.y = 0.3;
      hat.add(brim, crown);
      hat.position.set(0, 1.6, 0);
      p.add(hat);
      for (let r = 0; r < 4; r++) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.2 + r * 0.22, 0.25 + r * 0.22, 40), basic(COLORS.threat, 0.9));
        ring.position.set(0, -0.9, 0.05);
        p.add(ring);
      }
      pedestals.push(p);
    }

    pedestals.forEach((p, k) => {
      p.position.x = X[k];
      p.scale.setScalar(0.001);
      g.add(p);
    });

    // attacks flowing across at browser level — above all three defences
    const flow = stream({
      count: 40, color: COLORS.threat, size: 0.34, speed: 0.22,
      from: () => new THREE.Vector3(-13, rand(3.2, 5), rand(-1, 1)),
      to: () => new THREE.Vector3(13, rand(3.2, 5), rand(-1, 1)),
    });
    g.add(flow);
    const browserLevel = s.addLabel(label('browser level — where attacks happen', 'threat small'));
    browserLevel.position.set(0, 6, 0);
    g.add(browserLevel);

    s.enter = () => {
      pedestals.forEach((p) => p.scale.setScalar(0.001));
      flow.material.opacity = 0;
      pedestals[1].userData.streams.forEach((st) => (st.material.opacity = 0));
      fade(flow.material, 0.9, 1, 0.6);
    };
    s.step = (k) => {
      const p = pedestals[k];
      if (!p) return;
      sfx.blip(520 + k * 120);
      gsap.to(p.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(1.6)' });
      if (k === 1) p.userData.streams.forEach((st, j) => fade(st.material, 0.95, 0.6, 0.4 + j * 0.6));
    };
    s.update = (t, dt) => {
      flow.userData.update(dt);
      pedestals[0].userData.spin.rotation.y = t * 1.4;
      pedestals[1].userData.streams.forEach((st) => st.userData.update(dt));
      pedestals.forEach((p, k) => (p.rotation.y = Math.sin(t * 0.5 + k) * 0.25));
    };
  });
}

// ── 7 · decision matrix backdrop ────────────────────────────
function matrixBackdrop(i) {
  return station(i, (s, g) => {
    const cubes = [];
    for (let k = 0; k < 22; k++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        basic(k % 5 === 0 ? COLORS.safe : COLORS.dim, k % 5 === 0 ? 0.5 : 0.35, { wireframe: true }),
      );
      c.position.set(rand(-22, 22), rand(-9, 9), rand(-18, -6));
      c.scale.setScalar(rand(0.6, 2.4));
      c.userData.spin = rand(0.1, 0.4);
      g.add(c);
      cubes.push(c);
    }
    s.update = (t) => cubes.forEach((c, k) => {
      c.rotation.set(t * c.userData.spin, t * c.userData.spin * 0.7, 0);
      c.position.y += Math.sin(t * 0.6 + k) * 0.003;
    });
  });
}

// Glowing protective dome: icosahedron lattice + fresnel skin.
function makeShield(R, detail = 2) {
  const group = new THREE.Group();
  const lattice = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R, detail)),
    new THREE.LineBasicMaterial({ color: COLORS.safe, transparent: true, opacity: 0.4 }),
  );
  const skin = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.995, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(COLORS.safe) }, uHit: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uHit;
        varying vec3 vN; varying vec3 vV;
        void main() {
          float f = pow(1.0 - abs(dot(vN, vV)), 2.6);
          gl_FragColor = vec4(uColor, f * (0.28 + uHit));
        }`,
    }),
  );
  group.add(lattice, skin);
  let hitGlow = 0;
  return {
    group,
    lattice,
    hit: () => (hitGlow = Math.min(0.35, hitGlow + 0.05)),
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

// ── 8 · Heros Shell: the shield goes up ─────────────────────
function heros(i) {
  return station(i, (s, g) => {
    const win = browserWindow(6.6, 4.2, COLORS.safe);
    g.add(win);

    const R = 6;
    const shield = makeShield(R);
    shield.group.scale.setScalar(0.001);
    g.add(shield.group);

    const zones = [0, 1, 2].map((k) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.6 + k * 0.6, 0.05, 8, 160), basic(COLORS.safe, 0));
      ring.rotation.x = Math.PI / 2 - 0.25;
      g.add(ring);
      return ring;
    });

    const attacks = bouncingAttacks(R, 70, 22, shield.hit);
    g.add(attacks.points);

    s.enter = () => {
      shield.group.scale.setScalar(0.001);
      attacks.mat.opacity = 0;
      zones.forEach((z) => (z.material.opacity = 0));
      gsap.to(shield.group.scale, {
        x: 1, y: 1, z: 1, duration: 1.4, delay: 0.5, ease: 'elastic.out(1, 0.6)',
        onStart: () => sfx.impact(),
      });
      fade(attacks.mat, 1, 1, 1.2);
    };
    s.step = (k) => {
      const z = zones[k];
      if (!z) return;
      sfx.blip(660 + k * 180);
      fade(z.material, 0.85, 0.6);
      gsap.fromTo(z.scale, { x: 1.25, y: 1.25, z: 1.25 }, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'power3.out' });
    };
    s.update = (t, dt) => {
      shield.lattice.rotation.y = t * 0.08;
      zones.forEach((z, k) => (z.rotation.z = t * (0.1 + k * 0.05) * (k % 2 ? -1 : 1)));
      attacks.update(dt, shield.group.scale.x > 0.9);
      shield.update();
    };
  }, { camOffset: new THREE.Vector3(0, 1.5, 27) });
}

// ── 9 · local-first vs cloud ────────────────────────────────
function local(i) {
  return station(i, (s, g) => {
    // left: cloud model
    const left = new THREE.Group();
    left.position.x = -4.6;
    const cloud = new THREE.Group();
    [[0, 0, 1.3], [-1.3, -0.3, 0.95], [1.3, -0.3, 1], [-0.6, 0.6, 0.9], [0.7, 0.55, 0.85]].forEach(([x, y, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), basic(COLORS.threat, 0.35, { wireframe: true }));
      m.position.set(x, y, 0);
      cloud.add(m);
    });
    cloud.position.y = 4.4;
    const laptop = browserWindow(3.4, 2.3, COLORS.dim, { rows: false });
    laptop.position.y = -2.6;
    left.add(cloud, laptop);
    const up = stream({
      count: 22, color: COLORS.threat, size: 0.32, speed: 0.5,
      from: () => new THREE.Vector3(rand(-0.6, -0.2), -1.4, 0),
      to: () => new THREE.Vector3(rand(-0.8, -0.2), 3.4, 0),
    });
    const down = stream({
      count: 14, color: COLORS.warn, size: 0.28, speed: 0.4,
      from: () => new THREE.Vector3(rand(0.2, 0.8), 3.4, 0),
      to: () => new THREE.Vector3(rand(0.2, 0.6), -1.4, 0),
    });
    left.add(up, down);
    const lc = s.addLabel(label('Cloud', 'threat small'));
    lc.position.set(0, 6.4, 0);
    left.add(lc);
    g.add(left);

    // divider
    const div = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 13), basic(COLORS.dim, 0.7));
    g.add(div);

    // right: everything stays inside
    const right = new THREE.Group();
    right.position.x = 4.6;
    const vaultEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5, 5, 5)), new THREE.LineBasicMaterial({ color: COLORS.safe }));
    const device = browserWindow(3, 2, COLORS.safe, { rows: false });
    right.add(vaultEdges, device);
    const N = 30;
    const pos = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const orbit = new THREE.Points(geo, new THREE.PointsMaterial({ color: COLORS.safe, size: 0.3, map: dotTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    right.add(orbit);
    const seeds = Array.from({ length: N }, () => ({ a: rand(0, Math.PI * 2), r: rand(1.4, 2.2), y: rand(-1.8, 1.8), s: rand(0.4, 1.1) }));
    const lr = s.addLabel(label('Your device', 'safe small'));
    lr.position.set(0, -3.4, 0);
    right.add(lr);
    g.add(right);

    s.enter = () => {
      up.material.opacity = 0;
      down.material.opacity = 0;
      fade(up.material, 0.95, 0.6, 0.4);
      fade(down.material, 0.9, 0.6, 1.2);
    };
    s.update = (t, dt) => {
      up.userData.update(dt);
      down.userData.update(dt);
      cloud.rotation.y = t * 0.2;
      vaultEdges.rotation.y = t * 0.15;
      seeds.forEach((q, k) => {
        const a = q.a + t * q.s;
        pos[k * 3] = Math.cos(a) * q.r;
        pos[k * 3 + 1] = q.y + Math.sin(t + k) * 0.2;
        pos[k * 3 + 2] = Math.sin(a) * q.r;
      });
      geo.attributes.position.needsUpdate = true;
    };
  });
}

// ── 10 · Nevai Hub ──────────────────────────────────────────
function hub(i, hubContent) {
  return station(i, (s, g) => {
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 16), basic(COLORS.safe, 1));
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), basic(COLORS.safe, 0.35, { wireframe: true }));
    g.add(core, shell);
    const cl = s.addLabel(label('Nevai Hub', 'big'));
    cl.position.set(0, -2.8, 0);
    g.add(cl);

    const domainNodes = hubContent.domains.map((d, k) => {
      const a = (k / hubContent.domains.length) * Math.PI * 2 + Math.PI / 4;
      const n = new THREE.Group();
      n.position.set(Math.cos(a) * 5.4, Math.sin(a) * 4.2, 0);
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), basic(COLORS.dim, 1));
      n.add(m);
      const l = s.addLabel(label(d.name, 'small'));
      l.position.set(0, -1.1, 0);
      n.add(l);
      g.add(n);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), basic(COLORS.safe, 0.15));
      const len = n.position.length();
      beam.scale.y = len;
      beam.position.copy(n.position).multiplyScalar(0.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.position.clone().normalize());
      g.add(beam);
      return { n, m, beam, level: 0 };
    });

    const modules = hubContent.modules.map((mod, k) => {
      const n = new THREE.Group();
      n.position.set([-6.5, 0, 6.5][k], [6, 7.6, 6][k], -1);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), basic(COLORS.white, 0.9, { wireframe: true }));
      n.add(m);
      const l = s.addLabel(label(`<b>${mod.name}</b><br><span>${mod.desc}</span>`, 'small module'));
      l.position.set(0, 1.0, 0);
      n.add(l);
      g.add(n);
      return { n, m };
    });

    s.setDomain = (k, ratio) => {
      const d = domainNodes[k];
      if (!d) return;
      d.level = ratio;
      const c = new THREE.Color(COLORS.dim).lerp(new THREE.Color(COLORS.safe), ratio);
      gsap.to(d.m.material.color, { r: c.r, g: c.g, b: c.b, duration: 0.3 });
      gsap.to(d.beam.material, { opacity: 0.15 + ratio * 0.8, duration: 0.3 });
      gsap.fromTo(d.m.scale, { x: 1.5, y: 1.5, z: 1.5 }, { x: 1, y: 1, z: 1, duration: 0.5 });
    };
    s.update = (t) => {
      shell.rotation.set(t * 0.2, t * 0.25, 0);
      core.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
      domainNodes.forEach((d, k) => (d.m.rotation.y = t * (0.5 + d.level * 2) + k));
      modules.forEach((m, k) => (m.m.rotation.set(t * 0.4 + k, t * 0.5, 0)));
    };
  }, { lookOffset: new THREE.Vector3(0, 1.4, 0), camOffset: new THREE.Vector3(0, 2.2, 24) });
}

// ── 11 · demo: Chrome alone vs Chrome + Heros ───────────────
function demo(i) {
  return station(i, (s, g) => {
    const a = browserWindow(6, 4, COLORS.threat);
    a.position.set(-12, 0, -2);
    a.rotation.y = 0.35;
    const b = browserWindow(6, 4, COLORS.safe);
    b.position.set(12, 0, -2);
    b.rotation.y = -0.35;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.06, 8, 120), basic(COLORS.safe, 0.8));
    ring.position.copy(b.position);
    ring.rotation.y = -0.35;
    g.add(a, b, ring);
    const leak = stream({
      count: 30, color: COLORS.threat, size: 0.34, speed: 0.4,
      from: () => new THREE.Vector3(-12 + rand(-2, 2), rand(-1, 1), -2),
      to: () => new THREE.Vector3(-12 + rand(-6, 6), rand(6, 10), rand(-6, -2)),
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

// ── 12 · outro: every browser safe under one shield ────────
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
      w.position.set(Math.cos(a) * r, -2 + (k % 3) * 1.6, Math.sin(a) * r);
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
function road(list) {
  const pts = list.map((s) => s.anchor.clone().add(new THREE.Vector3(0, -6.2, 0)));
  pts.unshift(pts[0].clone().add(new THREE.Vector3(-40, 0, 6)));
  pts.push(pts[pts.length - 1].clone().add(new THREE.Vector3(40, 0, 6)));
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 600, 0.09, 6), basic(COLORS.safe, 0.85)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 600, 0.6, 8), basic(COLORS.safeDeep, 0.12, { depthWrite: false })));
  // a node under every station
  list.forEach((s) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.4, 48), basic(COLORS.safe, 0.7, { side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(s.anchor).add(new THREE.Vector3(0, -6.2, 0));
    g.add(ring);
  });
  return g;
}

export function createStations(world, content) {
  const builders = {
    intro, fingerprint, audience, chromium, threats, gaps,
    matrix: matrixBackdrop, heros, local,
    hub: (k) => hub(k, content.hub),
    demo,
    outro,
  };
  const list = content.stations.map((c, k) => {
    const s = builders[c.id](k);
    s.id = c.id;
    s.cam.frame = c.layout === 'center' ? 'center' : 'left';
    world.scene.add(s.group);
    world.onFrame((t, dt) => s.update(t, dt));
    return s;
  });
  world.scene.add(road(list));
  return list;
}
