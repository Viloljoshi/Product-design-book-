# Product Design Psychology · Interactive Learning Edition

An animated study companion for *Product Design Psychology* by Wouter de Bres —
41 chapters distilled into field notes across four minds: the Designer's, the Design's, the User's, and the Organization's.

**Apple-keynote-style scroll film · PM-style field notes per chapter · 3D research vault · problem-search command palette · self-check quiz**

## Run it

Any static server works:

```bash
npx http-server -p 8317
# open http://localhost:8317
```

(Or enable GitHub Pages on this repo · no build step required.)

## What's inside

| Piece | What it does |
|---|---|
| `index.html` | Sharp autoplaying cinematic hero video (seamless 2304x1296 denoised+sharpened boomerang loop, GPU-composited), library of all 41 chapters, 3D Research Vault |
| `chapter.html?c=N` | Chapter field notes (PM-style: takeaway, apply, when, red flags, the question to ask) + 3D research cards + self-check quiz + CTA to the original chapter |
| `js/search.js` | ⌘K problem-search command palette: describe a symptom, get the chapter that answers it |
| `js/progress.js` | Read/unread bookmarking only, persisted in `localStorage` — no points, levels, streaks, or badges |
| `js/hero.js` | Autoplay video hero + immediate header reveal, scroll-keyed beats, parallax |
| `data/chapters.json` | Chapter metadata + research references (full text lives on the author's site) |
| `data/notes.json` | Our own PM-style field notes per chapter (learned / apply / when / flags / question) |
| `data/quiz.json` | 40 psychology concepts + real-world product scenarios for the self-check |

## Learning loop

1. **Read** the field notes for a chapter — what to take away, how to apply it, when it applies, the red flags, the question to ask
2. **Flip** the research cards and open the original papers if you want the primary source
3. **Self-check** with the end-of-chapter scenario quiz — immediate feedback, no scoring
4. **Go deeper** via the CTA to the original chapter on productdesignpsychology.com
5. Search any problem you're facing (⌘K) to jump straight to the relevant chapter

Media generated with Higgsfield (Kling 3.0 Turbo video → WebP frame film; Nano Banana part dividers). Illustrations from the original book.
