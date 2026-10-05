import { beforeEach, describe, expect, it } from 'vitest'
import { exportProgress, importProgress } from './storage'

// vitest runs in Node: a minimal localStorage
const mem = new Map<string, string>()
globalThis.localStorage = {
  get length() {
    return mem.size
  },
  key: (i: number) => [...mem.keys()][i] ?? null,
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
} as Storage

describe('progress backup', () => {
  beforeEach(() => mem.clear())

  it('exports every NextMove key and restores it exactly', () => {
    mem.set('nextmove:academy-progress', JSON.stringify({ rook: 3 }))
    mem.set('nextmove:puzzle-stats', JSON.stringify({ rating: 950 }))
    mem.set('other-app', 'untouched')
    const file = exportProgress()
    mem.clear()
    mem.set('nextmove:academy-progress', JSON.stringify({ bishop: 1 })) // replaced by the backup
    mem.set('other-app', 'untouched')
    expect(importProgress(file)).toEqual({ restored: 2 })
    expect(JSON.parse(mem.get('nextmove:academy-progress')!)).toEqual({ rook: 3 })
    expect(JSON.parse(mem.get('nextmove:puzzle-stats')!)).toEqual({ rating: 950 })
    expect(mem.get('other-app')).toBe('untouched')
  })

  it('refuses a file that is not a NextMove backup, and changes nothing', () => {
    mem.set('nextmove:academy-progress', JSON.stringify({ rook: 3 }))
    expect(importProgress('hello')).toHaveProperty('error')
    expect(importProgress(JSON.stringify({ app: 'Other', data: {} }))).toHaveProperty('error')
    expect(importProgress(JSON.stringify({ app: 'NextMove', version: 1, data: {} }))).toHaveProperty('error')
    expect(JSON.parse(mem.get('nextmove:academy-progress')!)).toEqual({ rook: 3 })
  })

  it('ignores odd key names in a hand-edited file', () => {
    const file = JSON.stringify({ app: 'NextMove', version: 1, data: { settings: { mode: 'kids' }, '../evil': 1, 'X Y': 2 } })
    expect(importProgress(file)).toEqual({ restored: 1 })
    expect([...mem.keys()]).toEqual(['nextmove:settings'])
  })
})
