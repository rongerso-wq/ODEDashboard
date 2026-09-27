// Synthesised board sounds (no audio files): a soft wooden "tock" for moves, a sharper
// double knock for captures, a bright ping for check and a short chord at game end.
let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean) {
  enabled = on
}

function audio(): AudioContext | null {
  if (!enabled) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function knock(a: AudioContext, at: number, pitch: number, gain: number) {
  // Filtered noise burst = the wood; a quick sine drop = the body of the piece.
  const len = Math.floor(a.sampleRate * 0.06)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  const noise = a.createBufferSource()
  noise.buffer = buf
  const bp = a.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = pitch * 6
  bp.Q.value = 1.2
  const ng = a.createGain()
  ng.gain.value = gain * 0.9
  noise.connect(bp).connect(ng).connect(a.destination)
  noise.start(at)

  const osc = a.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(pitch * 1.6, at)
  osc.frequency.exponentialRampToValueAtTime(pitch, at + 0.08)
  const og = a.createGain()
  og.gain.setValueAtTime(gain, at)
  og.gain.exponentialRampToValueAtTime(0.0001, at + 0.12)
  osc.connect(og).connect(a.destination)
  osc.start(at)
  osc.stop(at + 0.13)
}

function tone(a: AudioContext, at: number, freq: number, dur: number, gain: number) {
  const osc = a.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = freq
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g).connect(a.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

export type SoundKind = 'move' | 'capture' | 'check' | 'castle' | 'end' | 'error' | 'select' | 'star' | 'correct'

export function play(kind: SoundKind) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + 0.005
  switch (kind) {
    case 'move':
      knock(a, t, 180, 0.35)
      break
    case 'castle':
      knock(a, t, 180, 0.3)
      knock(a, t + 0.09, 200, 0.3)
      break
    case 'capture':
      knock(a, t, 240, 0.45)
      knock(a, t + 0.05, 150, 0.3)
      break
    case 'check':
      knock(a, t, 200, 0.35)
      tone(a, t + 0.03, 880, 0.25, 0.12)
      break
    case 'end':
      tone(a, t, 523.25, 0.6, 0.12)
      tone(a, t + 0.1, 659.25, 0.6, 0.1)
      tone(a, t + 0.2, 783.99, 0.8, 0.1)
      break
    case 'error':
      tone(a, t, 180, 0.15, 0.1)
      break
    case 'select':
      knock(a, t, 320, 0.08)
      break
    case 'star':
      knock(a, t, 200, 0.25)
      tone(a, t + 0.02, 1318.5, 0.25, 0.1)
      tone(a, t + 0.09, 1760, 0.3, 0.08)
      break
    case 'correct':
      tone(a, t, 659.25, 0.2, 0.1)
      tone(a, t + 0.1, 987.77, 0.35, 0.1)
      break
  }
}

export function vibrate(ms: number | number[]) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* unsupported */
  }
}
