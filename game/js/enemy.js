/* =====================================================
   الأعداء — آلة حالات AI + خالد بوس + نورالدين بوس
   الحالات: IDLE, PATROL, CHASE, ATTACK, STUN, RETURN
===================================================== */
'use strict';

class Enemy {
    constructor(x, y, opts) {
        opts = opts || {};
        this.x = x; this.y = y;
        this.homeX = x;
        this.w = opts.w || 36; this.h = opts.h || 60;
        this.vx = 0; this.vy = 0;
        this.facing = -1;
        this.onGround = false;
        this.climbing = false;

        this.type = opts.type || 'thug';
        this.maxHealth = opts.health || 40;
        this.health = this.maxHealth;
        this.alive = true;
        this.speed = opts.speed || 150;
        this.chaseSpeed = opts.chaseSpeed || 230;
        this.damage = opts.damage || 12;
        this.sightRange = opts.sightRange || 420;
        this.attackRange = opts.attackRange || 55;
        this.patrolRange = opts.patrolRange || 250;

        this.state = 'IDLE';
        this.stateTime = 0;
        this.attackCd = 0;
        this.stunned = 0;
        this.frozen = 0;
        this.distracted = 0;
        this.animTime = Math.random() * 10;
        this.invulnTime = 0;

        this.colors = opts.colors || { skin: '#d8a878', shirt: '#5a5a6a', pants: '#33333d', hair: '#222' };
    }

    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }

    distract(time) {
        this.distracted = time;
        this.setState('STUN');
    }

    setState(s) {
        if (this.state !== s) {
            this.state = s;
            this.stateTime = 0;
        }
    }

    /* أقرب لاعب مرئي */
    nearestPlayer(players) {
        let best = null, bd = Infinity;
        for (const p of players) {
            if (!p.alive || p.hidden) continue;
            const d = Physics.dist(this, p);
            if (d < bd) { bd = d; best = p; }
        }
        return { player: best, dist: bd };
    }

    update(dt, world, players, game) {
        if (!this.alive) return;
        this.animTime += dt;
        this.stateTime += dt;
        if (this.attackCd > 0) this.attackCd -= dt;
        if (this.invulnTime > 0) this.invulnTime -= dt;

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
            return;
        }
        if (this.distracted > 0) {
            this.distracted -= dt;
            // يتلفّت مشوشًا
            this.vx = 0;
            this.facing = Math.sin(this.animTime * 6) > 0 ? 1 : -1;
            Physics.moveEntity(this, world.solids, dt);
            return;
        }

        const { player, dist } = this.nearestPlayer(players);

        switch (this.state) {
            case 'IDLE':
                this.vx *= 0.85;
                if (this.stateTime > 1.5 + Math.random()) this.setState('PATROL');
                if (player && dist < this.sightRange) this.setState('CHASE');
                break;

            case 'PATROL': {
                const dir = Math.sin(this.stateTime * 0.7) > 0 ? 1 : -1;
                this.vx = dir * this.speed * 0.6;
                this.facing = dir;
                if (Math.abs(this.x - this.homeX) > this.patrolRange) {
                    this.vx = Math.sign(this.homeX - this.x) * this.speed * 0.6;
                    this.facing = Math.sign(this.vx) || 1;
                }
                if (this.stateTime > 4) this.setState('IDLE');
                if (player && dist < this.sightRange) this.setState('CHASE');
                break;
            }

            case 'CHASE':
                if (!player || dist > this.sightRange * 1.4) { this.setState('RETURN'); break; }
                this.facing = Math.sign(player.cx - this.cx) || 1;
                this.vx = this.facing * this.chaseSpeed;
                // قفز فوق العوائق
                if (this.hitWall && this.onGround) this.vy = -650;
                if (dist < this.attackRange) this.setState('ATTACK');
                break;

            case 'ATTACK':
                this.vx *= 0.7;
                if (player) this.facing = Math.sign(player.cx - this.cx) || 1;
                if (this.attackCd <= 0 && player && dist < this.attackRange + 15) {
                    this.attackCd = 1.1;
                    player.takeDamage(this.damage, this.cx, game);
                }
                if (!player || dist > this.attackRange * 1.6) this.setState('CHASE');
                break;

            case 'STUN':
                this.vx *= 0.85;
                if (this.stateTime > 1.2) this.setState('RETURN');
                break;

            case 'RETURN': {
                const dx = this.homeX - this.x;
                if (Math.abs(dx) < 20) { this.setState('IDLE'); this.vx = 0; break; }
                this.vx = Math.sign(dx) * this.speed * 0.7;
                this.facing = Math.sign(dx) || 1;
                if (player && dist < this.sightRange * 0.8) this.setState('CHASE');
                break;
            }
        }

        this.hitWall = false;
        Physics.moveEntity(this, world.solids, dt);
    }

    takeDamage(amount, fromX, game) {
        if (!this.alive || this.invulnTime > 0) return;
        this.health -= amount;
        this.invulnTime = 0.25;
        this.stunned = Math.max(this.stunned, 0.3);
        Physics.knockback(this, fromX, 300, 220);
        game.particles.hit(this.cx, this.cy, '#ffd0a0');
        Audio2.play('hit');
        if (this.health <= 0) {
            this.alive = false;
            game.particles.hit(this.cx, this.cy, '#fff');
            game.particles.sparkle(this.cx, this.cy, '#ffaa5e');
            game.onEnemyDown && game.onEnemyDown(this);
        }
    }

    /* رسم عدو عادي */
    draw(ctx) {
        if (!this.alive) return;
        const c = this.colors;
        const t = this.animTime;
        ctx.save();
        if (this.invulnTime > 0) ctx.globalAlpha = 0.5;

        const running = Math.abs(this.vx) > 40;
        const legSwing = running ? Math.sin(t * 12) * 0.6 : 0;
        const bob = running ? Math.abs(Math.sin(t * 12)) * 2 : Math.sin(t * 2.5);

        ctx.translate(this.cx, this.y + this.h - bob);
        ctx.scale(this.facing, 1);
        const H = this.h;

        // الأرجل
        ctx.strokeStyle = c.pants;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-4, -H * 0.42); ctx.lineTo(-4 + Math.sin(legSwing) * 11, -2);
        ctx.moveTo(5, -H * 0.42); ctx.lineTo(5 - Math.sin(legSwing) * 11, -2);
        ctx.stroke();
        // الجسم
        ctx.fillStyle = c.shirt;
        ctx.fillRect(-12, -H * 0.78, 24, H * 0.38);
        // الذراعان
        ctx.strokeStyle = c.shirt;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-8, -H * 0.7); ctx.lineTo(-13, -H * 0.48);
        ctx.moveTo(8, -H * 0.7); ctx.lineTo(14, -H * 0.5);
        ctx.stroke();
        // الرأس
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, -H * 0.88, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.hair;
        ctx.beginPath(); ctx.arc(0, -H * 0.92, 11, Math.PI, Math.PI * 2); ctx.fill();
        // عين غاضبة
        ctx.strokeStyle = '#3a1a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(4, -H * 0.93); ctx.lineTo(10, -H * 0.9);
        ctx.stroke();
        ctx.fillStyle = '#3a1a1a';
        ctx.beginPath(); ctx.arc(8, -H * 0.88, 2, 0, Math.PI * 2); ctx.fill();

        ctx.restore();

        this.drawStatus(ctx);
        this.drawHealthBar(ctx);
    }

    drawStatus(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 15px sans-serif';
        if (this.frozen > 0) {
            ctx.fillStyle = 'rgba(150,200,255,0.9)';
            ctx.fillText('❄', this.cx, this.y - 14);
        } else if (this.distracted > 0) {
            ctx.fillStyle = '#ffe27a';
            ctx.fillText('؟', this.cx + Math.sin(this.animTime * 5) * 5, this.y - 14);
        } else if (this.state === 'CHASE' || this.state === 'ATTACK') {
            ctx.fillStyle = '#ff5a5a';
            ctx.fillText('!', this.cx, this.y - 14);
        }
        ctx.restore();
    }

    drawHealthBar(ctx) {
        if (this.health >= this.maxHealth) return;
        // البوسات: شريط أعرض وأوضح
        const boss = this.maxHealth > 100;
        const w = boss ? 74 : 52;
        const h = boss ? 8 : 6;
        const x = this.cx - w / 2, y = this.y - (boss ? 18 : 13);
        const ratio = Math.max(0, this.health / this.maxHealth);
        // خلفية + إطار
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        // اللون حسب الصحة
        ctx.fillStyle = ratio > 0.6 ? '#4ecb5e' : ratio > 0.3 ? '#f5a623' : '#e04545';
        ctx.fillRect(x, y, w * ratio, h);
        // لمعة خفيفة
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x, y, w * ratio, 2);
    }
}

