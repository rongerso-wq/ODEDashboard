// Stockfish (WASM, in a Web Worker) behind a small promise API.
// One search runs at a time per Engine; later searches queue behind it. Callers that no longer
// want a result (the user undid a move, left the screen) call stop() and ignore the answer.

export type Score = { cp: number } | { mate: number } // from the side to move's point of view

export type Line = { multipv: number; depth: number; score: Score; pv: string[] }

export type SearchResult = { bestmove: string | null; lines: Line[] }

export type SearchOptions = {
  skill?: number // Stockfish "Skill Level" 0–20
  /** play at roughly this rating (Stockfish UCI_LimitStrength/UCI_Elo, 1320–3190); overrides skill */
  elo?: number
  depth?: number
  movetime?: number // ms
  multipv?: number
}

const ENGINE_URL = '/engine/stockfish.js'

// iOS can kill a Web Worker while the app is in the background (or short of memory) without any
// error event. A dead worker never answers, so every wait has a silence limit: past it the worker
// is restarted and the search asked again, instead of a bot "thinking…" forever.
const SILENCE_MS = 15_000 // a search prints info lines every depth; this long without one = dead
const PING_MS = 3_000 // "isready" is answered at once, even mid-search
const SYNC_MS = 5_000 // "isready" between searches (after new options, a new game)

class EngineStalled extends Error {
  /** true when restart() already replaced the worker */
  restarted = false
}

export class Engine {
  private worker!: Worker
  private listeners = new Set<(line: string) => void>()
  private waiting = new Set<(e: Error) => void>() // rejects of pending waits, for restart()
  private ready!: Promise<void>
  private chain: Promise<unknown> = Promise.resolve()
  private searching = false
  private generation = 0
  private options = new Map<string, string>()
  private onVisible = () => {
    if (!document.hidden) this.checkAlive()
  }
  failed: Error | null = null

