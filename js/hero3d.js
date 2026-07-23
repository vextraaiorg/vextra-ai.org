/* Vextra AI — hero 3D network + contact particle field.
   ES module (Three.js r160 via importmap). GSAP/ScrollTrigger are UMD globals. */
import * as THREE from 'three';

/* Raw sRGB components (skip r160's default sRGB→linear conversion): the glow
   shader writes these attribute values straight to the sRGB canvas, so storing
   them unconverted keeps brand colors exact. */
const srgb = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
const TEAL = srgb(0x3fb0b3);
const ORANGE = srgb(0xe08a3c);
const INK = srgb(0x021818);
const HAZE_TEAL = srgb(0x8fd4d6);
const SOFT_TEAL = srgb(0x6fc2c4);

/* ---------------- shared glow-point shader ----------------
   One shader serves hero nodes, outer haze, and the contact field —
   per-point size/phase/color/alpha attributes, soft radial falloff. */
const GLOW_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uWobble;
  uniform float uWarp;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    // organic wobble — cheap decorrelated trig, per-point phase keeps it non-uniform
    p += uWobble * vec3(
      sin(uTime * 0.60 + aPhase),
      cos(uTime * 0.47 + aPhase * 1.7),
      sin(uTime * 0.71 + aPhase * 2.3)
    );
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // warp jump: fling points radially out from the view axis (view-space xy),
    // per-point seed keeps the streaks organic; length guarded near the axis
    float seed = fract(aPhase * 0.618034);
    mv.xy += (mv.xy / max(length(mv.xy), 0.001)) * uWarp * (1.5 + 3.0 * seed);
    // perspective size attenuation, guarded so points passing the camera during
    // the dive don't produce negative/huge sizes; points swell as they streak past
    gl_PointSize = min(aSize * uPixelRatio * (140.0 / max(-mv.z, 0.6)) * (1.0 + uWarp * (1.5 + 2.0 * seed)), 160.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = aAlpha;
  }
`;
const GLOW_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uWarp;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    // soft radial core; under warp the hot core widens + alpha rises → streak feel
    float glow = smoothstep(0.5, 0.08 + uWarp * 0.22, d);
    vec3 col = mix(vColor, vec3(0.78, 1.0, 1.0), uWarp * 0.6); // warp light shift
    gl_FragColor = vec4(col, min(glow * vAlpha * uOpacity * (1.0 + uWarp * 0.8), 1.0));
  }
`;

function makeGlowMaterial(wobble) {
  return new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uWobble: { value: wobble },
      uOpacity: { value: 1 },
      uWarp: { value: 0 }, // 0 everywhere except the hero dive finale
    },
    transparent: true,
    depthWrite: false,
  });
}

/* ---------------- link-line shader ----------------
   aLineT runs 0→1 along each segment; a per-segment seed staggers a traveling
   brightness pulse. Deliberately faint — B2B, not rave. */
const LINE_VERT = /* glsl */ `
  attribute float aLineT;
  attribute float aSeed;
  varying float vLineT;
  varying float vSeed;
  void main() {
    vLineT = aLineT;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const LINE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying float vLineT;
  varying float vSeed;
  void main() {
    vec3 base = vec3(0.247, 0.690, 0.702);   // #3fb0b3
    vec3 orange = vec3(0.878, 0.541, 0.235); // #e08a3c
    float speed = 0.08 + fract(vSeed * 7.31) * 0.10;
    float cycle = uTime * speed + vSeed;
    float p = fract(cycle);
    // each cycle a segment either carries a pulse or stays quiet (pseudo-random gate)
    float gate = step(0.62, fract(vSeed * 13.7 + floor(cycle) * 0.618));
    float pulse = smoothstep(0.16, 0.0, abs(vLineT - p)) * gate;
    gl_FragColor = vec4(mix(base, orange, pulse * 0.8), (0.14 + pulse * 0.30) * uOpacity);
  }
`;

function makeRenderer(canvas) {
  /* antialias off: soft-glow shader points don't benefit from MSAA, and fill rate
     is the scroll-lag bottleneck on large viewports. DPR 1.5 for the same reason. */
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  return renderer;
}

