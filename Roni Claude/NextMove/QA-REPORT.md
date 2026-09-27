# NextMove QA report

Full QA started 2026-09-27. Areas A–L, run in four rounds. Legend: ✅ pass · 🐞 bug found (fixed / open) · ⚠️ needs a decision · 📱 needs a real device.

## Round 1: chess correctness and games

### A1 Rules ✅
- 16 new automated checks (`src/chess/rules.qa.test.ts`) on top of the existing 9:
  - **castling:** open rank; not in check; not through or into an attacked square; queenside allowed with only b1 attacked; not with pieces in between; not after the king or that rook moved
  - **promotion:** to each of the four pieces, and capturing promotion
  - **draws:** fifty-move rule (and its message); insufficient material (K+B, K+N, K v K; K+R is not a draw); checkmate on the 100th half-move beats the fifty-move counter
  - **en passant:** only immediately after the double step; refused when it would expose the own king along the rank

### A2 Board ✅ (browser, two-player game)
- Illegal tap and illegal drag rejected. Tapping the opponent's piece is ignored. Tapping another own piece switches the selection (with its dots); tapping the selected piece again deselects it.
- An interrupted drag (pointercancel) leaves the board usable. Moves map correctly on a flipped board.
- The promotion picker offers 4 pieces; tapping outside cancels with no move made; promotion to R, B and Q through the picker (N was verified in Phase 1); undo after a promotion works.
- Note: "tap again to deselect" only fails if press and release fire in the same instant (a test-script artifact; with a realistic 60 ms press it works).

### A3 Clock ✅ (unit tests + browser, 3|2 vs Pip)
- White's clock doesn't run before the first move; the first move is free; the increment is added after each move; the thinking time is charged exactly (178.6 s after 3.4 s of thought and one increment).
- A reload mid-game restores the moves and both clocks; the side to move's clock continues.
- Timeout and the timeout-draw rule were verified earlier (Phase 2), plus unit tests.

