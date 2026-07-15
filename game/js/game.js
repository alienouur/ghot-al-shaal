/* =====================================================
   نواة اللعبة — حلقة اللعب، الحالات، الربط بين الأنظمة
===================================================== */
'use strict';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = 'MENU';   // MENU | STORY | STREET | PAUSED
        this.prevState = null;

        this.camera = new Camera(window.innerWidth, window.innerHeight);
        this.particles = new ParticleSystem();
        this.world = null;
        this.players = [];
        this.story = null;
        this.street = null;
        this.ui = new UI(this);

        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDt = 1 / 120;      // فيزياء بمعدل ثابت
        this.gameTime = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTimer = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // تفعيل الصوت عند أول تفاعل
        const initAudio = () => {
            Audio2.init();
            Audio2.resume();
            const st = SaveSystem.data.settings;
            Audio2.setMusicVolume(st.musicVolume);
            Audio2.setSfxVolume(st.sfxVolume);
            Audio2.setMuted(st.muted);
            if (this.state === 'MENU') Audio2.playMusic('menu');
        };
        window.addEventListener('pointerdown', initAudio, { once: true });
        window.addEventListener('keydown', initAudio, { once: true });
    }

    resize() {
        // دقة CSS مباشرة — أخف على الأجهزة الضعيفة
        this.dpr = 1;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.camera.resize(window.innerWidth, window.innerHeight);
    }

    settingsShake() { return SaveSystem.data.settings.screenShake; }

    /* ---------- بدء طور القصة ---------- */
    startStory(char) {
        this.world = new World();
        this.players = [new Player(char, 200, 400, 0)];
        this.story = new StoryMode(this);
        this.street = null;
        this.state = 'STORY';
        this.camera.follow(this.players[0]);
        this.ui.clearScreen();
        this.ui.showHud();
        this.ui.buildHudPlayers(this.players);
        Input.setTouchVisible(true);
        // متابعة من آخر فصل محفوظ
        const startCh = Math.min(Math.max(SaveSystem.data.storyChapter - 1, 0), 4);
        this.story.startChapter(startCh);
    }

    /* ---------- بدء وضع شارعنا ---------- */
    startStreet(chars, modeId) {
        this.world = new World();
        this.players = chars.map((c, i) => new Player(c, 2800 + i * 100, 400, i));
        this.story = null;
        this.street = new StreetMode(this);
        this.state = 'STREET';
        this.ui.clearScreen();
        this.ui.showHud();
        this.ui.buildHudPlayers(this.players);
        Input.setTouchVisible(true);
        this.street.start(modeId);
    }

    /* ---------- بدء لعبة أونلاين ---------- */
    startOnline(modeId, rosterList, myId, isHost) {
        this.world = new World();
        this.story = null;
        this.players = rosterList.map((r, i) => {
            const char = GAME_DATA.characters.find(c => c.id === r.charId);
            const p = new Player(char, 2800 + i * 100, 400, i);
            p.netId = r.id;
            p.remote = r.id !== myId;
            return p;
        });
        this.online = new OnlineSession(this, rosterList, myId, isHost);
        this.street = new StreetMode(this);
        this.state = 'STREET';
        this.ui.clearScreen();
        this.ui.showHud();
        this.ui.buildHudPlayers(this.players);
        Input.setTouchVisible(true);
        this.street.start(modeId);
        // الكاميرا تتبع لاعبي فقط في الأونلاين
        this.camera.follow(this.players[this.online.myIndex]);
    }

    /* لاعبون آخرون (للقدرات التفاعلية في وضع شارعنا) */
    otherPlayers(me) {
        return this.players.filter(p => p !== me && p.alive);
    }

    onPlayerDown(player) {
        this.particles.hit(player.cx, player.cy, '#fff');
        Audio2.play('lose');
    }

    onPlayerHit(attacker, victim) {
        // نقاط الضرب في نمط "آخر واحد"
        if (this.street && this.street.mode && this.street.mode.id === 'last') {
            attacker.score += 2;
        }
    }

    onEnemyDown(enemy) {
        if (this.players[0]) this.players[0].score += 10;
    }

    showToast(text) { this.ui.showToast(text); }

    pause() {
        if (this.online) {
            // أونلاين: اللعبة ما تتوقفش — مجرد قائمة فوقية
            this.ui.showPause();
            return;
        }
        if (this.state === 'STORY' || this.state === 'STREET') {
            this.prevState = this.state;
            this.state = 'PAUSED';
            this.ui.showPause();
        }
    }

    resume() {
        if (this.online) { this.ui.clearScreen(); return; }
        this.state = this.prevState;
        this.ui.clearScreen();
    }

    returnToMenu() {
        if (this.online) {
            this.online.destroy();
            this.online = null;
        }
        this.state = 'MENU';
        this.story = null;
        this.street = null;
        this.players = [];
        this.particles.clear();
        Audio2.stopMusic();
        this.ui.hideDialogue();
        this.ui.hideHud();
        Input.setTouchVisible(false);
        this.ui.showMainMenu();
    }

    /* ================= حلقة اللعب ================= */
    start() {
        this.ui.showMainMenu();
        requestAnimationFrame((t) => this.loop(t));
    }

    loop(time) {
        requestAnimationFrame((t) => this.loop(t));
        let dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        if (dt > 0.1) dt = 0.1; // تجنب قفزات كبيرة

        // FPS
        this.fpsCounter++;
        this.fpsTimer += dt;
        if (this.fpsTimer >= 0.5) {
            this.fps = Math.round(this.fpsCounter / this.fpsTimer);
            this.fpsCounter = 0;
            this.fpsTimer = 0;
        }

        this.update(dt);
        this.draw();
        Input.endFrame();
    }

    update(dt) {
        // إيقاف مؤقت
        if ((this.state === 'STORY' || this.state === 'STREET') &&
            (Input.wasPressed('Escape') || Input.wasPressed('KeyP'))) {
            this.pause();
            return;
        }
        if (this.state === 'PAUSED') {
            if (Input.wasPressed('Escape')) this.resume();
            return;
        }
        if (this.state === 'MENU') return;

        this.gameTime += dt;
        const inDialogue = this.story && this.story.dialogue;

        if (!inDialogue) {
            // تحديث اللاعبين
            this.players.forEach((p, i) => {
                if (p.eliminated) return;
                if (p.remote) { p.netUpdate(dt); return; }
                // في الأونلاين لاعبي يستخدم تحكم اللاعب 1 دايمًا
                const input = Input.getPlayerInput(this.online ? 0 : i);
                p.update(dt, input, this.world, this);
            });

            // تحديث الأعداء
            const targets = this.players.filter(p => p.alive && !p.eliminated);
            for (let i = this.world.enemies.length - 1; i >= 0; i--) {
                const e = this.world.enemies[i];
                e.update(dt, this.world, targets, this);
                if (!e.alive && e.deadTimer === undefined) e.deadTimer = 1;
                if (e.deadTimer !== undefined) {
                    e.deadTimer -= dt;
                    if (e.deadTimer <= 0) this.world.enemies.splice(i, 1);
                }
            }

            this.world.update(dt);
            this.particles.update(dt);
        }

        // تحديث الأنماط
        if (this.state === 'STORY' && this.story) {
            this.story.update(dt);
        } else if (this.state === 'STREET' && this.street) {
            // أونلاين: منطق النمط يديره الهوست فقط
            if (!this.street.finished && (!this.online || this.online.isHost)) this.street.update(dt);
        }

        // مزامنة الشبكة
        if (this.online) this.online.update(dt);

        // الكاميرا
        if (this.state === 'STREET' && this.players.length > 1 && !this.online) {
            this.camera.followGroup(this.players.filter(p => !p.eliminated));
        }
        this.camera.update(dt);

        // HUD
        this.ui.updateHud(this.players);
        if (this.state === 'STORY' && this.players[0]) {
            this.ui.setScore('نقاط: ' + this.players[0].score);
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.camera.viewW, this.camera.viewH);

        if (this.state === 'MENU' || !this.world) {
            this.drawMenuBackground(ctx);
            return;
        }

        // العالم (يرسم السماء بنفسه ثم يعود لتحويل الكاميرا)
        this.camera.apply(ctx);
        this.world.draw(ctx, this.camera, this.gameTime);

        // عناصر النمط
        if (this.street) this.street.draw(ctx);
        if (this.story) this.story.draw(ctx);

        // الأعداء
        for (const e of this.world.enemies) {
            if (this.camera.inView(e.x - 100, e.y - 100, e.w + 200, e.h + 200)) e.draw(ctx);
        }

        // اللاعبون
        this.players.forEach((p, i) => {
            if (p.eliminated) return;
            p.draw(ctx);
            if (this.players.length > 1) p.drawTag(ctx, GAME_DATA.playerTagColors[i]);
        });

        // الجزيئات
        this.particles.draw(ctx);

        this.camera.restore(ctx);

        // طبقات الشاشة الثابتة
        if (this.street && !this.street.finished) this.street.drawScoreboard(ctx);

        // اسم المنطقة الحالية
        if (this.players[0] && this.state === 'STORY') {
            const zone = this.world.getZoneAt(this.players[0].cx);
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(zone.name, 16, this.camera.viewH - 14);
        }

        // FPS
        if (SaveSystem.data.settings.showFps) {
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            ctx.fillStyle = '#7dffa0';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('FPS: ' + this.fps, 16, 22);
        }
    }

    /* خلفية متحركة للقائمة الرئيسية */
    drawMenuBackground(ctx) {
        const w = this.camera.viewW, h = this.camera.viewH;
        const t = performance.now() / 1000;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#141030');
        grad.addColorStop(0.6, '#2a1a4a');
        grad.addColorStop(1, '#4a2a4a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // نجوم
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 60; i++) {
            const sx = (i * 137.5) % w;
            const sy = (i * 89.3) % (h * 0.6);
            const tw = 0.4 + Math.sin(t * 2 + i) * 0.3;
            ctx.globalAlpha = tw;
            ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.globalAlpha = 1;
        // صف بيوت (سيلويت)
        ctx.fillStyle = '#0d0a1e';
        for (let i = 0; i < Math.ceil(w / 190) + 1; i++) {
            const bx = i * 190 - ((t * 12) % 190);
            const bh = 110 + ((i * 53) % 90);
            ctx.fillRect(bx, h - bh, 150, bh);
            // نوافذ مضيئة
            ctx.fillStyle = 'rgba(255,215,120,0.55)';
            if (i % 2 === 0) ctx.fillRect(bx + 30, h - bh + 28, 16, 16);
            if (i % 3 === 0) ctx.fillRect(bx + 90, h - bh + 60, 16, 16);
            ctx.fillStyle = '#0d0a1e';
        }
        // قمر
        ctx.fillStyle = '#f0ecd8';
        ctx.beginPath();
        ctx.arc(w * 0.82, h * 0.2, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#141030';
        ctx.beginPath();
        ctx.arc(w * 0.82 + 13, h * 0.19, 30, 0, Math.PI * 2);
        ctx.fill();
    }
}