function sizeToParent(renderer, camera, canvas) {
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

/* Random point-cloud attribute builder shared by haze + contact field. */
function buildCloud({ count, position, size, color, alpha }) {
  const pos = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const alphas = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    position(i, pos);
    sizes[i] = size(i);
    phases[i] = Math.random() * Math.PI * 2;
    const c = color(i);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    alphas[i] = alpha(i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  return geo;
}

/* ================= HERO ================= */
export function initHero({ reduceMotion }) {
  const canvas = document.getElementById('hero-canvas');
  const heroEl = document.querySelector('.hero');
  if (!canvas || !heroEl) return;

  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger); // registration is not guaranteed upstream

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  const renderer = makeRenderer(canvas);
  const group = new THREE.Group();
  scene.add(group);

  /* --- nodes: fibonacci sphere, r 3.4–4.0 --- */
  const NODE_COUNT = 140;
  const nodeGeo = buildCloud({
    count: NODE_COUNT,
    position: (i, pos) => {
      const t = i / NODE_COUNT;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 3.4 + Math.random() * 0.6;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    },
    size: () => 0.32 + Math.random() * 0.3,
    color: () => {
      const pick = Math.random();
      return pick < 0.14 ? ORANGE : pick < 0.4 ? TEAL : INK;
    },
    alpha: () => 0, // rewritten below — alpha depends on the color pick
  });
  // per-point alpha keyed to color: ink recedes, brand colors read
  {
    const cols = nodeGeo.getAttribute('aColor');
    const alphas = nodeGeo.getAttribute('aAlpha');
    for (let i = 0; i < NODE_COUNT; i++) {
      const isInk = Math.abs(cols.getX(i) - INK.r) < 0.01;
      alphas.setX(i, isInk ? 0.4 : 0.9);
    }
  }
  const nodeMat = makeGlowMaterial(0.06);
  const nodePoints = new THREE.Points(nodeGeo, nodeMat);
  nodePoints.frustumCulled = false; // survives the fly-through
  group.add(nodePoints);

  /* --- link lines between near nodes (static topology, computed once) --- */
  const LINK_DIST = 2.35;
  const nodePos = nodeGeo.getAttribute('position');
  const linkPos = [];
  const lineT = [];
  const seeds = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < NODE_COUNT; i++) {
    a.fromBufferAttribute(nodePos, i);
    for (let j = i + 1; j < NODE_COUNT; j++) {
      b.fromBufferAttribute(nodePos, j);
      if (a.distanceTo(b) < LINK_DIST) {
        linkPos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        lineT.push(0, 1);
        const s = Math.random() * 10;
        seeds.push(s, s);
      }
    }
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPos, 3));
  linkGeo.setAttribute('aLineT', new THREE.Float32BufferAttribute(lineT, 1));
  linkGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  const linkMat = new THREE.ShaderMaterial({
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
    transparent: true,
    depthWrite: false,
  });
  const links = new THREE.LineSegments(linkGeo, linkMat);
  links.frustumCulled = false;
  group.add(links);

  /* --- outer haze for depth --- */
  const hazeGeo = buildCloud({
    count: 260,
    position: (i, pos) => {
      const r = 5.5 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    },
    size: () => 0.1 + Math.random() * 0.1,
    color: () => HAZE_TEAL,
    alpha: () => 0.35,
  });
  const hazeMat = makeGlowMaterial(0.03);
  const haze = new THREE.Points(hazeGeo, hazeMat);
  haze.frustumCulled = false;
  group.add(haze);

  /* --- mouse parallax (ported from old app.js) --- */
  let mouseX = 0, mouseY = 0, rotX = 0, rotY = 0;
  if (!reduceMotion) {
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  const resize = () => sizeToParent(renderer, camera, canvas);
  window.addEventListener('resize', resize);
  resize();

  /* --- THE SIGNATURE: scroll camera dive through the network --- */
  if (!reduceMotion && hasGsap) {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      /* short pin + low scrub: every wheel tick must visibly move the dive — long
         pins with lazy scrub read as "scrolling does nothing" */
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=700', pin: true, scrub: 0.5 },
    });
    tl.to(camera.position, { z: 0.8, ease: 'power2.in', duration: 1 }, 0)         // fly through
      .to(nodeMat.uniforms.uOpacity, { value: 1.3, duration: 0.6 }, 0)            // nodes brighten
      .to('.hero-inner', { opacity: 0, y: -70, scale: 0.95, ease: 'power1.in', duration: 0.4 }, 0)
      .to('.hero-flash', { opacity: 1, ease: 'power1.in', duration: 0.25 }, 0.75) // light-burst handoff = warp exit
      .to(canvas, { opacity: 0.35, duration: 0.12 }, 0.88)                        // no hard cut at unpin
      // warp jump finale: points streak, fov punches wide, link lines dissolve
      .to([nodeMat.uniforms.uWarp, hazeMat.uniforms.uWarp], { value: 1, ease: 'power2.in', duration: 0.35 }, 0.65)
      .to(camera, { fov: 82, ease: 'power2.in', duration: 0.35, onUpdate: () => camera.updateProjectionMatrix() }, 0.65)
      .to(linkMat.uniforms.uOpacity, { value: 0, duration: 0.35 }, 0.65);
  }

  /* render only while the hero (or its pin spacer) is on screen — without this the
     hero GPU loop runs for the whole page and drags scroll perf in later sections */
  let heroVisible = true;
  const vis = new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; });
  vis.observe(canvas.parentElement || canvas);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden || !heroVisible) return; // no rendering while hidden or scrolled past
    const t = clock.getElapsedTime();

    if (reduceMotion) {
      group.rotation.y += 0.0004; // gentle idle drift only
    } else {
      nodeMat.uniforms.uTime.value = t;
      hazeMat.uniforms.uTime.value = t;
      linkMat.uniforms.uTime.value = t;
      rotX += (mouseY * 0.25 - rotX) * 0.04;
      rotY += (mouseX * 0.35 - rotY) * 0.04;
      group.rotation.x = rotX + t * 0.02;
      group.rotation.y = rotY + t * 0.05;
      // camera x/y drift toward cursor for real depth; GSAP owns camera z
      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 0.35 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
    }
    renderer.render(scene, camera);
  }
  animate();
}

