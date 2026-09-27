import { useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import type { Color, PieceSymbol, Square } from '../chess/game'
import { pieceUrl } from '../chess/pieces'
import { play } from '../lib/sound'
import './Board.css'

type Piece = { type: PieceSymbol; color: Color }
export type BoardMove = { from: Square; to: Square; promotion?: PieceSymbol }

export type BoardProps = {
  fen: string
  orientation?: Color
  /** legal destinations of the pieces the user may move now; empty/undefined = board is locked */
  dests?: Map<Square, Square[]>
  lastMove?: { from: Square; to: Square } | null
  animate?: boolean
  /** increases with every move; restarts the slide animation */
  ply?: number
  check?: Square | null
  coordinates?: boolean
  onMove?: (move: BoardMove, viaDrag: boolean) => void
  /** coach overlays */
  arrows?: BoardArrow[]
  marks?: BoardMark[]
  /** Academy "collect the stars" targets */
  stars?: Square[]
}

export type Tone = 'good' | 'bad' | 'hint'
export type BoardArrow = { from: Square; to: Square; tone: Tone }
export type BoardMark = { square: Square; tone: Tone }

const S = 100 // one square in SVG units; the board is 800 x 800
const FILES = 'abcdefgh'
const DRAG_THRESHOLD = 6 // svg units before a press becomes a drag

function parsePlacement(fen: string): Map<Square, Piece> {
  const map = new Map<Square, Piece>()
  const rows = fen.split(' ')[0].split('/')
  rows.forEach((row, i) => {
    let f = 0
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch)
      else {
        const color: Color = ch === ch.toUpperCase() ? 'w' : 'b'
        map.set(`${FILES[f]}${8 - i}` as Square, { type: ch.toLowerCase() as PieceSymbol, color })
        f++
      }
    }
  })
  return map
}

function xy(sq: Square, o: Color): [number, number] {
  const f = FILES.indexOf(sq[0])
  const r = Number(sq[1]) - 1
  return o === 'w' ? [f * S, (7 - r) * S] : [(7 - f) * S, r * S]
}

function squareAt(x: number, y: number, o: Color): Square | null {
  const c = Math.floor(x / S)
  const row = Math.floor(y / S)
  if (c < 0 || c > 7 || row < 0 || row > 7) return null
  return (o === 'w' ? `${FILES[c]}${8 - row}` : `${FILES[7 - c]}${row + 1}`) as Square
}

// five-pointed star centred on 0,0 (outer radius 34, inner 14)
const STAR_PATH =
  Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 14 : 34
    const a = (Math.PI / 5) * i - Math.PI / 2
    return `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`
  }).join(' ') + ' Z'