### B4 Opponent strength 🐞 → fixed
- **Found:** with `scripts/qa-bot-strength.ts` (every bot's real settings on 70 positions, loss measured by Stockfish), levels 1–4 weakened properly, but **Quinn, The Professor, Master Kasimir and Grandmaster Nova all played almost perfectly** (2–6 centipawns lost per move). Stockfish's Skill Level barely weakens play at these depths, so a learner going from Rosa to Quinn would have hit a grandmaster-strength wall. The old "rises steadily" check had been too lenient to catch it.
- **Fixed:** `SearchOptions.elo` in `engine.ts` (Stockfish `UCI_LimitStrength`/`UCI_Elo`, which only goes down to 1320). New ladder:
  - Benny: 25 % random moves, skill 1, depth 3
  - Rosa: Elo 1320
  - Quinn: Elo 1420
  - The Professor: Elo 1650
  - Master Kasimir: Elo 2000
  - Nova: unchanged
  - The check is now strict: each level must lose less than the one below it.
- **Result** (average loss per move, two runs): Pip 571/560 · Nora 321/439 · Benny 319/340 · Rosa 172/203 · Quinn 91/202 · The Professor 71/96 · Master Kasimir 29/21 · Nova 3/3. The order holds on average, but neighbours vary by about ±50 between runs, because random moves and Stockfish's Elo limiter are themselves random.
- ⚠️ The strength labels (≈400 … ≈1900) are still rough guesses. Stockfish's Elo scale is calibrated against engines, not people. Real players' results would be the true calibration.

### B5 Game flow ✅ (browser)
- A real checkmate against Pip gives "You won" plus Pip's line; it's recorded in history as a checkmate; the unfinished-game save is cleared; Rematch resets moves, dialog and greeting; the "✓ Beaten" badge and the recent-game row appear.
- Resign, take-back, resume after reload and timeout were verified in Phase 2; draw offers only exist in two-player games (bots don't take draws).

### B6 Engine failure ✅ (browser, network cut before the engine loads)
- Within 2 s: "The chess engine couldn't start on this device, so Grandmaster Nova is playing random moves." The game continues (Nova played 1.a4) instead of hanging.

## Round 2: teaching and puzzles

### C7 Coach grading ✅ (real engine, `QA=1 npx vitest run src/coach/coach.qa`)
- On 40 real puzzle positions: the correct move was graded best/good **40/40**; a legal move losing ≥ 3 pawns was graded mistake/blunder **40/40**.
- Every explanation and all 120 hints (levels 1–3) are well-formed (no empty text, no "undefined", level 3 always has an arrow).

### C8 Opponent commentary ✅
- Fuzz test: 20 random games, every move commented in Classic and Kids wording. It never throws, never prints garbage, and every comment is under 220 characters. It costs ~6 ms per comment (rules-only), which is fine for one comment per move.
- Content checks (Scholar's threat, check, fork, capture, attack, centre, castling) are in `commentary.test.ts`.

### C9 Academy: every lesson played end to end 🐞 → fixed
- A browser robot played all 40 lessons as a user would: taps Next, solves star hunts along the shortest route, plays the listed or any-mate moves (promotions through the picker), answers questions, and plays engine goals with Stockfish's moves.
- **39/40 finished with 3★ at the first attempt.**
- **Bug:** *Rule of the square* could never be completed. Catching the last pawn leaves K v K, a draw by the rules, and the goal check tested "draw → failed" before "all captured → won". So a perfect answer was told "The game ended in a draw. Try again." Fixed (the capture goal is checked first); the replay now gives "Caught it!" and 3★.
- The lesson checker (`npm run verify:lessons`) and the rules tests were already green.

### C10 Review ✅ (80-move game)
- The analysis took 23 s with the progress bar shown.
- The numbers agree with each other: your mistakes + blunders (2 + 4) = 6 key moments = 6 practice cards; graph markers (20) = both sides' ?!/?/?? counts.
- The Last button jumps to the end. Reviewing the same game again adds no duplicate practice cards.

### C11 My mistakes ✅
- Verified when built (saving, engine-accepted alternatives, missed card back in the same session, spacing 1 → 3 days); the schedule is unit-tested.

### D12 Puzzles 🐞 → fixed
- The robot solved one puzzle in every one of the 14 themes (1–3-move solutions, including a promotion): all "Solved".
- All 1,864 puzzles replay legally (unit test); Rush, rating and daily were verified in Phase 5.
- **Bug:** "today" was the **UTC** date, so the puzzle of the day and the day streak rolled over at 03:00 in Israel (09:00 in Tokyo), not at midnight. Fixed: local calendar day, DST-safe "yesterday"; new `streak.test.ts` passes in Jerusalem, Tokyo and Los Angeles time zones.

### Testing hooks added
- `Board` exposes `data-fen` / `data-orientation` (read-only) for browser QA robots; `PuzzleBoard` has `data-puzzle`.

## Round 3: voice, design, accessibility

### E13 Elias's voice ✅ (2 small fixes)
- Every sentence sent to the voice was recorded across Academy, a lesson, a game with the coach, puzzles, Rush, review and My mistakes. He speaks on every screen and stays silent in Rush; no raw notation, symbols or "undefined" were ever read out ("Queen takes f7, checkmate", "Pawn to g6"); speech is cancelled on every screen change.
- Mute (top-bar portrait) stops all speech and is saved; the 🔊 replay button still speaks once on request.
- Fixed: lesson words in capitals ("CHECKMATE is…") are spoken as normal words (some voices spell capitals out). The review announced pawn moves as a bare "e4"; now "Pawn to e4", like the coach (`spokenMove`).
- 📱 How he actually sounds on real phones still needs a human ear.

### F15–F17 Layout, text size, tap targets ✅ (4 fixes)
- An automatic inspector checked **13 screens × 2 styles × 4 sizes (360, 390, 768, 1366 px) = 104 combinations**: horizontal overflow, text below 12 px, tap targets below 44 px.
- **Overflow: none anywhere.**
- Fixed:
  - the Classic/Kids switch buttons were 36 px tall on phones (invisible 44 px hit area added)
  - "✓ Beaten" was 11 px text
  - the small grade badges in key moments were 11.96 px
  - the "Lichess puzzle database" link was 16 px tall
  - the 🔊 replay button squeezed to 43 px on tablets
- After the fixes, all 104 pass.

### F18 Visual consistency ✅
- Screenshots of the game at tablet size and of Home in both styles: consistent spacing, fonts, colours and icons.

### G19 Accessibility 🐞 → fixed, ⚠️ one open item
- Lighthouse (accessibility) on Home, lesson, game, setup, puzzles, puzzle, review and My mistakes, **in both Classic and Kids style: all 100/100** after these fixes:
  - no `<main>` landmark (added once in `App`); `robots.txt` added
  - 11 labelled visual indicators (progress dots, stars, lives, captured pieces…) had labels screen readers may ignore → `role="img"`
  - recent-game buttons had a spoken name that didn't match their visible text (a problem for voice control) → the visible text is now the name
  - **contrast:** the blunder red was 3.4:1 on the dark theme. **Kids mode's coral was 2.8:1** as text and behind white button text, and its green and red text were 3.3 and 2.7:1. New tokens: `--g-*` (grade text), `--gb-*` (badge backgrounds), `--accent-text` (accent used as text; deeper orange #c2410c in Kids). Kids buttons now use **dark text on the same bright coral (5.3:1)**, so the look stays playful. The Kids `--good`/`--danger` are darker; focus outlines use `--accent-text`. All text colours are now ≥ 4.5:1.
- Keyboard: Tab order is sensible and the focus ring is clearly visible; `prefers-reduced-motion` is honoured.
- ⚠️ **Open: the chessboard can't be used without a pointer.** There's no keyboard move entry, and screen readers hear only "Chess board". Blind and motor-impaired players can use menus, lessons and settings but can't move pieces. Suggested (≈45 min): arrow keys + Enter to move, with the position and moves announced to screen readers.
