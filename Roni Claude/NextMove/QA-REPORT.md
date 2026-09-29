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

## Round 4: offline, robustness, performance, content, legal (2026-09-28)

### H20 Offline app and install ✅
- All 42 precached files were in the cache. With the **server shut down**: a cold start, every screen, fonts, pieces, the puzzles and a game against Quinn (the engine answered in about 1 s) all worked.
- Update: a changed service worker showed "A new version of NextMove is ready. [Update] [Later]" in the middle of a game; Update switched to the new version and the game was kept move for move.
- Settings showed the real "Install NextMove" button (Chrome fired the install prompt).
- A hard reload (Shift+Reload) while offline gives the browser's offline page. That's how browsers work (a hard reload skips the offline cache), not a bug.

### I21 Data robustness 🐞 → fixed
- **Bug: damaged saved data blanked whole screens.** Each saved key was set to 8 kinds of wrong data (a number, text, `{}`, `[]`, `null`, a mixed list, a wrong object, broken JSON) and the screens that read it were opened: **38 of 112 went completely white** (the saved game, game history, review, My mistakes; Home and Puzzles too for My mistakes). This can happen after an update changes a data format, or from a browser extension.
- Fixed:
  - every saved-data reader now checks the shape (`load(key, fallback, valid)`, `loadList`, in `lib/storage.ts`); a broken list keeps its good items
  - one level deeper, a card with an impossible position, puzzle stats with wrong field types and star counts for lessons that don't exist are dropped too (they had shown "★ 0many3/120" and stuck My mistakes)
  - a safety net (`components/CrashGuard.tsx`): if a screen still fails, it shows "Oops, this screen got stuck" with Back to home / Try again, instead of a blank page. Your saved data is untouched.
  - `src/lib/storage.test.ts` covers all of it (11 tests).
- After the fixes: **128 of 128 combinations** and all the deeper cases open normally.
- Storage blocked (private mode, site data off): every screen works, no errors. Storage full: goes through the same safe path.
- Robots: 400 random taps at up to 30 per second, leaving a game while the bot was thinking (4 times; the bot resumed on return and the save was always consistent), and a storm of back/forward presses: no errors, no stuck states.
- Console: **no errors or warnings** on any screen.

