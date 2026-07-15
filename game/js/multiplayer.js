/* =====================================================
   وضع شارعنا — Local Multiplayer (2-5 لاعبين)
   الأنماط: ملك الشارع، آخر واحد، كنز الشارع، المطاردة،
            سباق الأزقة، الكرة الذهبية، الغميضة
===================================================== */
'use strict';

class StreetMode {
    constructor(game) {
        this.game = game;
        this.mode = null;
        this.timer = 0;
        this.finished = false;
        this.winner = null;

        // بيانات خاصة بالأنماط
        this.kingZone = null;
        this.kingMoveTimer = 0;
        this.treasureTimer = 0;
        this.ball = null;
        this.raceFinish = 0;
        this.raceStart = 0;
        this.seekerIndex = 0;
        this.hidePrepTime = 0;
        this.scoreTick = 0;
    }

    start(modeId) {
        const game = this.game;
        const world = game.world;
        const g = world.groundY;
        this.mode = GAME_DATA.streetModes.find(m => m.id === modeId);
        this.timer = this.mode.time;
        this.finished = false;
        this.winner = null;
        world.enemies = [];
        world.collectibles = [];
        game.particles.clear();
        world.timeOfDay = modeId === 'hide' ? 'night' : 'day';
        Audio2.playMusic(modeId === 'hide' ? 'calm' : 'street');

        // ساحة اللعب حسب النمط
        let arenaFrom = 2700, arenaSpan = 2400;
        if (modeId === 'race' || modeId === 'hide') { arenaFrom = 5400; arenaSpan = 2200; }

        game.players.forEach((p, i) => {
            p.score = 0;
            p.itTag = false;
            p.hasBall = false;
            p.eliminated = false;
            p.raceDone = false;
            p.respawn(arenaFrom + 150 + i * 120, g - 120);
            p.health = p.maxHealth;
        });

        switch (modeId) {
            case 'king':
                this.kingZone = { x: arenaFrom + arenaSpan / 2 - 130, y: g - 200, w: 260, h: 200 };
                this.kingMoveTimer = 12;
                break;
            case 'treasure':
                this.treasureTimer = 0;
                break;
            case 'chase':
                this.seekerIndex = Math.floor(Math.random() * game.players.length);
                game.players[this.seekerIndex].itTag = true;
                break;
            case 'race':
                this.raceStart = 5450;
                this.raceFinish = 7700;
                game.players.forEach((p, i) => p.respawn(this.raceStart + i * 40, g - 120));
                break;
            case 'goldball':
                this.ball = { x: arenaFrom + arenaSpan / 2, y: g - 300, w: 24, h: 24, vx: 0, vy: 0, holder: null };
                break;
            case 'hide':
                this.seekerIndex = Math.floor(Math.random() * game.players.length);
                this.hidePrepTime = 8;
                game.players[this.seekerIndex].itTag = true;
                // المختبئون يتوزعون
                game.players.forEach((p, i) => {
                    if (i !== this.seekerIndex) p.respawn(5600 + i * 500, g - 120);
                    else p.respawn(5450, g - 120);
                });
                break;
        }

        game.ui.setObjective(this.mode.name + ' — ' + this.mode.desc);
    }

    update(dt) {
        if (this.finished) return;
        const game = this.game;
        const players = game.players;
        const g = game.world.groundY;

        // العد التنازلي
        if (this.mode.id === 'hide' && this.hidePrepTime > 0) {
            this.hidePrepTime -= dt;
            game.ui.setTimer(Math.ceil(this.hidePrepTime), 'استعداد');
            // الباحث مجمد أثناء الاستعداد
            players[this.seekerIndex].frozen = 0.1;
            if (this.hidePrepTime <= 0) {
                Audio2.play('whistle');
                game.showToast('اللي يحوّس انطلق!');
            }
            return;
        }

        this.timer -= dt;
        game.ui.setTimer(Math.ceil(Math.max(0, this.timer)));

        switch (this.mode.id) {
            case 'king': this.updateKing(dt); break;
            case 'last': this.updateLast(dt); break;
            case 'treasure': this.updateTreasure(dt); break;
            case 'chase': this.updateChase(dt); break;
            case 'race': this.updateRace(dt); break;
            case 'goldball': this.updateGoldBall(dt); break;
            case 'hide': this.updateHide(dt); break;
        }

        if (this.timer <= 0 && !this.finished) {
            this.endByScore();
        }
    }

