/* =====================================================
   مدير الصوت — أصوات مولّدة بالكامل عبر Web Audio API
   (موسيقى خلفية، مؤثرات، قدرات، أجواء)
===================================================== */
'use strict';

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.muted = false;
        this.musicTimer = null;
        this.currentTrack = null;
        this.ambientNodes = [];
    }

    /* يجب أن يُستدعى بعد أول تفاعل من المستخدم */
    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
        } catch (e) {
            console.warn('Web Audio غير مدعوم', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    setMusicVolume(v) {
        this.musicVolume = v;
        if (this.musicGain) this.musicGain.gain.value = v;
    }
    setSfxVolume(v) {
        this.sfxVolume = v;
        if (this.sfxGain) this.sfxGain.gain.value = v;
    }
    setMuted(m) {
        this.muted = m;
        if (this.masterGain) this.masterGain.gain.value = m ? 0 : 1;
    }

    /* ---------- مؤثرات صوتية ---------- */
    tone(freq, dur, type, vol, slideTo) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
        g.gain.setValueAtTime(vol || 0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(t); osc.stop(t + dur + 0.02);
    }

    noise(dur, vol, filterFreq) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const size = this.ctx.sampleRate * dur;
        const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq || 1000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol || 0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(filter); filter.connect(g); g.connect(this.sfxGain);
        src.start(t);
    }

    /* مكتبة الأصوات */
    play(name) {
        if (!this.ctx) return;
        switch (name) {
            case 'jump':      this.tone(320, 0.18, 'square', 0.12, 620); break;
            case 'land':      this.noise(0.12, 0.18, 500); break;
            case 'step':      this.noise(0.05, 0.06, 800); break;
            case 'hit':       this.tone(160, 0.12, 'sawtooth', 0.2, 60); this.noise(0.1, 0.15, 900); break;
            case 'hurt':      this.tone(220, 0.25, 'sawtooth', 0.18, 90); break;
            case 'collect':   this.tone(660, 0.1, 'sine', 0.15, 880); this.tone(880, 0.15, 'sine', 0.12, 1320); break;
            case 'select':    this.tone(440, 0.08, 'square', 0.1, 550); break;
            case 'confirm':   this.tone(520, 0.1, 'square', 0.12, 780); this.tone(780, 0.12, 'square', 0.1, 1040); break;
            case 'back':      this.tone(400, 0.12, 'square', 0.1, 240); break;
            case 'dialogue':  this.tone(600, 0.04, 'sine', 0.06); break;
            case 'ability_nida':    this.tone(400, 0.4, 'sine', 0.2, 900); this.tone(500, 0.5, 'triangle', 0.12, 1100); break;
            case 'ability_khatfa':  this.noise(0.2, 0.2, 3000); this.tone(700, 0.15, 'sawtooth', 0.1, 1400); break;
            case 'ability_dafaa':   this.tone(90, 0.3, 'sawtooth', 0.28, 40); this.noise(0.25, 0.25, 400); break;
            case 'ability_ain':     this.tone(1200, 0.5, 'sine', 0.12, 300); break;
            case 'ability_tamweh':  this.tone(800, 0.35, 'triangle', 0.1, 200); this.noise(0.3, 0.08, 2000); break;
            case 'boss_roar':  this.tone(80, 0.7, 'sawtooth', 0.3, 45); this.noise(0.5, 0.2, 300); break;
            case 'stun':       this.tone(900, 0.3, 'sine', 0.1, 450); break;
            case 'win':
                [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'square', 0.12), i * 130));
                break;
            case 'lose':
                [400, 350, 300, 200].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.12), i * 180));
                break;
            case 'achievement':
                [660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'sine', 0.14), i * 100));
                break;
            case 'whistle': this.tone(1000, 0.3, 'sine', 0.15, 1400); break;
        }
    }

    /* ---------- موسيقى خلفية مولّدة (متتالية نغمية) ---------- */
    playMusic(track) {
        if (!this.ctx) return;
        if (this.currentTrack === track) return;
        this.stopMusic();
        this.currentTrack = track;

        const tracks = {
            // مقام بسيط دافئ للقوائم والشارع
            street:  { bpm: 92,  bass: [130.8, 130.8, 98, 110],  melody: [523, 587, 659, 523, 440, 494, 523, 392], type: 'triangle' },
            menu:    { bpm: 76,  bass: [110, 98, 87.3, 98],      melody: [440, 494, 523, 587, 523, 494, 440, 392], type: 'sine' },
            danger:  { bpm: 132, bass: [82.4, 82.4, 77.8, 73.4], melody: [330, 311, 330, 392, 330, 311, 294, 247], type: 'sawtooth' },
            boss:    { bpm: 150, bass: [65.4, 65.4, 61.7, 58.3], melody: [262, 247, 262, 311, 262, 233, 262, 196], type: 'square' },
            calm:    { bpm: 66,  bass: [130.8, 110, 98, 110],    melody: [523, 494, 440, 392, 440, 494, 523, 587], type: 'sine' }
        };
        const cfg = tracks[track] || tracks.street;
        const beatDur = 60 / cfg.bpm;
        let step = 0;

        const playStep = () => {
            if (this.muted || !this.ctx) return;
            const t = this.ctx.currentTime;
            // البيس
            if (step % 2 === 0) {
                const bass = this.ctx.createOscillator();
                const bg = this.ctx.createGain();
                bass.type = 'triangle';
                bass.frequency.value = cfg.bass[(step / 2) % cfg.bass.length];
                bg.gain.setValueAtTime(0.14, t);
                bg.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 1.8);
                bass.connect(bg); bg.connect(this.musicGain);
                bass.start(t); bass.stop(t + beatDur * 2);
            }
            // اللحن
            const mel = this.ctx.createOscillator();
            const mg = this.ctx.createGain();
            mel.type = cfg.type;
            mel.frequency.value = cfg.melody[step % cfg.melody.length];
            mg.gain.setValueAtTime(0.055, t);
            mg.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.9);
            mel.connect(mg); mg.connect(this.musicGain);
            mel.start(t); mel.stop(t + beatDur);
            // إيقاع خفيف
            if (step % 4 === 0) this.noiseMusic(0.05, 0.04, 6000);
            step++;
        };

        playStep();
        this.musicTimer = setInterval(playStep, beatDur * 1000);
    }

    noiseMusic(dur, vol, freq) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const size = Math.floor(this.ctx.sampleRate * dur);
        const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const f = this.ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f); f.connect(g); g.connect(this.musicGain);
        src.start(t);
    }

    stopMusic() {
        if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
        this.currentTrack = null;
    }
}

const Audio2 = new AudioManager();