/* ================= CONTACT FIELD ================= */
export function initContactField({ reduceMotion }) {
  const canvas = document.getElementById('contact-canvas');
  const section = document.querySelector('.contact.finale');
  if (!canvas || !section) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.set(0, 0, 9);
  const renderer = makeRenderer(canvas);
  const group = new THREE.Group();
  scene.add(group);

  const geo = buildCloud({
    count: 220,
    position: (i, pos) => {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 7;
    },
    size: () => 0.12 + Math.random() * 0.34,
    color: () => (Math.random() < 0.15 ? ORANGE : SOFT_TEAL),
    alpha: () => 0.25 + Math.random() * 0.5,
  });
  const mat = makeGlowMaterial(reduceMotion ? 0 : 0.5); // wobble doubles as the slow drift
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);

  let mouseX = 0, mouseY = 0;
  if (!reduceMotion) {
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  const clock = new THREE.Clock();
  const renderOnce = () => renderer.render(scene, camera);
  const resize = () => { sizeToParent(renderer, camera, canvas); if (reduceMotion) renderOnce(); };
  window.addEventListener('resize', resize);
  resize();

  if (reduceMotion) {
    renderOnce(); // static field, no loop
    return;
  }

  /* render only while the section is on screen */
  let rafId = 0;
  let running = false;
  function loop() {
    rafId = requestAnimationFrame(loop);
    if (document.hidden) return;
    mat.uniforms.uTime.value = clock.getElapsedTime() * 0.5; // slow drift
    group.rotation.y += (mouseX * 0.08 - group.rotation.y) * 0.03;  // slight parallax
    group.rotation.x += (mouseY * 0.05 - group.rotation.x) * 0.03;
    renderer.render(scene, camera);
  }
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) { running = true; loop(); }
    else if (!entry.isIntersecting && running) { running = false; cancelAnimationFrame(rafId); }
  });
  io.observe(section);
}