    /* ---------- ملك الشارع ---------- */
    updateKing(dt) {
        const game = this.game;
        this.kingMoveTimer -= dt;
        if (this.kingMoveTimer <= 0) {
            this.kingMoveTimer = 12;
            this.kingZone.x = 2800 + Math.random() * 2000;
            game.showToast('بلاصة التاج تبدلت!');
            Audio2.play('whistle');
        }
        this.scoreTick -= dt;
        const tick = this.scoreTick <= 0;
        if (tick) this.scoreTick = 0.5;
        for (const p of game.players) {
            if (p.alive && Physics.aabb(p, this.kingZone)) {
                if (tick) {
                    p.score++;
                    game.particles.sparkle(p.cx, p.y - 10, '#ffd24a');
                }
            }
        }
    }

    /* ---------- آخر واحد في الشارع ---------- */
    updateLast(dt) {
        const alive = this.game.players.filter(p => !p.eliminated);
        for (const p of this.game.players) {
            if (!p.eliminated && !p.alive) {
                p.eliminated = true;
                this.game.showToast(p.char.name + ' طاح من اللعبة!');
                Audio2.play('lose');
            }
        }
        if (alive.length <= 1) {
            this.finish(alive[0] || null);
        }
    }

    /* ---------- كنز الشارع ---------- */
    updateTreasure(dt) {
        const game = this.game;
        const world = game.world;
        this.treasureTimer -= dt;
        if (this.treasureTimer <= 0) {
            this.treasureTimer = 1.6;
            world.collectibles.push({
                x: 2800 + Math.random() * 2200,
                y: world.groundY - 100 - Math.random() * 250,
                w: 26, h: 26, type: 'treasure', collected: false,
                bob: Math.random() * Math.PI * 2
            });
            if (world.collectibles.length > 25) world.collectibles.splice(0, 1);
        }
        for (const c of world.collectibles) {
            if (c.collected) continue;
            for (const p of game.players) {
                if (p.alive && Physics.aabb(p, c)) {
                    c.collected = true;
                    p.score += 5;
                    Audio2.play('collect');
                    game.particles.sparkle(c.x + 13, c.y + 13, '#ffd700');
                    break;
                }
            }
        }
    }

    /* ---------- المطاردة ---------- */
    updateChase(dt) {
        const game = this.game;
        const it = game.players[this.seekerIndex];
        this.scoreTick -= dt;
        const tick = this.scoreTick <= 0;
        if (tick) this.scoreTick = 1;
        for (let i = 0; i < game.players.length; i++) {
            const p = game.players[i];
            if (i !== this.seekerIndex && tick && p.alive) p.score++;
            // انتقال المطاردة باللمس
            if (i !== this.seekerIndex && Physics.aabb(it, p) && it.invulnTime <= 0) {
                it.itTag = false;
                it.invulnTime = 1;
                p.itTag = true;
                p.invulnTime = 1;
                this.seekerIndex = i;
                Audio2.play('hit');
                game.particles.hit(p.cx, p.cy, '#ff8a4a');
                game.showToast(p.char.name + ' ولّى هو المطارد!');
                break;
            }
        }
    }

    /* ---------- سباق الأزقة ---------- */
    updateRace(dt) {
        const game = this.game;
        for (const p of game.players) {
            if (!p.raceDone && p.x >= this.raceFinish) {
                p.raceDone = true;
                p.score = Math.ceil(this.timer); // نقاط = الوقت المتبقي
                game.showToast(p.char.name + ' وصل!');
                Audio2.play('win');
                if (!this.winner) this.finish(p);
            }
        }
    }

    /* ---------- الكرة الذهبية ---------- */
    updateGoldBall(dt) {
        const game = this.game;
        const b = this.ball;
        const world = game.world;

        if (b.holder) {
            // الكرة مع لاعب
            b.x = b.holder.cx - 12;
            b.y = b.holder.y - 30;
            this.scoreTick -= dt;
            if (this.scoreTick <= 0) {
                this.scoreTick = 0.5;
                b.holder.score++;
            }
            // إسقاط الكرة عند تلقي ضربة
            if (b.holder.stunned > 0 || !b.holder.alive) {
                b.holder.hasBall = false;
                b.vx = (Math.random() - 0.5) * 500;
                b.vy = -400;
                b.holder = null;
                Audio2.play('hit');
            }
        } else {
            // فيزياء الكرة
            b.vy += 1400 * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.vx *= 0.99;
            if (b.y + b.h > world.groundY) {
                b.y = world.groundY - b.h;
                b.vy = -b.vy * 0.5;
                b.vx *= 0.85;
            }
            if (b.x < 2700) { b.x = 2700; b.vx = Math.abs(b.vx); }
            if (b.x > 5100) { b.x = 5100; b.vx = -Math.abs(b.vx); }
            // التقاط الكرة
            for (const p of game.players) {
                if (p.alive && p.stunned <= 0 && Physics.aabb(p, b)) {
                    b.holder = p;
                    p.hasBall = true;
                    Audio2.play('collect');
                    game.particles.sparkle(b.x, b.y, '#ffd700');
                    break;
                }
            }
        }
    }

