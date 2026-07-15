/* =====================================================
   العالم — "شارعنا": الخريطة الكاملة والرسم البرمجي
   بيوت، دكان، أزقة، مبنى مهجور، ساحة النهاية
===================================================== */
'use strict';

class World {
    constructor() {
        this.groundY = GAME_DATA.world.groundY;
        this.width = GAME_DATA.world.width;
        this.solids = [];        // أجسام صلبة
        this.climbables = [];    // سلالم
        this.enemies = [];
        this.collectibles = [];  // ذكريات / كنوز
        this.npcs = [];
        this.decor = [];         // عناصر مرسومة (بيوت، أشجار، سيارات...)
        this.doors = [];
        this.timeOfDay = 'day';  // day | sunset | night
        this.buildMap();
    }

    /* ---------- بناء الخريطة ---------- */
    buildMap() {
        const g = this.groundY;

        // الأرض الرئيسية على طول الشارع
        this.solids.push({ x: 0, y: g, w: this.width, h: 300 });

        /* ===== المنطقة 1: بداية شارع غوط الشعال (0 - 2600) ===== */
        // الرصيف
        this.decor.push({ type: 'sidewalk', x: 0, y: g - 14, w: 2600 });
        // البيوت
        this.addHouse(120, g, '#d9b38c', '#8a5a2a', 2);
        this.addHouse(520, g, '#c9c2b8', '#5a7a9a', 1);
        this.addHouse(860, g, '#e0c9a8', '#7a4a3a', 2);
        this.addHouse(1650, g, '#cfae88', '#4a6a4a', 1);
        this.addHouse(2050, g, '#d8c8b0', '#8a3a3a', 2);
        // الأشجار
        this.decor.push({ type: 'tree', x: 460, y: g, size: 1.2 });
        this.decor.push({ type: 'tree', x: 1250, y: g, size: 1 });
        this.decor.push({ type: 'tree', x: 2380, y: g, size: 1.35 });
        // مكان اللعب
        this.decor.push({ type: 'playground', x: 1280, y: g });
        this.solids.push({ x: 1330, y: g - 90, w: 120, h: 12, oneWay: true }); // أعلى الزحليقة
        // الجدار
        this.decor.push({ type: 'wall', x: 1530, y: g, w: 100, h: 85 });
        this.solids.push({ x: 1530, y: g - 85, w: 100, h: 85 });
        // سيارات قديمة
        this.decor.push({ type: 'car', x: 700, y: g, color: '#7a9ac9' });
        this.decor.push({ type: 'car', x: 1900, y: g, color: '#c95a4a' });
        // منصات على أسطح
        this.solids.push({ x: 120, y: g - 230, w: 300, h: 14, oneWay: true });
        this.solids.push({ x: 860, y: g - 230, w: 300, h: 14, oneWay: true });
        // سلالم للوصول إلى الأسطح والذكريات المرتفعة
        this.climbables.push({ x: 395, y: g - 245, w: 30, h: 245 });
        this.decor.push({ type: 'ladder', x: 395, y: g - 245, h: 245 });
        this.climbables.push({ x: 1135, y: g - 245, w: 30, h: 245 });
        this.decor.push({ type: 'ladder', x: 1135, y: g - 245, h: 245 });
        // صناديق مساعدة للقفز
        this.solids.push({ x: 620, y: g - 55, w: 55, h: 55 });
        this.decor.push({ type: 'crate', x: 620, y: g - 55, w: 55, h: 55 });

        /* ===== المنطقة 2: منتصف الشارع (2600 - 5400) ===== */
        this.decor.push({ type: 'sidewalk', x: 2600, y: g - 14, w: 2800 });
        // الدكان
        this.decor.push({ type: 'shop', x: 3050, y: g });
        this.solids.push({ x: 3050, y: g - 170, w: 340, h: 14, oneWay: true }); // سطح الدكان
        // الأرض الفاضية
        this.decor.push({ type: 'emptyLot', x: 3600, y: g, w: 700 });
        // أماكن تجمع
        this.decor.push({ type: 'benches', x: 4450, y: g });
        this.addHouse(2700, g, '#d4bc98', '#6a4a8a', 1);
        this.addHouse(4700, g, '#c8b8a0', '#3a6a7a', 2);
        this.addHouse(5100, g, '#dcc4a4', '#8a6a3a', 1);
        this.decor.push({ type: 'tree', x: 4300, y: g, size: 1.1 });
        this.decor.push({ type: 'car', x: 2850, y: g, color: '#e0c040' });
        // صناديق للقفز في الأرض الفاضية
        this.solids.push({ x: 3700, y: g - 60, w: 60, h: 60 });
        this.solids.push({ x: 3900, y: g - 110, w: 60, h: 110 });
        this.solids.push({ x: 4100, y: g - 60, w: 60, h: 60 });
        this.decor.push({ type: 'crate', x: 3700, y: g - 60, w: 60, h: 60 });
        this.decor.push({ type: 'crate', x: 3900, y: g - 110, w: 60, h: 110 });
        this.decor.push({ type: 'crate', x: 4100, y: g - 60, w: 60, h: 60 });

        /* ===== المنطقة 3: الأزقة (5400 - 7800) ===== */
        // جدران الأزقة تشكل ممرات
        const alleyWalls = [
            { x: 5500, w: 40, h: 260 },
            { x: 5900, w: 40, h: 180 },
            { x: 6300, w: 40, h: 260 },
            { x: 6700, w: 40, h: 200 },
            { x: 7100, w: 40, h: 260 },
            { x: 7500, w: 40, h: 180 }
        ];
        for (const wll of alleyWalls) {
            this.decor.push({ type: 'alleyWall', x: wll.x, y: g, w: wll.w, h: wll.h });
            this.solids.push({ x: wll.x, y: g - wll.h, w: wll.w, h: wll.h - 110 }); // فجوة سفلية = ممر سري
        }
        // منصات فوق الجدران
        this.solids.push({ x: 5450, y: g - 270, w: 140, h: 12, oneWay: true });
        this.solids.push({ x: 6250, y: g - 270, w: 140, h: 12, oneWay: true });
        this.solids.push({ x: 7050, y: g - 270, w: 140, h: 12, oneWay: true });
        // أماكن اختباء (حاويات)
        this.decor.push({ type: 'dumpster', x: 5700, y: g });
        this.decor.push({ type: 'dumpster', x: 6500, y: g });
        this.decor.push({ type: 'dumpster', x: 7300, y: g });
        this.decor.push({ type: 'alleyBg', x: 5400, y: g, w: 2400 });
        // سلم في الزقاق
        this.climbables.push({ x: 6320, y: g - 260, w: 30, h: 260 });
        this.decor.push({ type: 'ladder', x: 6320, y: g - 260, h: 260 });

        /* ===== المنطقة 4: المبنى المهجور (7800 - 10000) ===== */
        this.decor.push({ type: 'abandoned', x: 8200, y: g, w: 1400, floors: 3 });
        // طوابق المبنى
        const bx = 8200, bw = 1400;
        this.solids.push({ x: bx, y: g - 200, w: bw * 0.45, h: 16, oneWay: true });
        this.solids.push({ x: bx + bw * 0.55, y: g - 200, w: bw * 0.45, h: 16, oneWay: true });
        this.solids.push({ x: bx + bw * 0.2, y: g - 400, w: bw * 0.6, h: 16, oneWay: true });
        // سلالم المبنى
        this.climbables.push({ x: bx + 60, y: g - 200, w: 30, h: 200 });
        this.climbables.push({ x: bx + bw - 90, y: g - 400, w: 30, h: 400 });
        this.decor.push({ type: 'ladder', x: bx + 60, y: g - 200, h: 200 });
        this.decor.push({ type: 'ladder', x: bx + bw - 90, y: g - 400, h: 400 });
        // ركام
        this.solids.push({ x: 7900, y: g - 50, w: 90, h: 50 });
        this.decor.push({ type: 'rubble', x: 7900, y: g, w: 90 });
        this.solids.push({ x: 9750, y: g - 50, w: 90, h: 50 });
        this.decor.push({ type: 'rubble', x: 9750, y: g, w: 90 });

        /* ===== المنطقة 5: نهاية الشارع (10000 - 12000) ===== */
        this.decor.push({ type: 'sidewalk', x: 10000, y: g - 14, w: 2000 });
        this.decor.push({ type: 'arena', x: 10300, y: g, w: 1500 });
        this.addHouse(10050, g, '#b8a890', '#4a4a6a', 2);
        this.decor.push({ type: 'tree', x: 11850, y: g, size: 1.4 });
        // منصات ساحة المواجهة
        this.solids.push({ x: 10600, y: g - 120, w: 120, h: 14, oneWay: true });
        this.solids.push({ x: 11000, y: g - 200, w: 120, h: 14, oneWay: true });
        this.solids.push({ x: 11400, y: g - 120, w: 120, h: 14, oneWay: true });
        this.decor.push({ type: 'crate', x: 10600, y: g - 120, w: 120, h: 14 });
        this.decor.push({ type: 'crate', x: 11000, y: g - 200, w: 120, h: 14 });
        this.decor.push({ type: 'crate', x: 11400, y: g - 120, w: 120, h: 14 });

        // أعمدة إنارة على طول الشارع
        for (let x = 300; x < this.width; x += 800) {
            this.decor.push({ type: 'lamp', x, y: g });
        }
    }

