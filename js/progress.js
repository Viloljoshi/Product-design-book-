/* Reading progress: which chapters you've opened. No points, no levels,
   no streaks, no rewards — just a bookmark so the library can show what
   you've already read. */
const Progress = (() => {
  const KEY = 'pdp_read_v1';
  let read;
  try { read = JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { read = {}; }

  const save = () => localStorage.setItem(KEY, JSON.stringify(read));

  return {
    isRead: (n) => !!read[n],
    markRead(n) {
      if (read[n]) return;
      read[n] = 1;
      save();
      document.dispatchEvent(new CustomEvent('pdp:progress'));
    },
    readCount: () => Object.keys(read).length,
  };
})();
