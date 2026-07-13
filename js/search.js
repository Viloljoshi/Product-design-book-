/* Problem search: type what's going wrong, get the chapter that answers it.
   Basic: substring/prefix match on titles + concepts.
   Advanced: weighted multi-field scoring, problem-phrase synonyms,
   mind:N filter, keyboard-first (⌘K / "/" · ↑↓ · Enter · Esc). */
(async () => {
  const V = '?v=12';
  const $ = (s, r = document) => r.querySelector(s);

  let docs = null;
  const load = async () => {
    if (docs) return docs;
    const [book, quiz, quick, notes] = await Promise.all([
      fetch('data/chapters.json' + V).then((r) => r.json()),
      fetch('data/quiz.json' + V).then((r) => r.json()),
      fetch('data/quick.json' + V).then((r) => r.json()).catch(() => []),
      fetch('data/notes.json' + V).then((r) => r.json()).catch(() => []),
    ]);
    const q = Object.fromEntries(quiz.map((x) => [x.n, x]));
    const k = Object.fromEntries(quick.map((x) => [x.n, x]));
    const nt = Object.fromEntries(notes.map((x) => [x.n, x]));
    docs = book.chapters.map((c) => ({
      n: c.n, part: c.part, title: c.title,
      concept: q[c.n]?.concept || (c.n === 0 ? 'Design = psychology' : ''),
      tldr: c.tldr || '', scenario: q[c.n]?.scenario || '', take: k[c.n]?.take || '',
      when: (nt[c.n]?.when || []).join(' · '), flags: (nt[c.n]?.flags || []).join(' '),
      question: nt[c.n]?.question || '',
    }));
    return docs;
  };

  /* problem-phrase → chapter boosts */
  const SYN = [
    [/churn|quit|leav|abandon|drop.?off|stop(ped)? (using|trying)/, [30, 22, 21]],
    [/ignor|banner|announce|attention|notice|blind/, [29]],
    [/redesign|backlash|hate.*new|angry.*update|revolt/, [25, 33]],
    [/onboard|first.?run|activation|signup|sign.?up/, [22, 19, 15]],
    [/boss|ceo|vp|exec|hippo|leadership|stakeholder/, [31, 32]],
    [/meeting|committee|consensus|groupthink/, [32]],
    [/metric|kpi|dashboard|number|goodhart|engagement/, [34]],
    [/roadmap|plan|commit/, [35, 33]],
    [/sunk|ship.*broken|too far|already (spent|built)/, [36, 35]],
    [/forget|remember|recall|memory/, [17, 37]],
    [/too many|options|complex|clutter|feature.?(creep|fatigue)|settings/, [28, 15]],
    [/click|button|tap|afford|flat|discover/, [13]],
    [/intuitive|familiar|convention|pattern|learn/, [14, 16]],
    [/trust|first impression|credib|professional|vibe|ugly/, [11, 24]],
    [/default|pre.?select|framing|nudge|steer/, [12, 40]],
    [/culture|international|global|localiz|translat|market/, [26]],
    [/habit|switch|competitor|incumbent|migrat/, [27, 25]],
    [/interview|survey|research|said they|lying|validate/, [23, 10, 39]],
    [/deadline|crunch|pressure|stress|rush/, [7]],
    [/feedback|critique|defensive|ego|criticism/, [3, 2]],
    [/taste|aesthetic|grew on/, [5]],
    [/idea|creativ|inspiration|brainstorm|blocked/, [6, 8]],
    [/first (sketch|idea|draft)|fixat|iterat/, [8]],
    [/expert|jargon|curse|beginner|newbie|technical/, [9]],
    [/assume|myself|team thinks|obvious/, [1, 4]],
    [/progress|streak|complet|gamif|motivat/, [19, 21]],
    [/layout|spacing|group|hierarchy|scan/, [20]],
    [/ending|last|checkout|cancel|offboard|peak/, [18, 40]],
    [/dark pattern|manipul|ethic|urgency|countdown|guilt/, [40, 12]],
    [/inconsist|different (screens|pages)|confus/, [16]],
    [/wrong problem|brief|framing|solve/, [38]],
    [/error|fail|helpless|gave up|stuck/, [30]],
    [/waiting|later|delay|value|impatien/, [22]],
  ];

  const score = (d, tokens, raw) => {
    let s = 0;
    for (const [re, ns] of SYN) if (re.test(raw) && ns.includes(d.n)) s += 30 - ns.indexOf(d.n) * 6;
    for (const t of tokens) {
      if (!t) continue;
      const T = (f, w) => { const v = d[f].toLowerCase(); if (v.includes(t)) s += w * (v.split(t).length - 1 > 1 ? 1.3 : 1); };
      T('title', 14); T('concept', 12); T('tldr', 5); T('scenario', 6);
      T('take', 4); T('when', 5); T('flags', 4); T('question', 3);
      if (d.title.toLowerCase().startsWith(t)) s += 8;
      if (d.concept.toLowerCase().startsWith(t)) s += 8;
    }
    return s;
  };

  const hl = (text, tokens, max = 150) => {
    let t = text.length > max ? text.slice(0, max).replace(/\s\S*$/, '') + '…' : text;
    for (const tok of tokens) {
      if (tok.length < 3) continue;
      t = t.replace(new RegExp(`(${tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>');
    }
    return t;
  };

  /* ── UI ── */
  document.body.insertAdjacentHTML('beforeend', `
    <div id="cmdk" hidden role="dialog" aria-modal="true" aria-label="Search the book">
      <div class="cmdk-scrim"></div>
      <div class="cmdk-panel">
        <div class="cmdk-bar">
          <span class="cmdk-glyph">⌕</span>
          <input id="cmdk-input" type="text" autocomplete="off" spellcheck="false"
            placeholder="Describe the problem… “users hate the redesign”, “boss overrides research”" />
          <kbd>esc</kbd>
        </div>
        <div class="cmdk-results" id="cmdk-results" role="listbox"></div>
        <div class="cmdk-foot">
          <span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> open chapter</span>
          <span class="cmdk-adv">advanced: <code>mind:1–4</code> filters a mind · try symptoms, not titles</span>
        </div>
      </div>
    </div>`);

  const wrap = $('#cmdk'), input = $('#cmdk-input'), list = $('#cmdk-results');
  let items = [], active = 0;

  const open = () => { wrap.hidden = false; requestAnimationFrame(() => { wrap.classList.add('on'); input.focus(); input.select(); }); load().then(() => render(input.value)); };
  const close = () => { wrap.classList.remove('on'); setTimeout(() => { wrap.hidden = true; }, 180); };

  const render = (qraw) => {
    const raw = qraw.toLowerCase().trim();
    let mind = 0;
    const cleaned = raw.replace(/mind:([1-4])/g, (_, m) => { mind = +m; return ' '; }).trim();
    const tokens = cleaned.split(/\s+/).filter((t) => t.length > 1);
    let pool = docs || [];
    if (mind) pool = pool.filter((d) => d.part === mind);
    if (!cleaned) {
      items = pool.slice(0, 8);
    } else {
      items = pool.map((d) => [score(d, tokens, cleaned), d]).filter(([s]) => s > 0)
        .sort((a, b) => b[0] - a[0]).slice(0, 8).map(([, d]) => d);
    }
    active = 0;
    list.innerHTML = items.length ? items.map((d, i) => `
      <a class="cmdk-item ${i === 0 ? 'active' : ''}" role="option" href="chapter.html?c=${d.n}" data-i="${i}">
        <span class="ci-num p${d.part || 1}">${String(d.n).padStart(2, '0')}</span>
        <span class="ci-main">
          <span class="ci-title">${hl(d.title, tokens, 60)} <em>${d.concept}</em></span>
          <span class="ci-answer">${hl(cleaned ? (d.take || d.tldr) : d.tldr, tokens)}</span>
        </span>
        <span class="ci-go">↵</span>
      </a>`).join('')
      : `<div class="cmdk-empty">Nothing matches that yet. Try describing the symptom: <br><b>“users say yes but never pay”</b> · <b>“everything shipped late and broken”</b></div>`;
  };

  const move = (d) => {
    if (!items.length) return;
    active = (active + d + items.length) % items.length;
    list.querySelectorAll('.cmdk-item').forEach((el, i) => el.classList.toggle('active', i === active));
    list.querySelectorAll('.cmdk-item')[active]?.scrollIntoView({ block: 'nearest' });
  };

  input.addEventListener('input', () => render(input.value));
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); const el = list.querySelectorAll('.cmdk-item')[active]; if (el) location.href = el.href; }
  });
  wrap.querySelector('.cmdk-scrim').addEventListener('click', close);
  list.addEventListener('mousemove', (e) => { const it = e.target.closest('.cmdk-item'); if (it) { active = +it.dataset.i; list.querySelectorAll('.cmdk-item').forEach((el, i) => el.classList.toggle('active', i === active)); } });

  addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); wrap.hidden ? open() : close(); }
    else if (e.key === '/' && wrap.hidden && !e.target.closest('input, textarea, [contenteditable]')) { e.preventDefault(); open(); }
  });

  /* nav trigger (both pages) */
  const nav = $('#topnav');
  if (nav) {
    const btn = document.createElement('button');
    btn.id = 'search-btn';
    btn.type = 'button';
    btn.innerHTML = '<span class="sb-glyph">⌕</span><span class="sb-text">Search a problem</span><kbd>⌘K</kbd>';
    btn.addEventListener('click', open);
    const right = $('.nav-right', nav);
    (right || nav).insertBefore(btn, right ? right.firstChild : nav.children[1] || null);
  }
})();
