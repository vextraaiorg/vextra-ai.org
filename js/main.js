/* Vextra AI — module entry point: Lenis, preloader, hero intro, text reveals,
   scroll progress, cursor, nav, magnetics, form. Hero/contact 3D and section
   choreography live in sibling modules. */
import { initHero, initContactField } from './hero3d.js';
import { initSections } from './sections.js';
import { initGallery } from './gallery.js';

/* cinematic entry: always start at top — preloader + hero dive assume it,
   and browser scroll restoration mid-pin lands on a half-played timeline */
history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* GSAP writes inline transforms via rAF — the CSS transition-duration:0.01ms
   reduced-motion shim never touches it. Every gsap call below routes its
   duration through this so transform-based motion collapses to imperceptible
   under reduced motion instead of silently ignoring the OS setting. */
const dur = (s) => (reduceMotion ? 0.01 : s);

gsap.registerPlugin(ScrollTrigger);

/* ---------------- scroll: NATIVE ----------------
   Lenis removed deliberately: its lerp smoothing adds input latency by design
   and its rAF loop costs frame budget — users read both as "laggy scroll".
   Native scroll = zero input delay on every machine; the cinematic feel comes
   from ScrollTrigger scrubs, not from hijacking the scrollbar.
   Anchor offset for the fixed nav is CSS (scroll-padding-top). */
const lenis = null;

/* ---------------- nav + burger + mobile menu ---------------- */
function initNav() {
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
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
    burger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }));

  /* smooth scroll to absolute top (y = 0) when clicking brand logo or #top links */
  document.querySelectorAll('a[href="#top"], .brand').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.location.hash !== '#top') {
        history.pushState(null, '', '#top');
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  });
}

/* ---------------- cursor dot + ring ---------------- */
function initCursor() {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const dotX = gsap.quickTo(dot, 'x', { duration: dur(0.5), ease: 'power3' });
  const dotY = gsap.quickTo(dot, 'y', { duration: dur(0.5), ease: 'power3' });
  const ringX = gsap.quickTo(ring, 'x', { duration: dur(0.45), ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: dur(0.45), ease: 'power3' });

  window.addEventListener('mousemove', (e) => {
    dot.classList.add('active');
    ring.classList.add('active');
    dotX(e.clientX);
    dotY(e.clientY);
    ringX(e.clientX);
    ringY(e.clientY);
  });

  document.addEventListener('mouseover', (e) => {
    ring.classList.toggle('is-link', !!e.target.closest('a, button, .module-card'));
  });
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) ring.classList.remove('is-link'); // pointer left the window
  });
}

/* ---------------- magnetic buttons + press feedback ---------------- */
function initMagnetics() {
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
    /* press state-confirmation: ~100ms in, ~150ms settle */
    btn.addEventListener('mousedown', () => gsap.to(btn, { scale: 0.96, duration: dur(0.1), ease: 'power2.out' }));
    btn.addEventListener('mouseup', () => gsap.to(btn, { scale: 1, duration: dur(0.15), ease: 'power2.out' }));
    btn.addEventListener('mouseleave', () => gsap.to(btn, { scale: 1, duration: dur(0.15), ease: 'power2.out' }));
  });
}

/* ---------------- contact form (client-side only, no backend) ---------------- */
function initForm() {
  const form = document.querySelector('.form');
  if (!form) return;
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

/* ---------------- scroll progress ---------------- */
function initScrollProgress() {
  /* scrub maps directly to scroll position — state, not decoration, so kept under reduced motion */
  gsap.to('.scroll-progress', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  });
}

/* ---------------- text reveals (per-line mask) ---------------- */
function initTextReveals() {
  if (reduceMotion) return; // CSS neutralizes .st-line under reduced motion
  document.querySelectorAll('.section-head h2, .feature-copy h3, .contact-info h2').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);

    /* pass 1: word spans, measured to find natural line breaks */
    el.textContent = '';
    const spans = words.map((w) => {
      const s = document.createElement('span');
      s.textContent = w;
      s.style.display = 'inline-block';
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
      return s;
    });
    const lines = [];
    let top = null;
    spans.forEach((s) => {
      if (s.offsetTop !== top) { top = s.offsetTop; lines.push([]); }
      lines[lines.length - 1].push(s.textContent);
    });

    /* pass 2: rebuild as .st-line > span (inner span starts translateY(110%) via CSS) */
    el.textContent = '';
    const inners = lines.map((lineWords) => {
      const line = document.createElement('span');
      line.className = 'st-line';
      const inner = document.createElement('span');
      inner.textContent = lineWords.join(' ');
      line.appendChild(inner);
      el.appendChild(line);
      return inner;
    });

    gsap.to(inners, {
      y: 0, duration: 0.9, ease: 'power4.out', stagger: 0.09,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onComplete: () => el.classList.add('st-done'),
    });
  });
}

