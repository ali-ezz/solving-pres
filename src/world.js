// The 3D engine: renderer, bloom, environment and the cinematic camera.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
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

export function createWorld(canvas, labelHost, cssHost) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(viewport.w, viewport.h);
  renderer.setClearColor(COLORS.bg, 1);

  const labels = new CSS2DRenderer({ element: labelHost });
  labels.setSize(viewport.w, viewport.h);
  // real DOM elements placed in the 3D scene (sharp, untouched by bloom)
  const css3d = new CSS3DRenderer({ element: cssHost });
  css3d.setSize(viewport.w, viewport.h);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070f22, 0.012);

  const camera = new THREE.PerspectiveCamera(45, viewport.w / viewport.h, 0.1, 1200);
  camera.position.set(0, 2, 30);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(viewport.w, viewport.h), 0.8, 0.5, 0.18);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  scene.add(new THREE.AmbientLight(0x6080ff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(10, 20, 15);
  scene.add(key);

  addSky(scene);
  addFloor(scene);
  const stars = addStars(scene);
  const dust = addDust(scene);

  // ── camera rig ────────────────────────────────────────────
  // `rig` holds the "official" camera pose for the current station;
  // mouse parallax is layered on top every frame.
  const rig = {
    pos: camera.position.clone(),
    look: new THREE.Vector3(0, 0, 0),
    film: 0,
    frame: 'center',
    parallax: 1, // how far the cursor moves the camera at this station
  };
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / viewport.w) * 2 - 1;
    mouse.y = (e.clientY / viewport.h) * 2 - 1;
  });

  let flight = null;
  let settle = null;
  function flyTo({ pos, look, frame = 'left', parallax = 1 }, { duration = 1.4, instant = false } = {}) {
    if (flight) {
      flight.kill();
      settle?.();
    }
    const from = { pos: rig.pos.clone(), look: rig.look.clone(), film: rig.film, parallax: rig.parallax };
    const toFilm = frameOffset(frame);
    rig.frame = frame;
    if (instant) {
      rig.pos.copy(pos);
      rig.look.copy(look);
      rig.film = toFilm;
      rig.parallax = parallax;
      return Promise.resolve();
    }
    // a calm glide: straight along the road with a slight rise, the gaze leading the way
    const lift = Math.min(2.5, from.pos.distanceTo(pos) * 0.05);
    const p = { t: 0 };
    return new Promise((resolve) => {
      settle = resolve;
      flight = gsap.to(p, {
        t: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          const t = p.t;
          rig.pos.lerpVectors(from.pos, pos, t);
          rig.pos.y += Math.sin(Math.PI * t) * lift;
          rig.look.lerpVectors(from.look, look, Math.min(1, t * 1.25));
          rig.film = from.film + (toFilm - from.film) * t;
          rig.parallax = from.parallax + (parallax - from.parallax) * t;
        },
        onComplete: () => {
          settle = null;
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
    css3d.setSize(w, h);
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

    tmp.set(mouse.sx * 1.6, -mouse.sy * 0.9, 0).multiplyScalar(rig.parallax);
    camera.position.copy(rig.pos).add(tmp);
    // gentle idle drift so the world never looks frozen
    camera.position.y += Math.sin(t * 0.4) * 0.12;
    camera.lookAt(rig.look);
    // film offset shifts the lens sideways: the subject moves right while the
    // camera keeps looking straight at it
    camera.filmOffset = rig.film;
    camera.updateProjectionMatrix();

    stars.rotation.y = t * 0.004;
    dust.update(t);
    for (const fn of updaters) fn(t, dt);

    composer.render();
    labels.render(scene, camera);
    css3d.render(scene, camera);
    // CSS3DRenderer ignores the lens shift: move its whole layer by the same amount
    cssHost.style.transform = `translateX(${-camera.projectionMatrix.elements[8] * viewport.w * 0.5}px)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    scene,
    camera,
    rig,
    renderer,
    bloom,
    flyTo,
    onFrame: (fn) => updaters.add(fn),
  };
}

// A huge gradient dome: deep navy near the horizon fading to black overhead.
function addSky(scene) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x02030a) },
      uHorizon: { value: new THREE.Color(0x0a1834) },
      uGlow: { value: new THREE.Color(0x0b4a66) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGlow;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 c = mix(uHorizon, uTop, smoothstep(-0.05, 0.45, h));
        c += uGlow * exp(-abs(h - 0.02) * 22.0) * 0.35;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), mat);
  sky.position.x = 150;
  sky.renderOrder = -1;
  scene.add(sky);
}

// Fine dust floating along the whole route: gives the space depth.
function addDust(scene) {
  const n = 700;
  const base = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    base[i * 3] = -60 + Math.random() * 380;
    base[i * 3 + 1] = -6 + Math.random() * 22;
    base[i * 3 + 2] = -40 + Math.random() * 70;
  }
  const pos = base.slice();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x9cc8ff, size: 0.09, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  scene.add(pts);
  return {
    update(t) {
      for (let i = 0; i < n; i++) {
        pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.2 + i) * 0.4;
        pos[i * 3] = base[i * 3] + Math.cos(t * 0.15 + i * 0.7) * 0.4;
      }
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
        float fade = exp(-d * 0.024);
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
  const n = 1500;
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
    opacity: 0.45,
    depthWrite: false,
    fog: false,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return pts;
}