    /* ---------- الغميضة ---------- */
    updateHide(dt) {
        const game = this.game;
        const seeker = game.players[this.seekerIndex];
        let hidersLeft = 0;
        for (let i = 0; i < game.players.length; i++) {
            if (i === this.seekerIndex) continue;
            const p = game.players[i];
            if (p.eliminated) continue;
            hidersLeft++;
            if (Physics.aabb(seeker, p)) {
                p.eliminated = true;
                p.alive = false;
                seeker.score += 10;
                Audio2.play('hit');
                game.showToast(seeker.char.name + ' شدّ ' + p.char.name + '!');
            } else {
                p.score += dt; // نقاط البقاء
            }
        }
        if (hidersLeft === 0) this.finish(seeker);
    }

    /* ---------- النهاية ---------- */
    endByScore() {
        let best = null;
        for (const p of this.game.players) {
            if (!best || p.score > best.score) best = p;
        }
        // في الغميضة: لو انتهى الوقت والمختبئون باقون، يفوز أفضل مختبئ
        if (this.mode.id === 'hide') {
            best = null;
            for (let i = 0; i < this.game.players.length; i++) {
                if (i === this.seekerIndex || this.game.players[i].eliminated) continue;
                const p = this.game.players[i];
                if (!best || p.score > best.score) best = p;
            }
            best = best || this.game.players[this.seekerIndex];
        }
        this.finish(best);
    }

    finish(winner) {
        if (this.finished) return;
        this.finished = true;
        this.winner = winner;
        Audio2.play('win');
        SaveSystem.data.stats.streetWins++;
        SaveSystem.save();
        if (SaveSystem.unlockAchievement('street_win')) {
            this.game.ui.showAchievement('نجم شارعنا');
        }
        this.game.ui.setTimer(null);
        this.game.ui.showStreetResult(winner, this.game.players, this.mode);
    }

    /* ---------- الرسم ---------- */
    draw(ctx) {
        const game = this.game;
        // منطقة التاج
        if (this.mode && this.mode.id === 'king' && this.kingZone) {
            const z = this.kingZone;
            const pulse = 0.15 + Math.sin(performance.now() / 300) * 0.07;
            ctx.fillStyle = `rgba(255,210,74,${pulse})`;
            ctx.fillRect(z.x, z.y, z.w, z.h);
            ctx.strokeStyle = '#ffd24a';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 8]);
            ctx.strokeRect(z.x, z.y, z.w, z.h);
            ctx.setLineDash([]);
            // التاج
            ctx.fillStyle = '#ffd24a';
            ctx.font = 'bold 30px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('👑', z.x + z.w / 2, z.y - 10);
        }
        // خط النهاية للسباق
        if (this.mode && this.mode.id === 'race') {
            const g = game.world.groundY;
            ctx.fillStyle = '#fff';
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 2; x++) {
                    ctx.fillStyle = (x + y) % 2 === 0 ? '#fff' : '#222';
                    ctx.fillRect(this.raceFinish + x * 15, g - 240 + y * 30, 15, 30);
                }
            }
        }
        // الكرة الذهبية
        if (this.mode && this.mode.id === 'goldball' && this.ball && !this.ball.holder) {
            const b = this.ball;
            ctx.save();
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 18;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(b.x + 12, b.y + 12, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff8d0';
            ctx.beginPath();
            ctx.arc(b.x + 8, b.y + 8, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /* لوحة النقاط أعلى الشاشة */
    drawScoreboard(ctx) {
        const cam = this.game.camera;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const players = this.game.players;
        const bw = 130;
        const totalW = players.length * bw;
        const x0 = (cam.viewW - totalW) / 2;
        players.forEach((p, i) => {
            const x = x0 + i * bw;
            ctx.fillStyle = p.eliminated ? 'rgba(60,20,20,0.8)' : 'rgba(15,10,35,0.8)';
            ctx.fillRect(x, 8, bw - 8, 44);
            ctx.strokeStyle = GAME_DATA.playerTagColors[i];
            ctx.lineWidth = 2;
            ctx.strokeRect(x, 8, bw - 8, 44);
            ctx.fillStyle = GAME_DATA.playerTagColors[i];
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.char.name + (p.itTag ? ' 🔥' : ''), x + (bw - 8) / 2, 25);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(Math.floor(p.score), x + (bw - 8) / 2, 45);
        });
        ctx.restore();
    }
}
