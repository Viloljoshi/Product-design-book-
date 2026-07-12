# Product Design Psychology · Interactive Learning Edition

An animated, gamified learning experience for *Product Design Psychology* by Wouter de Bres —
41 chapters and 293 research sources across four minds: the Designer's, the Design's, the User's, and the Organization's.

**Apple-keynote-style scroll film · 3D research vault · XP, levels, streaks & badges · recall quizzes · Bias Match arena**

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
| `index.html` | Sharp autoplaying cinematic hero video (seamless 1600x900 boomerang loop, GPU-composited), library of all 41 chapters, 3D Research Vault, Bias Match game |
| `chapter.html?c=N` | Chapter reader with animated hero, TL;DR card, pull quotes, 3D tilt/flip research-paper cards linking to every original study, and a scenario recall quiz |
| `js/gamify.js` | XP, five levels (Curious Mind → Mind Reader), daily streaks, part-completion badges · persisted in `localStorage` |
| `js/hero.js` | Autoplay video hero + immediate header reveal, scroll-keyed beats, parallax |
| `data/chapters.json` | Full book parsed chapter-wise: sections, quotes, references with URLs |
| `data/quiz.json` | 40 psychology concepts + real-world product scenarios |

## Learning loop

1. **Read** a chapter (+25 XP at 86% scroll depth)
2. **Flip** the research cards and open the original papers (+5 XP each)
3. **Prove it** in the end-of-chapter scenario quiz (+25 XP first try)
4. **Retain it** in the Bias Match arena (+5 XP per pair)
5. Finish all ten chapters of a mind → **badge**

Media generated with Higgsfield (Kling 3.0 Turbo video → WebP frame film; Nano Banana part dividers). Illustrations from the original book.
