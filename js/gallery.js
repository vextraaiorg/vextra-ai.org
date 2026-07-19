/* Vextra AI — cinematic pinned horizontal chapter gallery (#modules).
   Desktop: pins .chapters and scrubs .chapters-track -66.666% across three
   panels, with per-panel parallax art/numerals and staggered copy reveals.
   Mobile <900px: stacked layout (css/gallery.css) + simple fade-up reveals.
   Reduced motion: stacked, static, fully visible — no tweens at all.
   Assumes main.js already ran gsap.registerPlugin(ScrollTrigger). */

export function initGallery({ reduceMotion }) {
  const section = document.querySelector('.chapters');
  const track = section && section.querySelector('.chapters-track');
  if (!track) return;

  // Defensive: CSS hides nothing, so if GSAP/ScrollTrigger failed to load the
  // section already renders static and visible — just bail.
  if (!window.gsap || !window.ScrollTrigger) return;

  // Reduced motion: css/gallery.css stacks the chapters and everything is
  // visible. ponytail: instant visibility beats a decorative fade tween.
  if (reduceMotion) return;

  const chapters = gsap.utils.toArray('.chapter', track);
  const n = chapters.length;
  if (n < 2) return;

  const mm = gsap.matchMedia();

  // ---- mobile: stacked chapters, one fade-up per chapter ----
  mm.add('(max-width: 899px)', () => {
    chapters.forEach((ch) => {
      const inner = ch.querySelector('.chapter-inner');
      if (!inner) return;
      gsap.from(inner, {
        autoAlpha: 0,
        y: 28,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: { trigger: ch, start: 'top 80%', once: true },
      });
    });
  });

  // ---- desktop: pinned horizontal scrub ----
  mm.add('(min-width: 900px)', () => {
    // Parallax setters built once — no per-frame allocations.
    const setArt = [];
    const setNum = [];
    const depths = [];
    chapters.forEach((ch, i) => {
      const art = ch.querySelector('.chapter-art');
      const num = ch.querySelector('.chapter-num');
      setArt[i] = art ? gsap.quickSetter(art, 'x', 'px') : null;
      setNum[i] = num ? gsap.quickSetter(num, 'x', 'px') : null;
      depths[i] = art ? parseFloat(art.dataset.depth) || 0.25 : 0;
    });

    const fill = section.querySelector('.chapters-progress i');
    const setFill = fill ? gsap.quickSetter(fill, 'scaleX') : null;

    let panelW = window.innerWidth; // re-read in onRefresh after resizes

    // Local progress li runs -1 → 1 as panel i crosses the viewport: the art
    // lags the track by depth * panel width, the numeral drifts at 0.1.
    function applyParallax(p) {
      const t = p * (n - 1);
      for (let i = 0; i < n; i++) {
        const li = t - i;
        if (setArt[i]) setArt[i](depths[i] * panelW * li);
        if (setNum[i]) setNum[i](0.1 * panelW * li);
      }
    }

    const snapPoints = chapters.map((_, i) => i / (n - 1)); // [0, 0.5, 1]

    const scrub = gsap.to(track, {
      xPercent: (-100 * (n - 1)) / n, // -66.666 for 3 panels
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=1600', /* 800px per panel transition — long pins read as dead scroll */
        pin: true,
        scrub: 0.5,
        anticipatePin: 1,
        /* snap removed: it yanked the scrollbar to fixed points — read as "frame
           type" stepped scrolling. Free scrub feels direct and user-controlled. */
        onRefresh(self) {
          panelW = window.innerWidth;
          applyParallax(self.progress);
        },
        onUpdate(self) {
          if (setFill) setFill(self.progress);
          applyParallax(self.progress);
        },
      },
    });

    // Copy reveals: chapter 0 as the section scrolls into view, later chapters
    // as their panel slides in (containerAnimation-driven triggers).
    chapters.forEach((ch, i) => {
      const items = ch.querySelectorAll('.chapter-inner > *');
      if (!items.length) return;
      gsap.from(items, {
        autoAlpha: 0,
        y: 30,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.09,
        scrollTrigger:
          i === 0
            ? { trigger: section, start: 'top 70%', once: true }
            : { trigger: ch, containerAnimation: scrub, start: 'left 65%', once: true },
      });
    });
  });
}
