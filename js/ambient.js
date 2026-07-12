/* Shared ambience: inertial smooth scroll (Lenis) + cursor system + selection lens */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Lenis inertial scroll ── */
  if (!reduced) {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/lenis@1.1.18/dist/lenis.min.js';
    s.onload = () => {
      const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 1.25, touchMultiplier: 1.8, smoothWheel: true, syncTouch: false });
      window.__lenis = lenis;
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const el = document.querySelector(a.getAttribute('href'));
        if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -20, duration: 1.4 }); }
      });
    };
    document.head.appendChild(s);
  }

  /* ── cursor ── */
  if (!fine) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="cur-dot" aria-hidden="true"></div>
    <div id="cur-ring" aria-hidden="true"><span id="cur-label"></span></div>`);
  const dot = document.getElementById('cur-dot');
  const ring = document.getElementById('cur-ring');
  const label = document.getElementById('cur-label');

  let tx = innerWidth / 2, ty = innerHeight / 2, rx = tx, ry = ty, down = false;

  const stateFor = (t) => {
    if (t.closest('.pcard')) return { cls: 'card', text: t.closest('.pcard.flipped') ? '↗' : '⤾' };
    if (t.closest('.chap-card')) return { cls: 'card', text: '→' };
    if (t.closest('a[target="_blank"]')) return { cls: 'link', text: '↗' };
    if (t.closest('a, button')) return { cls: 'link', text: '' };
    if (t.closest('h1, h2, h3, h4, p, blockquote, li')) return { cls: 'text', text: '' };
    return { cls: '', text: '' };
  };

  addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY;
    dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%,-50%) scale(${down ? 0.55 : 1})`;
    const st = stateFor(e.target);
    ring.className = st.cls;
    label.textContent = st.text;
  }, { passive: true });
  addEventListener('mousedown', () => { down = true; ring.classList.add('down'); });
  addEventListener('mouseup', () => { down = false; ring.classList.remove('down'); });
  document.addEventListener('mouseleave', () => { dot.style.opacity = 0; ring.style.opacity = 0; });
  document.addEventListener('mouseenter', () => { dot.style.opacity = 1; ring.style.opacity = 1; });

  /* selection lens: magnify-style pulse while text is highlighted */
  document.addEventListener('selectionchange', () => {
    const sel = document.getSelection();
    const has = sel && !sel.isCollapsed && sel.toString().trim().length > 0;
    ring.classList.toggle('lens', !!has);
  });

  (function trail() {
    rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(trail);
  })();
})();
