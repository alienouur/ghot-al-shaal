/* =====================================================
   نظام الجزيئات — غبار، ضربات، خطوط سرعة، شرر
===================================================== */
'use strict';

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.max = 300; // حد أقصى للأداء
    }

    spawn(opts) {
        if (this.particles.length >= this.max) this.particles.shift();
        this.particles.push({
            x: opts.x, y: opts.y,
            vx: opts.vx || 0, vy: opts.vy || 0,
            life: opts.life || 0.5,
            maxLife: opts.life || 0.5,
            size: opts.size || 4,
            color: opts.color || '#fff',
            gravity: opts.gravity !== undefined ? opts.gravity : 600,
            shape: opts.shape || 'circle',
            fade: opts.fade !== false
        });
    }

    /* غبار عند الجري / الهبوط */
    dust(x, y, count) {
        for (let i = 0; i < (count || 4); i++) {
            this.spawn({
                x: x + (Math.random() - 0.5) * 20, y: y,
                vx: (Math.random() - 0.5) * 120,
                vy: -Math.random() * 80 - 20,
                life: 0.35 + Math.random() * 0.25,
                size: 3 + Math.random() * 4,
                color: 'rgba(200,180,150,0.7)',
                gravity: 150
            });
        }
    }

    /* تأثير ضربة */
    hit(x, y, color) {
        for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 100 + Math.random() * 220;
            this.spawn({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 100,
                life: 0.3 + Math.random() * 0.3,
                size: 3 + Math.random() * 4,
                color: color || '#ffcf5e',
                gravity: 500,
                shape: Math.random() > 0.5 ? 'square' : 'circle'
            });
        }
    }

    /* خطوط سرعة (خطفة / جري سريع) */
    speedLines(x, y, dir, color) {
        for (let i = 0; i < 5; i++) {
            this.spawn({
                x: x - dir * 10, y: y + (Math.random() - 0.5) * 40,
                vx: -dir * (200 + Math.random() * 150),
                vy: (Math.random() - 0.5) * 30,
                life: 0.25,
                size: 12 + Math.random() * 16,
                color: color || 'rgba(255,255,255,0.55)',
                gravity: 0,
                shape: 'line'
            });
        }
    }

    /* بريق (ذكريات / كنز) */
    sparkle(x, y, color) {
        for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            this.spawn({
                x, y,
                vx: Math.cos(a) * 140,
                vy: Math.sin(a) * 140,
                life: 0.55,
                size: 3 + Math.random() * 3,
                color: color || '#ffe98a',
                gravity: -60,
                shape: 'star'
            });
        }
    }

    /* موجة قدرة (النداء / الدفعة) */
    wave(x, y, color) {
        this.spawn({ x, y, vx: 0, vy: 0, life: 0.5, size: 10, color: color || '#8ad4ff', gravity: 0, shape: 'ring' });
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.shape === 'ring') p.size += 500 * dt;
        }
    }

    draw(ctx) {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const alpha = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            switch (p.shape) {
                case 'square':
                    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                    break;
                case 'line':
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + p.size * Math.sign(p.vx || 1), p.y);
                    ctx.stroke();
                    break;
                case 'ring':
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 'star':
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillRect(p.x - p.size * 1.6, p.y - 1, p.size * 3.2, 2);
                    ctx.fillRect(p.x - 1, p.y - p.size * 1.6, 2, p.size * 3.2);
                    break;
                default:
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    clear() { this.particles.length = 0; }
}
