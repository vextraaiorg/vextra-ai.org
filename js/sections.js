/* Vextra AI — section choreography. Replaces the section logic of js/app.js.
   ES module; GSAP + ScrollTrigger are UMD globals loaded before this runs. */

export function initSections({ reduceMotion }) {
  const gsap = window.gsap;
  if (!gsap) return;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  const ST = window.ScrollTrigger;
  if (!ST) {
    /* no ScrollTrigger — never leave content stuck at opacity 0 */
    gsap.set('.reveal', { opacity: 1, y: 0, rotationX: 0, scale: 1 });
    return;
  }

  /* ported from app.js: every tween's duration collapses under reduced motion */
  const dur = (s) => (reduceMotion ? 0.01 : s);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- 1. generic reveals (ported from app.js) ----------
     .feature-visual is also excluded: the parallax scrub (section 8) owns its y,
     so it gets an opacity-only reveal below to avoid two tweens fighting over y. */
  $$('.reveal:not(.feature-visual)').forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: dur(0.8), ease: 'power3.out',
      delay: reduceMotion ? 0 : (Number(el.dataset.d) || 0),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  $$('.feature-visual.reveal').forEach((el) => {
    const vars = {
      opacity: 1, duration: dur(0.8), ease: 'power3.out',
      delay: reduceMotion ? 0 : (Number(el.dataset.d) || 0),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    };
    if (reduceMotion) vars.y = 0; /* no parallax under reduced motion, so settle y here */
    gsap.to(el, vars);
  });

  /* ---------- 2. flow — pinned assemble (ported) + data pulses (new) ---------- */
  const flowTrack = $('.flow-track');
  if (flowTrack && !reduceMotion) {
    /* pin removed: it left the section visibly EMPTY until the pin engaged
       (nodes at opacity 0, floating arrowheads) — a once-on-enter cascade keeps
       the section always complete with zero dead scroll */
    flowTrack.classList.add('js-flow-pin');
    const nodes = $$('.flow-node', flowTrack);
    const beams = $$('.flow-arrow .beam', flowTrack);
    const heads = $$('.flow-arrow path', flowTrack);
    gsap.set(heads, { opacity: 0 });
    gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: flowTrack, start: 'top 78%', once: true },
    })
      .to(nodes[0], { opacity: 1, rotationX: 0, y: 0, scale: 1, duration: 0.7 })
      .to(beams[0], { strokeDashoffset: 0, duration: 0.45, ease: 'power1.inOut' }, '-=0.25')
      .to(heads[0], { opacity: 1, duration: 0.2 }, '<0.3')
      .to(nodes[1], { opacity: 1, rotationX: 0, y: 0, scale: 1, duration: 0.7 }, '-=0.2')
      .to(beams[1], { strokeDashoffset: 0, duration: 0.45, ease: 'power1.inOut' }, '-=0.25')
      .to(heads[1], { opacity: 1, duration: 0.2 }, '<0.3')
      .to(nodes[2], { opacity: 1, rotationX: 0, y: 0, scale: 1, duration: 0.7 }, '-=0.2');

    /* pulses travel each arrow (viewBox "0 0 34 12", line y=6), gated to viewport */
    const pulseTweens = $$('.flow-arrow svg', flowTrack).map((svg, i) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', 'flow-pulse');
      c.setAttribute('r', '2.5');
      c.setAttribute('cx', '0');
      c.setAttribute('cy', '6');
      svg.appendChild(c);
      return gsap.fromTo(c, { x: 0, autoAlpha: 0 }, {
        x: 30, autoAlpha: 1, duration: 1.1, ease: 'power1.inOut',
        repeat: -1, repeatDelay: 0.5, delay: i * 0.55, paused: true,
      });
    });
    ST.create({
      trigger: '.flow', start: 'top bottom', end: 'bottom top',
      onToggle: (self) => pulseTweens.forEach((t) => (self.isActive ? t.play() : t.pause())),
    });
  }

  /* ---------- 3. marquees — infinite seamless loop, velocity-reactive ----------
     Each track has 16 identical spans (8 per half). Translating by -50% shifts
     exactly 1 full half, making the loop 100% gapless, continuous, and seamless. */
  if (!reduceMotion) {
    const tracks = $$('.marquee-track');
    if (tracks.length) {
      const loops = tracks.map((track) => {
        const baseSpan = track.querySelector('span');
        const content = baseSpan ? baseSpan.outerHTML : '<span>Vextra.AI&nbsp;·&nbsp;</span>';
        if (track.children.length < 16) {
          let html = '';
          for (let i = 0; i < 16; i++) html += content;
          track.innerHTML = html;
        }

        return gsap.to(track, {
          xPercent: -50,
          repeat: -1,
          ease: 'none',
          duration: 30,
        });
      });
      const skews = tracks.map((track) => gsap.quickSetter(track, 'skewX', 'deg'));
      let speed = 1;
      let skew = 0;
      let lastY = window.scrollY;
      gsap.ticker.add(() => {
        /* native scroll velocity: per-frame scrollY delta */
        const y = window.scrollY;
        const v = y - lastY;
        lastY = y;
        speed += (1 + Math.min(Math.abs(v) / 60, 2.5) - speed) * 0.1;
        skew += (gsap.utils.clamp(-6, 6, v * 0.05) - skew) * 0.1;
        loops.forEach((l) => l.timeScale(speed));
        skews.forEach((set) => set(skew));
      });
    }
  }

  /* ---------- 4. erp — roadmap line scrub + lit steps ---------- */
  const roadmap = $('#erp .roadmap');
  if (roadmap) {
    gsap.to('#erp .roadmap-line i', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: roadmap, start: 'top 75%', end: 'bottom 60%', scrub: 0.5 },
    });
    $$('.roadmap-step', roadmap).forEach((step) => {
      ST.create({ trigger: step, start: 'top 70%', end: 'max', toggleClass: 'lit' });
    });
    /* ported from app.js: steps slide in */
    gsap.from($$('.roadmap-step', roadmap), {
      opacity: 0, x: reduceMotion ? 0 : -14, duration: dur(0.6),
      stagger: reduceMotion ? 0 : 0.12, ease: 'power2.out',
      scrollTrigger: { trigger: roadmap, start: 'top 85%', once: true },
    });
  }

  /* ---------- 5a. ai — typing effect ---------- */
  const interviewQ = $('.interview-q');
  if (interviewQ && interviewQ.dataset.text) {
    const full = interviewQ.dataset.text;
    if (reduceMotion) {
      interviewQ.textContent = full;
    } else {
      interviewQ.textContent = '';
      ST.create({
        trigger: interviewQ, start: 'top 85%', once: true,
        onEnter: () => {
          const textNode = document.createTextNode('');
          const caret = document.createElement('span');
          caret.className = 'type-caret';
          interviewQ.appendChild(textNode);
          interviewQ.appendChild(caret);
          const state = { n: 0 };
          gsap.to(state, {
            n: full.length, duration: 1.8, ease: 'none',
            onUpdate: () => { textNode.nodeValue = full.slice(0, Math.round(state.n)); },
            onComplete: () => gsap.delayedCall(1, () => caret.remove()),
          });
        },
      });
    }
  }

  /* ---------- 5b. ai — waveform, only while #ai is on screen ---------- */
  const waveBars = $$('#ai .wave i');
  if (waveBars.length) {
    if (reduceMotion) {
      waveBars.forEach((bar) => gsap.set(bar, { scaleY: gsap.utils.random(0.2, 1), transformOrigin: 'bottom' }));
    } else {
      const waveTweens = waveBars.map((bar) => gsap.to(bar, {
        scaleY: 'random(0.2, 1)', transformOrigin: 'bottom',
        duration: gsap.utils.random(0.3, 0.7), ease: 'sine.inOut',
        repeat: -1, repeatRefresh: true, paused: true,
      }));
      ST.create({
        trigger: '#ai', start: 'top bottom', end: 'bottom top',
        onToggle: (self) => waveTweens.forEach((t) => (self.isActive ? t.play() : t.pause())),
      });
    }
  }

  /* ---------- 5c. ai — score bars (ported) + chip counters ---------- */
  $$('.score-chip').forEach((chip) => {
    const bar = $('.score-bar i', chip);
    const num = $('strong', chip);
    const tl = gsap.timeline({ scrollTrigger: { trigger: chip, start: 'top 85%', once: true } });
    if (bar) tl.to(bar, { scaleX: bar.dataset.value, duration: dur(1.2), ease: 'power2.out' }, 0);
    if (num) {
      const target = parseInt(num.textContent, 10) || 0;
      const state = { v: 0 };
      tl.to(state, {
        v: target, duration: dur(1.2), ease: 'power2.out',
        onUpdate: () => { num.innerText = Math.round(state.v); },
      }, 0);
    }
  });

  /* ---------- 6. custom — blueprint assembly ---------- */
  const chain = $('.custom-grid');
  if (chain) {
    const items = $$('.workflow-step', chain);
    const tl = gsap.timeline({ scrollTrigger: { trigger: chain, start: 'top 80%', once: true } });
    items.forEach((item, i) => {
      const at = reduceMotion ? 0 : i * 0.12;
      tl.from(item, { y: reduceMotion ? 0 : 28, opacity: 0, duration: dur(0.6), ease: 'power2.out' }, at);
    });
    tl.from($$('.step-indicator em', chain), {
      scale: 0, duration: dur(0.35),
      stagger: reduceMotion ? 0 : 0.06, ease: 'back.out(2)'
    }, reduceMotion ? 0 : 0.3);
  }

  /* ---------- 7. why — stat counters ---------- */
  $$('.stat-strip strong[data-count]').forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const pad = Number(el.dataset.pad) || 0;
    const state = { v: 0 };
    gsap.to(state, {
      v: target, duration: dur(1.4), ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => { el.innerText = prefix + String(Math.round(state.v)).padStart(pad, '0') + suffix; },
    });
  });

  /* ---------- 8. feature visuals — subtle parallax ---------- */
  if (!reduceMotion) {
    $$('.feature-visual').forEach((visual) => {
      gsap.fromTo(visual, { y: -30 }, {
        y: 30, ease: 'none',
        scrollTrigger: {
          trigger: visual.closest('.feature-row') || visual,
          start: 'top bottom', end: 'bottom top', scrub: true,
        },
      });
    });
  }

  /* ---------- 9. body color morph — per-section --bg crossfade ----------
     All values share the exact oklch(L% C H) shape, so GSAP interpolates the
     three numbers of the proxy string; onUpdate writes the var each frame. */
  {
    const BG_DEFAULT = 'oklch(98.2% 0.005 260)'; /* matches :root --bg in style.css */
    const bg = { c: BG_DEFAULT };
    let bgTween = null;
    const morph = (c) => {
      if (bgTween) bgTween.kill();
      bgTween = gsap.to(bg, {
        c, duration: dur(0.8), ease: 'power2.inOut',
        onUpdate: () => document.documentElement.style.setProperty('--bg', bg.c),
      });
    };
    [
      ['.flow', BG_DEFAULT],               /* restores default scrolling back up past #erp */
      ['#erp', 'oklch(96.2% 0.018 258)'],  /* soft azure */
      ['#ai', 'oklch(14.5% 0.025 260)'],   /* cosmic obsidian dark */
      ['#custom', 'oklch(96.8% 0.022 65)'], /* radiant warm amber */
      ['#why', BG_DEFAULT],
    ].forEach(([sel, color]) => {
      const el = $(sel);
      if (!el) return;
      ST.create({
        trigger: el, start: 'top 55%', end: 'bottom 55%',
        onEnter: () => morph(color),
        onEnterBack: () => morph(color),
      });
    });
  }

  /* ---------- 10. footer reveal — content lifts off the fixed dark footer ----------
     Layout, not motion: kept under reduced motion. CSS pins footer.dark under
     .page-lift; --footer-h gives the page the space to scroll past it. */
  const footer = $('.footer.dark');
  if (footer) {
    const setFooterH = () => {
      document.documentElement.style.setProperty('--footer-h', footer.offsetHeight + 'px');
      ST.refresh();
    };
    setFooterH();
    let footerT;
    window.addEventListener('resize', () => {
      clearTimeout(footerT);
      footerT = setTimeout(setFooterH, 200);
    });
    document.fonts.ready.then(setFooterH);
  }
}
