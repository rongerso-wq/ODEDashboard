import { isObj, load, save } from '../lib/storage'
import { CHAPTERS } from './lessons'

/** Best stars (1–3) earned per lesson id. */
export type Progress = Record<string, number>

const LESSON_IDS = new Set(CHAPTERS.flatMap((c) => c.lessons.map((l) => l.id)))

/** Only star counts 1–3 for lessons that exist are kept, so a damaged or outdated entry can't
 *  break the star totals (QA I). */
export const loadProgress = (): Progress =>
  Object.fromEntries(
    Object.entries(load<Progress>('academy-progress', {}, isObj)).filter(
      ([id, s]) => LESSON_IDS.has(id) && typeof s === 'number' && Number.isInteger(s) && s >= 1 && s <= 3,
    ),
  )

export function recordLesson(id: string, stars: number): Progress {
  const p = loadProgress()
  p[id] = Math.max(p[id] ?? 0, stars)
  save('academy-progress', p)
  return p
}

/** 3 stars for a clean lesson, 2 for up to two slips, 1 otherwise. */
export const starsFor = (mistakes: number) => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1)

export function chapterDone(chapterId: string, p: Progress): boolean {
  const ch = CHAPTERS.find((c) => c.id === chapterId)
  return !!ch && ch.lessons.every((l) => (p[l.id] ?? 0) > 0)
}

/** The first lesson not yet completed, in curriculum order. */
export function nextLessonId(p: Progress): string | null {
  for (const c of CHAPTERS) for (const l of c.lessons) if (!p[l.id]) return l.id
  return null
}
