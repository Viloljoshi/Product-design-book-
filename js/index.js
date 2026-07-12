/* Landing: boot, ambient, library render, research vault, bias match */
(async () => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── ambient particles ── */
  const pc = $('#particles');
  if (pc && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const px = pc.getContext('2d');
    const size = () => { pc.width = innerWidth; pc.height = innerHeight; };
    size(); addEventListener('resize', size);
    const HUES = ['245,241,234', '167,139,250', '62,214,197', '251,113,133'];
    const ps = Array.from({ length: 38 }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      r: 0.3 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.14,
      a: 0.05 + Math.random() * 0.28, c: HUES[Math.random() < 0.75 ? 0 : 1 + (Math.random() * 3 | 0)],
    }));
    (function tick() {
      px.clearRect(0, 0, pc.width, pc.height);
      for (const p of ps) {
        p.x = (p.x + p.vx + pc.width) % pc.width; p.y = (p.y + p.vy + pc.height) % pc.height;
        px.beginPath(); px.arc(p.x, p.y, p.r, 0, 7);
        px.fillStyle = `rgba(${p.c},${p.a})`; px.fill();
      }
      requestAnimationFrame(tick);
    })();
  }

  /* ── letter split ── */
  $$('#hero-scroll [data-split]').forEach((el) => {
    el.innerHTML = el.textContent.split(' ').map((w) =>
      `<span style="white-space:nowrap">${[...w].map((c) => `<span class="ch">${c}</span>`).join('')}</span>`
    ).join(' ');
    $$('.ch', el).forEach((c, i) => { c.style.transitionDelay = `${i * 26}ms`; });
  });

  /* ── data ── */
  const [book, quiz] = await Promise.all([
    fetch('data/chapters.json?v=11').then((r) => r.json()),
    fetch('data/quiz.json?v=11').then((r) => r.json()),
  ]);
  const conceptOf = Object.fromEntries(quiz.map((q) => [q.n, q.concept]));
  const scenarioOf = Object.fromEntries(quiz.map((q) => [q.n, q.scenario]));

  /* ── loader + hero boot ── */
  const fill = $('#loader-fill'), pct = $('#loader-pct'), loader = $('#loader');
  const onProg = (p) => { fill.style.width = `${(p * 100) | 0}%`; pct.textContent = `${(p * 100) | 0}%`; };
  Hero.start(onProg).then(() => {
    loader.classList.add('done');
    /* stat counters */
    $$('.stat b').forEach((b) => {
      const end = +b.dataset.count, t0 = performance.now();
      (function cnt(t) {
        const k = Math.min(1, (t - t0) / 1500), e = 1 - (1 - k) ** 3;
        b.textContent = Math.round(end * e) + (end >= 100 ? '+' : '');
        if (k < 1) requestAnimationFrame(cnt);
      })(t0);
    });
  });

  /* ── nav progress ring + level ── */
  const refreshHud = () => {
    const lv = Gamify.level();
    const ringEl = $('#nav-ring');
    ringEl.style.strokeDashoffset = 97.4 * (1 - lv.pct);
    $('#nav-level').textContent = lv.name;
    const st = Gamify.state;
    $('#lib-progress').innerHTML = `
      <span class="lvl"><b>${lv.name}</b><span class="lvl-bar"><span style="width:${lv.pct * 100}%"></span></span>${lv.next ? `${st.xp}/${lv.next.xp} XP` : `${st.xp} XP`}</span>
      <span><b>${Gamify.readCount()}</b>/41 read</span>
      <span><b>${Gamify.quizCount()}</b>/40 recalled</span>
      ${st.streak > 1 ? `<span>🔥 <b>${st.streak}</b>-day streak</span>` : ''}
      ${st.badges.map((b) => `<span class="badge-chip">${({ part1: "Designer's Mind", part2: 'Minding the Design', part3: "User's Mind", part4: "Organization's Mind" })[b]} ✓</span>`).join('')}`;
  };
  document.addEventListener('pdp:xp', refreshHud);

  /* ── library render ── */
  const root = $('#parts-root');
  const chaps = book.chapters;
  const intro = chaps.find((c) => c.n === 0);
  let html = intro ? `
    <div class="part-block rv">
      <a class="chap-card" href="chapter.html?c=0" style="max-width:560px;flex-direction:row;display:flex">
        <div class="cc-body"><span class="cc-num">PREFACE ${Gamify.isRead(0) ? '<span class="cc-state">✓</span>' : ''}</span>
        <h4>Introduction: why design <em>is</em> psychology</h4>
        <span class="cc-concept">Start here · 4 min</span></div>
      </a>
    </div>` : '';
  for (const part of book.parts) {
    const items = part.chapters.map((n) => {
      const c = chaps.find((x) => x.n === n);
      const done = Gamify.isRead(n), quizzed = Gamify.quizDone(n);
      return `<a class="chap-card rv ${done ? 'done' : ''}" href="chapter.html?c=${n}">
        <div class="cc-art"><img loading="lazy" src="assets/art/${c.image.replace('.png', '.webp')}" alt="" width="800" height="800"></div>
        <div class="cc-body">
          <span class="cc-num">CH ${String(n).padStart(2, '0')} <span class="cc-state">${done ? '✓' : ''}${quizzed ? ' ★' : ''}</span></span>
          <h4>${c.title}</h4>
          <span class="cc-concept">${conceptOf[n] || ''}</span>
        </div></a>`;
    }).join('');
    const doneCount = part.chapters.filter((n) => Gamify.isRead(n)).length;
    html += `<section class="part-block pa${part.id}" id="part${part.id}">
      <div class="part-hero rv">
        <img loading="lazy" src="assets/dividers/part${part.id}.webp" alt="" width="1200" height="670">
        <div class="ph-scrim"></div>
        <span class="ph-done">${doneCount}/${part.chapters.length} read</span>
        <div class="ph-copy">
          <span class="ph-num" style="color:var(--p${part.id})">MIND ${'I'.repeat(part.id)}</span>
          <h3>${part.title}</h3><p>${part.tag}</p>
        </div>
      </div>
      <div class="chap-grid">${items}</div></section>`;
  }
  root.innerHTML = html;
  refreshHud();

  /* ── reveal observer + scroll fallback ── */
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('in')), { threshold: 0.12 });
  $$('.rv').forEach((el) => io.observe(el));
  const revealSweep = () => {
    const vh = innerHeight || document.documentElement.clientHeight || 900;
    $$('.rv:not(.in)').forEach((el) => { if (el.getBoundingClientRect().top < vh * 1.05) el.classList.add('in'); });
  };
  addEventListener('scroll', revealSweep, { passive: true });
  setTimeout(revealSweep, 800);

  /* ── research vault: pick 1 flagship paper per chapter ── */
  const stage = $('#vault-stage');
  const papers = [];
  let total = 0;
  for (const c of chaps) {
    total += c.refs.length;
    const flag = c.refs.find((r) => r.year && r.url) || c.refs[0];
    if (flag && c.n > 0) papers.push({ ...flag, ch: c.n, chTitle: c.title, part: c.part, concept: conceptOf[c.n] });
  }
  $('#vault-count').textContent = `${total} sources across 41 chapters. Here are 40 landmark studies, one per concept.`;
  stage.innerHTML = papers.map((p, i) => `
    <div class="pcard vc${p.part}" data-i="${i}" tabindex="0" role="button" aria-label="Research card: ${p.title}">
      <div class="pcard-face pcard-front">
        <span class="pc-year">${p.year || '···'}</span>
        <p class="pc-title">${p.title}</p>
        <span class="pc-ch">Ch ${String(p.ch).padStart(2, '0')} · ${p.concept}</span>
      </div>
      <div class="pcard-face pcard-back">
        <span class="pc-tag">${p.concept}</span>
        <p class="pc-why">The study behind “${p.chTitle}.”</p>
        <p class="pc-venue">${(p.venue || '').slice(0, 140)}</p>
        <a class="pc-open" href="${p.url}" target="_blank" rel="noopener" data-url="${p.url}">Read the paper ↗</a>
      </div>
    </div>`).join('');

  /* 3D tilt + flip + drag-scroll */
  let dragging = false, moved = 0, sx = 0, sl = 0;
  stage.addEventListener('pointerdown', (e) => { dragging = true; moved = 0; sx = e.clientX; sl = stage.scrollLeft; stage.classList.add('grabbing'); });
  addEventListener('pointermove', (e) => {
    if (dragging) { const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); stage.scrollLeft = sl - dx; }
  });
  addEventListener('pointerup', () => { dragging = false; stage.classList.remove('grabbing'); });
  $$('.pcard', stage).forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      if (card.classList.contains('flipped') || dragging) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 14}deg) translateZ(14px)`;
    });
    card.addEventListener('mouseleave', () => { if (!card.classList.contains('flipped')) card.style.transform = ''; });
    card.addEventListener('click', (e) => {
      if (moved > 8) return;
      if (e.target.closest('.pc-open')) { Gamify.paperOpened(e.target.closest('.pc-open').dataset.url); return; }
      card.classList.toggle('flipped'); card.style.transform = '';
    });
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('flipped'); } });
  });

  /* ── bias match arena ── */
  const board = $('#arena-board');
  let sel = null, matched = 0, roundTotal = 0, totalMatched = 0;
  const newRound = () => {
    sel = null; matched = 0;
    const pool = [...quiz].sort(() => Math.random() - 0.5).slice(0, 6);
    roundTotal = pool.length;
    const defs = [...pool].sort(() => Math.random() - 0.5);
    board.innerHTML = `
      <div class="ab-col">${pool.map((q) => `<button class="chip" data-n="${q.n}">${q.concept}</button>`).join('')}</div>
      <div class="ab-col">${defs.map((q) => `<button class="slotcard" data-n="${q.n}">${q.scenario}</button>`).join('')}</div>`;
    $$('.chip', board).forEach((ch) => ch.addEventListener('click', () => {
      $$('.chip', board).forEach((c) => c.classList.remove('sel'));
      ch.classList.add('sel'); sel = ch;
    }));
    $$('.slotcard', board).forEach((sc) => sc.addEventListener('click', () => {
      if (!sel) { Gamify.toast('Pick a concept first'); return; }
      if (sc.dataset.n === sel.dataset.n) {
        sc.classList.add('locked'); sel.classList.add('locked'); sel.classList.remove('sel'); sel = null;
        matched++; totalMatched++;
        $('#arena-score').textContent = `${totalMatched} matched`;
        if (matched === roundTotal) {
          Gamify.matchScore(roundTotal);
          $('#arena-streak').textContent = `Round clear! +${roundTotal * Gamify.XP.matchPair} XP`;
          board.insertAdjacentHTML('beforeend', `<div class="arena-done">Beautiful. Your recall is compounding. <br><button class="btn-ghost small" onclick="document.getElementById('arena-new').click()" style="margin-top:14px">Play another round</button></div>`);
        }
      } else {
        sc.classList.add('wrong');
        setTimeout(() => sc.classList.remove('wrong'), 420);
      }
    }));
  };
  $('#arena-new').addEventListener('click', newRound);
  newRound();
})();
