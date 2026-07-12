/* Gamification engine — XP, levels, streaks, badges (localStorage) */
const Gamify = (() => {
  const KEY = 'pdp_state_v1';
  const LEVELS = [
    { xp: 0, name: 'Curious Mind' },
    { xp: 150, name: 'Observer' },
    { xp: 400, name: 'Practitioner' },
    { xp: 800, name: 'Design Psychologist' },
    { xp: 1300, name: 'Mind Reader' },
  ];
  const XP = { read: 25, quizFirst: 25, quizRetry: 10, matchPair: 5, paperOpen: 5 };

  const blank = () => ({
    xp: 0, read: {}, quiz: {}, papers: {}, matchBest: 0,
    lastDay: '', streak: 0, badges: [],
  });

  let s;
  try { s = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { s = blank(); }

  const save = () => localStorage.setItem(KEY, JSON.stringify(s));

  const touchStreak = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (s.lastDay === today) return;
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    s.streak = s.lastDay === yest ? s.streak + 1 : 1;
    s.lastDay = today;
  };

  const level = () => {
    let cur = LEVELS[0], next = null;
    for (let i = 0; i < LEVELS.length; i++) {
      if (s.xp >= LEVELS[i].xp) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; }
    }
    const base = cur.xp, cap = next ? next.xp : cur.xp || 1;
    const pct = next ? Math.min(1, (s.xp - base) / (cap - base)) : 1;
    return { name: cur.name, next, pct, index: LEVELS.indexOf(cur) };
  };

  let toastEl, toastTimer;
  const toast = (msg) => {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'xp-toast';
      toastEl.innerHTML = '<span class="orb">✦</span><span class="msg"></span>';
      document.body.appendChild(toastEl);
    }
    toastEl.querySelector('.msg').textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  };

  const award = (amount, msg) => {
    touchStreak();
    s.xp += amount;
    save();
    toast(`+${amount} XP · ${msg}`);
    document.dispatchEvent(new CustomEvent('pdp:xp', { detail: { xp: s.xp } }));
  };

  const checkPartBadge = (partId, chapterNs, partTitle) => {
    const done = chapterNs.every((n) => s.read[n]);
    const id = 'part' + partId;
    if (done && !s.badges.includes(id)) {
      s.badges.push(id); save();
      toast(`Badge unlocked · ${partTitle}`);
    }
  };

  return {
    XP, LEVELS, level, toast,
    get state() { return s; },
    markRead(n) {
      if (s.read[n]) return false;
      s.read[n] = 1; award(XP.read, 'chapter read'); return true;
    },
    isRead: (n) => !!s.read[n],
    quizResult(n, firstTry) {
      if (s.quiz[n]) return false;
      s.quiz[n] = firstTry ? 2 : 1;
      award(firstTry ? XP.quizFirst : XP.quizRetry, firstTry ? 'perfect recall' : 'concept learned');
      return true;
    },
    quizDone: (n) => !!s.quiz[n],
    paperOpened(url) {
      if (s.papers[url]) return;
      s.papers[url] = 1; award(XP.paperOpen, 'source opened');
    },
    papersCount: () => Object.keys(s.papers).length,
    matchScore(pairs) {
      award(pairs * XP.matchPair, `${pairs} pairs matched`);
      if (pairs > s.matchBest) { s.matchBest = pairs; save(); }
    },
    readCount: () => Object.keys(s.read).length,
    quizCount: () => Object.keys(s.quiz).length,
    checkPartBadge,
  };
})();
