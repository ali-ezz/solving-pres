// The 3D engine: renderer, bloom, environment and the cinematic camera.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import { viewport, onViewportResize } from './viewport.js';

export const COLORS = {
  bg: 0x04060c,
  safe: 0x37e2ff,
  safeDeep: 0x1677ff,
  threat: 0xff3b5c,
  warn: 0xffb020,
  dim: 0x3a4a66,
  white: 0xe8f1ff,
};

// Lens shift (film offset, mm) that centres the subject in the free space
// right of the text column. Mirrors .panel.left in styles.css:
// left 7vw, width min(640px, 40vw).
function frameOffset(frame) {
  if (frame !== 'left') return 0;
  const w = viewport.w;
  const aspect = w / viewport.h;
  const textRight = (0.07 * w + Math.min(640, 0.4 * w)) / w;
  const target = (textRight + 1) / 2; // middle of the free area, 0..1
  // the visible film width is filmGauge (35mm) * 2*tan(fov/2) * aspect, fov 45°
  return -(target - 0.5) * 35 * 0.8284 * aspect;
}

export function createWorld(canvas, labelHost) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(viewport.w, viewport.h);
  renderer.setClearColor(COLORS.bg, 1);

  const labels = new CSS2DRenderer({ element: labelHost });
  labels.setSize(viewport.w, viewport.h);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(COLORS.bg, 0.012);

  const camera = new THREE.PerspectiveCamera(45, viewport.w / viewport.h, 0.1, 1200);
  camera.position.set(0, 2, 30);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(viewport.w, viewport.h), 0.95, 0.55, 0.12);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  scene.add(new THREE.AmbientLight(0x6080ff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(10, 20, 15);
  scene.add(key);

  addFloor(scene);
  const stars = addStars(scene);

  // ── camera rig ────────────────────────────────────────────
  // `rig` holds the "official" camera pose for the current station;
  // mouse parallax is layered on top every frame.
  const rig = {
    pos: camera.position.clone(),
    look: new THREE.Vector3(0, 0, 0),
    film: 0,
    frame: 'center',
    warp: 0, // 0 at rest, 1 at full flight speed
  };
  const streaks = addWarpStreaks(camera);
  scene.add(camera);
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / viewport.w) * 2 - 1;
    mouse.y = (e.clientY / viewport.h) * 2 - 1;
  });

  let flight = null;
  function flyTo({ pos, look, frame = 'left' }, { duration = 1.8, instant = false } = {}) {
    if (flight) flight.kill();
    const from = { pos: rig.pos.clone(), look: rig.look.clone(), film: rig.film };
    const toFilm = frameOffset(frame);
    rig.frame = frame;
    if (instant) {
      rig.pos.copy(pos);
      rig.look.copy(look);
      rig.film = toFilm;
      return Promise.resolve();
    }
    const dist = from.pos.distanceTo(pos);
    const lift = Math.min(10, dist * 0.12);
    const p = { t: 0 };
    return new Promise((resolve) => {
      flight = gsap.to(p, {
        t: 1,
        duration,
        ease: 'power3.inOut',
        onUpdate: () => {
          const t = p.t;
          rig.pos.lerpVectors(from.pos, pos, t);
          rig.pos.y += Math.sin(Math.PI * t) * lift;
          // pull back a little mid-flight for a "breath" feel
          rig.pos.z += Math.sin(Math.PI * t) * lift * 0.6;
          rig.look.lerpVectors(from.look, look, Math.min(1, t * 1.15));
          rig.film = from.film + (toFilm - from.film) * t;
          rig.warp = Math.sin(Math.PI * t) ** 3;
        },
        onComplete: () => {
          rig.warp = 0;
          resolve();
        },
      });
    });
  }

  function resize() {
    const { w, h } = viewport;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    labels.setSize(w, h);
    if (!flight || !flight.isActive()) rig.film = frameOffset(rig.frame);
  }
  onViewportResize(resize);

  const updaters = new Set();
  const timer = new THREE.Timer();
  const tmp = new THREE.Vector3();

  function frame(now) {
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    mouse.sx += (mouse.x - mouse.sx) * 0.05;
    mouse.sy += (mouse.y - mouse.sy) * 0.05;

    tmp.set(mouse.sx * 1.6, -mouse.sy * 0.9, 0);
    camera.position.copy(rig.pos).add(tmp);
    // gentle idle drift so the world never looks frozen
    camera.position.y += Math.sin(t * 0.4) * 0.12;
    camera.lookAt(rig.look);
    // film offset shifts the lens sideways: the subject moves right while the
    // camera keeps looking straight at it
    camera.filmOffset = rig.film;
    // a short field-of-view punch sells the speed of each flight
    camera.fov = 45 + rig.warp * 9;
    camera.updateProjectionMatrix();
    streaks.update(dt, rig.warp);
    bloom.strength = 0.95 + rig.warp * 0.45;

    stars.rotation.y = t * 0.004;
    for (const fn of updaters) fn(t, dt);

    composer.render();
    labels.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    scene,
    camera,
    renderer,
    bloom,
    flyTo,
    onFrame: (fn) => updaters.add(fn),
  };
}

// Light streaks rushing past the lens during a flight. They live in camera
// space, so they always fly straight at the viewer.
function addWarpStreaks(camera) {
  const N = 260;
  const pos = new Float32Array(N * 6);
  const seeds = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 16;
    seeds.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6, z: -Math.random() * 90, len: 1 + Math.random() * 3 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({
    color: COLORS.safe, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  camera.add(lines);
  return {
    update(dt, warp) {
      mat.opacity = warp * 0.42;
      lines.visible = warp > 0.01;
      if (!lines.visible) return;
      seeds.forEach((q, i) => {
        q.z += dt * (40 + 160 * warp);
        if (q.z > -2) q.z -= 90;
        const len = q.len * (1 + warp * 6);
        pos.set([q.x, q.y, q.z, q.x, q.y, q.z - len], i * 6);
      });
      geo.attributes.position.needsUpdate = true;
    },
  };
}

function addFloor(scene) {
  const geo = new THREE.PlaneGeometry(2000, 2000, 1, 1);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(COLORS.safeDeep) },
      uFogColor: { value: new THREE.Color(COLORS.bg) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vWorld;
      float grid(vec2 p, float size) {
        vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        float d = length(vWorld.xz - cameraPosition.xz);
        float fade = exp(-d * 0.018);
        float g = grid(vWorld.xz, 4.0) * 0.55 + grid(vWorld.xz, 20.0) * 0.6;
        gl_FragColor = vec4(uColor * g, g * fade * 0.5);
      }`,
    extensions: { derivatives: true },
  });
  const floor = new THREE.Mesh(geo, mat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -7;
  scene.add(floor);
}

function addStars(scene) {
  const n = 2600;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.2) * 900;
    pos[i * 3 + 1] = Math.random() * 160 - 20;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 500 - 60;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x7fa8ff,
    size: 0.35,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return pts;
}