const isLight = (sq: Square) => (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 1
const translate = ([x, y]: [number, number]) => `translate(${x}px, ${y}px)`

/** Rook squares for an animated castle, derived from the king's two-file jump. */
function castleRook(last: { from: Square; to: Square }, pieces: Map<Square, Piece>) {
  const king = pieces.get(last.to)
  if (king?.type !== 'k' || Math.abs(FILES.indexOf(last.from[0]) - FILES.indexOf(last.to[0])) !== 2) return null
  const rank = last.to[1]
  return last.to[0] === 'g'
    ? { from: `h${rank}` as Square, to: `f${rank}` as Square }
    : { from: `a${rank}` as Square, to: `d${rank}` as Square }
}

type Drag = { from: Square; startX: number; startY: number; x: number; y: number; moved: boolean; wasSelected: boolean }
type Promo = { from: Square; to: Square; color: Color; viaDrag: boolean }

export default function Board({
  fen,
  orientation = 'w',
  dests,
  lastMove,
  animate = true,
  ply = 0,
  check,
  coordinates = true,
  onMove,
  arrows = [],
  marks = [],
  stars = [],
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pieces = useMemo(() => parsePlacement(fen), [fen])
  // Selection belongs to one position: a new position clears it without an effect.
  const [selection, setSelection] = useState<{ fen: string; sq: Square } | null>(null)
  const selected = selection?.fen === fen ? selection.sq : null
  const select = (sq: Square | null) => setSelection(sq ? { fen, sq } : null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [promo, setPromo] = useState<Promo | null>(null)

  const targets = (from: Square | null) => (from && dests?.get(from)) || []
  const canMove = (sq: Square) => !!dests?.has(sq)

  function toSvg(e: PointerEvent): [number, number] {
    const r = svgRef.current!.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 8 * S, ((e.clientY - r.top) / r.height) * 8 * S]
  }

  function attempt(from: Square, to: Square, viaDrag: boolean) {
    const p = pieces.get(from)
    if (!p || !targets(from).includes(to)) return false
    select(null)
    if (p.type === 'p' && (to[1] === '8' || to[1] === '1')) {
      setPromo({ from, to, color: p.color, viaDrag })
      return true
    }
    onMove?.({ from, to }, viaDrag)
    return true
  }

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (promo || e.button > 0) return
    const [x, y] = toSvg(e)
    const sq = squareAt(x, y, orientation)
    if (!sq) return
    if (selected && sq !== selected && attempt(selected, sq, false)) return
    if (canMove(sq)) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* pointer already released */
      }
      if (selected !== sq) play('select')
      setDrag({ from: sq, startX: x, startY: y, x, y, moved: false, wasSelected: selected === sq })
      select(sq)
    } else select(null)
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag) return
    const [x, y] = toSvg(e)
    const moved = drag.moved || Math.hypot(x - drag.startX, y - drag.startY) > DRAG_THRESHOLD
    setDrag({ ...drag, x, y, moved })
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    if (!drag) return
    const [x, y] = toSvg(e)
    const sq = squareAt(x, y, orientation)
    if (drag.moved) {
      if (sq && sq !== drag.from) attempt(drag.from, sq, true)
    } else if (drag.wasSelected) select(null)
    setDrag(null)
  }

  const hover = drag?.moved ? squareAt(drag.x, drag.y, orientation) : null
  const selTargets = targets(selected)
  const rook = lastMove && animate ? castleRook(lastMove, pieces) : null

  const squares: Square[] = []
  for (let r = 8; r >= 1; r--) for (const f of FILES) squares.push(`${f}${r}` as Square)

  return (
    <div className="board-frame">
      <svg
        ref={svgRef}
        className={`board${drag?.moved ? ' dragging' : ''}`}
        data-fen={fen /* read by browser QA scripts */}
        data-orientation={orientation}
        viewBox={`0 0 ${8 * S} ${8 * S}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        role="img"
        aria-label="Chess board"
      >
        <defs>
          <radialGradient id="check-glow">
            <stop offset="0%" stopColor="var(--check)" stopOpacity="1" />
            <stop offset="45%" stopColor="var(--check)" stopOpacity="0.75" />
            <stop offset="100%" stopColor="var(--check)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* squares */}
        {squares.map((sq) => {
          const [x, y] = xy(sq, orientation)
          return <rect key={sq} x={x} y={y} width={S} height={S} fill={isLight(sq) ? 'var(--sq-light)' : 'var(--sq-dark)'} />
        })}

        {/* highlights */}
        {lastMove &&
          [lastMove.from, lastMove.to].map((sq) => {
            const [x, y] = xy(sq, orientation)
            return <rect key={`lm-${sq}`} x={x} y={y} width={S} height={S} fill="var(--hl-last)" />
          })}
        {selected && (() => {
          const [x, y] = xy(selected, orientation)
          return <rect x={x} y={y} width={S} height={S} fill="var(--hl-select)" />
        })()}
        {check && (() => {
          const [x, y] = xy(check, orientation)
          return <rect className="check-glow" x={x} y={y} width={S} height={S} fill="url(#check-glow)" />
        })()}
        {hover && selTargets.includes(hover) && (() => {
          const [x, y] = xy(hover, orientation)
          return <rect x={x + 3} y={y + 3} width={S - 6} height={S - 6} className="hover-target" />
        })()}

        {/* lesson stars */}
        {stars.map((sq) => {
          const [x, y] = xy(sq, orientation)
          return <path key={`s-${sq}`} className="star" transform={`translate(${x + S / 2} ${y + S / 2})`} d={STAR_PATH} />
        })}

        {/* coach marks: a glowing ring under the piece */}
        {marks.map((m) => {
          const [x, y] = xy(m.square, orientation)
          return <circle key={`m-${m.square}-${m.tone}`} cx={x + S / 2} cy={y + S / 2} r={S / 2 - 5} className={`mark mark-${m.tone}`} />
        })}

        {/* pieces */}
        {[...pieces].map(([sq, p]) => {
          const pos = xy(sq, orientation)
          let from: Square | null = null
          if (animate && lastMove?.to === sq) from = lastMove.from
          else if (rook?.to === sq) from = rook.from
          const dragging = drag?.moved && drag.from === sq
          const style: CSSProperties & Record<string, string> = { transform: translate(pos) }
          if (from) style['--from'] = translate(xy(from, orientation))
          return (
            <image
              key={from ? `${sq}-${ply}` : sq}
              href={pieceUrl(p)}
              width={S}
              height={S}
              className={`piece${from ? ' slide' : ''}${dragging ? ' lifted' : ''}`}
              style={style}
            />
          )
        })}

        {/* coordinates, over the pieces so a piece on the edge never hides them */}
        {coordinates &&
          squares.map((sq) => {
            const [x, y] = xy(sq, orientation)
            const fill = isLight(sq) ? 'var(--coord-on-light)' : 'var(--coord-on-dark)'
            return (
              <g key={`c-${sq}`}>
                {y === 7 * S && (
                  <text x={x + S - 6} y={y + S - 6} textAnchor="end" className="coord" fill={fill}>
                    {sq[0]}
                  </text>
                )}
                {x === 0 && (
                  <text x={x + 6} y={y + 24} className="coord" fill={fill}>
                    {sq[1]}
                  </text>
                )}
              </g>
            )
          })}

        {/* coach arrows */}
        {arrows.map((a) => (
          <Arrow key={`a-${a.from}-${a.to}-${a.tone}`} {...a} orientation={orientation} />
        ))}

        {/* legal move markers, drawn over pieces so capture rings stay visible */}
        {selTargets.map((sq) => {
          const [x, y] = xy(sq, orientation)
          return pieces.has(sq) ? (
            <circle key={`d-${sq}`} cx={x + S / 2} cy={y + S / 2} r={S / 2 - 6} className="dest-ring" />
          ) : (
            <circle key={`d-${sq}`} cx={x + S / 2} cy={y + S / 2} r={S * 0.15} className="dest-dot" />
          )
        })}

        {/* dragged piece follows the pointer */}
        {drag?.moved && pieces.get(drag.from) && (
          <image
            href={pieceUrl(pieces.get(drag.from)!)}
            width={S * 1.15}
            height={S * 1.15}
            x={drag.x - S * 0.575}
            y={drag.y - S * 0.8}
            className="piece ghost"
          />
        )}

        {promo && <PromotionPicker promo={promo} orientation={orientation} onPick={(type) => {
          setPromo(null)
          if (type) onMove?.({ from: promo.from, to: promo.to, promotion: type }, promo.viaDrag)
        }} />}
      </svg>
    </div>
  )
}

function Arrow({ from, to, tone, orientation }: BoardArrow & { orientation: Color }) {
  const [x1, y1] = xy(from, orientation).map((v) => v + S / 2)
  const [x2, y2] = xy(to, orientation).map((v) => v + S / 2)
  const len = Math.hypot(x2 - x1, y2 - y1)
  const ux = (x2 - x1) / len
  const uy = (y2 - y1) / len
  const head = 40
  const width = 16
  // start a little off the origin centre; stop the shaft where the head begins
  const sx = x1 + ux * 22
  const sy = y1 + uy * 22
  const bx = x2 - ux * head
  const by = y2 - uy * head
  const px = -uy
  const py = ux
  const points = [
    [sx + (px * width) / 2, sy + (py * width) / 2],
    [bx + (px * width) / 2, by + (py * width) / 2],
    [bx + px * 26, by + py * 26],
    [x2, y2],
    [bx - px * 26, by - py * 26],
    [bx - (px * width) / 2, by - (py * width) / 2],
    [sx - (px * width) / 2, sy - (py * width) / 2],
  ]
  return <polygon className={`arrow arrow-${tone}`} points={points.map((p) => p.join(',')).join(' ')} />
}

function PromotionPicker({ promo, orientation, onPick }: { promo: Promo; orientation: Color; onPick: (t: PieceSymbol | null) => void }) {
  const [x, y0] = xy(promo.to, orientation)
  const down = y0 === 0 // column grows away from the edge the pawn reached
  const options: PieceSymbol[] = ['q', 'n', 'r', 'b']
  return (
    <g className="promo">
      <rect width={8 * S} height={8 * S} className="promo-dim" onPointerDown={(e) => { e.stopPropagation(); onPick(null) }} />
      {options.map((t, i) => {
        const y = down ? y0 + i * S : y0 - i * S
        return (
          <g key={t} className="promo-option" onPointerDown={(e) => { e.stopPropagation(); onPick(t) }}>
            <circle cx={x + S / 2} cy={y + S / 2} r={S / 2 - 2} />
            <image href={pieceUrl({ type: t, color: promo.color })} x={x + 6} y={y + 6} width={S - 12} height={S - 12} />
          </g>
        )
      })}
    </g>
  )
}
