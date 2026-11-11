# Sorting Logic: a sorting algorithm visualizer

A study tool for sorting and searching algorithms. Pick an algorithm and a
dataset, then play, pause, step forward and back, or scrub through every
comparison, swap and write. The source code panel highlights the line being
executed, and the counters show running vs total comparisons, swaps, writes,
reads and recursion depth.

The interface is in English by default, with a French toggle in the header.
Bubble sort is implemented as the reference. The other algorithms are stubs,
to be written as an exercise; see [docs/ADDING_AN_ALGORITHM.md](docs/ADDING_AN_ALGORITHM.md).

Every setting is in the URL (`?algo=bubble&n=30&preset=random&seed=42&speed=40`),
so a shared link reproduces the exact same array.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run test         # conformance + player tests (vitest)
npm run test:watch
npm run typecheck    # tsc -b (no emit)
npm run build        # typecheck + production build into dist/
npm run preview      # serve dist/ locally
npm run lint
```

Run the conformance suite for one algorithm:

```bash
npx vitest run conformance -t insertion
```

## Keyboard

| Key | Action |
|---|---|
| Space | play / pause |
| ← / → | step back / forward |
| Shift + ← / → | jump 10 steps |
| R | regenerate (new seed) |
| 0 | back to the start |

## Architecture

```
src/
  types.ts         Step, Write, AlgorithmEntry (the shared vocabulary)
  core/            pure TypeScript: no DOM, no React, runs in Node
    ctx.ts         the API algorithms write against; builds each step's inverse
    recorder.ts    runs a generator to completion → { frames, initial, final, lineMap, stats }
    patch.ts       applyStep(step, ±1, main, aux): writes `to` forward, `from` backward
    timeline.ts    cursor over a recording + sticky visual state; computeBarStates()
    dcTree.ts      recursion tree (split/merge rows) derived from split/join steps
    player.ts      rAF playback loop with an injected scheduler; time-debt accumulator
    stats.ts       counters, with checkpoints every 1024 frames
    lineMap.ts     `// @marker` comments → line numbers
    generators.ts  seeded dataset presets; prng.ts: mulberry32
    conformance.ts pure checks used by the test suite
  algorithms/      one generator per file + index.ts registry; imports only from core/
  hooks/           React glue: useRecording, usePlayer, useUrlState, useI18n
  components/      UI; painter.ts writes bar heights/states straight to the DOM;
                   DcTreeView / HeapTreeView draw the tree views as SVG
  i18n/strings.ts  every visible string, { key: { fr, en } }
  styles/          plain CSS; all colours are tokens in theme.css
```

Four rules hold the design together:

1. **Strict layering.** `algorithms/` imports only from `core/`. `core/` never
   imports React or touches the DOM, so every algorithm can be tested in Node.
2. **Every step carries its inverse.** A write is recorded as
   `{ index, from, to }`. Forward applies `to`, backward applies `from`, so
   stepping back is O(1) and no array snapshots are stored.
3. **Eager recording, imperative playback.** The generator runs to completion
   up front (capped at 2,000,000 steps). During playback the bars are painted
   directly through refs. React re-renders the counters, cursor and code
   highlight at about 10 Hz, never the bars.
4. **Algorithms only touch the array through `Ctx`.** That is how every inverse
   gets recorded. Calling a ctx method without yielding its step, or using an
   index out of bounds, fails loudly during recording.

Seeking backward un-applies steps one by one while that is cheaper than
replaying from zero (`distance ≤ target`). Otherwise the timeline resets to
the initial array and replays forward. See `Timeline.seek` in `core/timeline.ts`.

Styling is plain CSS with custom properties. Tailwind is still installed from
the project template, but nothing uses it.
