/* Hero: scroll-scrubbed frame film, tuned for buttery smoothness.
   The three things that make a canvas scrub feel smooth vs. janky:
   (1) LINEAR scroll->frame mapping (constant frame velocity, no lurching),
   (2) EVERY frame preloaded to a GPU ImageBitmap before scrubbing goes live
       (zero decode hitches mid-scroll),
   (3) ONE cheap draw per rAF + LERP easing on top of Lenis-smoothed scroll. */
const Hero = (() => {
  const FRAME_COUNT = 200;
  const LERP = 0.16;                 // frame easing toward scroll target

  const section = document.getElementById('hero-scroll');
  const canvas = document.getElementById('hero-canvas');
  if (!section || !canvas) return { start: async (cb) => cb?.(1) };
  const ctx = canvas.getContext('2d', { alpha: false });

  const isMobile = matchMedia('(max-width: 760px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pre = isMobile ? 'm' : 'd';
  const src = (i) => `assets/frames/${pre}-${String(i).padStart(3, '0')}.webp`;

  const frames = new Array(FRAME_COUNT + 1).fill(null);
  const nearest = (i) => {
    if (frames[i]) return frames[i];
    for (let d = 1; d <= FRAME_COUNT; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  };

  /* canvas cover-fit at capped DPR (self-heals if viewport size changes) */
  const fit = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round((innerWidth || document.documentElement.clientWidth) * dpr);
    const h = Math.round((innerHeight || document.documentElement.clientHeight) * dpr);
    if (w && h && (w !== canvas.width || h !== canvas.height)) { canvas.width = w; canvas.height = h; return true; }
    return false;
  };
  fit();
  addEventListener('resize', fit);
  addEventListener('visibilitychange', fit);

  const paint = (f) => {
    if (!f) return;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / f.width, ch / f.height);
    const w = f.width * s, h = f.height * s;
    ctx.drawImage(f, (cw - w) / 2, (ch - h) / 2, w, h);
  };

  /* ── scroll-keyed overlays ── */
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
  };

  /* ── render loop: LERP the frame toward the (linear) scroll target ── */
  let cur = 0, running = false;
  const loop = () => {
    if (!canvas.width || !canvas.height) fit();   // heal zero-size (bg tab wake)
    const p = progress();
    const target = p * (FRAME_COUNT - 1);
    cur += (target - cur) * LERP;
    if (Math.abs(target - cur) < 0.02) cur = target;
    paint(nearest(Math.round(cur) + 1));
    updateOverlays(p);
    requestAnimationFrame(loop);
  };

  /* ── preload EVERYTHING, then go live (loader covers the wait) ── */
  const loadOne = (i) => new Promise((res) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (window.createImageBitmap) {
        createImageBitmap(img).then((b) => { frames[i] = b; res(); }).catch(() => { frames[i] = img; res(); });
      } else { frames[i] = img; res(); }
    };
    img.onerror = () => res();
    img.src = src(i);
  });

  const start = async (onProgress) => {
    /* load critical spread first so the first frame + a coarse timeline exist,
       reveal, then finish loading the rest — but keep scrub disabled until all
       are in so there are never decode hitches while dragging. */
    const order = [];
    for (let step = 32; step >= 1; step = Math.floor(step / 2)) {
      for (let i = 1; i <= FRAME_COUNT; i += step) if (!order.includes(i)) order.push(i);
      if (step === 1) break;
    }
    let done = 0;
    const total = order.length;
    const CONC = 8;
    for (let k = 0; k < order.length; k += CONC) {
      await Promise.all(order.slice(k, k + CONC).map((i) => loadOne(i).then(() => onProgress?.(++done / total))));
      if (!running) { paint(nearest(1)); }        // show first frame ASAP
    }
    if (!running) { running = true; if (!reduced) loop(); else { paint(nearest(1)); updateOverlays(0); addEventListener('scroll', () => { paint(nearest(Math.round(progress() * (FRAME_COUNT - 1)) + 1)); updateOverlays(progress()); }, { passive: true }); } }
    onProgress?.(1);
  };

  return { start };
})();