/* =====================================================
   خالد بوس — Mini Boss (اندفاع، دفع، مطاردة)
===================================================== */
class KhaledBoss extends Enemy {
    constructor(x, y) {
        super(x, y, {
            type: 'khaled',
            w: 48, h: 78,
            health: 160, speed: 170, chaseSpeed: 260,
            damage: 16, sightRange: 700, attackRange: 70, patrolRange: 350,
            colors: { skin: '#c89060', shirt: '#8a2a2a', pants: '#2a2a30', hair: '#181008' }
        });
        this.dashCd = 0;
        this.dashing = 0;
        this.shoveCd = 0;
    }

    update(dt, world, players, game) {
        if (!this.alive) return;
        if (this.dashCd > 0) this.dashCd -= dt;
        if (this.shoveCd > 0) this.shoveCd -= dt;

        // الاندفاع
        if (this.dashing > 0) {
            this.dashing -= dt;
            this.animTime += dt;
            this.vx = this.facing * 620;
            game.particles.speedLines(this.cx, this.cy, this.facing, 'rgba(255,120,90,0.6)');
            Physics.moveEntity(this, world.solids, dt);
            // إصابة اللاعبين أثناء الاندفاع
            for (const p of players) {
                if (p.alive && Physics.aabb(this, p)) {
                    p.takeDamage(this.damage + 6, this.cx, game);
                }
            }
            if (this.dashing <= 0) this.vx = 0;
            return;
        }

        const { player, dist } = this.nearestPlayer(players);

        // قرار الاندفاع أثناء المطاردة
        if (this.state === 'CHASE' && player && this.dashCd <= 0 &&
            dist > 180 && dist < 550 && this.frozen <= 0 && this.stunned <= 0 && this.distracted <= 0) {
            this.dashCd = 4;
            this.dashing = 0.55;
            this.facing = Math.sign(player.cx - this.cx) || 1;
            Audio2.play('boss_roar');
            game.camera.shake(5, 0.2);
            return;
        }

        // الدفعة القوية عن قرب
        if (player && dist < 90 && this.shoveCd <= 0 && this.frozen <= 0 && this.stunned <= 0) {
            this.shoveCd = 3;
            Physics.knockback(player, this.cx, 800, 450);
            player.takeDamage(10, this.cx, game);
            game.particles.wave(this.cx, this.cy, '#ff8a6a');
            game.camera.shake(8, 0.3);
            Audio2.play('ability_dafaa');
        }

        super.update(dt, world, players, game);
    }

