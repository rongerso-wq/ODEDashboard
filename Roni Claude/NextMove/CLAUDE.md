# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NextMove is a chess app for ages 0–100 whose **first purpose is teaching**. It has an Academy of engine-verified lessons, play against 8 computer opponents with a live coach, post-game review, and puzzles, plus a spoken teacher persona ("Elias"). Everything is free with no ads, and nothing is locked. It's built with Vite + React 19 + TypeScript and runs as a static single-page app (no backend yet).

- **Plan:** `C:\Users\litbe\.claude\plans\i-want-to-build-compiled-flute.md` (7 phases, one per turn; wait for the user's "go").
- **Done:** phases 1–5, Elias and the opponent commentary, My mistakes (spaced repetition), the installable offline app (PWA), a cleaner Home.
- **Full QA in progress** (the user asked for everything to be covered; areas A–L in `QA-REPORT.md`):
  - **Rounds 1–3 done:** rules/board/clock/bots · teaching/puzzles · voice/design/accessibility. 14 bugs found and fixed so far.
  - **Next: Round 4** — H offline app & install · I data robustness (blocked/corrupt/full storage, rapid tapping, screen switching mid-move, back/forward, console errors on every screen) · J performance (Lighthouse performance, memory over a long session) · K content quality (read all lesson/hint/explanation text for typos and age-appropriateness) · L legal/store readiness (licences credited, privacy statement, kids-store rules such as the external Lichess links). Then a final summary and commit.
  - Report each round in `QA-REPORT.md`, fix clear bugs, list decisions, then ask to commit.
- **Open decisions for the user:** (1) keyboard/screen-reader play on the board (≈45 min; see QA G19); (2) the Stockfish GPL licence before an app-store release (publish the source, or swap engines); (3) bot strength labels are rough until real players test.
- **Working style:** plain-language updates; ask before every commit (local commits only, never push); stage only `Roni Claude/NextMove` files by name (the git repo is the user's home folder).
- **Online play (Phase 6) is dropped** by the user's decision (2026-09-27): no accounts, no backend, no Supabase. NextMove is positioned as *the free chess teacher for the whole family: no ads, no accounts, works offline*. Don't add online features or "Coming soon" teasers for them.
- **On hold at the user's request:** a private Vercel test link and a tester scorecard for a side-by-side comparison with the Dr. Wolf app.
- `README.md` is the unmodified Vite template.

## Commands

```bash
npm run dev                  # Vite dev server
npm run build                # tsc -b && vite build (type errors fail the build)
npm run lint                 # oxlint (.oxlintrc.json; ignores public/engine/ and dist/)
npm test                     # vitest run: all unit tests
npx vitest run src/coach/commentary.test.ts   # one file
npx vitest run -t "names a fork"              # one test by name
npm run verify:lessons       # Stockfish (in Node) checks every Academy lesson; must print "0 problems"
node scripts/qa-bot-strength.ts   # QA: the 8 bots' strength must rise level by level (~5 min)
QA=1 npx vitest run src/coach/coach.qa   # QA: coach grading/hints with the real engine + commentary fuzz (~30 s)
npm run puzzles              # rebuild src/puzzles/puzzles.json from the Lichess puzzle DB (network)
npm run engine               # re-copy Stockfish WASM from node_modules into public/engine/
node scripts/extract-pieces.mjs   # re-extract the cburnett piece SVGs into public/pieces/
npm run icons                # regenerate public/icons/*.png (knight on brass) with sharp
npm run build && npx vite preview --port 4273   # the only way to test the service worker / offline mode
```

## Installable offline app (PWA)
- **Setup:** `vite-plugin-pwa` in `vite.config.ts` writes the manifest and a Workbox service worker that **precaches everything**: engine WASM (~1.8 MB, hence `maximumFileSizeToCacheInBytes` 5 MB), the puzzles chunk, fonts, pieces and icons. That's about 41 files / 3.1 MB. The whole app works with no network (verified with the server shut down: home, fonts, puzzles, and the engine playing a move).
- **Updates:** `registerType: 'prompt'`. `components/UpdatePrompt.tsx` shows "A new version is ready [Update] [Later]" and **never reloads on its own**, so a game in progress is safe. Cache versions come from the build's content hashes, so there's no manual version bump. Verify an update by rebuilding, re-serving, reloading the old tab and checking that the toast appears and the new bundle loads after Update.
- **Dev mode:** the service worker exists only in production builds, never in `npm run dev`. Port 4199 is used by another local project; use 4273 for previews.
- **Install:** `lib/install.ts` captures `beforeinstallprompt` (imported first in `main.tsx`) for the "Install NextMove" button in Settings. iOS has no prompt, so it shows Share → Add to Home Screen instead. Automated/test Chrome usually doesn't fire the event, so the fallback text appears there; the real prompt needs a normal browser. iOS home-screen tags and `apple-touch-icon` are in `index.html`.

## Architecture

**Routing** (`src/lib/router.ts`, hash routes, switched in `src/App.tsx`):

| Route | Screen |
|---|---|
| `/` | Home |
| `/learn`, `/learn/<lessonId>` | Academy map, lesson player |
| `/play/local` | Two players on one device |
| `/play/computer`, `/play/computer/game` | Opponent setup, game against a bot |
| `/review` | Post-game review |
| `/mistakes` | My mistakes (spaced-repetition practice) |
| `/puzzles`, `/puzzles/{daily\|rated\|theme/<id>}`, `/puzzles/rush` | Puzzles home, puzzle player, Puzzle Rush |

- **Handing state between screens:** screens pass data through storage, not the URL. For example, the game-over dialog writes `review-game`, then navigates.
- **Speech on route change:** `App` stops Elias's speech on every route change.

**The board is rules-agnostic.** `components/Board.tsx` is an SVG board (800×800 viewBox, 100 units per square).
- **Input:** it takes `fen`, `dests` (a legal-destination map; omit it to lock the board), `lastMove`, `check`, and overlays (`arrows`, `marks`, `stars`).
- **Output:** it emits `onMove(move, viaDrag)`. It handles tap and drag, the promotion picker, and the slide animation (keyed by `ply`; drag moves don't animate).
- **Who owns the rules:** every screen owns its own chess.js instance. It's usually `chess/useChessGame.ts` (move/undo/reset/finish, plus sounds). Lessons and puzzles mutate their own `Chess` and re-render via a counter or index state.

**Two independent engines.** Stockfish 19 **lite single-threaded** WASM (GPLv3) runs in `public/engine/`.
- **How it loads:** `stockfish.js` finds `stockfish.wasm` by swapping the extension, and `COPYING.txt` must ship with it. No COOP/COEP headers are needed.
- **The wrapper:** `engine/engine.ts` wraps a Web Worker with UCI. `search()` calls are serialised. `stop()` ends the running search and drops queued ones (via a generation counter).
- **Who uses which engine:** `botEngine()` is the shared instance that plays the bots. The coach, the review and lesson goals each create **their own** `Engine`, so analysis never delays the opponent. Terminate them on unmount.

**Settings and theming.** `lib/settings.tsx` persists these: `mode` (classic/kids), `sound`, `coordinates`, `coach`, `voice`, `voiceName`.
- **Kids mode:** it's `<html data-mode="kids">`, which overrides the design tokens in `src/index.css`. It gives bigger tap targets (`--tap` 58px), a warmer palette and rounder corners, and components pick friendlier copy via a `kids` flag. Every feature must work in both modes.
- **`:hover`:** rules live only inside `@media (hover: hover)`.
- **Storage:** all goes through `lib/storage.ts` (try/catch, keys prefixed `nextmove:`). The keys are `settings`, `computer-current`, `computer-last`, `computer-history`, `review-game`, `academy-progress`, `puzzle-stats`, `mistakes`.

## Subsystems

### Bots, clock, saved games
- **Bots** (`engine/bots.ts`): 8 opponents, Pip … Grandmaster Nova. Even Stockfish Skill 0 is too strong for beginners, so the low bots (Pip, Nora, Benny) play `randomMove()` with probability `randomness`. Rosa … Master Kasimir use a rating limit (`search.elo` → `UCI_LimitStrength`/`UCI_Elo`, which goes no lower than 1320), because Skill Level barely weakens play at these depths. Strength labels are rough and shown as "≈".
- **After changing any bot setting**, run `node scripts/qa-bot-strength.ts` (about 5 min): the average centipawn loss must fall at every level. Neighbours vary by about ±50 between runs, so run it twice.
- **Clock** (`chess/clock.ts`): pure functions (tested) plus `useClock`. The clock starts on the first move, and the first move is free. On timeout the game is a draw if the side with time left has too few pieces to ever checkmate (`timeoutOutcome`).
- **Saved games** (`chess/saved.ts`): `computer-current` holds the unfinished game (SAN + paused clock), saved after every move, on `pagehide` and on unmount. `computer-history` keeps the last 30 results. Take-backs and hints only exist in games without a clock.

### Coach (`src/coach/`)
- **Grading** (`grade.ts`):
  - It uses win chances with the Lichess thresholds: a drop of ≥0.1 is an inaccuracy, ≥0.2 a mistake, ≥0.3 a blunder.
  - The engine's own move, or a loss of ≤12 cp, counts as "best".
  - Mates become ±10000 minus the distance to mate. Accuracy uses the Lichess per-move formula, averaged.
- **Tactic facts** (`tactics.ts`): rules-only, instant. It detects hanging pieces, free captures, forks, mate-in-one, and mate threats (via a "pass" move).
- **Why a move was bad** (`explain.ts`), in priority order:
  1. missed a mate
  2. allowed a mate
  3. left a piece hanging (confirmed by the engine's reply)
  4. missed free material or a fork
  5. the reply wins material
  6. broke an opening principle
  7. generic, with the evaluation in words
- **Wording:** `Voice` sets the wording ("your" vs "White's"). `hintFor()` gives a 3-step hint: the idea, then the piece, then an arrow with the reason.
- **Opponent commentary** (`commentary.ts`): after each bot move, a rules-only comment (check → mate threat → fork → capture → piece now attacked → your piece en prise → their piece loose (hinted, never named) → castling/early queen/centre/development). Quiet moves get none.
- **The live hook** (`useCoach.ts`): it has its own engine and an `AnalysisCache` keyed by FEN. Feedback is keyed by `ply:afterFen`, so a take-back never shows stale advice.
- **In the game screen:** `ComputerGame` withholds the commentary while `coach.pending`, so Elias always speaks in the order "your move, then theirs".
- **Review** (`screens/Review.tsx`): it analyses every position (depth 12 / 260 ms), then shows accuracy per side, the eval graph and key moments. "Try again from here" starts a no-clock bot game from the moves before the mistake.

### Academy (`src/academy/`)
- **Content** is data in `lessons.ts` (types in `types.ts`). The step kinds are:
  - `info`
  - `collect`: collect the stars. Black never moves, kings are optional (chess.js `skipValidation`), and the fewest possible moves comes from a BFS in `collect.ts`.
  - `moves`: a SAN line alternating player and opponent. `A|B` gives alternatives, `any: 'check'|'mate'` accepts any such move, `opponentFirst` is for Black openings, and `notes[i]` explains each move. `verify: 'book'` steps always show the next move.
  - `goal`: against a full-strength engine (mate / promote / capture / hold, with `within`).
  - `choice`: a question, with an optional rules-checkable `fact`.
- **Gate:** after any content change, both `npx vitest run src/academy` and `npm run verify:lessons` must pass.
  - The verifier checks that puzzle moves are the engine's choice, book moves and alternatives are sound, goals are reachable, and mates fit within `within`.
  - It has already caught a wrong "fork" and an illegal position.
- **Node constraint:** `scripts/verify-lessons.ts` runs through Node's built-in TypeScript stripping, so `lessons.ts` and `validate.ts` (the files it imports) must use only erasable TS and `import type` for local types.
- **Stars:** 3 for no slips, 2 for ≤2, otherwise 1. Slips are wrong moves or answers (max 2 per move), "show me" hints, goal retries, and extra moves in collect steps (one per two).

### Puzzles (`src/puzzles/`)
- **Data** (`puzzles.json`, lazy-loaded as its own chunk): 1,864 puzzles from the Lichess puzzle DB (CC0), built by `scripts/build-puzzles.mjs`.
  - **File format:** the DB is **pzstd**, meaning each zstd frame is preceded by a skippable frame whose payload is the next frame's size. Node's streaming decompressor rejects skippable frames, so the script cuts out the first frame and uses `zstdDecompressSync`.
  - **Selection:** there's a lower quality bar under rating 1100, so beginners get plenty.
  - **After a rebuild:** run `npx vitest run src/puzzles`. It replays every puzzle and checks that mate puzzles end in mate.
- **Puzzle format:** `moves[0]` is the opponent's lead-in; the solver is the side to move after it. Derive it from the **starting FEN**, never the live board (reading the live board once flipped the board mid-puzzle).
- **The player** (`PuzzleBoard`):
  - It accepts the stored move **or any checkmate** (the Lichess rule).
  - `onFirstResult` fires once, and is true only with no wrong move and no hint.
  - `strict` (Rush) ends the puzzle at the first mistake.
  - It carries `data-puzzle=<id>`.
- **Rating and modes** (`model.ts`):
  - Rating is Elo against the puzzle's rating: start 800, K = 48/32/20 as games grow, and only the first attempt at a rated puzzle counts.
  - The daily puzzle is the same for everyone (a date hash over ratings 700–1400).
  - Puzzle Rush is 3 minutes and 3 lives. Its target rating rises 55 per solve and falls back to the *nearest* rating, never a random one.

### My mistakes (`src/mistakes/deck.ts`, `screens/MistakesPractice.tsx`, route `/mistakes`)
- **Cards:** every coach verdict graded mistake or blunder becomes a card (`cardFromFeedback`): the position before the move, the engine's best move, the played move, and the coach's "why".
  - **Sources:** added live by `ComputerGame` (the coach card shows "Saved to My mistakes") and by `Review` once its analysis is complete. Only games with an owner are used (`game.me`), not pass-and-play.
  - **Uniqueness:** the id is the FEN (without move counters) plus the best move, so a card is never duplicated. The deck is capped at 200 cards; mastered ones are dropped first.
- **Scheduling:** Leitner boxes with `INTERVALS` of 0 / 1 / 3 / 7 / 21 / 60 days.
  - Solved at the first try (no wrong move, no hint) → up one box. Otherwise → box 0, practised again at the end of the same session.
  - Box 5 = mastered; the card leaves the queue.
- **Answers:** the stored move or any mate is accepted instantly. Any other move is judged by a fresh `Engine` (depth 12): within 40 cp of the stored best eval counts as correct ("Qe7 works as well. I had g6 in mind…"). Reasons come from `hintFor` (rules-based), so no engine is needed to explain.
- **Entry points:** `MistakesBanner` on Home and Puzzles (shown only when cards are due), and the "N saved" button in Review's key moments. Storage key: `mistakes`.

### Elias, the voice
- **The voice** (`lib/voice.ts`): browser `speechSynthesis` only (free, offline, no key).
  - It picks the best male English voice (the `PREFERRED` list), and lowers the pitch and rate of plain voices.
  - `speak()` cancels the current speech, or appends with `{ queue: true }`. It also splits text into sentences, because some browsers cut long utterances.
  - A premium text-to-speech service would replace only `speak()`.
- **Notation to words** (`lib/speakable.ts`, tested): turns SAN into words ("Qxf7#" → "Queen takes f7, checkmate") and removes emoji and symbols. Any new text that contains notation goes through it automatically via `speak()`.
- **Hooks** (`lib/useVoice.ts`): `useSay(text, key, { queue })` speaks when the text changes and stops on unmount; `useSpeaking()` reports whether he's talking.
- **Components** (`components/Elias.tsx`): `EliasAvatar`, `Narrator` (bubble plus replay), `VoiceToggle`. Voice selection lives in `components/SettingsSheet.tsx`.
- **Browser behaviour:** speech needs a user gesture first. In dev, StrictMode speaks each line twice and cancels the first copy; production speaks once.

## Verification and UI testing
- **Before declaring a change done:** `npm run build`, `npm run lint`, `npm test`, plus `npm run verify:lessons` when lessons change.
- **UI checks:** use Chrome DevTools MCP at 390×844 and 360 wide (no horizontal scroll) plus desktop, in both Classic and Kids mode.
- **Driving the board from scripts:** dispatch `PointerEvent`s on `svg.board` at square centres (mirror the coordinates when the board is flipped), and **wait between taps**, because the selection must render before the second tap.
- **Speech needs a real click:** use the MCP `click` tool, because synthetic clicks don't count as a user gesture. To see what Elias says, wrap `speechSynthesis.speak` to log `u.text`.
- **Setting up states:** write the storage keys directly, e.g. `nextmove:computer-current` or `nextmove:review-game`. Navigate away first, because leaving a game saves it and would overwrite your injected save.
- **Puzzle solutions:** in dev, `await import('/src/puzzles/puzzles.json')` plus the board's `data-puzzle` give you the answer.
- **Robots:** `svg.board` carries `data-fen` and `data-orientation`, so a browser script can read the live position and play whole lessons, puzzles or games (import `/src/academy/lessons.ts`, `/src/engine/engine.ts`, and chess.js from `/node_modules/.vite/deps/chess__js.js` in dev). A full-Academy robot run is described in `QA-REPORT.md` (C9).
- **Dates:** "today" must be the local calendar day (`puzzles/model.ts` `today()`), never `toISOString()` (that's UTC).

## Licensing
- **Pieces:** cburnett (CC BY-SA 3.0), credited on Home.
- **Engine:** Stockfish (GPLv3), with its license shipped in `public/engine/COPYING.txt`. That's fine for a free web app, but a closed-source app-store build would need review.
- **Puzzles:** Lichess (CC0), credited on the Puzzles screen.
