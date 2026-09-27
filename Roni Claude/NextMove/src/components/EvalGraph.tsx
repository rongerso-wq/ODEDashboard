import type { PointerEvent } from 'react'
import type { Grade } from '../coach/grade'
import { winChance } from '../coach/grade'
import './EvalGraph.css'

type Props = {
  /** White's evaluation after each position (index 0 = start), null while not analysed */
  evals: (number | null)[]
  grades: (Grade | undefined)[] // per move (index i = move i, reaching position i + 1)
  current: number // position index
  onPick: (ply: number) => void
}

const W = 600
const H = 110

/** White's advantage over the game: area above the middle = White better. Click to jump. */
export default function EvalGraph({ evals, grades, current, onPick }: Props) {
  const n = Math.max(1, evals.length - 1)
  const x = (i: number) => (i / n) * W
  const y = (cp: number) => H / 2 - (winChance(cp) * H) / 2.1
  const known = evals.map((e, i) => (e === null ? null : ([x(i), y(e)] as const))).filter(Boolean) as [number, number][]
  const line = known.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const area = known.length ? `${line} L${known.at(-1)![0]},${H} L0,${H} Z` : ''

  function pick(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    onPick(Math.round(((e.clientX - r.left) / r.width) * n))
  }

  return (
    <svg className="eval-graph" viewBox={`0 0 ${W} ${H}`} onPointerDown={pick} role="img" aria-label="Evaluation graph: higher means White is better">
      <rect width={W} height={H} className="eg-bg" />
      {area && <path d={area} className="eg-area" />}
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="eg-mid" />
      {line && <path d={line} className="eg-line" />}
      {grades.map((g, i) =>
        g === 'mistake' || g === 'blunder' || g === 'inaccuracy'
          ? evals[i + 1] !== null && (
              <circle key={i} cx={x(i + 1)} cy={y(evals[i + 1]!)} r={g === 'inaccuracy' ? 4 : 5.5} className={`eg-dot g-${g}`} />
            )
          : null,
      )}
      <line x1={x(current)} x2={x(current)} y1={0} y2={H} className="eg-cursor" />
    </svg>
  )
}
