// ─── Web Audio synthesized sound effects (no audio files needed) ───

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, detune = 0) {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.detune.value = detune
  gain.gain.setValueAtTime(volume, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + duration)
}

function playNoise(duration: number, volume = 0.1, filterFreq = 2000) {
  const c = getCtx()
  const bufSize = c.sampleRate * duration
  const buf = c.createBuffer(1, bufSize, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterFreq
  const gain = c.createGain()
  gain.gain.setValueAtTime(volume, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(c.destination)
  src.start()
}

export const Sounds = {
  slash() {
    playNoise(0.15, 0.12, 3000)
    playTone(200, 0.1, 'sawtooth', 0.06)
  },

  fireball() {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, c.currentTime)
    osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.3)
    gain.gain.setValueAtTime(0.08, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + 0.5)
    playNoise(0.3, 0.06, 1500)
  },

  arrow() {
    playNoise(0.08, 0.1, 5000)
    playTone(1200, 0.1, 'sine', 0.04)
  },

  heal() {
    playTone(523, 0.3, 'sine', 0.1)
    setTimeout(() => playTone(659, 0.3, 'sine', 0.08), 100)
    setTimeout(() => playTone(784, 0.4, 'sine', 0.06), 200)
  },

  shield() {
    playTone(120, 0.4, 'sine', 0.1)
    playTone(180, 0.3, 'triangle', 0.06)
  },

  damage() {
    playNoise(0.1, 0.15, 800)
    playTone(100, 0.15, 'square', 0.05)
  },

  spawn() {
    playTone(330, 0.15, 'sine', 0.08)
    setTimeout(() => playTone(440, 0.15, 'sine', 0.06), 100)
    setTimeout(() => playTone(550, 0.2, 'sine', 0.05), 200)
  },

  victory() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => {
      setTimeout(() => {
        playTone(n, 0.4, 'sine', 0.1 - i * 0.015)
        playTone(n * 1.5, 0.3, 'triangle', 0.04)
      }, i * 120)
    })
    setTimeout(() => playNoise(0.3, 0.04, 6000), 500)
  },

  levelUp() {
    const notes = [440, 554, 659, 880]
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 0.2, 'sine', 0.08), i * 80)
    })
  },

  click() {
    playTone(800, 0.05, 'sine', 0.04)
  },

  error() {
    playTone(200, 0.2, 'square', 0.06)
    setTimeout(() => playTone(150, 0.3, 'square', 0.04), 100)
  },

  enemyAttack() {
    playTone(150, 0.15, 'sawtooth', 0.08)
    playNoise(0.12, 0.1, 1200)
  },
}
