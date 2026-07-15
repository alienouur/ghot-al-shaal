/* =====================================================
   الجلسة الأونلاين — مزامنة اللاعبين وحالة النمط
   - كل لاعب يتحكم بشخصيته من جهازه
   - منطق النمط (المؤقت، النقاط، الكرة...) يديره الهوست
     ويبث لقطات الحالة للبقية
===================================================== */
'use strict';

class OnlineSession {
    constructor(game, rosterList, myId, isHost) {
        this.game = game;
        this.myId = myId;
        this.isHost = isHost;
        this.roster = rosterList; // [{id, name, charId, host}]
        this.myIndex = rosterList.findIndex(r => r.id === myId);
        this.sendTimer = 0;
        this.snapTimer = 0;
        this.ended = false;

        Net.on('relay', (msg) => this.onRelay(msg));
        Net.on('roster', (msg) => this.onRoster(msg));
        Net.on('peer_left', (msg) => this.onPeerLeft(msg));
        Net.on('disconnected', () => this.onDisconnect());
    }

    playerById(id) {
        const idx = this.roster.findIndex(r => r.id === id);
        return idx >= 0 ? this.game.players[idx] : null;
    }

    /* ================= التحديث كل إطار ================= */
    update(dt) {
        if (this.ended) return;
        const game = this.game;
        const me = game.players[this.myIndex];
        if (!me) return;

        // إرسال حالة لاعبي (20 مرة/ثانية)
        this.sendTimer -= dt;
        if (this.sendTimer <= 0) {
            this.sendTimer = 0.05;
            Net.relay({
                k: 's',
                x: Math.round(me.x), y: Math.round(me.y),
                vx: Math.round(me.vx), f: me.facing,
                hp: Math.round(me.health), s: me.state,
                hid: me.hidden ? 1 : 0,
                atk: me.attackAnim > 0.2 ? 1 : 0,
                abl: me.abilityActive > 0 ? 1 : 0
            });
        }

        // الهوست: بث لقطة حالة النمط
        if (this.isHost && game.street) {
            this.snapTimer -= dt;
            if (this.snapTimer <= 0) {
                this.snapTimer = 0.15;
                Net.relay({ k: 'snap', d: this.buildSnapshot() });
            }
        }
    }

    /* ================= لقطة الهوست ================= */
    buildSnapshot() {
        const st = this.game.street;
        const world = this.game.world;
        const snap = {
            tm: Math.max(0, st.timer),
            prep: st.hidePrepTime || 0,
            fin: st.finished ? 1 : 0,
            win: st.winner ? this.roster[this.game.players.indexOf(st.winner)]?.id ?? -1 : -1,
            seek: st.seekerIndex,
            ps: this.game.players.map(p => ({
                sc: Math.round(p.score), el: p.eliminated ? 1 : 0,
                it: p.itTag ? 1 : 0, hb: p.hasBall ? 1 : 0
            }))
        };
        if (st.kingZone) snap.kz = Math.round(st.kingZone.x);
        if (st.ball) snap.ball = [Math.round(st.ball.x), Math.round(st.ball.y)];
        if (st.mode && st.mode.id === 'treasure') {
            snap.col = world.collectibles.filter(c => !c.collected).map(c => [Math.round(c.x), Math.round(c.y)]);
        }
        return snap;
    }

    applySnapshot(snap) {
        const game = this.game;
        const st = game.street;
        if (!st || st.finished) return;

        st.timer = snap.tm;
        st.hidePrepTime = snap.prep;
        st.seekerIndex = snap.seek;
        if (snap.prep > 0) {
            game.ui.setTimer(Math.ceil(snap.prep), 'استعداد');
            // إذا أنا الباحث: مجمد أثناء الاستعداد
            if (snap.seek === this.myIndex) {
                const me = game.players[this.myIndex];
                if (me) me.frozen = 0.3;
            }
        } else {
            game.ui.setTimer(Math.ceil(snap.tm));
        }

        snap.ps.forEach((s, i) => {
            const p = game.players[i];
            if (!p) return;
            p.score = s.sc;
            p.itTag = !!s.it;
            p.hasBall = !!s.hb;
            if (s.el && !p.eliminated) { p.eliminated = true; p.alive = false; }
        });

        if (snap.kz !== undefined && st.kingZone) st.kingZone.x = snap.kz;
        if (snap.ball && st.ball) { st.ball.x = snap.ball[0]; st.ball.y = snap.ball[1]; }
        if (snap.col) {
            game.world.collectibles = snap.col.map(([x, y]) => ({ x, y, w: 26, h: 26, collected: false }));
        }

        // النهاية
        if (snap.fin) {
            st.finished = true;
            st.winner = snap.win >= 0 ? this.playerById(snap.win) : null;
            game.ui.setTimer(null);
            Audio2.play('win');
            game.ui.showStreetResult(st.winner, game.players, st.mode);
        }
    }

    /* ================= استقبال الرسائل ================= */
    onRelay(msg) {
        const d = msg.d;
        if (!d) return;
        switch (d.k) {
            case 's': { // حالة لاعب بعيد
                const p = this.playerById(msg.from);
                if (p && p.remote) p.applyNetState(d);
                break;
            }
            case 'snap': // لقطة النمط (من الهوست)
                if (!this.isHost) this.applySnapshot(d.d);
                break;
            case 'fx': { // تأثير موجه لي (ضرب/دفع/تجميد)
                if (d.to !== this.myId) break;
                const me = this.game.players[this.myIndex];
                if (!me || !me.alive) break;
                if (d.dmg) me.takeDamage(d.dmg, d.fx, this.game);
                if (d.push) {
                    Physics.knockback(me, d.push[0], d.push[1], d.push[2]);
                    me.stunned = Math.max(me.stunned, d.stun || 0.8);
                    Audio2.play('hit');
                }
                if (d.frz) {
                    me.frozen = d.frz;
                    this.game.particles.sparkle(me.cx, me.cy, '#c8a2ff');
                    Audio2.play('stun');
                }
                break;
            }
            case 'restart': // الهوست أعاد الجولة
                if (!this.isHost) {
                    this.game.ui.clearScreen();
                    this.game.street.start(d.modeId);
                }
                break;
        }
    }

    sendEffect(targetId, effect) {
        Net.relay(Object.assign({ k: 'fx', to: targetId }, effect));
    }

    restart(modeId) {
        Net.relay({ k: 'restart', modeId });
        this.game.street.start(modeId);
    }

    onRoster(msg) {
        // تحديث الهوست إذا تغيّر
        const meEntry = msg.players.find(p => p.id === this.myId);
        if (meEntry && meEntry.host && !this.isHost) {
            this.isHost = true;
            this.game.showToast('ولّيت أنت صاحب الروم!');
        }
    }

    onPeerLeft(msg) {
        const p = this.playerById(msg.id);
        if (p) {
            p.eliminated = true;
            p.alive = false;
            this.game.showToast((p.char ? p.char.name : 'لاعب') + ' خرج من الروم');
        }
    }

    onDisconnect() {
        if (this.ended) return;
        this.ended = true;
        this.game.showToast('انقطع الاتصال بالسيرفر!');
        this.game.returnToMenu();
    }

    destroy() {
        this.ended = true;
        Net.leave();
    }
}