/* ---------------- hero intro (deferred until the preloader curtain lifts) ---------------- */
function playHeroIntro() {
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTl
    .to('.hero-badge', { opacity: 1, y: 0, duration: dur(0.7) }, reduceMotion ? 0 : 0.1)
    .to('.hero-word', { opacity: 1, y: 0, filter: 'blur(0px)', duration: dur(0.8), stagger: reduceMotion ? 0 : 0.06 }, reduceMotion ? 0 : 0.25)
    .to('.hero-sub', { opacity: 1, y: 0, duration: dur(0.7) }, reduceMotion ? 0 : 0.55)
    .to('.hero-actions', { opacity: 1, y: 0, duration: dur(0.7) }, reduceMotion ? 0 : 0.68)
    .to('.hero-meta', { opacity: 1, y: 0, duration: dur(0.7) }, reduceMotion ? 0 : 0.8);
}

/* ---------------- preloader ---------------- */
function initPreloader() {
  const preloader = document.querySelector('.preloader');
  if (reduceMotion || !preloader) {
    /* CSS already hides the preloader under reduced motion — go straight to init */
    /* some browsers re-apply scroll restoration after module scripts run — force top again */
    if (lenis) lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0);
    playHeroIntro();
    ScrollTrigger.refresh();
    return;
  }

  /* no scrolling while the curtain is up. Chrome re-applies scroll restoration
     asynchronously (~60-320ms in, and again as pin spacers grow the page), so a
     one-shot scrollTo(0,0) loses the race — pin the scroll to top every frame
     until the curtain lifts. */
  if (lenis) lenis.stop();
  document.body.style.overflow = 'hidden';
  const pinTop = () => { if (window.scrollY) window.scrollTo(0, 0); };
  gsap.ticker.add(pinTop);

  const countEl = preloader.querySelector('.preloader-count');
  const bar = preloader.querySelector('.preloader-bar i');
  const letters = preloader.querySelectorAll('.preloader-word .pl-l > span');
  const tag = preloader.querySelector('.preloader-tag');
  const mark = preloader.querySelector('.preloader-mark');
  const counter = { v: 0 };

  /* entrance: mark draws, dots pop, VEXTRA AI letters rise out of their masks */
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .to(mark.querySelector('.pl-path'), { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0)
    .to(mark.querySelectorAll('.pl-dot'), { scale: 1, duration: 0.5, stagger: 0.12, ease: 'back.out(2.5)' }, 0.35)
    .to(letters, { y: 0, duration: 0.9, stagger: 0.055, ease: 'power4.out' }, 0.25)
    .to(tag, { opacity: 1, duration: 0.6 }, 0.95);

  const countTween = gsap.to(counter, {
    v: 100, duration: 2.1, ease: 'power2.inOut',
    onUpdate: () => {
      countEl.textContent = String(Math.round(counter.v)).padStart(3, '0');
      gsap.set(bar, { scaleX: counter.v / 100 });
    },
  });

  const loaded = new Promise((res) => {
    if (document.readyState === 'complete') res();
    else window.addEventListener('load', res, { once: true });
  });

  /* GSAP tweens are thenable — completion gated on both the counter and window load */
  Promise.all([countTween, loaded]).then(() => {
    gsap.timeline()
      /* letters sink back into their masks, chrome fades, curtain lifts into the hero */
      .to(letters, { y: '-115%', duration: 0.55, stagger: 0.035, ease: 'power3.in' })
      .to([mark, tag, countEl, bar], { opacity: 0, duration: 0.3, ease: 'power2.out' }, '<0.15')
      .to(preloader, { yPercent: -100, duration: 0.85, ease: 'power4.inOut' }, '>-0.05')
      .set(preloader, { display: 'none' })
      .call(() => {
        preloader.classList.add('done');
        gsap.ticker.remove(pinTop);
        document.body.style.overflow = '';
        window.scrollTo(0, 0);
        playHeroIntro();
        ScrollTrigger.refresh();
      });
  });
}

/* ---------------- init ---------------- */
initCursor();
initNav();
initForm();
initMagnetics();
initScrollProgress();
/* split after webfonts settle so line grouping matches final layout (once-only reveals, no re-split) */
document.fonts.ready.then(initTextReveals);

try { initHero({ reduceMotion }); } catch (err) { console.error('hero3d initHero failed:', err); }
try { initSections({ reduceMotion }); } catch (err) { console.error('sections initSections failed:', err); }
try { initGallery({ reduceMotion }); } catch (err) { console.error('gallery initGallery failed:', err); }
try { initContactField({ reduceMotion }); } catch (err) { console.error('hero3d initContactField failed:', err); }

initPreloader();
