/* Scroll-driven frame engine with dwell remapping (Apple-style scroll film) */
const Hero = (() => {
  const FRAME_COUNT = 121;
  const LERP = 0.085;
  const DWELL_WIDTH = 0.045;
  const DWELL_PEAK = 3.4;
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
  };
  fit();
  addEventListener('resize', fit);

  const draw = (i) => {
    const f = nearest(i);
    if (!f) return;
    const cw = canvas.width, ch = canvas.height;
    const fw = f.width, fh = f.height;
    const s = Math.max(cw / fw, ch / fh);
    const w = fw * s, h = fh * s;
    ctx.drawImage(f, (cw - w) / 2, (ch - h) / 2, w, h);
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

  let cur = 0, target = 0, running = false;
  const loop = () => {
    const p = remap(progress());
    target = p * (FRAME_COUNT - 1);
    cur += (target - cur) * LERP;
    if (Math.abs(target - cur) < 0.01) cur = target;
    draw(Math.round(cur) + 1);
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