    addHouse(x, g, wallColor, doorColor, floors) {
        const h = 120 + floors * 100;
        this.decor.push({ type: 'house', x, y: g, w: 300, h, wallColor, doorColor, floors });
        this.doors.push({ x: x + 120, y: g - 70, w: 55, h: 70 });
        // سطح البيت كمنصة
        this.solids.push({ x: x + 10, y: g - h, w: 280, h: 12, oneWay: true });
    }

    /* ---------- الذكريات والعناصر القابلة للجمع ---------- */
    spawnMemories(list) {
        this.collectibles = list.map(m => ({
            x: m.x, y: m.y, w: 26, h: 26, type: m.type || 'memory',
            collected: false, bob: Math.random() * Math.PI * 2
        }));
    }

    update(dt) {
        for (const c of this.collectibles) c.bob += dt * 3;
    }

    getZoneAt(x) {
        for (const z of GAME_DATA.world.zones) {
            if (x >= z.from && x < z.to) return z;
        }
        return GAME_DATA.world.zones[0];
    }

    /* =====================================================
       الرسم
    ===================================================== */
    draw(ctx, camera, time) {
        this.drawSky(ctx, camera);
        this.drawBackground(ctx, camera);

        // العناصر الزخرفية (مع قص خارج الشاشة)
        for (const d of this.decor) {
            const w = d.w || 400, h = d.h || 500;
            if (!camera.inView(d.x - 50, d.y - h - 100, w + 100, h + 200)) continue;
            this.drawDecor(ctx, d, time);
        }

        // الأرض
        this.drawGround(ctx, camera);

        // العناصر القابلة للجمع
        for (const c of this.collectibles) {
            if (c.collected || !camera.inView(c.x, c.y, c.w, c.h)) continue;
            this.drawCollectible(ctx, c);
        }
    }

