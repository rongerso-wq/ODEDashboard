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