    draw(ctx) {
        if (!this.alive) return;
        const t = this.animTime;
        const c = this.colors;
        ctx.save();
        if (this.invulnTime > 0) ctx.globalAlpha = 0.5;

        const running = Math.abs(this.vx) > 40;
        const legSwing = running ? Math.sin(t * 11) * 0.6 : 0;
        const bob = running ? Math.abs(Math.sin(t * 11)) * 2.5 : Math.sin(t * 2) * 1.5;

        ctx.translate(this.cx, this.y + this.h - bob);
        ctx.scale(this.facing, 1);
        const H = this.h;

        // هالة الاندفاع
        if (this.dashing > 0) {
            ctx.shadowColor = '#ff5a3a';
            ctx.shadowBlur = 22;
        }

        // أرجل ضخمة
        ctx.strokeStyle = c.pants;
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-7, -H * 0.42); ctx.lineTo(-7 + Math.sin(legSwing) * 13, -2);
        ctx.moveTo(8, -H * 0.42); ctx.lineTo(8 - Math.sin(legSwing) * 13, -2);
        ctx.stroke();
        // جسم عريض
        const grad = ctx.createLinearGradient(0, -H * 0.8, 0, -H * 0.4);
        grad.addColorStop(0, c.shirt);
        grad.addColorStop(1, '#5a1a1a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-19, -H * 0.78);
        ctx.lineTo(19, -H * 0.78);
        ctx.lineTo(15, -H * 0.4);
        ctx.lineTo(-15, -H * 0.4);
        ctx.closePath();
        ctx.fill();
        // أذرع ضخمة
        ctx.strokeStyle = c.shirt;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(-14, -H * 0.72); ctx.lineTo(-21, -H * 0.46);
        ctx.moveTo(14, -H * 0.72); ctx.lineTo(22, -H * 0.48);
        ctx.stroke();
        ctx.fillStyle = c.skin;
        ctx.beginPath();
        ctx.arc(-21, -H * 0.45, 6, 0, Math.PI * 2);
        ctx.arc(22, -H * 0.47, 6, 0, Math.PI * 2);
        ctx.fill();
        // رأس
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, -H * 0.88, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c.hair;
        ctx.beginPath(); ctx.arc(0, -H * 0.93, 13, Math.PI * 0.9, Math.PI * 2.05); ctx.fill();
        // حاجب غاضب وعين
        ctx.strokeStyle = '#2a1008';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(3, -H * 0.94); ctx.lineTo(12, -H * 0.9);
        ctx.stroke();
        ctx.fillStyle = '#2a1008';
        ctx.beginPath(); ctx.arc(9, -H * 0.87, 2.5, 0, Math.PI * 2); ctx.fill();
        // ندبة
        ctx.strokeStyle = '#8a4a3a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, -H * 0.93); ctx.lineTo(-8, -H * 0.85);
        ctx.stroke();

        ctx.restore();
        this.drawStatus(ctx);
    }
}

