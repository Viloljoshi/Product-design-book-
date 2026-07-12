/* Chapter reader: render, 3D research cards, recall quiz, read tracking */
(async () => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const n = Math.max(0, parseInt(new URLSearchParams(location.search).get('c') || '0', 10));

  const [book, quiz] = await Promise.all([
    fetch('data/chapters.json').then((r) => r.json()),
    fetch('data/quiz.json').then((r) => r.json()),
  ]);
  const ch = book.chapters.find((c) => c.n === n) || book.chapters[0];
  const q = quiz.find((x) => x.n === ch.n);
  const part = book.parts.find((p) => p.id === ch.part);

  /* accent = part color */
  const ACC = { 0: 'p1', 1: 'p1', 2: 'p2', 3: 'p3', 4: 'p4' }[ch.part] || 'p1';
  const rs = document.documentElement.style;
  rs.setProperty('--accent', `var(--${ACC})`);
  rs.setProperty('--accent-glow', `var(--${ACC}-glow)`);
  rs.setProperty('--accent-soft', `var(--${ACC}-soft)`);

  document.title = `${ch.title} — Product Design Psychology`;
  $('#ch-pos').textContent = ch.n === 0 ? 'Introduction' : `Chapter ${String(ch.n).padStart(2, '0')} / 40`;
  const updateXp = () => { $('#ch-xp').textContent = `✦ ${Gamify.state.xp} XP · ${Gamify.level().name}`; };
  updateXp();
  document.addEventListener('pdp:xp', updateXp);

  /* words → read time */
  const words = ch.sections.flatMap((s) => s.ps).reduce((a, p) => a + (p.html || (p.items || []).join(' ') || '').split(' ').length, 0);
  const mins = Math.max(3, Math.round(words / 220));

  /* ── render ── */
  const art = ch.image ? `assets/art/${ch.image.replace('.png', '.webp')}` : 'assets/art/cover.webp';
  const titleWords = ch.title.split(' ').map((w, i) =>
    `<span class="wd" style="animation-delay:${120 + i * 90}ms">${w}</span>`).join(' ');

  let body = '';
  for (const sec of ch.sections) {
    if (sec.h) body += `<h2 class="rv">${sec.h}</h2>`;
    for (const p of sec.ps) {
      if (p.t === 'quote') body += `<blockquote class="ch-quote rv"><p>${p.html}</p>${p.cite ? `<cite>${p.cite}</cite>` : ''}</blockquote>`;
      else if (p.t === 'list') body += `<ul class="rv">${p.items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
      else body += `<p class="rv">${p.html}</p>`;
    }
  }

  $('#chapter-root').innerHTML = `
    <header class="ch-hero">
      <div class="ch-hero-art"><img src="${art}" alt="${ch.title} illustration" fetchpriority="high"></div>
      <div class="ch-hero-copy">
        <div class="ch-kicker">
          ${part ? `<span class="ch-part-chip">Mind ${'I'.repeat(part.id)} · ${part.title}</span>` : '<span class="ch-part-chip">Preface</span>'}
          <span class="ch-num">${ch.n === 0 ? '00' : String(ch.n).padStart(2, '0')}</span>
        </div>
        <h1>${titleWords}</h1>
        ${ch.subtitle ? `<p class="ch-sub">${ch.subtitle}</p>` : ''}
        <div class="ch-meta">
          <span>${mins} min read</span>
          <span>${ch.refs.length} sources</span>
          ${q ? `<span>Concept · ${q.concept}</span>` : ''}
          ${Gamify.isRead(ch.n) ? '<span style="color:var(--p2)">✓ read</span>' : ''}
        </div>
      </div>
    </header>
    ${ch.tldr ? `<div class="tldr"><div class="tldr-card glass"><b>TL;DR</b><p>${ch.tldr}</p></div></div>` : ''}
    <div class="ch-body">${body}</div>`;

  /* reveal */
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.08 });
  $$('.rv').forEach((el) => io.observe(el));

  /* ── research cards ── */
  if (ch.refs.length) {
    $('#research').hidden = false;
    $('#res-grid').innerHTML = ch.refs.map((r, i) => `
      <div class="pcard rv" tabindex="0" role="button" aria-label="Research: ${r.title}">
        <div class="pcard-face pcard-front">
          <span class="pc-year">${r.year || '—'}</span>
          <p class="pc-title">${r.title}</p>
          <span class="pc-flip">Tap to flip ⟲</span>
        </div>
        <div class="pcard-face pcard-back">
          <p class="pc-venue">${r.venue || 'Original source'}</p>
          <span class="pc-opened" data-o="${i}">${Gamify.state.papers[r.url] ? '✓ opened' : ''}</span>
          ${r.url ? `<a class="pc-open" href="${r.url}" target="_blank" rel="noopener" data-url="${r.url}" data-o="${i}">Read the paper ↗</a>` : ''}
        </div>
      </div>`).join('');
    $$('.pcard', $('#res-grid')).forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        if (card.classList.contains('flipped')) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 12}deg) translateZ(12px)`;
      });
      card.addEventListener('mouseleave', () => { if (!card.classList.contains('flipped')) card.style.transform = ''; });
      card.addEventListener('click', (e) => {
        const open = e.target.closest('.pc-open');
        if (open) { Gamify.paperOpened(open.dataset.url); $(`[data-o="${open.dataset.o}"].pc-opened`, card).textContent = '✓ opened'; return; }
        card.classList.toggle('flipped'); card.style.transform = '';
      });
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('flipped'); } });
    });
    io.observe($('#research'));
  }

  /* ── quiz ── */
  if (q) {
    $('#quiz').hidden = false;
    $('#quiz-scenario').textContent = `“${q.scenario}”`;
    const others = quiz.filter((x) => x.n !== q.n).sort(() => Math.random() - 0.5).slice(0, 3).map((x) => x.concept);
    const opts = [q.concept, ...others].sort(() => Math.random() - 0.5);
    let tries = 0, done = Gamify.quizDone(ch.n);
    const resEl = $('#quiz-result');
    if (done) resEl.textContent = 'Concept already mastered ★ — replaying is free recall practice.';
    $('#quiz-opts').innerHTML = opts.map((o) => `<button class="quiz-opt">${o}</button>`).join('');
    $$('.quiz-opt').forEach((btn) => btn.addEventListener('click', () => {
      if (btn.textContent === q.concept) {
        $$('.quiz-opt').forEach((b) => { b.disabled = true; });
        btn.classList.add('correct');
        if (!done) { Gamify.quizResult(ch.n, tries === 0); done = true; }
        resEl.textContent = tries === 0 ? 'First try. That concept is yours now.' : 'Got there — the misses are how it sticks.';
      } else {
        tries++; btn.classList.add('wrong'); btn.disabled = true;
        resEl.textContent = 'Not that one — feel the difference, then try again.';
      }
    }));
  }

  /* ── next chapter ── */
  const next = book.chapters.find((c) => c.n === ch.n + 1);
  if (next) {
    $('#next-nav').hidden = false;
    $('#next-link').href = `chapter.html?c=${next.n}`;
    $('#next-title').textContent = `${String(next.n).padStart(2, '0')} · ${next.title}`;
  } else {
    $('#next-nav').hidden = false;
    $('#next-link').href = 'index.html#arena';
    $('#next-title').textContent = 'You finished the book — enter the Recall Arena';
  }

  /* ── read progress + completion ── */
  const fill = $('#read-fill');
  let marked = Gamify.isRead(ch.n);
  addEventListener('scroll', () => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight);
    fill.style.width = `${p * 100}%`;
    if (!marked && p > 0.86) {
      marked = true;
      Gamify.markRead(ch.n);
      if (part) Gamify.checkPartBadge(part.id, part.chapters, part.title);
    }
  }, { passive: true });
})();
