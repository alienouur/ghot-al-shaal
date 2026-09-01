// Tiny WebAudio synth for feedback sounds — no copyrighted assets.
let ctx = null;
let muted = false;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, duration, type = 'sine', gainVal = 0.12, when = 0) {
  const c = getCtx();
  if (!c || muted) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainVal, c.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + when);
  osc.stop(c.currentTime + when + duration);
}

export const Sound = {
  setMuted(m) {
    muted = m;
  },
  isMuted() {
    return muted;
  },
  correct() {
    tone(660, 0.12, 'sine');
    tone(880, 0.18, 'sine', 0.12, 0.1);
  },
  incorrect() {
    tone(220, 0.25, 'square', 0.08);
  },
  timeout() {
    tone(330, 0.12, 'triangle', 0.1);
    tone(262, 0.2, 'triangle', 0.1, 0.12);
  },
};
