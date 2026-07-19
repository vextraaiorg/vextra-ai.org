/* Vextra AI — interactions: Three.js hero network, GSAP reveals/magnetics, form + nav behavior. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* GSAP writes inline transforms via rAF — the CSS transition-duration:0.01ms
     reduced-motion shim never touches it. Every gsap call below routes its
     duration through this so transform-based motion collapses to imperceptible
     under reduced motion instead of silently ignoring the OS setting. */
  const dur = (seconds) => (reduceMotion ? 0.01 : seconds);

  /* ---------------- nav ---------------- */
  const nav = document.querySelector('.nav');
  const burger = document.querySelector('.nav-burger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('open');
    mobileMenu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
    burger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }));

  /* ---------------- cursor dot ---------------- */
  const dot = document.querySelector('.cursor-dot');
  if (dot && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const moveDot = gsap.quickTo(dot, 'x', { duration: dur(0.5), ease: 'power3' });
    const moveDotY = gsap.quickTo(dot, 'y', { duration: dur(0.5), ease: 'power3' });
    window.addEventListener('mousemove', (e) => {
      dot.classList.add('active');
      moveDot(e.clientX);
      moveDotY(e.clientY);
    });
  }

  /* ---------------- GSAP reveals ---------------- */
  gsap.registerPlugin(ScrollTrigger);

  gsap.utils.toArray('.reveal:not(.module-card)').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: dur(0.8), ease: 'power3.out',
      delay: reduceMotion ? 0 : (Number(el.dataset.d) || 0),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  /* module cards — dimensional 3D entrance, distinct from the flat generic reveal above */
  gsap.utils.toArray('.module-card.reveal').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, rotationX: 0, scale: 1, duration: dur(0.9), ease: 'power3.out',
      delay: reduceMotion ? 0 : (Number(el.dataset.d) || 0),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  /* flow section — pinned scroll choreography: nodes + arrows assemble as the user scrolls */
  const flowTrack = document.querySelector('.flow-track');
  if (flowTrack && !reduceMotion && window.ScrollTrigger) {
    flowTrack.classList.add('js-flow-pin');
    const nodes = flowTrack.querySelectorAll('.flow-node');
    const beams = flowTrack.querySelectorAll('.flow-arrow .beam');
    const flowTl = gsap.timeline({
      scrollTrigger: {
        trigger: flowTrack, start: 'top top', end: '+=900', pin: true, scrub: 0.6,
      },
    });
    flowTl
      .to(nodes[0], { opacity: 1, rotationX: 0, y: 0, scale: 1, ease: 'power2.out' })
      .to(beams[0], { strokeDashoffset: 0, ease: 'none' }, '<')
      .to(nodes[1], { opacity: 1, rotationX: 0, y: 0, scale: 1, ease: 'power2.out' })
      .to(beams[1], { strokeDashoffset: 0, ease: 'none' }, '<')
      .to(nodes[2], { opacity: 1, rotationX: 0, y: 0, scale: 1, ease: 'power2.out' });
  }

  /* hero intro timeline */
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTl
    .to('.hero-badge', { opacity: 1, y: 0, duration: dur(0.7) }, reduceMotion ? 0 : 0.1)
    .to('.hero-word', { opacity: 1, y: 0, filter: 'blur(0px)', duration: dur(0.8), stagger: reduceMotion ? 0 : 0.06 }, reduceMotion ? 0 : 0.25)
    .to('.hero-sub', { opacity: 1, y: 0, duration: dur(0.7) }, reduceMotion ? 0 : 0.55)
    .to('.hero-actions', { opacity: 1, y: 0, duration: dur(0.7) }, reduceMotion ? 0 : 0.68)
    .to('.hero-meta', { opacity: 1, y: 0, duration: dur(0.7) }, reduceMotion ? 0 : 0.8);

  /* score bars fill when visible — kept even under reduced motion (conveys real state, not decoration), just instant */
  gsap.utils.toArray('.score-bar i').forEach((bar) => {
    gsap.to(bar, {
      scaleX: bar.dataset.value, duration: dur(1.2), ease: 'power2.out',
      scrollTrigger: { trigger: bar, start: 'top 85%', once: true },
    });
  });

  /* roadmap steps stagger */
  gsap.utils.toArray('.roadmap').forEach((list) => {
    gsap.from(list.querySelectorAll('.roadmap-step'), {
      opacity: 0, x: reduceMotion ? 0 : -14, duration: dur(0.6), stagger: reduceMotion ? 0 : 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: list, start: 'top 85%', once: true },
    });
  });

  /* ---------------- magnetic buttons + press feedback ---------------- */
  document.querySelectorAll('.btn').forEach((btn) => {
    if (!reduceMotion) {
      const strength = 0.35;
      const moveX = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
      const moveY = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        moveX((e.clientX - r.left - r.width / 2) * strength);
        moveY((e.clientY - r.top - r.height / 2) * strength);
      });
      btn.addEventListener('mouseleave', () => { moveX(0); moveY(0); });
    }
    /* press state-confirmation: ~100ms in, ~150ms settle — the animation-discipline default for feedback */
    btn.addEventListener('mousedown', () => gsap.to(btn, { scale: 0.96, duration: dur(0.1), ease: 'power2.out' }));
    btn.addEventListener('mouseup', () => gsap.to(btn, { scale: 1, duration: dur(0.15), ease: 'power2.out' }));
    btn.addEventListener('mouseleave', () => gsap.to(btn, { scale: 1, duration: dur(0.15), ease: 'power2.out' }));
  });

  /* ---------------- module card tilt (skipped under reduced motion — rotate is the highest-cost vestibular trigger) ---------------- */
  if (!reduceMotion) {
    document.querySelectorAll('.module-card').forEach((card) => {
      const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
      const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
      card.addEventListener('mousemove', (e) => {
        if (matchMedia('(hover: none)').matches) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rotX(py * -8);
        rotY(px * 8);
      });
      card.addEventListener('mouseleave', () => { rotX(0); rotY(0); });
    });
  }

  /* ---------------- contact form (client-side only, no backend) ---------------- */
  const form = document.querySelector('.form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      form.querySelectorAll('[required]').forEach((input) => {
        const field = input.closest('.field');
        const empty = !input.value.trim();
        const badEmail = input.type === 'email' && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
        field.classList.toggle('err', empty || badEmail);
        if (empty || badEmail) valid = false;
      });
      const status = form.querySelector('.form-status');
      if (!valid) {
        status.textContent = 'Check the highlighted fields.';
        status.className = 'form-status show';
        return;
      }
      const btn = form.querySelector('.form-submit');
      btn.textContent = 'Sending…';
      setTimeout(() => {
        status.textContent = "Thanks — we'll reply within one business day.";
        status.className = 'form-status show ok';
        btn.textContent = 'Request sent';
        form.querySelectorAll('input, textarea, select').forEach((f) => (f.disabled = true));
      }, 700);
    });
  }

  /* ---------------- Three.js hero network ---------------- */
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  const NODE_COUNT = 130;
  const LINK_DIST = 2.35;
  const nodes = [];
  const nodeGeo = new THREE.SphereGeometry(0.032, 8, 8);

  const blue = new THREE.Color(0x3f7fb3);
  const orange = new THREE.Color(0xe08a3c);
  const ink = new THREE.Color(0x1c2733);

  for (let i = 0; i < NODE_COUNT; i++) {
    // fibonacci sphere for even distribution
    const t = i / NODE_COUNT;
    const phi = Math.acos(1 - 2 * t);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 3.4 + Math.random() * 0.6;
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const colorPick = Math.random();
    const color = colorPick < 0.14 ? orange : (colorPick < 0.4 ? blue : ink);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: colorPick < 0.14 ? 0.95 : 0.55 });
    const mesh = new THREE.Mesh(nodeGeo, mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
    nodes.push(mesh);
  }

  // link lines between near nodes (static topology, computed once)
  const linkPositions = [];
  const linkColors = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = nodes[i].position.distanceTo(nodes[j].position);
      if (d < LINK_DIST) {
        linkPositions.push(nodes[i].position.x, nodes[i].position.y, nodes[i].position.z);
        linkPositions.push(nodes[j].position.x, nodes[j].position.y, nodes[j].position.z);
        const c = blue.clone().lerp(orange, Math.random() * 0.5);
        linkColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    }
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3));
  linkGeo.setAttribute('color', new THREE.Float32BufferAttribute(linkColors, 3));
  const linkMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16 });
  const links = new THREE.LineSegments(linkGeo, linkMat);
  group.add(links);

  // soft outer particle haze for depth
  const hazeCount = 260;
  const hazePos = new Float32Array(hazeCount * 3);
  for (let i = 0; i < hazeCount; i++) {
    const r = 5.5 + Math.random() * 3.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    hazePos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    hazePos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    hazePos[i * 3 + 2] = r * Math.cos(phi);
  }
  const hazeGeo = new THREE.BufferGeometry();
  hazeGeo.setAttribute('position', new THREE.Float32BufferAttribute(hazePos, 3));
  const hazeMat = new THREE.PointsMaterial({ color: 0x8fb4d6, size: 0.045, transparent: true, opacity: 0.35 });
  group.add(new THREE.Points(hazeGeo, hazeMat));

  let targetRotX = 0, targetRotY = 0;
  let mouseX = 0, mouseY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  resize();

  let scrollFade = 1;
  const heroEl = document.querySelector('.hero');
  function updateScrollFade() {
    if (!heroEl) return;
    const h = heroEl.offsetHeight;
    scrollFade = Math.max(0, 1 - window.scrollY / (h * 0.9));
  }
  document.addEventListener('scroll', updateScrollFade, { passive: true });
  updateScrollFade();

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    targetRotX += (mouseY * 0.25 - targetRotX) * 0.04;
    targetRotY += (mouseX * 0.35 - targetRotY) * 0.04;

    group.rotation.x = targetRotX + (reduceMotion ? 0 : t * 0.02);
    group.rotation.y = targetRotY + (reduceMotion ? 0 : t * 0.05);

    group.scale.setScalar(0.92 + scrollFade * 0.08);
    group.position.y = (1 - scrollFade) * -0.6;
    canvas.style.opacity = String(0.35 + scrollFade * 0.65);

    /* camera drifts back on scroll + subtle mouse-driven parallax for real depth */
    camera.position.z = 9 + (1 - scrollFade) * 1.6;
    if (!reduceMotion) {
      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 0.35 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }
  animate();
})();
