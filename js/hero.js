/* Scroll-driven frame engine with dwell remapping (Apple-style scroll film) */
const Hero = (() => {
  const FRAME_COUNT = 160;
  const LERP = 0.09;
  const DWELL_WIDTH = 0.06;
  const DWELL_PEAK = 1.7;
  const REMAP_N = 1600;

  const section = document.getElementById('hero-scroll');
  const canvas = document.getElementById('hero-canvas');
  if (!section || !canvas) return {};
  const ctx = canvas.getContext('2d');
  const isMobile = matchMedia('(max-width: 760px)').matches;
  const prefix = isMobile ? 'm' : 'd';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const texts = [...document.querySelectorAll('.scroll-text')];
  const DWELLS = texts.map((t) => (Number(t.dataset.showAt) + Number(t.dataset.hideAt)) / 2);

  /* dwell remap lookup table */
  const lut = new Float32Array(REMAP_N + 1);
  (() => {
    let acc = 0;
    const dens = new Float32Array(REMAP_N + 1);
    for (let i = 0; i <= REMAP_N; i++) {
      const x = i / REMAP_N;
      let d = 1;
      for (const c of DWELLS) d += DWELL_PEAK * Math.exp(-((x - c) ** 2) / (2 * DWELL_WIDTH ** 2));
      dens[i] = d;
    }
    for (let i = 0; i <= REMAP_N; i++) { acc += dens[i]; lut[i] = acc; }
    for (let i = 0; i <= REMAP_N; i++) lut[i] /= acc;
  })();
  const remap = (x) => {
    /* invert cumulative curve: find effective progress for raw scroll x */
    let lo = 0, hi = REMAP_N;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (lut[mid] < x) lo = mid + 1; else hi = mid; }
    return lo / REMAP_N;
  };

  /* frame store + progressive loading */
  const frames = new Array(FRAME_COUNT + 1).fill(null);
  let loaded = 0;
  const src = (i) => `assets/frames/${prefix}-${String(i).padStart(3, '0')}.webp`;
  const loadFrame = (i) => new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      (window.createImageBitmap ? createImageBitmap(img) : Promise.resolve(img))
        .then((bmp) => { frames[i] = bmp; loaded++; res(); })
        .catch(() => { frames[i] = img; loaded++; res(); });
    };
    img.onerror = () => { loaded++; res(); };
    img.src = src(i);
  });

  const nearest = (i) => {
    if (frames[i]) return frames[i];
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  };

  /* canvas sizing (cover) */
  const fit = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  };
  fit();
  addEventListener('resize', fit);

  const paint = (f, alpha) => {
    if (!f) return;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / f.width, ch / f.height);
    const w = f.width * s, h = f.height * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(f, (cw - w) / 2, (ch - h) / 2, w, h);
  };

  /* single frame (index is 1-based) */
  const draw = (i) => { paint(nearest(i), 1); ctx.globalAlpha = 1; };

  /* sub-frame cross-fade: dissolve the next frame over the current one so
     160 discrete frames read as continuous motion */
  const drawBlend = (curFloat) => {
    const lo = Math.floor(curFloat);
    const t = curFloat - lo;
    const fLo = nearest(lo + 1);
    paint(fLo, 1);
    if (t > 0.001) {
      const fHi = nearest(lo + 2);
      if (fHi && fHi !== fLo) paint(fHi, t);
    }
    ctx.globalAlpha = 1;
  };

  const progress = () => {
    const r = section.getBoundingClientRect();
    return Math.max(0, Math.min(1, -r.top / (r.height - innerHeight)));
  };

  /* overlay text + chapter markers + tint */
  const markers = [...document.querySelectorAll('.marker')];
  const tint = document.getElementById('hero-tint');
  const TINTS = ['167,139,250', '167,139,250', '62,214,197', '251,113,133', '240,179,92', '167,139,250'];
  const updateOverlays = (p) => {
    let active = 0;
    texts.forEach((t, idx) => {
      const on = p >= +t.dataset.showAt && p <= +t.dataset.hideAt;
      t.classList.toggle('visible', on);
      if (on) active = idx;
    });
    markers.forEach((m, idx) => m.classList.toggle('active', idx === active));
    if (tint) {
      const c = TINTS[active] || TINTS[0];
      tint.style.background = `radial-gradient(ellipse at 30% 60%, rgba(${c},0.10), transparent 65%)`;
    }
  };

  /* ── gentle autoplay: after the first scroll, the film keeps playing
     itself while the pointer is idle, so a single scroll carries you
     through. Any wheel/touch/key instantly takes back control. ── */
  const AUTOPLAY_SECONDS = 15;
  let hasScrolled = false, lastInput = 0, travelPx = 1, prevT = 0;
  const measure = () => { travelPx = Math.max(1, section.offsetHeight - innerHeight); };
  measure();
  addEventListener('resize', measure);
  ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown'].forEach((ev) =>
    addEventListener(ev, () => { hasScrolled = true; lastInput = performance.now(); }, { passive: true }));

  let cur = 0, target = 0, running = false;
  const loop = (t) => {
    const now = t || performance.now();
    const dt = prevT ? Math.min(0.05, (now - prevT) / 1000) : 0;
    prevT = now;
    const raw = progress();

    /* autoplay advance while idle and still inside the hero */
    if (hasScrolled && !reduced && raw > 0 && raw < 0.995 && document.visibilityState === 'visible'
        && now - lastInput > 1400) {
      const dy = (travelPx / AUTOPLAY_SECONDS) * dt;
      if (window.__lenis) window.__lenis.scrollTo(scrollY + dy, { immediate: true, force: true });
      else scrollTo(0, scrollY + dy);
    }

    target = remap(progress()) * (FRAME_COUNT - 1);
    /* frame-rate-independent smoothing so it feels identical on 60/120Hz */
    cur += (target - cur) * LERP;
    if (Math.abs(target - cur) < 0.004) cur = target;
    drawBlend(cur);
    updateOverlays(progress());
    requestAnimationFrame(loop);
  };

  /* boot: critical frames → reveal → rest in batches */
  const start = async (onProgress) => {
    const critical = [];
    for (let i = 1; i <= FRAME_COUNT; i += 8) critical.push(i);
    if (!critical.includes(FRAME_COUNT)) critical.push(FRAME_COUNT);
    let done = 0;
    await Promise.all(critical.map((i) => loadFrame(i).then(() => onProgress?.(++done / critical.length * 0.6))));
    draw(1);
    if (!running) { running = true; if (!reduced) loop(); else { draw(1); updateOverlays(0); addEventListener('scroll', () => { draw(Math.round(remap(progress()) * (FRAME_COUNT - 1)) + 1); updateOverlays(progress()); }, { passive: true }); } }
    const rest = [];
    for (let i = 1; i <= FRAME_COUNT; i++) if (!frames[i]) rest.push(i);
    const BATCH = 12;
    for (let b = 0; b < rest.length; b += BATCH) {
      await Promise.all(rest.slice(b, b + BATCH).map(loadFrame));
      onProgress?.(0.6 + 0.4 * Math.min(1, (b + BATCH) / rest.length));
    }
    onProgress?.(1);
  };

  return { start };
})();
