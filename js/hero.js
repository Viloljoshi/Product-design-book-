/* Hero: sharp autoplaying cinematic video (GPU-composited, seamless boomerang
   loop). Smooth + automatic + never blurry. Scroll reveals the story beats and
   drives a subtle parallax/zoom. Headers reveal cleanly the instant the loader
   lifts, independent of how fast the media loads. */
const Hero = (() => {
  const section = document.getElementById('hero-scroll');
  const video = document.getElementById('hero-video');
  if (!section || !video) return { start: async (cb) => { cb?.(1); } };

  const isMobile = matchMedia('(max-width: 760px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  video.src = (isMobile ? 'assets/hero-mobile.mp4' : 'assets/hero.mp4') + '?v=12';

  const texts = [...document.querySelectorAll('.scroll-text')];
  const markers = [...document.querySelectorAll('.marker')];
  const tint = document.getElementById('hero-tint');
  const TINTS = ['167,139,250', '167,139,250', '62,214,197', '251,113,133', '240,179,92', '167,139,250'];

  let revealed = false;   // gate the hero title until the loader lifts

  const progress = () => {
    const r = section.getBoundingClientRect();
    const h = r.height - innerHeight;
    return h > 0 ? Math.max(0, Math.min(1, -r.top / h)) : 0;
  };

  const updateOverlays = (p) => {
    let active = 0;
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      let on = p >= +t.dataset.showAt && p <= +t.dataset.hideAt;
      if (i === 0 && !revealed) on = false;   // hold the hero beat until reveal
      t.classList.toggle('visible', on);
      if (on) active = i;
    }
    markers.forEach((m, idx) => m.classList.toggle('active', idx === active));
    if (tint) {
      const c = TINTS[active] || TINTS[0];
      tint.style.background = `radial-gradient(ellipse at 30% 60%, rgba(${c},0.12), transparent 65%)`;
    }
    /* translate-only parallax: never scales the video, so it stays pixel-sharp */
    if (!reduced) video.style.transform = `translateZ(0) translateY(${p * 26}px)`;
  };

  let raf = 0;
  const loop = () => { updateOverlays(progress()); raf = requestAnimationFrame(loop); };

  const playSafely = () => {
    const pr = video.play();
    if (pr && pr.catch) pr.catch(() => {
      const kick = () => { video.play().catch(() => {}); };
      addEventListener('pointerdown', kick, { once: true });
      addEventListener('scroll', kick, { once: true });
    });
  };

  const reveal = () => { revealed = true; updateOverlays(progress()); };

  const start = (onProgress) => new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return; settled = true;
      onProgress?.(1);
      reveal();               // headers cascade in exactly as the loader lifts
      resolve();
    };

    if (!raf) loop();
    if (reduced) { video.pause(); finish(); return; }

    playSafely();
    video.addEventListener('loadedmetadata', () => onProgress?.(0.5), { once: true });
    video.addEventListener('canplay', () => onProgress?.(0.85), { once: true });
    video.addEventListener('canplaythrough', finish, { once: true });
    /* reveal promptly even on slow/aborted media — never make the user wait */
    setTimeout(finish, 1400);
    if (video.readyState >= 3) finish();
  });

  /* pause when the hero is fully off-screen (battery) */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      if (reduced) return;
      es[0].isIntersecting ? video.play().catch(() => {}) : video.pause();
    }, { threshold: 0.01 }).observe(section);
  }

  return { start };
})();
