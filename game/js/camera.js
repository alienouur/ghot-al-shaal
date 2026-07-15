/* =====================================================
   نظام الكاميرا — تتبع، زوم، اهتزاز، انتقالات سينمائية
===================================================== */
'use strict';

class Camera {
    constructor(viewW, viewH) {
        this.x = 0; this.y = 0;
        this.viewW = viewW; this.viewH = viewH;
        this.zoom = 1;
        this.targetZoom = 1;
        this.shakeTime = 0;
        this.shakePower = 0;
        this.shakeX = 0; this.shakeY = 0;
        this.target = null;        // كيان للتتبع
        this.cineTarget = null;    // هدف سينمائي مؤقت {x, y, zoom, time}
        this.lerpSpeed = 5;
    }

    resize(w, h) { this.viewW = w; this.viewH = h; }

    follow(target) { this.target = target; }

    shake(power, time) {
        this.shakePower = Math.max(this.shakePower, power);
        this.shakeTime = Math.max(this.shakeTime, time);
    }

    /* لقطة سينمائية مؤقتة نحو نقطة معينة */
    cinematic(x, y, zoom, time) {
        this.cineTarget = { x, y, zoom: zoom || 1.4, time: time || 2 };
    }

    setZoom(z) { this.targetZoom = z; }

    /* تتبع عدة لاعبين (وضع شارعنا): توسيط + زوم حسب التباعد */
    followGroup(entities) {
        if (!entities.length) return;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const e of entities) {
            minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.w);
            minY = Math.min(minY, e.y); maxY = Math.max(maxY, e.y + e.h);
        }
        this.groupFocus = {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            spanX: maxX - minX,
            spanY: maxY - minY
        };
    }

    update(dt) {
        let fx, fy;

        if (this.cineTarget) {
            fx = this.cineTarget.x;
            fy = this.cineTarget.y;
            this.targetZoom = this.cineTarget.zoom;
            this.cineTarget.time -= dt;
            if (this.cineTarget.time <= 0) {
                this.cineTarget = null;
                this.targetZoom = 1;
            }
        } else if (this.groupFocus) {
            fx = this.groupFocus.x;
            fy = this.groupFocus.y;
            const needZoomX = this.viewW / (this.groupFocus.spanX + 500);
            const needZoomY = this.viewH / (this.groupFocus.spanY + 400);
            this.targetZoom = Math.min(1.1, Math.max(0.55, Math.min(needZoomX, needZoomY)));
            this.groupFocus = null;
        } else if (this.target) {
            fx = this.target.x + this.target.w / 2 + (this.target.facing || 0) * 60;
            fy = this.target.y + this.target.h / 2 - 40;
        } else {
            fx = this.x + this.viewW / 2;
            fy = this.y + this.viewH / 2;
        }

        // زوم سلس
        this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 4);

        // تتبع سلس
        const t = Math.min(1, dt * this.lerpSpeed);
        const desiredX = fx - this.viewW / (2 * this.zoom);
        const desiredY = fy - this.viewH / (2 * this.zoom);
        this.x += (desiredX - this.x) * t;
        this.y += (desiredY - this.y) * t;

        // حدود العالم
        const maxX = GAME_DATA.world.width - this.viewW / this.zoom;
        this.x = Math.max(0, Math.min(this.x, Math.max(0, maxX)));
        const maxY = 900 - this.viewH / this.zoom;
        this.y = Math.min(this.y, Math.max(-200, maxY));
        if (this.y < -400) this.y = -400;

        // الاهتزاز
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            this.shakeX = (Math.random() - 0.5) * 2 * this.shakePower;
            this.shakeY = (Math.random() - 0.5) * 2 * this.shakePower;
            if (this.shakeTime <= 0) { this.shakePower = 0; this.shakeX = 0; this.shakeY = 0; }
        }
    }

    /* تطبيق التحويل على السياق */
    apply(ctx) {
        ctx.save();
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
    }

    restore(ctx) { ctx.restore(); }

    /* هل المستطيل داخل مجال الرؤية؟ (لتحسين الأداء) */
    inView(x, y, w, h) {
        const vw = this.viewW / this.zoom, vh = this.viewH / this.zoom;
        return x + w > this.x - 100 && x < this.x + vw + 100 &&
               y + h > this.y - 100 && y < this.y + vh + 100;
    }
}