/* =====================================================
   نورالدين بوس — Final Boss بثلاث مراحل
   1: الحصار (استدعاء أتباع + موجات صادمة)
   2: المطاردة (سريع وشرس)
   3: المواجهة النهائية (كل شيء معًا)
===================================================== */
class NoureddineBoss extends Enemy {
    constructor(x, y) {
        super(x, y, {
            type: 'noureddine',
            w: 54, h: 88,
            health: 400, speed: 150, chaseSpeed: 240,
            damage: 20, sightRange: 900, attackRange: 80, patrolRange: 200,
            colors: { skin: '#b88858', shirt: '#2a1a4a', pants: '#141020', hair: '#0a0a0a' }
        });
        this.phase = 1;
        this.summonCd = 5;
        this.shockCd = 3;
        this.dashCd = 2;
        this.dashing = 0;
        this.roarTimer = 0;
    }

    get phaseThresholds() { return [0.66, 0.33]; }

    update(dt, world, players, game) {
        if (!this.alive) return;

        // تحديد المرحلة
        const hpRatio = this.health / this.maxHealth;
        let newPhase = 1;
        if (hpRatio <= this.phaseThresholds[1]) newPhase = 3;
        else if (hpRatio <= this.phaseThresholds[0]) newPhase = 2;
        if (newPhase !== this.phase) {
            this.phase = newPhase;
            Audio2.play('boss_roar');
            game.camera.shake(12, 0.5);
            game.camera.cinematic(this.cx, this.cy - 60, 1.5, 1.6);
            game.particles.wave(this.cx, this.cy, '#a05aff');
            game.showToast && game.showToast(newPhase === 2 ? 'نورالدين زعلان بالحق — المطاردة!' : 'المرحلة الأخيرة!');
            this.invulnTime = 1.2;
        }

        if (this.summonCd > 0) this.summonCd -= dt;
        if (this.shockCd > 0) this.shockCd -= dt;
        if (this.dashCd > 0) this.dashCd -= dt;

        const { player, dist } = this.nearestPlayer(players);
        const canAct = this.frozen <= 0 && this.stunned <= 0 && this.distracted <= 0;

        // الاندفاع (المرحلة 2+)
        if (this.dashing > 0) {
            this.dashing -= dt;
            this.animTime += dt;
            this.vx = this.facing * 700;
            game.particles.speedLines(this.cx, this.cy, this.facing, 'rgba(160,90,255,0.6)');
            Physics.moveEntity(this, world.solids, dt);
            for (const p of players) {
                if (p.alive && Physics.aabb(this, p)) p.takeDamage(this.damage, this.cx, game);
            }
            return;
        }

        if (canAct && player) {
            // المرحلة 1 و3: استدعاء أتباع (الحصار)
            if ((this.phase === 1 || this.phase === 3) && this.summonCd <= 0 && world.enemies.length < 6) {
                this.summonCd = this.phase === 3 ? 9 : 7;
                Audio2.play('whistle');
                game.particles.wave(this.cx, this.cy - 40, '#ffd24a');
                const side = Math.random() > 0.5 ? 1 : -1;
                world.enemies.push(new Enemy(this.cx + side * 380, this.y - 20, {
                    health: 30, speed: 170, chaseSpeed: 250, damage: 8, sightRange: 800,
                    colors: { skin: '#d8a878', shirt: '#4a3a6a', pants: '#2a2438', hair: '#1a1210' }
                }));
            }
            // موجة صادمة أرضية
            if (this.shockCd <= 0 && this.onGround && dist < 500) {
                this.shockCd = this.phase === 3 ? 3.5 : 5;
                Audio2.play('ability_dafaa');
                game.camera.shake(10, 0.35);
                game.particles.wave(this.cx, this.y + this.h, '#a05aff');
                game.particles.dust(this.cx - 60, this.y + this.h, 8);
                game.particles.dust(this.cx + 60, this.y + this.h, 8);
                for (const p of players) {
                    if (p.alive && p.onGround && Physics.dist(this, p) < 330) {
                        p.takeDamage(12, this.cx, game);
                    }
                }
            }
            // الاندفاع في المرحلة 2+
            if (this.phase >= 2 && this.dashCd <= 0 && dist > 200 && dist < 650) {
                this.dashCd = this.phase === 3 ? 3 : 4;
                this.dashing = 0.6;
                this.facing = Math.sign(player.cx - this.cx) || 1;
                Audio2.play('boss_roar');
                return;
            }
        }

        // سرعة حسب المرحلة
        this.chaseSpeed = this.phase === 1 ? 200 : this.phase === 2 ? 300 : 340;

        super.update(dt, world, players, game);
    }

