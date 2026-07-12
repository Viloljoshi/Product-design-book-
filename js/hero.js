/* Hero: real autoplaying cinematic video (GPU-decoded, seamless boomerang
   loop) with scroll-keyed text beats, chapter markers, tint + parallax.
   No canvas frame-scrubbing — the video plays itself, smoothly. */
const Hero = (() => {
  const section = document.getElementById('hero-scroll');
  const video = document.getElementById('hero-video');
  if (!section || !video) return { start: async (cb) => cb?.(1) };

  const isMobile = matchMedia('(max-width: 760px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  video.src = isMobile ? 'assets/hero-mobile.mp4' : 'assets/hero.mp4';

  const texts = [...document.querySelectorAll('.scroll-text')];
  const markers = [...document.querySelectorAll('.marker')];
  const tint = document.getElementById('hero-tint');
  const TINTS = ['167,139,250', '167,139,250', '62,214,197', '251,113,133', '240,179,92', '167,139,250'];

  const progress = () => {
    const r = section.getBoundingClientRect();
    return Math.max(0, Math.min(1, -r.top / (r.height - innerHeight)));
  };

  const updateOverlays = (p) => {
    let active = 0;
    for (let i = 0; i < texts.length; i++) {
      const t = texts[i];
      const on = p >= +t.dataset.showAt && p <= +t.dataset.hideAt;
      t.classList.toggle('visible', on);
      if (on) active = i;
    }
    markers.forEach((m, idx) => m.classList.toggle('active', idx === active));
    if (tint) {
      const c = TINTS[active] || TINTS[0];
      tint.style.background = `radial-gradient(ellipse at 30% 60%, rgba(${c},0.12), transparent 65%)`;
    }
    /* subtle parallax + slow-zoom on the video as you scroll the pinned hero */
    if (!reduced) video.style.transform = `translateZ(0) scale(${1.04 + p * 0.08}) translateY(${p * -18}px)`;
  };

  /* rAF loop only updates overlays — the video decodes itself on the GPU */
  let raf = 0;
  const loop = () => { updateOverlays(progress()); raf = requestAnimationFrame(loop); };

  const playSafely = () => {
    const pr = video.play();
    if (pr && pr.catch) pr.catch(() => {
      /* autoplay blocked: start on first interaction */
      const kick = () => { video.play().catch(() => {}); removeEventListener('pointerdown', kick); removeEventListener('scroll', kick); };
      addEventListener('pointerdown', kick, { once: true });
      addEventListener('scroll', kick, { once: true });
    });
  };

  const start = (onProgress) => new Promise((resolve) => {
    let settled = false;
    const done = () => { if (settled) return; settled = true; onProgress?.(1); resolve(); };

    updateOverlays(0);
    if (!raf) loop();
    if (reduced) { video.pause(); done(); return; }

    playSafely();
    /* progressive loader signal */
    video.addEventListener('loadedmetadata', () => onProgress?.(0.4));
    video.addEventListener('canplay', () => onProgress?.(0.75));
    video.addEventListener('canplaythrough', done, { once: true });
    /* never let the loader hang on a slow/failed video */
    setTimeout(done, 2600);
    if (video.readyState >= 3) done();
  });

  /* pause when the hero scrolls fully out of view (saves battery) */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      const vis = es[0].isIntersecting;
      if (reduced) return;
      if (vis) video.play().catch(() => {}); else video.pause();
    }, { threshold: 0.01 }).observe(section);
  }

  return { start };
})();