    drawSky(ctx, camera) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const w = camera.viewW, h = camera.viewH;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        if (this.timeOfDay === 'night') {
            grad.addColorStop(0, '#0a0a2a');
            grad.addColorStop(0.7, '#1a1a4a');
            grad.addColorStop(1, '#2a2a5a');
        } else if (this.timeOfDay === 'sunset') {
            grad.addColorStop(0, '#3a2a6a');
            grad.addColorStop(0.5, '#c9584a');
            grad.addColorStop(1, '#f5a05a');
        } else {
            grad.addColorStop(0, '#5aa8e8');
            grad.addColorStop(0.7, '#a8d4f0');
            grad.addColorStop(1, '#e8d8b0');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // الشمس / القمر
        const px = w * 0.8 - camera.x * 0.02;
        if (this.timeOfDay === 'night') {
            ctx.fillStyle = '#f0f0d8';
            ctx.beginPath(); ctx.arc(px, h * 0.18, 34, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0a0a2a';
            ctx.beginPath(); ctx.arc(px + 12, h * 0.17, 28, 0, Math.PI * 2); ctx.fill();
            // نجوم ثابتة
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            for (let i = 0; i < 40; i++) {
                const sx = ((i * 137.5) % w);
                const sy = ((i * 89.3) % (h * 0.5));
                ctx.fillRect(sx, sy, 2, 2);
            }
        } else {
            ctx.fillStyle = this.timeOfDay === 'sunset' ? '#ff9a4a' : '#ffe27a';
            ctx.beginPath(); ctx.arc(px, h * 0.2, 40, 0, Math.PI * 2); ctx.fill();
        }
        // غيوم بسيطة
        ctx.fillStyle = 'rgba(255,255,255,' + (this.timeOfDay === 'night' ? 0.08 : 0.6) + ')';
        for (let i = 0; i < 5; i++) {
            const cx2 = ((i * 420 - camera.x * 0.08) % (w + 300)) - 150;
            const cy2 = 60 + (i % 3) * 55;
            ctx.beginPath();
            ctx.ellipse(cx2, cy2, 65, 20, 0, 0, Math.PI * 2);
            ctx.ellipse(cx2 + 40, cy2 - 10, 45, 17, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawBackground(ctx, camera) {
        // مبانٍ بعيدة (Parallax)
        ctx.save();
        ctx.setTransform(camera.zoom, 0, 0, camera.zoom, 0, 0);
        ctx.translate(-camera.x * 0.3, -camera.y * 0.15);
        const dark = this.timeOfDay === 'night';
        ctx.fillStyle = dark ? '#141432' : 'rgba(120,130,160,0.45)';
        for (let i = 0; i < 40; i++) {
            const bx = i * 460;
            const bh = 140 + ((i * 73) % 130);
            ctx.fillRect(bx, this.groundY + 60 - bh, 200 + (i % 3) * 60, bh);
            if (dark) {
                ctx.fillStyle = 'rgba(255,220,120,0.5)';
                for (let wY = 0; wY < 3; wY++)
                    if ((i + wY) % 3 !== 0) ctx.fillRect(bx + 30 + wY * 50, this.groundY - bh + 90 + wY * 6, 14, 14);
                ctx.fillStyle = '#141432';
            }
        }
        ctx.restore();
    }

    drawGround(ctx, camera) {
        const g = this.groundY;
        const from = Math.max(0, Math.floor(camera.x / 100) * 100 - 200);
        const to = Math.min(this.width, camera.x + camera.viewW / camera.zoom + 200);

        // الإسفلت
        const grad = ctx.createLinearGradient(0, g, 0, g + 200);
        grad.addColorStop(0, this.timeOfDay === 'night' ? '#2a2a38' : '#5a5a66');
        grad.addColorStop(1, this.timeOfDay === 'night' ? '#1a1a24' : '#3a3a44');
        ctx.fillStyle = grad;
        ctx.fillRect(from, g, to - from, 300);

        // خط الشارع المتقطع
        ctx.fillStyle = this.timeOfDay === 'night' ? 'rgba(220,220,160,0.35)' : 'rgba(240,240,200,0.75)';
        for (let x = Math.floor(from / 120) * 120; x < to; x += 120) {
            ctx.fillRect(x, g + 90, 55, 8);
        }
        // شقوق
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        for (let x = Math.floor(from / 300) * 300; x < to; x += 300) {
            ctx.beginPath();
            ctx.moveTo(x + 20, g + 10);
            ctx.lineTo(x + 45, g + 40);
            ctx.lineTo(x + 35, g + 70);
            ctx.stroke();
        }
    }

    drawCollectible(ctx, c) {
        const y = c.y + Math.sin(c.bob) * 6;
        ctx.save();
        if (c.type === 'memory') {
            // ذكرى: صورة فوتوغرافية متوهجة
            ctx.shadowColor = '#ffe98a';
            ctx.shadowBlur = 16;
            ctx.fillStyle = '#fff8e0';
            ctx.fillRect(c.x, y, 26, 26);
            ctx.fillStyle = '#7ab8e0';
            ctx.fillRect(c.x + 3, y + 3, 20, 14);
            ctx.fillStyle = '#e8a050';
            ctx.beginPath();
            ctx.arc(c.x + 9, y + 12, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4a8a4a';
            ctx.fillRect(c.x + 3, y + 13, 20, 4);
        } else {
            // كنز: عملة ذهبية
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(c.x + 13, y + 13, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#b8860b';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('★', c.x + 13, y + 18);
        }
        ctx.restore();
    }

    /* ---------- رسم العناصر الزخرفية ---------- */
    drawDecor(ctx, d, time) {
        const night = this.timeOfDay === 'night';
        switch (d.type) {
            case 'sidewalk': {
                ctx.fillStyle = night ? '#4a4a56' : '#9a9aa4';
                ctx.fillRect(d.x, d.y, d.w, 14);
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1;
                for (let x = d.x; x < d.x + d.w; x += 60) {
                    ctx.beginPath(); ctx.moveTo(x, d.y); ctx.lineTo(x, d.y + 14); ctx.stroke();
                }
                break;
            }
            case 'house': this.drawHouse(ctx, d, night); break;
            case 'tree': this.drawTree(ctx, d, time); break;
            case 'car': this.drawCar(ctx, d, night); break;
            case 'wall': {
                const grad = ctx.createLinearGradient(d.x, d.y - d.h, d.x, d.y);
                grad.addColorStop(0, night ? '#5a5044' : '#b8a888');
                grad.addColorStop(1, night ? '#4a4038' : '#98876a');
                ctx.fillStyle = grad;
                ctx.fillRect(d.x, d.y - d.h, d.w, d.h);
                // طوب
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                for (let y = d.y - d.h + 17; y < d.y; y += 17) {
                    ctx.beginPath(); ctx.moveTo(d.x, y); ctx.lineTo(d.x + d.w, y); ctx.stroke();
                }
                // كتابة على الجدار
                ctx.fillStyle = 'rgba(200,60,60,0.8)';
                ctx.font = 'bold 15px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('شارعنا', d.x + d.w / 2, d.y - d.h / 2);
                break;
            }
            case 'playground': this.drawPlayground(ctx, d, night); break;
            case 'shop': this.drawShop(ctx, d, night); break;
            case 'emptyLot': {
                ctx.fillStyle = night ? '#3a3428' : '#a89468';
                ctx.fillRect(d.x, d.y - 4, d.w, 8);
                // أعشاب
                ctx.strokeStyle = night ? '#2a4a2a' : '#5a8a3a';
                ctx.lineWidth = 2;
                for (let x = d.x + 15; x < d.x + d.w; x += 42) {
                    const sway = Math.sin(time * 2 + x) * 3;
                    ctx.beginPath();
                    ctx.moveTo(x, d.y);
                    ctx.quadraticCurveTo(x + sway, d.y - 14, x + sway * 1.5, d.y - 22);
                    ctx.moveTo(x + 5, d.y);
                    ctx.quadraticCurveTo(x + 5 + sway, d.y - 10, x + 5 + sway, d.y - 16);
                    ctx.stroke();
                }
                // إطار سيارة قديم
                ctx.strokeStyle = '#2a2a2a';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(d.x + d.w * 0.6, d.y - 15, 18, 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
            case 'benches': {
                for (let i = 0; i < 2; i++) {
                    const bx = d.x + i * 140;
                    ctx.fillStyle = night ? '#5a3a22' : '#8a5a32';
                    ctx.fillRect(bx, d.y - 34, 90, 8);
                    ctx.fillRect(bx, d.y - 60, 90, 8);
                    ctx.fillStyle = '#3a3a3a';
                    ctx.fillRect(bx + 6, d.y - 34, 7, 34);
                    ctx.fillRect(bx + 77, d.y - 34, 7, 34);
                }
                break;
            }
            case 'alleyBg': {
                ctx.fillStyle = night ? 'rgba(10,10,25,0.55)' : 'rgba(40,40,60,0.3)';
                ctx.fillRect(d.x, d.y - 320, d.w, 320);
                break;
            }
            case 'alleyWall': {
                const grad = ctx.createLinearGradient(d.x, d.y - d.h, d.x, d.y);
                grad.addColorStop(0, night ? '#3a3648' : '#8a8496');
                grad.addColorStop(1, night ? '#2a2636' : '#6a6478');
                ctx.fillStyle = grad;
                ctx.fillRect(d.x, d.y - d.h, d.w, d.h - 110);
                // الفتحة السفلية (ممر سري)
                ctx.fillStyle = 'rgba(0,0,0,0.55)';
                ctx.fillRect(d.x, d.y - 110, d.w, 110);
                ctx.strokeStyle = night ? '#4a4658' : '#9a94a6';
                ctx.lineWidth = 3;
                ctx.strokeRect(d.x, d.y - 110, d.w, 110);
                break;
            }
            case 'dumpster': {
                ctx.fillStyle = night ? '#1a4a3a' : '#2a6a4a';
                ctx.fillRect(d.x, d.y - 58, 110, 58);
                ctx.fillStyle = night ? '#155a40' : '#1a5a3a';
                ctx.fillRect(d.x - 5, d.y - 68, 120, 14);
                ctx.fillStyle = '#222';
                ctx.fillRect(d.x + 12, d.y - 8, 14, 8);
                ctx.fillRect(d.x + 84, d.y - 8, 14, 8);
                break;
            }
            case 'ladder': {
                ctx.strokeStyle = night ? '#6a5a3a' : '#8a7a4a';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(d.x + 4, d.y); ctx.lineTo(d.x + 4, d.y + d.h);
                ctx.moveTo(d.x + 26, d.y); ctx.lineTo(d.x + 26, d.y + d.h);
                ctx.stroke();
                ctx.lineWidth = 3;
                for (let y = d.y + 12; y < d.y + d.h; y += 24) {
                    ctx.beginPath(); ctx.moveTo(d.x + 4, y); ctx.lineTo(d.x + 26, y); ctx.stroke();
                }
                break;
            }
            case 'abandoned': this.drawAbandoned(ctx, d, night, time); break;
            case 'rubble': {
                ctx.fillStyle = night ? '#4a4448' : '#7a7478';
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x + d.w * 0.3, d.y - 50);
                ctx.lineTo(d.x + d.w * 0.7, d.y - 35);
                ctx.lineTo(d.x + d.w, d.y);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(d.x + 15, d.y - 20, 20, 8);
                break;
            }
            case 'arena': {
                // أعلام وزينة لساحة النهاية
                ctx.strokeStyle = '#8a6a4a';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(d.x, d.y - 260);
                ctx.quadraticCurveTo(d.x + d.w / 2, d.y - 200, d.x + d.w, d.y - 260);
                ctx.stroke();
                const flagColors = ['#e05a5a', '#e8c93a', '#4a9a5a', '#5a7ae0'];
                for (let i = 0; i < 24; i++) {
                    const t2 = i / 24;
                    const fx = d.x + t2 * d.w;
                    const fy = d.y - 260 + Math.sin(t2 * Math.PI) * 58;
                    ctx.fillStyle = flagColors[i % 4];
                    ctx.beginPath();
                    ctx.moveTo(fx, fy);
                    ctx.lineTo(fx + 14, fy);
                    ctx.lineTo(fx + 7, fy + 18);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
            }
            case 'lamp': {
                ctx.fillStyle = '#3a3a44';
                ctx.fillRect(d.x, d.y - 200, 8, 200);
                ctx.fillRect(d.x - 4, d.y - 206, 34, 8);
                ctx.fillStyle = night ? '#ffe27a' : '#c8c8d0';
                ctx.beginPath();
                ctx.arc(d.x + 26, d.y - 194, 8, 0, Math.PI * 2);
                ctx.fill();
                if (night) {
                    const lg = ctx.createRadialGradient(d.x + 26, d.y - 190, 5, d.x + 26, d.y - 100, 130);
                    lg.addColorStop(0, 'rgba(255,226,122,0.28)');
                    lg.addColorStop(1, 'rgba(255,226,122,0)');
                    ctx.fillStyle = lg;
                    ctx.beginPath();
                    ctx.moveTo(d.x + 26, d.y - 190);
                    ctx.lineTo(d.x - 60, d.y);
                    ctx.lineTo(d.x + 112, d.y);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
            }
            case 'crate': {
                ctx.fillStyle = night ? '#5a4630' : '#9a7a4a';
                ctx.fillRect(d.x, d.y, d.w, d.h);
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = 2;
                ctx.strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
                if (d.h > 20) {
                    ctx.beginPath();
                    ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.w, d.y + d.h);
                    ctx.moveTo(d.x + d.w, d.y); ctx.lineTo(d.x, d.y + d.h);
                    ctx.stroke();
                }
                break;
            }
        }
    }

    drawHouse(ctx, d, night) {
        const { x, y, w, h, wallColor, doorColor, floors } = d;
        // الجدران
        const grad = ctx.createLinearGradient(x, y - h, x, y);
        grad.addColorStop(0, wallColor);
        grad.addColorStop(1, this.shade(wallColor, -30));
        ctx.fillStyle = night ? this.shade(wallColor, -70) : grad;
        ctx.fillRect(x, y - h, w, h);
        // السطح
        ctx.fillStyle = night ? '#3a3230' : '#6a5a4a';
        ctx.fillRect(x - 10, y - h - 12, w + 20, 14);
        // الباب
        ctx.fillStyle = doorColor;
        ctx.fillRect(x + 120, y - 70, 55, 70);
        ctx.fillStyle = '#e8c93a';
        ctx.beginPath();
        ctx.arc(x + 165, y - 36, 3.5, 0, Math.PI * 2);
        ctx.fill();
        // النوافذ
        for (let f = 0; f < floors; f++) {
            const wy = y - 110 - f * 100;
            for (const wx of [x + 35, x + 215]) {
                ctx.fillStyle = night ? (Math.random() > 0.4 ? '#ffdf8a' : '#1a1a30') : '#a8d8f0';
                ctx.fillRect(wx, wy, 50, 44);
                ctx.strokeStyle = night ? '#2a2520' : '#fff';
                ctx.lineWidth = 3;
                ctx.strokeRect(wx, wy, 50, 44);
                ctx.beginPath();
                ctx.moveTo(wx + 25, wy); ctx.lineTo(wx + 25, wy + 44);
                ctx.stroke();
            }
        }
        // مكيّف
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(x + w - 70, y - h + 30, 36, 24);
    }

    drawTree(ctx, d, time) {
        const s = d.size;
        const sway = Math.sin(time * 1.2 + d.x) * 4 * s;
        // الجذع
        ctx.fillStyle = '#6a4a2a';
        ctx.beginPath();
        ctx.moveTo(d.x - 9 * s, d.y);
        ctx.quadraticCurveTo(d.x - 5 * s, d.y - 60 * s, d.x - 4 * s + sway * 0.3, d.y - 95 * s);
        ctx.lineTo(d.x + 4 * s + sway * 0.3, d.y - 95 * s);
        ctx.quadraticCurveTo(d.x + 5 * s, d.y - 60 * s, d.x + 9 * s, d.y);
        ctx.closePath();
        ctx.fill();
        // الأوراق
        const leaf = this.timeOfDay === 'night' ? '#1a3a22' : '#3a8a4a';
        const leaf2 = this.timeOfDay === 'night' ? '#14301c' : '#2f7a3f';
        ctx.fillStyle = leaf2;
        ctx.beginPath();
        ctx.arc(d.x - 30 * s + sway, d.y - 110 * s, 38 * s, 0, Math.PI * 2);
        ctx.arc(d.x + 30 * s + sway, d.y - 110 * s, 38 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = leaf;
        ctx.beginPath();
        ctx.arc(d.x + sway, d.y - 140 * s, 45 * s, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCar(ctx, d, night) {
        const c = night ? this.shade(d.color, -60) : d.color;
        // الهيكل
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - 22);
        ctx.lineTo(d.x + 22, d.y - 22);
        ctx.quadraticCurveTo(d.x + 34, d.y - 48, d.x + 62, d.y - 48);
        ctx.lineTo(d.x + 108, d.y - 48);
        ctx.quadraticCurveTo(d.x + 132, d.y - 48, d.x + 142, d.y - 22);
        ctx.lineTo(d.x + 160, d.y - 22);
        ctx.quadraticCurveTo(d.x + 166, d.y - 10, d.x + 158, d.y - 6);
        ctx.lineTo(d.x + 4, d.y - 6);
        ctx.quadraticCurveTo(d.x - 5, d.y - 12, d.x, d.y - 22);
        ctx.closePath();
        ctx.fill();
        // النوافذ
        ctx.fillStyle = night ? '#1a2a3a' : '#b8e0f0';
        ctx.beginPath();
        ctx.moveTo(d.x + 40, d.y - 44);
        ctx.lineTo(d.x + 104, d.y - 44);
        ctx.lineTo(d.x + 116, d.y - 24);
        ctx.lineTo(d.x + 32, d.y - 24);
        ctx.closePath();
        ctx.fill();
        // العجلات
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(d.x + 36, d.y - 4, 13, 0, Math.PI * 2);
        ctx.arc(d.x + 126, d.y - 4, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath();
        ctx.arc(d.x + 36, d.y - 4, 6, 0, Math.PI * 2);
        ctx.arc(d.x + 126, d.y - 4, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPlayground(ctx, d, night) {
        // زحليقة
        ctx.fillStyle = night ? '#8a3a3a' : '#e05a5a';
        ctx.beginPath();
        ctx.moveTo(d.x + 50, d.y - 90);
        ctx.lineTo(d.x + 70, d.y - 90);
        ctx.lineTo(d.x + 190, d.y);
        ctx.lineTo(d.x + 165, d.y);
        ctx.closePath();
        ctx.fill();
        // سلم الزحليقة
        ctx.strokeStyle = '#8a8a9a';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(d.x + 52, d.y); ctx.lineTo(d.x + 52, d.y - 90);
        ctx.moveTo(d.x + 68, d.y); ctx.lineTo(d.x + 68, d.y - 90);
        ctx.stroke();
        ctx.lineWidth = 3;
        for (let y = d.y - 15; y > d.y - 90; y -= 18) {
            ctx.beginPath(); ctx.moveTo(d.x + 52, y); ctx.lineTo(d.x + 68, y); ctx.stroke();
        }
        // أرجوحة
        ctx.strokeStyle = night ? '#5a4a6a' : '#7a5a9a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(d.x - 90, d.y);
        ctx.lineTo(d.x - 60, d.y - 100);
        ctx.lineTo(d.x - 0, d.y - 100);
        ctx.lineTo(d.x + 30, d.y);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#aaa';
        ctx.beginPath();
        ctx.moveTo(d.x - 40, d.y - 100); ctx.lineTo(d.x - 40, d.y - 35);
        ctx.moveTo(d.x - 18, d.y - 100); ctx.lineTo(d.x - 18, d.y - 35);
        ctx.stroke();
        ctx.fillStyle = '#e8c93a';
        ctx.fillRect(d.x - 46, d.y - 35, 34, 7);
    }

    drawShop(ctx, d, night) {
        const { x, y } = d;
        // المبنى
        ctx.fillStyle = night ? '#4a3a5a' : '#c9a86a';
        ctx.fillRect(x, y - 170, 340, 170);
        // اللافتة
        ctx.fillStyle = night ? '#8a2a2a' : '#d84a3a';
        ctx.fillRect(x - 8, y - 195, 356, 34);
        ctx.fillStyle = '#fff8e0';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('دكان الشارع', x + 170, y - 171);
        // الواجهة
        ctx.fillStyle = night ? '#2a2a44' : '#a8d8f0';
        ctx.fillRect(x + 20, y - 145, 130, 100);
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 5;
        ctx.strokeRect(x + 20, y - 145, 130, 100);
        // البضائع في الواجهة
        const goods = ['#e05a5a', '#e8c93a', '#4a9a5a', '#5a7ae0', '#e08a3a', '#9a5ae0'];
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = goods[i];
            ctx.fillRect(x + 32 + (i % 3) * 38, y - 130 + Math.floor(i / 3) * 45, 26, 30);
        }
        // الباب
        ctx.fillStyle = night ? '#3a2a1a' : '#6a4a2a';
        ctx.fillRect(x + 200, y - 130, 70, 130);
        ctx.fillStyle = '#e8c93a';
        ctx.beginPath();
        ctx.arc(x + 212, y - 66, 4, 0, Math.PI * 2);
        ctx.fill();
        // المظلة
        ctx.fillStyle = night ? '#5a4a2a' : '#e8b93a';
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = i % 2 === 0 ? (night ? '#5a4a2a' : '#e8b93a') : (night ? '#4a3222' : '#d87a3a');
            ctx.beginPath();
            ctx.arc(x + 54 + i * 62, y - 145, 31, Math.PI, 0);
            ctx.fill();
        }
        // صناديق أمام الدكان
        ctx.fillStyle = night ? '#5a4630' : '#9a7a4a';
        ctx.fillRect(x + 290, y - 40, 44, 40);
    }

    drawAbandoned(ctx, d, night, time) {
        const { x, y, w } = d;
        const h = 460;
        // الهيكل
        const grad = ctx.createLinearGradient(x, y - h, x, y);
        grad.addColorStop(0, night ? '#2a2432' : '#6a6272');
        grad.addColorStop(1, night ? '#1e1a26' : '#524a5e');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y - h, w, h);
        // سقف متهدم
        ctx.fillStyle = night ? '#1a1620' : '#3a3442';
        ctx.beginPath();
        ctx.moveTo(x - 15, y - h);
        ctx.lineTo(x + w * 0.3, y - h - 25);
        ctx.lineTo(x + w * 0.5, y - h - 5);
        ctx.lineTo(x + w * 0.75, y - h - 30);
        ctx.lineTo(x + w + 15, y - h);
        ctx.closePath();
        ctx.fill();
        // النوافذ المكسورة
        for (let f = 0; f < 3; f++) {
            for (let i = 0; i < 6; i++) {
                const wx = x + 60 + i * (w - 140) / 5;
                const wy = y - 120 - f * 145;
                ctx.fillStyle = night ? '#0a0a12' : '#1a1a24';
                ctx.fillRect(wx, wy, 56, 66);
                // زجاج مكسور
                ctx.strokeStyle = night ? 'rgba(140,150,180,0.35)' : 'rgba(200,210,230,0.5)';
                ctx.lineWidth = 2;
                if ((i + f) % 3 !== 0) {
                    ctx.beginPath();
                    ctx.moveTo(wx + 8, wy + 6);
                    ctx.lineTo(wx + 30, wy + 34);
                    ctx.lineTo(wx + 14, wy + 58);
                    ctx.moveTo(wx + 44, wy + 10);
                    ctx.lineTo(wx + 30, wy + 34);
                    ctx.stroke();
                }
                // ضوء غامض متذبذب في بعض النوافذ
                if (night && (i * 7 + f * 3) % 11 === 0) {
                    ctx.fillStyle = `rgba(160,220,120,${0.15 + Math.sin(time * 3 + i) * 0.1})`;
                    ctx.fillRect(wx, wy, 56, 66);
                }
            }
        }
        // مدخل كبير
        ctx.fillStyle = '#0a0a10';
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - 55, y);
        ctx.lineTo(x + w / 2 - 55, y - 105);
        ctx.quadraticCurveTo(x + w / 2, y - 145, x + w / 2 + 55, y - 105);
        ctx.lineTo(x + w / 2 + 55, y);
        ctx.closePath();
        ctx.fill();
        // ألواح خشبية على المدخل
        ctx.strokeStyle = night ? '#4a3a26' : '#6a5636';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - 60, y - 30);
        ctx.lineTo(x + w / 2 + 60, y - 80);
        ctx.moveTo(x + w / 2 - 60, y - 90);
        ctx.lineTo(x + w / 2 + 60, y - 40);
        ctx.stroke();
        // شقوق بالجدار
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 30, y - h + 40);
        ctx.lineTo(x + 80, y - h + 130);
        ctx.lineTo(x + 60, y - h + 210);
        ctx.moveTo(x + w - 50, y - 60);
        ctx.lineTo(x + w - 110, y - 150);
        ctx.stroke();
        // لافتة مائلة
        ctx.save();
        ctx.translate(x + w - 160, y - h + 80);
        ctx.rotate(0.15);
        ctx.fillStyle = night ? '#3a3226' : '#7a6a4a';
        ctx.fillRect(0, 0, 120, 30);
        ctx.fillStyle = 'rgba(255,240,200,0.6)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ممنوع الدخول', 60, 20);
        ctx.restore();
    }

    shade(hex, amt) {
        const n = parseInt(hex.slice(1), 16);
        const r = Math.max(0, Math.min(255, (n >> 16) + amt));
        const g2 = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
        const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
        return `rgb(${r},${g2},${b})`;
    }
}