    draw(ctx) {
        if (!this.alive) return;
        const t = this.animTime;
        const c = this.colors;
        ctx.save();
        if (this.invulnTime > 0) ctx.globalAlpha = 0.55;

        const running = Math.abs(this.vx) > 40;
        const legSwing = running ? Math.sin(t * 10) * 0.6 : 0;
        const bob = running ? Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 1.8) * 2;

        // هالة شريرة حسب المرحلة
        const auraColors = ['rgba(120,80,255,', 'rgba(200,60,255,', 'rgba(255,50,80,'];
        const aura = auraColors[this.phase - 1];
        const ag = ctx.createRadialGradient(this.cx, this.cy, 10, this.cx, this.cy, 90);
        ag.addColorStop(0, aura + (0.18 + Math.sin(t * 4) * 0.07) + ')');
        ag.addColorStop(1, aura + '0)');
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, 90, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(this.cx, this.y + this.h - bob);
        ctx.scale(this.facing, 1);
        const H = this.h;

        // أرجل
        ctx.strokeStyle = c.pants;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8, -H * 0.42); ctx.lineTo(-8 + Math.sin(legSwing) * 14, -2);
        ctx.moveTo(9, -H * 0.42); ctx.lineTo(9 - Math.sin(legSwing) * 14, -2);
        ctx.stroke();
        // معطف طويل
        const grad = ctx.createLinearGradient(0, -H * 0.8, 0, -H * 0.2);
        grad.addColorStop(0, c.shirt);
        grad.addColorStop(1, '#14102a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-20, -H * 0.8);
        ctx.lineTo(20, -H * 0.8);
        ctx.lineTo(26, -H * 0.15);
        ctx.lineTo(14, -H * 0.2);
        ctx.lineTo(0, -H * 0.12);
        ctx.lineTo(-14, -H * 0.2);
        ctx.lineTo(-26, -H * 0.15);
        ctx.closePath();
        ctx.fill();
        // أذرع
        ctx.strokeStyle = c.shirt;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(-15, -H * 0.72); ctx.lineTo(-24, -H * 0.44);
        ctx.moveTo(15, -H * 0.72); ctx.lineTo(25, -H * 0.46);
        ctx.stroke();
        ctx.fillStyle = c.skin;
        ctx.beginPath();
        ctx.arc(-24, -H * 0.43, 6, 0, Math.PI * 2);
        ctx.arc(25, -H * 0.45, 6, 0, Math.PI * 2);
        ctx.fill();
        // رأس
        ctx.fillStyle = c.skin;
        ctx.beginPath(); ctx.arc(2, -H * 0.89, 14, 0, Math.PI * 2); ctx.fill();
        // شعر حاد
        ctx.fillStyle = c.hair;
        ctx.beginPath();
        ctx.moveTo(-12, -H * 0.9);
        ctx.lineTo(-8, -H * 1.02);
        ctx.lineTo(-2, -H * 0.95);
        ctx.lineTo(4, -H * 1.04);
        ctx.lineTo(9, -H * 0.94);
        ctx.lineTo(14, -H * 1.0);
        ctx.lineTo(15, -H * 0.89);
        ctx.closePath();
        ctx.fill();
        // عيون متوهجة حسب المرحلة
        const eyeColors = ['#a05aff', '#ff5aff', '#ff3a4a'];
        ctx.fillStyle = eyeColors[this.phase - 1];
        ctx.shadowColor = eyeColors[this.phase - 1];
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(9, -H * 0.9, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // ابتسامة شريرة
        ctx.strokeStyle = '#4a2018';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(6, -H * 0.84, 5, Math.PI * 0.1, Math.PI * 0.6);
        ctx.stroke();

        ctx.restore();
        this.drawStatus(ctx);
    }
}
