/* =====================================================
   اللاعب — الحركة، القدرات، الرسوم الكرتونية البرمجية
===================================================== */
'use strict';

class Player {
    constructor(charData, x, y, playerIndex) {
        this.char = charData;
        this.playerIndex = playerIndex || 0;
        this.x = x; this.y = y;
        this.w = 34; this.h = 58;
        this.vx = 0; this.vy = 0;
        this.facing = 1;
        this.onGround = false;
        this.climbing = false;
        this.hitWall = false;

        this.maxHealth = 100;
        this.health = 100;
        this.alive = true;
        this.invulnTime = 0;

        // القدرة
        this.abilityCooldown = 0;
        this.abilityActive = 0;      // زمن متبقٍ للقدرة
        this.frozen = 0;             // مجمّد (قدرة العين)
        this.stunned = 0;

        // الرسوم المتحركة
        this.animTime = 0;
        this.state = 'idle';         // idle | run | jump | fall | climb | ability | hurt
        this.stepTimer = 0;
        this.wasOnGround = false;

        // خصائص مشتقة من الإحصائيات
        const P = GAME_DATA.physics;
        this.moveSpeed = P.walkSpeed * (0.75 + this.char.stats.speed * 0.11);
        this.attackPower = 8 + this.char.stats.power * 4;
        this.score = 0;

        // حالة الوضع الجماعي
        this.itTag = false;          // للمطاردة
        this.hasBall = false;        // للكرة الذهبية
        this.hidden = false;         // للغميضة / التمويه
        this.attackAnim = 0;

        // الأونلاين
        this.remote = false;         // لاعب من جهاز آخر
        this.netId = null;
        this.netTarget = null;
    }

    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }

    respawn(x, y) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.health = this.maxHealth;
        this.alive = true;
        this.frozen = 0; this.stunned = 0;
        this.invulnTime = 1.5;
    }

    /* ---------- التحديث ---------- */
    update(dt, input, world, game) {
        const P = GAME_DATA.physics;
        this.animTime += dt;
        if (this.abilityCooldown > 0) this.abilityCooldown -= dt;
        if (this.abilityActive > 0) this.abilityActive -= dt;
        if (this.invulnTime > 0) this.invulnTime -= dt;
        if (this.attackAnim > 0) this.attackAnim -= dt;

        if (this.frozen > 0) {
            this.frozen -= dt;
            this.vx *= 0.8;
            Physics.moveEntity(this, world.solids, dt);
            return;
        }
        if (this.stunned > 0) {
            this.stunned -= dt;
            this.vx *= 0.9;
            Physics.moveEntity(this, world.solids, dt);
            this.state = 'hurt';
            return;
        }
        if (!this.alive) return;

        // التمويه (علوني)
        const cloaked = this.char.ability.id === 'tamweh' && this.abilityActive > 0;
        this.hidden = cloaked;

        // سرعة فعلية
        let speed = this.moveSpeed;
        if (input.run) speed *= P.runMultiplier;
        if (cloaked) speed *= 1.45;

        // التسلق
        const canClimb = Physics.touchingClimbable(this, world.climbables);
        if (canClimb && (input.up || (this.climbing && input.down))) {
            this.climbing = true;
        }
        if (!canClimb) this.climbing = false;

        if (this.climbing) {
            this.vy = 0;
            if (input.up) this.vy = -P.climbSpeed;
            else if (input.down) this.vy = P.climbSpeed;
            if (input.left) { this.vx = -speed * 0.5; this.facing = -1; }
            else if (input.right) { this.vx = speed * 0.5; this.facing = 1; }
            else this.vx = 0;
            if (input.jumpPressed) {
                this.climbing = false;
                this.vy = P.jumpVelocity * 0.8;
                Audio2.play('jump');
            }
            this.state = 'climb';
        } else {
            // الحركة الأفقية
            if (input.left) { this.vx = -speed * (this.onGround ? 1 : P.airControl); this.facing = -1; }
            else if (input.right) { this.vx = speed * (this.onGround ? 1 : P.airControl); this.facing = 1; }
            else this.vx *= this.onGround ? P.friction : 0.96;

            // القفز
            if (input.jumpPressed && this.onGround) {
                this.vy = P.jumpVelocity;
                Audio2.play('jump');
                game.particles.dust(this.cx, this.y + this.h, 5);
            }
            // قفزة قصيرة عند ترك الزر
            if (!input.jump && this.vy < -260) this.vy = -260;
        }

        // القدرة
        if (input.ability && this.abilityCooldown <= 0) {
            this.useAbility(game, world);
        }

        // الهجوم
        if (input.attack && this.attackAnim <= 0) {
            this.attack(game, world);
        }

        this.hitWall = false;
        Physics.moveEntity(this, world.solids, dt);

        // صوت الهبوط + غبار
        if (this.onGround && !this.wasOnGround && this.vy >= 0) {
            Audio2.play('land');
            game.particles.dust(this.cx, this.y + this.h, 6);
        }
        this.wasOnGround = this.onGround;

        // غبار الجري + صوت الخطوات
        if (this.onGround && Math.abs(this.vx) > 120) {
            this.stepTimer -= dt;
            if (this.stepTimer <= 0) {
                this.stepTimer = 0.28 - Math.abs(this.vx) * 0.0002;
                Audio2.play('step');
                game.particles.dust(this.cx - this.facing * 10, this.y + this.h, 2);
            }
        }

        // خطوط سرعة أثناء الخطفة
        if (this.char.ability.id === 'khatfa' && this.abilityActive > 0) {
            game.particles.speedLines(this.cx, this.cy, this.facing, this.char.colors.accent);
        }

        // تحديد حالة الرسوم
        if (this.abilityActive > 0 && this.char.ability.id !== 'tamweh') this.state = 'ability';
        else if (this.climbing) this.state = 'climb';
        else if (!this.onGround) this.state = this.vy < 0 ? 'jump' : 'fall';
        else if (Math.abs(this.vx) > 30) this.state = 'run';
        else this.state = 'idle';

        // السقوط خارج العالم
        if (this.y > 1200) {
            this.takeDamage(25, this.cx, game);
            this.respawn(Math.max(60, this.x - 200), 300);
        }
    }

    /* ---------- القدرات الخاصة ---------- */
    useAbility(game, world) {
        const ab = this.char.ability;
        this.abilityCooldown = ab.cooldown;
        this.abilityActive = ab.duration;
        Audio2.play('ability_' + ab.id);

        switch (ab.id) {
            case 'nida': // علي: تشتيت الأعداء القريبين
                game.particles.wave(this.cx, this.cy, '#5ec8ff');
                game.particles.wave(this.cx, this.cy - 20, '#8ad4ff');
                for (const e of world.enemies) {
                    if (e.alive && Physics.dist(this, e) < 420) {
                        e.distract(ab.duration + 1.5);
                    }
                }
                game.camera.shake(4, 0.2);
                break;

            case 'khatfa': // عاصم: اندفاع سريع
                this.vx = this.facing * 900;
                this.vy = 0;
                this.invulnTime = Math.max(this.invulnTime, 0.3);
                game.particles.speedLines(this.cx, this.cy, this.facing, '#ff9d3c');
                break;

            case 'dafaa': // عبد العليم: دفع كل شيء أمامه
                game.particles.wave(this.cx + this.facing * 30, this.cy, '#a8e063');
                game.camera.shake(8, 0.25);
                for (const e of world.enemies) {
                    if (e.alive && Physics.dist(this, e) < 200 &&
                        Math.sign(e.cx - this.cx) === this.facing) {
                        Physics.knockback(e, this.cx, 700, 400);
                        e.takeDamage(this.attackPower * 1.5, this.cx, game);
                        e.stunned = Math.max(e.stunned, 1);
                    }
                }
                // دفع اللاعبين الآخرين في وضع شارعنا
                if (game.otherPlayers) {
                    for (const p of game.otherPlayers(this)) {
                        if (Physics.dist(this, p) < 200 && Math.sign(p.cx - this.cx) === this.facing) {
                            if (p.remote && game.online) {
                                game.online.sendEffect(p.netId, { push: [this.cx, 750, 420], stun: 0.8 });
                            } else {
                                Physics.knockback(p, this.cx, 750, 420);
                                p.stunned = Math.max(p.stunned, 0.8);
                            }
                            Audio2.play('hit');
                        }
                    }
                }
                break;

            case 'ain': // صديق: تجميد أقرب خصم
                {
                    let best = null, bd = 500;
                    for (const e of world.enemies) {
                        if (e.alive) {
                            const d = Physics.dist(this, e);
                            if (d < bd) { bd = d; best = e; }
                        }
                    }
                    if (game.otherPlayers) {
                        for (const p of game.otherPlayers(this)) {
                            const d = Physics.dist(this, p);
                            if (d < bd) { bd = d; best = p; }
                        }
                    }
                    if (best) {
                        if (best.remote && game.online) {
                            game.online.sendEffect(best.netId, { frz: ab.duration });
                        } else {
                            best.frozen = ab.duration;
                        }
                        game.particles.sparkle(best.cx, best.cy, '#c8a2ff');
                        Audio2.play('stun');
                    }
                }
                break;

            case 'tamweh': // علوني: اختفاء وزيادة سرعة (مطبق في update)
                game.particles.sparkle(this.cx, this.cy, '#fff3a0');
                break;
        }
    }

    /* ---------- تحديث لاعب بعيد (أونلاين) ---------- */
    applyNetState(d) {
        // تصحيح فوري للقفزات الكبيرة
        if (!this.netTarget || Math.abs(d.x - this.x) > 250 || Math.abs(d.y - this.y) > 250) {
            this.x = d.x; this.y = d.y;
        }
        this.netTarget = d;
        if (d.atk && this.attackAnim <= 0) { this.attackAnim = 0.3; }
        if (d.abl) this.abilityActive = Math.max(this.abilityActive, 0.3);
    }

    netUpdate(dt) {
        this.animTime += dt;
        if (this.invulnTime > 0) this.invulnTime -= dt;
        if (this.attackAnim > 0) this.attackAnim -= dt;
        if (this.abilityActive > 0) this.abilityActive -= dt;
        if (this.frozen > 0) this.frozen -= dt;
        if (this.stunned > 0) this.stunned -= dt;
        const t = this.netTarget;
        if (!t) return;
        const k = Math.min(1, dt * 14);
        this.x += (t.x - this.x) * k;
        this.y += (t.y - this.y) * k;
        this.vx = t.vx;
        this.facing = t.f;
        this.health = t.hp;
        this.state = t.s || 'idle';
        this.hidden = !!t.hid;
        if (t.hp <= 0 && this.alive) this.alive = false;
        if (t.hp > 0 && !this.alive && !this.eliminated) this.alive = true;
    }

    /* ---------- الهجوم القريب ---------- */
    attack(game, world) {
        this.attackAnim = 0.3;
        Audio2.play('hit');
        const range = { x: this.facing === 1 ? this.x + this.w : this.x - 46, y: this.y, w: 46, h: this.h };
        let landed = false;
        for (const e of world.enemies) {
            if (e.alive && Physics.aabb(range, e)) {
                e.takeDamage(this.attackPower, this.cx, game);
                landed = true;
            }
        }
        if (game.otherPlayers) {
            for (const p of game.otherPlayers(this)) {
                if (p.alive && p.invulnTime <= 0 && Physics.aabb(range, p)) {
                    p.takeDamage(this.attackPower, this.cx, game);
                    Physics.knockback(p, this.cx, 420, 280);
                    landed = true;
                    if (game.onPlayerHit) game.onPlayerHit(this, p);
                }
            }
        }
        if (landed) game.camera.shake(5, 0.15);
    }

    takeDamage(amount, fromX, game) {
        if (this.invulnTime > 0 || !this.alive) return false;
        // لاعب بعيد: يُرسل التأثير لصاحبه عبر الشبكة (هو المرجع)
        if (this.remote && game && game.online) {
            game.online.sendEffect(this.netId, { dmg: amount, fx: fromX });
            game.particles.hit(this.cx, this.cy, '#ff6a6a');
            this.invulnTime = 0.5;
            return false;
        }
        this.health -= amount;
        this.invulnTime = 0.8;
        this.stunned = Math.max(this.stunned, 0.25);
        Physics.knockback(this, fromX, 350, 260);
        Audio2.play('hurt');
        game.particles.hit(this.cx, this.cy, '#ff6a6a');
        if (game.settingsShake()) game.camera.shake(6, 0.2);
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            game.onPlayerDown && game.onPlayerDown(this);
        }
        return true;
    }

    /* ---------- الرسم الكرتوني البرمجي ---------- */
    draw(ctx) {
        const c = this.char.colors;
        const t = this.animTime;
        ctx.save();

        // وميض عند تلقي الضرر
        if (this.invulnTime > 0 && Math.floor(t * 12) % 2 === 0 && this.alive) ctx.globalAlpha = 0.4;
        // التمويه
        if (this.hidden) ctx.globalAlpha = 0.25;
        // التجميد
        if (this.frozen > 0) ctx.filter = 'none';

        ctx.translate(this.x + this.w / 2, this.y + this.h);
        ctx.scale(this.facing, 1);

        // حركة الرسوم حسب الحالة
        let bob = 0, legSwing = 0, armSwing = 0, lean = 0;
        switch (this.state) {
            case 'idle':
                bob = Math.sin(t * 3) * 1.5;
                armSwing = Math.sin(t * 3) * 0.06;
                break;
            case 'run':
                legSwing = Math.sin(t * 14) * 0.7;
                armSwing = Math.sin(t * 14 + Math.PI) * 0.55;
                bob = Math.abs(Math.sin(t * 14)) * 3;
                lean = 0.1;
                break;
            case 'jump': legSwing = -0.5; armSwing = -0.9; lean = 0.06; break;
            case 'fall': legSwing = 0.4; armSwing = 0.5; break;
            case 'climb':
                legSwing = Math.sin(t * 8) * 0.5;
                armSwing = Math.sin(t * 8 + Math.PI) * 0.6;
                break;
            case 'ability': armSwing = -1.3; bob = -2; break;
            case 'hurt': lean = -0.2; break;
        }
        if (this.attackAnim > 0) armSwing = -1.5 + (0.3 - this.attackAnim) * 6;

        ctx.rotate(lean);
        const H = this.h;

        // الظل
        ctx.restore();
        ctx.save();
        if (this.onGround) {
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(this.cx, this.y + this.h + 2, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        if (this.invulnTime > 0 && Math.floor(t * 12) % 2 === 0 && this.alive) ctx.globalAlpha = 0.4;
        if (this.hidden) ctx.globalAlpha = 0.25;
        ctx.translate(this.x + this.w / 2, this.y + this.h - bob);
        ctx.scale(this.facing, 1);
        ctx.rotate(lean);

        // الأرجل
        ctx.strokeStyle = c.pants;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-4, -H * 0.42);
        ctx.lineTo(-4 + Math.sin(legSwing) * 12, -2);
        ctx.moveTo(5, -H * 0.42);
        ctx.lineTo(5 - Math.sin(legSwing) * 12, -2);
        ctx.stroke();
        // الأحذية
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-4 + Math.sin(legSwing) * 12 + 3, -2, 7, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(5 - Math.sin(legSwing) * 12 + 3, -2, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // الجسم (القميص)
        const grad = ctx.createLinearGradient(0, -H * 0.75, 0, -H * 0.4);
        grad.addColorStop(0, c.shirt);
        grad.addColorStop(1, this.shade(c.shirt, -25));
        ctx.fillStyle = grad;
        this.roundRect(ctx, -12, -H * 0.78, 24, H * 0.38, 7);
        ctx.fill();

        // الذراع الخلفية
        ctx.strokeStyle = this.shade(c.shirt, -35);
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-8, -H * 0.7);
        ctx.lineTo(-8 - Math.sin(armSwing) * 13, -H * 0.48 + Math.cos(armSwing) * 5);
        ctx.stroke();
        ctx.fillStyle = c.skin;
        ctx.beginPath();
        ctx.arc(-8 - Math.sin(armSwing) * 13, -H * 0.48 + Math.cos(armSwing) * 5, 4, 0, Math.PI * 2);
        ctx.fill();

        // ===== الرأس والوجه =====
        const hy = -H * 0.88; // مركز الرأس
        // الأذن الخلفية
        ctx.fillStyle = this.shade(c.skin, -20);
        ctx.beginPath();
        ctx.arc(-10, hy + 1, 4, 0, Math.PI * 2);
        ctx.fill();
        // الرأس
        ctx.fillStyle = c.skin;
        ctx.beginPath();
        ctx.arc(2, hy, 14, 0, Math.PI * 2);
        ctx.fill();
        // الشعر (غرة كاملة مع خصلات)
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        ctx.arc(2, hy - 1, 14, Math.PI * 0.85, Math.PI * 2.1);
        ctx.quadraticCurveTo(14, hy - 8, 10, hy - 4);
        ctx.quadraticCurveTo(7, hy - 9, 3, hy - 6);
        ctx.quadraticCurveTo(-1, hy - 10, -5, hy - 6);
        ctx.quadraticCurveTo(-9, hy - 9, -11, hy - 3);
        ctx.closePath();
        ctx.fill();
        // رمش العين كل ~3.2 ثانية
        const blink = (t % 3.2) > 3.05;
        if (blink) {
            ctx.strokeStyle = '#3a2a1a';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(2, hy - 0.5); ctx.lineTo(7, hy - 0.5);
            ctx.moveTo(10, hy - 0.5); ctx.lineTo(14, hy - 0.5);
            ctx.stroke();
        } else {
            // بياض العينين
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(5, hy - 1, 3, 3.6, 0, 0, Math.PI * 2);
            ctx.ellipse(12, hy - 1, 3, 3.6, 0, 0, Math.PI * 2);
            ctx.fill();
            // البؤبؤ (ينظر باتجاه الحركة)
            ctx.fillStyle = '#241a10';
            ctx.beginPath();
            ctx.arc(6, hy - 0.5, 1.7, 0, Math.PI * 2);
            ctx.arc(13, hy - 0.5, 1.7, 0, Math.PI * 2);
            ctx.fill();
            // لمعة العين
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(6.7, hy - 1.3, 0.6, 0, Math.PI * 2);
            ctx.arc(13.7, hy - 1.3, 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        // الحاجبان
        ctx.strokeStyle = c.hair;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(2.5, hy - 5.5); ctx.lineTo(7.5, hy - 6);
        ctx.moveTo(10, hy - 6); ctx.lineTo(14.5, hy - 5.5);
        ctx.stroke();
        // الأنف
        ctx.strokeStyle = this.shade(c.skin, -50);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(9, hy + 1.5);
        ctx.quadraticCurveTo(10.8, hy + 3.5, 9, hy + 4.5);
        ctx.stroke();
        // الفم (ابتسامة واضحة)
        ctx.fillStyle = '#7a3a2e';
        ctx.beginPath();
        ctx.moveTo(4, hy + 6.5);
        ctx.quadraticCurveTo(9, hy + 10.5, 13.5, hy + 6.5);
        ctx.quadraticCurveTo(9, hy + 8.2, 4, hy + 6.5);
        ctx.closePath();
        ctx.fill();
        // الخد
        ctx.fillStyle = 'rgba(230,120,100,0.28)';
        ctx.beginPath();
        ctx.ellipse(1, hy + 5, 2.6, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // الذراع الأمامية
        ctx.strokeStyle = c.shirt;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(8, -H * 0.7);
        ctx.lineTo(8 + Math.sin(armSwing) * 14, -H * 0.48 - (this.attackAnim > 0 ? 10 : 0) + Math.cos(armSwing) * 5);
        ctx.stroke();
        ctx.fillStyle = c.skin;
        ctx.beginPath();
        ctx.arc(8 + Math.sin(armSwing) * 14, -H * 0.48 - (this.attackAnim > 0 ? 10 : 0) + Math.cos(armSwing) * 5, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // شارة مميزة (accent) على الصدر
        ctx.fillStyle = c.accent;
        ctx.beginPath();
        ctx.arc(2, -H * 0.62, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // مؤشرات الحالة فوق الرأس
        ctx.save();
        if (this.frozen > 0) {
            ctx.fillStyle = 'rgba(150,200,255,0.9)';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('❄', this.cx, this.y - 12);
            ctx.strokeStyle = 'rgba(150,200,255,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - 3, this.y - 3, this.w + 6, this.h + 6);
        }
        if (this.itTag) {
            ctx.fillStyle = '#ff4a4a';
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('مطارد!', this.cx, this.y - 26);
        }
        if (this.hasBall) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(this.cx, this.y - 18, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#b8860b';
            ctx.stroke();
        }
        ctx.restore();
    }

    /* اسم اللاعب فوق الرأس (وضع شارعنا) */
    drawTag(ctx, color) {
        ctx.save();
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        ctx.strokeText(this.char.name, this.cx, this.y - 8);
        ctx.fillText(this.char.name, this.cx, this.y - 8);
        ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    shade(hex, amt) {
        const n = parseInt(hex.slice(1), 16);
        const r = Math.max(0, Math.min(255, (n >> 16) + amt));
        const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
        const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
        return `rgb(${r},${g},${b})`;
    }
}