### J22 Performance ✅
- Phone speed test (4× slower CPU, slow 4G), Home:
  - **first visit: content visible after 2.4 s** (Google's "good" limit is 2.5 s), no layout shift
  - **repeat visit (from the offline cache): 0.8 s**
  - On a real host the files are compressed, so the first visit will be faster than this local test.
- Long session: 30 rounds of game → review → lesson → puzzle. Memory stayed between 6 and 16 MB and fell back each time (no leak). **62 engines were started and 61 stopped**; the one left is the current game's opponent.

### K23 Content quality ✅ (4 small fixes)
- All lesson text (≈4,300 words, Classic and Kids), the coach's explanations and hints, the opponents' comments and the bot descriptions were read in full. Accurate, friendly, and suitable for children.
- Fixed:
  - "Ruy Lopez: played by world champions for 500 years" (there have only been world champions since 1886) → "over 450 years old and still played by world champions"
  - "the knight on d6 jumps to e8" (it doesn't move; it attacks e8) → "from d6 the knight attacks e8: one L-shaped jump away"
  - "toward" → "towards" twice (the app uses British spelling throughout)
  - "a forced checkmate in 3, starting with…" → "in 3 moves"
- `npm run verify:lessons`: 0 problems.

### L24 Legal and store readiness 🐞 → fixed, ⚠️ decisions
- **Bug: Stockfish wasn't credited anywhere in the app, and the licence notices of React, chess.js and the fonts were stripped from the build** (MIT, BSD and OFL all require them to ship with the app).
- Fixed:
  - `public/licenses.txt` holds all the notices and the Stockfish source links. It's generated by `npm run licenses` (`scripts/licenses.mjs`); re-run it after adding or updating a dependency.
  - Settings has a new **Privacy** and **Credits** section, with a "Licences and source code" button.
- **Privacy statement** (in Settings): no accounts, no ads, no tracking, everything stays on the device. One honest caveat is in it: some device voices are online voices, so the text Elias reads may go to the browser maker (Chrome's "Google" voices do this).
- **Kids app-store rules:** the app had two links out to lichess.org (the Puzzles credit and "Puzzle #… on Lichess" after a puzzle). Apple's Kids category and Google's Families program require a parental gate before leaving the app. **Removed at the user's choice**; both credits stay as plain text. The app now has no links out.
- ⚠️ Stockfish GPL before an app-store build (unchanged): a GPL engine in a closed-source store app needs the app's source published, or a different engine.

## Round 5: mobile (iPhone) (2026-09-29)

Prompted by the user's iPhone report: a game against a strong bot "stopped" after it mated them and Safari's bars came up, the page zoomed, the screen "changed". Tested in Chrome's phone emulation (390×664 = iPhone in Safari with its bars, 375×553, 360×640, and sideways 844×390 and 667×375); a real iPhone check is still the user's.

### M25 Game-over card 🐞 → fixed
- **Bug: on short screens the game-over card was taller than the screen and couldn't scroll.** At 375×553 "See the board" and "Home" sat below the edge; swiping scrolled the page behind, which brought up Safari's bars. The game had ended; the player just couldn't reach the buttons.
- Fixed: the backdrop scrolls (flex + `margin: auto`, so the card starts at the top when it doesn't fit) and a compact card under 740px height. All four buttons fit at 375×553.

### M26 Double-tap zoom 🐞 → fixed
- **Bug: nothing turned off iPhone double-tap zoom**, so two quick taps beside the board zoomed the page and it stayed zoomed. Fixed with `touch-action: manipulation` on every element (`:where(*)`, so the board keeps `none`). Pinch zoom still works. Form controls are ≥16px, so iOS doesn't zoom on focus.

### M27 Updates on iPhone 🐞 → fixed
- **Bug: an installed iPhone app only looked for a new version on a full reload**, which iOS rarely does (it wakes the app instead), so the phone could run an old version for days. `UpdatePrompt` now calls `registration.update()` whenever the app comes back on screen.

### M28 Every game reaches its end ✅
- Robot player (taps the board with touch pointer events; mate in one if it can, else the biggest capture, else random) at 390×664: 17 full games, all 8 bots, both colours. Every game reached the game-over card with all buttons on screen, and each added exactly one history entry. Endings seen: checkmate both ways, insufficient material, including a promotion.
- Injected positions: stalemate (Loyd's 10-move line), time-out (1+0 with 3 s left), resign. All correct.

### M29 Engine killed in the background 🐞 → fixed (the "game never finishes" bug)
- **Bug: iOS can kill a Web Worker while the app is hidden or short of memory, with no error event.** The bot then showed "thinking…" forever, and every later search on that engine queued behind the dead one until the app was closed. Reproduced by terminating the Stockfish workers (recorded by wrapping `window.Worker` in a `navigate_page` `initScript`; importing `/src/engine/engine.ts` from a test script can give a different module instance after an HMR update, so it tests the wrong engine).
- Fixed in `Engine` (so bots, coach, Review, lessons and My mistakes all recover): every wait has a silence limit, an `isready` check runs before each search, and coming back on screen pings the engine (3 s) and restarts it if it doesn't answer. A stalled search restarts the worker and is asked once more.
- Measured: killed silently → bot replies in 5.8 s; killed while away → 0.6 s after returning; normal play afterwards 0.4 s; no "engine couldn't start" warning. `QA=1` coach tests pass.

### M30 Clock while away (user decision) ✅
- In a timed game the clock kept running while the phone was locked or in another app. **The user chose to pause it** (a family app shouldn't lose games on time while nobody is looking). `useClock` pauses on `visibilitychange` and resumes the same side on return; a bot reply that lands while away starts the player's clock only on return. Measured: 5 s away cost 0 s; the bot's reply while away didn't start the clock. Applies to two-player games too.

### M31 Phone sideways and narrow phones 🐞 → fixed
- **Bug: sideways, every board screen sized the board by the screen width**, so only 3 rows showed and the player had to scroll to play (Game, puzzles, Rush, My mistakes, Review, lessons).
- Fixed (`orientation: landscape` and `max-height: 520px`): the board is sized by the height, player strips sit beside it (Game screens), Review's arrows move above the summary, the lesson card and side panels scroll on their own, and the top bar is slimmer. Checked at 844×390 and 667×375: nothing overlaps, no page scroll.
- **Bug: Review's arrow row was 364px wide**, 4px wider than a 360px phone, so the page wiggled sideways. Tighter gaps under 400px.
- Upright layouts unchanged (checked at 390 and 360 wide).

### Still open
- A real-iPhone check by the user (Safari and the home-screen app): mate a bot, double-tap beside the board, turn the phone, lock it mid-game.