  constructor() {
    this.boot()
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisible)
  }

  private boot() {
    this.worker = new Worker(ENGINE_URL)
    this.options.clear()
    this.searching = false
    this.worker.onmessage = (e: MessageEvent) => {
      const text = typeof e.data === 'string' ? e.data : String(e.data)
      for (const line of text.split('\n')) for (const l of this.listeners) l(line)
    }
    this.ready = new Promise<void>((resolve, reject) => {
      this.worker.onerror = (e) => {
        this.failed = new Error(e.message || 'Chess engine failed to load')
        reject(this.failed)
      }
      this.waitFor('uciok', () => this.send('uci'), undefined, SILENCE_MS)
        .then(() => this.sync(SILENCE_MS)) // the first isready may load the network: slow phones need time
        .then(resolve, (e) => {
          this.failed ??= e instanceof Error ? e : new Error('Chess engine failed to load')
          reject(this.failed)
        })
    })
    this.ready.catch(() => {})
  }

  /** Replaces a dead worker with a fresh one; waits in progress fail with EngineStalled. */
  private restart() {
    this.worker.terminate()
    this.listeners.clear()
    const stalled = new EngineStalled('Chess engine stopped answering')
    stalled.restarted = true
    for (const fail of [...this.waiting]) fail(stalled)
    this.waiting.clear()
    this.boot()
  }

  /** Back on screen: a worker that doesn't answer "isready" quickly was killed while we were away. */
  private checkAlive() {
    if (this.failed) return
    this.ready
      .then(() => this.waitFor('readyok', () => this.send('isready'), undefined, PING_MS))
      .catch((e) => {
        if (e instanceof EngineStalled && !e.restarted && !this.failed) this.restart()
      })
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd)
  }

  /**
   * Sends a command (via start) and resolves on the first output line that starts with `prefix`.
   * With `silenceMs`, fails with EngineStalled when the engine prints nothing for that long.
   */
  private waitFor(prefix: string, start: () => void, onLine?: (line: string) => void, silenceMs?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const done = () => {
        clearTimeout(timer)
        this.listeners.delete(l)
        this.waiting.delete(fail)
      }
      const fail = (e: Error) => {
        done()
        reject(e)
      }
      const arm = () => {
        if (!silenceMs) return
        clearTimeout(timer)
        timer = setTimeout(() => fail(new EngineStalled('Chess engine stopped answering')), silenceMs)
      }
      const l = (line: string) => {
        arm()
        onLine?.(line)
        if (line.startsWith(prefix)) {
          done()
          resolve(line)
        }
      }
      this.listeners.add(l)
      this.waiting.add(fail)
      arm()
      start()
    })
  }

  private sync(silenceMs = SYNC_MS) {
    return this.waitFor('readyok', () => this.send('isready'), undefined, silenceMs).then(() => undefined)
  }

  private setOption(name: string, value: string | number) {
    const v = String(value)
    if (this.options.get(name) === v) return
    this.options.set(name, v)
    this.send(`setoption name ${name} value ${v}`)
  }

  whenReady() {
    return this.ready
  }

  newGame() {
    this.chain = this.chain.then(() => this.ready).then(() => {
      this.send('ucinewgame')
      return this.sync()
    }).catch((e) => {
      if (e instanceof EngineStalled && !e.restarted && !this.failed) this.restart()
    })
  }

  search(fen: string, opts: SearchOptions = {}): Promise<SearchResult> {
    const gen = this.generation
    const attempt = () => this.ready.then(() => (gen === this.generation ? this.run(fen, opts) : { bestmove: null, lines: [] }))
    const run = this.chain.then(attempt).catch((e) => {
      // A killed worker: restart it and ask once more. A second failure goes to the caller.
      if (!(e instanceof EngineStalled) || this.failed) throw e
      if (!e.restarted) this.restart()
      return attempt()
    })
    this.chain = run.catch(() => {})
    return run
  }

  /**
   * Ends the running search early (its promise resolves with the best move so far) and drops
   * searches that were queued but not started (they resolve with bestmove null).
   */
  stop() {
    this.generation++
    if (this.searching) this.send('stop')
  }

  terminate() {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible)
    this.worker.terminate()
  }

  private async run(fen: string, opts: SearchOptions): Promise<SearchResult> {
    // Skill Level alone barely weakens play at bot depths (QA B4); a rating limit really does.
    this.setOption('UCI_LimitStrength', opts.elo ? 'true' : 'false')
    if (opts.elo) this.setOption('UCI_Elo', Math.max(1320, Math.min(3190, opts.elo)))
    this.setOption('Skill Level', opts.elo ? 20 : (opts.skill ?? 20))
    this.setOption('MultiPV', opts.multipv ?? 1)
    // Always: it applies new options, and a killed worker is caught in seconds, not SILENCE_MS.
    await this.sync()

    const lines = new Map<number, Line>()
    const limits = [opts.depth ? `depth ${opts.depth}` : '', opts.movetime ? `movetime ${opts.movetime}` : '']
      .filter(Boolean)
      .join(' ')
    this.send(`position fen ${fen}`)
    this.searching = true
    const last = await this.waitFor(
      'bestmove',
      () => this.send(`go ${limits || 'depth 12'}`),
      (line) => {
        const info = parseInfo(line)
        if (info) lines.set(info.multipv, info)
      },
      SILENCE_MS,
    )
    this.searching = false
    const best = last.split(/\s+/)[1]
    return {
      bestmove: best && best !== '(none)' ? best : null,
      lines: [...lines.values()].sort((a, b) => a.multipv - b.multipv),
    }
  }
}

/** Parses a UCI "info … score … pv …" line; ignores other info lines. */
export function parseInfo(line: string): Line | null {
  if (!line.startsWith('info') || !line.includes(' pv ') || !line.includes(' score ')) return null
  const t = line.split(/\s+/)
  const at = (k: string) => t.indexOf(k)
  const depth = Number(t[at('depth') + 1])
  const mpv = at('multipv') >= 0 ? Number(t[at('multipv') + 1]) : 1
  const s = at('score')
  if (t[s + 3] === 'lowerbound' || t[s + 3] === 'upperbound') return null
  const score: Score = t[s + 1] === 'mate' ? { mate: Number(t[s + 2]) } : { cp: Number(t[s + 2]) }
  return { multipv: mpv, depth, score, pv: t.slice(at('pv') + 1) }
}

/** "e7e8q" -> { from: 'e7', to: 'e8', promotion: 'q' } */
export function parseUci(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined }
}

let shared: Engine | null = null
/** The engine that plays the bots. Created on first use. */
export function botEngine(): Engine {
  shared ??= new Engine()
  return shared
}
