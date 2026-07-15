/* =====================================================
   واجهة المستخدم — القوائم، HUD، الحوار، الإشعارات
===================================================== */
'use strict';

class UI {
    constructor(game) {
        this.game = game;
        this.layer = document.getElementById('ui-layer');
        this.currentScreen = null;
        this.buildStaticElements();
    }

    buildStaticElements() {
        // HUD
        this.hud = document.createElement('div');
        this.hud.id = 'hud';
        this.hud.innerHTML = `
            <div class="hud-top">
                <div id="hud-players"></div>
                <div class="hud-center">
                    <div class="hud-timer" id="hud-timer"></div>
                    <div class="hud-score" id="hud-score"></div>
                </div>
                <div style="width:200px"></div>
            </div>
            <div class="hud-objective" id="hud-objective" style="display:none"></div>`;
        this.layer.appendChild(this.hud);

        // صندوق الحوار
        this.dlgBox = document.createElement('div');
        this.dlgBox.id = 'dialogue-box';
        this.dlgBox.innerHTML = `
            <div class="dlg-speaker" id="dlg-speaker"></div>
            <div class="dlg-text" id="dlg-text"></div>
            <div class="dlg-hint">اضغط هني باش تكمّل ◄</div>`;
        this.layer.appendChild(this.dlgBox);
        this.dlgBox.addEventListener('click', () => {
            if (this.game.story) this.game.story.advanceDialogue();
        });

        // الإشعارات
        this.toastArea = document.createElement('div');
        this.toastArea.id = 'toast-area';
        this.layer.appendChild(this.toastArea);

        // عنوان الفصل
        this.chapterEl = document.createElement('div');
        this.chapterEl.id = 'chapter-title';
        this.chapterEl.innerHTML = '<h2 id="ch-sub"></h2><h1 id="ch-name"></h1>';
        this.layer.appendChild(this.chapterEl);
    }

    clearScreen() {
        if (this.currentScreen) {
            this.currentScreen.remove();
            this.currentScreen = null;
        }
    }

    showScreen(html, overlay) {
        this.clearScreen();
        const s = document.createElement('div');
        s.className = 'screen' + (overlay ? ' overlay' : '');
        s.innerHTML = html;
        this.layer.appendChild(s);
        this.currentScreen = s;
        return s;
    }

    /* ================= القائمة الرئيسية ================= */
    showMainMenu() {
        this.hideHud();
        const saved = SaveSystem.data.storyChapter > 0 && !SaveSystem.data.storyCompleted;
        const s = this.showScreen(`
            <div class="game-title">غوط الشعال</div>
            <div class="game-subtitle">— شارعنا —</div>
            <button class="menu-btn primary" data-act="story">${saved ? 'متابعة القصة (الفصل ' + SaveSystem.data.storyChapter + ')' : 'طور القصة'}</button>
            ${saved ? '<button class="menu-btn" data-act="newstory">قصة جديدة</button>' : ''}
            <button class="menu-btn" data-act="street">وضع شارعنا (2-5 لاعبين)</button>
            <button class="menu-btn" data-act="online">🌐 أونلاين — كل واحد من هاتفه</button>
            <button class="menu-btn" data-act="achievements">الإنجازات</button>
            <button class="menu-btn" data-act="settings">الإعدادات</button>
            <p class="screen-hint">لعبة عربية 2D مبنية بالكامل بدون محرك ألعاب — تعمل Offline</p>
        `);
        s.addEventListener('click', (e) => {
            const act = e.target.dataset && e.target.dataset.act;
            if (!act) return;
            Audio2.init(); Audio2.resume();
            Audio2.play('confirm');
            if (act === 'story') this.showCharacterSelect('story');
            else if (act === 'newstory') { SaveSystem.data.storyChapter = 0; SaveSystem.save(); this.showCharacterSelect('story'); }
            else if (act === 'street') this.showStreetSetup();
            else if (act === 'online') this.showOnlineMenu();
            else if (act === 'achievements') this.showAchievements();
            else if (act === 'settings') this.showSettings();
        });
        Audio2.playMusic('menu');
    }

    /* ================= اختيار الشخصية ================= */
    showCharacterSelect(mode, playerCount, chosenList, currentPlayer) {
        playerCount = playerCount || 1;
        chosenList = chosenList || [];
        currentPlayer = currentPlayer || 0;

        const title = mode === 'story'
            ? 'اختر شخصيتك'
            : `اللاعب ${currentPlayer + 1} — اختر شخصيتك`;

        let cards = '';
        GAME_DATA.characters.forEach((c, i) => {
            const taken = chosenList.find(ch => ch.id === c.id);
            cards += `
            <div class="char-card ${taken ? 'locked' : ''}" data-idx="${i}">
                <canvas width="96" height="120" data-charcanvas="${i}"></canvas>
                <div class="char-name">${c.name}</div>
                <div class="char-role">${c.role}</div>
                <div class="char-ability">⚡ ${c.ability.name}: ${c.ability.desc}</div>
                ${this.statBars(c.stats)}
                ${taken ? `<span class="player-tag" style="background:${GAME_DATA.playerTagColors[chosenList.indexOf(taken)]}">لاعب ${chosenList.indexOf(taken) + 1}</span>` : ''}
            </div>`;
        });

        const s = this.showScreen(`
            <h2 class="screen-title">${title}</h2>
            <div class="char-grid">${cards}</div>
            <button class="menu-btn small" data-act="back">رجوع</button>
        `);

        // رسم صور الشخصيات على كانفس مصغر
        s.querySelectorAll('[data-charcanvas]').forEach(cv => {
            this.drawCharPreview(cv, GAME_DATA.characters[+cv.dataset.charcanvas]);
        });

        s.addEventListener('click', (e) => {
            if (e.target.dataset.act === 'back') {
                Audio2.play('back');
                this.showMainMenu();
                return;
            }
            const card = e.target.closest('.char-card');
            if (!card || card.classList.contains('locked')) return;
            Audio2.play('confirm');
            const char = GAME_DATA.characters[+card.dataset.idx];

            if (mode === 'story') {
                this.game.startStory(char);
            } else {
                chosenList.push(char);
                if (chosenList.length >= playerCount) {
                    this.showStreetModeSelect(chosenList);
                } else {
                    this.showCharacterSelect(mode, playerCount, chosenList, currentPlayer + 1);
                }
            }
        });
    }

    statBars(stats) {
        const labels = { speed: 'سرعة', power: 'قوة', stealth: 'تخفي', intelligence: 'ذكاء' };
        return Object.keys(labels).map(k => `
            <div class="stat-row">
                <span class="stat-label">${labels[k]}</span>
                <div class="stat-bar"><div class="stat-fill" style="width:${stats[k] * 20}%"></div></div>
            </div>`).join('');
    }

    drawCharPreview(canvas, char) {
        const ctx = canvas.getContext('2d');
        const p = new Player(char, 31, 50, -1);
        p.animTime = 0.5;
        ctx.clearRect(0, 0, 96, 120);
        p.draw(ctx);
    }

    /* ================= إعداد وضع شارعنا ================= */
    showStreetSetup() {
        const s = this.showScreen(`
            <h2 class="screen-title">وضع شارعنا</h2>
            <p style="color:#bcaee8;margin-bottom:16px">كم عدد اللاعبين؟ (لوحة مفاتيح واحدة مشتركة)</p>
            ${[2, 3, 4, 5].map(n => `<button class="menu-btn" data-n="${n}">${n} لاعبين</button>`).join('')}
            <button class="menu-btn small" data-act="back">رجوع</button>
            <table class="help-table">
                <tr><td>لاعب 1</td><td>WASD + مسافة | قدرة E | ضرب F</td></tr>
                <tr><td>لاعب 2</td><td>الأسهم | قدرة / | ضرب .</td></tr>
                <tr><td>لاعب 3</td><td>IJKL | قدرة O | ضرب U</td></tr>
                <tr><td>لاعب 4</td><td>TFGH | قدرة Y | ضرب R</td></tr>
                <tr><td>لاعب 5</td><td>أرقام Numpad 8456 | قدرة 9 | ضرب 7</td></tr>
            </table>
        `);
        s.addEventListener('click', (e) => {
            if (e.target.dataset.act === 'back') { Audio2.play('back'); this.showMainMenu(); return; }
            const n = e.target.dataset.n;
            if (!n) return;
            Audio2.play('confirm');
            this.showCharacterSelect('street', +n, [], 0);
        });
    }

    showStreetModeSelect(chosenChars) {
        const s = this.showScreen(`
            <h2 class="screen-title">اختر نمط اللعب</h2>
            <div class="char-grid">
                ${GAME_DATA.streetModes.map(m => `
                    <div class="char-card" data-mode="${m.id}" style="width:220px">
                        <div class="char-name">${m.name}</div>
                        <div class="char-ability">${m.desc}</div>
                        <div class="char-role">⏱ ${m.time} ثانية</div>
                    </div>`).join('')}
            </div>
            <button class="menu-btn small" data-act="back">رجوع</button>
        `);
        s.addEventListener('click', (e) => {
            if (e.target.dataset.act === 'back') { Audio2.play('back'); this.showStreetSetup(); return; }
            const card = e.target.closest('.char-card');
            if (!card) return;
            Audio2.play('confirm');
            this.game.startStreet(chosenChars, card.dataset.mode);
        });
    }

    /* ================= الأونلاين ================= */
    showOnlineMenu() {
        if (!Net.canConnect()) {
            this.showToast('الأونلاين يحتاج سيرفر! شغّل: npm start وافتح اللعبة من http://');
            return;
        }
        let selChar = 0;
        const chips = GAME_DATA.characters.map((c, i) =>
            `<button class="char-chip ${i === 0 ? 'sel' : ''}" data-chip="${i}">${c.name}</button>`).join('');
        const s = this.showScreen(`
            <h2 class="screen-title">🌐 اللعب أونلاين</h2>
            <p style="color:#bcaee8;margin-bottom:10px">اختر شخصيتك:</p>
            <div class="chip-row">${chips}</div>
            <button class="menu-btn primary" data-act="create">دير روم جديد</button>
            <div class="join-row">
                <input id="room-code" class="room-input" maxlength="4" placeholder="كود الروم" autocomplete="off">
                <button class="menu-btn" data-act="join">ادخل الروم</button>
            </div>
            <button class="menu-btn small" data-act="back">رجوع</button>
            <p class="screen-hint">كل لاعب يفتح اللعبة من هاتفه على نفس العنوان ويدخل بالكود</p>
        `);

        s.addEventListener('click', async (e) => {
            const chip = e.target.dataset.chip;
            if (chip !== undefined) {
                selChar = +chip;
                s.querySelectorAll('.char-chip').forEach(c => c.classList.toggle('sel', c.dataset.chip === chip));
                Audio2.play('confirm');
                return;
            }
            const act = e.target.dataset.act;
            if (!act) return;
            if (act === 'back') { Audio2.play('back'); Net.leave(); this.showMainMenu(); return; }

            const char = GAME_DATA.characters[selChar];
            try {
                await Net.connect();
            } catch {
                this.showToast('ما قدرناش نتصلوا بالسيرفر! تأكد إنه شغّال (npm start)');
                return;
            }
            Net.on('err', (m) => this.showToast(m.msg));
            Net.on('created', (m) => this.showLobby(m.code, m.players, true));
            Net.on('joined', (m) => this.showLobby(m.code, m.players, false));

            if (act === 'create') {
                Audio2.play('confirm');
                Net.createRoom(char.name, char.id);
            } else if (act === 'join') {
                const code = s.querySelector('#room-code').value.trim();
                if (code.length < 4) { this.showToast('اكتب كود الروم (4 حروف)!'); return; }
                Audio2.play('confirm');
                Net.joinRoom(code, char.name, char.id);
            }
        });
    }

    showLobby(code, players, isHost) {
        let selMode = GAME_DATA.streetModes[0].id;
        const render = (list, host) => {
            const rows = list.map(p => `
                <div class="lobby-player">${p.host ? '👑 ' : ''}${p.name}</div>`).join('');
            const modes = GAME_DATA.streetModes.map(m =>
                `<button class="char-chip mode-chip ${m.id === selMode ? 'sel' : ''}" data-mode="${m.id}">${m.name}</button>`).join('');
            return `
                <h2 class="screen-title">الروم</h2>
                <div class="room-code-big">${code}</div>
                <p style="color:#bcaee8;margin-bottom:8px">عطِ الكود لأصحابك باش يدخلوا (${list.length}/5)</p>
                <div class="lobby-list">${rows}</div>
                ${host ? `<p style="color:#bcaee8;margin:8px 0 4px">اختر النمط:</p><div class="chip-row">${modes}</div>
                <button class="menu-btn primary" data-act="go" ${list.length < 2 ? 'disabled' : ''}>ابدأ اللعب (${list.length} لاعبين)</button>`
                : '<p style="color:#f5a623;margin-top:10px">❗ في انتظار صاحب الروم يبدأ...</p>'}
                <button class="menu-btn small" data-act="leave">اطلع من الروم</button>`;
        };

        const s = this.showScreen(render(players, isHost));

        Net.on('roster', (m) => {
            const meHost = m.players.find(p => p.id === Net.myId)?.host || false;
            isHost = meHost;
            s.innerHTML = render(m.players, isHost);
        });
        Net.on('started', (m) => {
            const meEntry = m.players.find(p => p.id === Net.myId);
            const amHost = meEntry ? meEntry.host : false;
            Audio2.play('whistle');
            this.game.startOnline(m.modeId, m.players, Net.myId, amHost);
        });

        s.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            if (mode) {
                selMode = mode;
                s.querySelectorAll('.mode-chip').forEach(c => c.classList.toggle('sel', c.dataset.mode === mode));
                Audio2.play('confirm');
                return;
            }
            const act = e.target.dataset.act;
            if (act === 'go') { Net.startGame(selMode); }
            else if (act === 'leave') { Audio2.play('back'); Net.leave(); this.showMainMenu(); }
        });
    }

    /* ================= الإعدادات ================= */
    showSettings() {
        const st = SaveSystem.data.settings;
        const s = this.showScreen(`
            <h2 class="screen-title">الإعدادات</h2>
            <div class="settings-panel">
                <div class="setting-row">
                    <span>الموسيقى</span>
                    <input type="range" id="set-music" min="0" max="100" value="${st.musicVolume * 100}">
                </div>
                <div class="setting-row">
                    <span>المؤثرات</span>
                    <input type="range" id="set-sfx" min="0" max="100" value="${st.sfxVolume * 100}">
                </div>
                <div class="setting-row">
                    <span>كتم الصوت</span>
                    <button class="toggle-btn ${st.muted ? 'on' : ''}" id="set-mute">${st.muted ? 'مكتوم' : 'مفعّل'}</button>
                </div>
                <div class="setting-row">
                    <span>اهتزاز الشاشة</span>
                    <button class="toggle-btn ${st.screenShake ? 'on' : ''}" id="set-shake">${st.screenShake ? 'نعم' : 'لا'}</button>
                </div>
                <div class="setting-row">
                    <span>عرض FPS</span>
                    <button class="toggle-btn ${st.showFps ? 'on' : ''}" id="set-fps">${st.showFps ? 'نعم' : 'لا'}</button>
                </div>
                <div class="setting-row">
                    <span>مسح التقدم</span>
                    <button class="toggle-btn" id="set-reset">مسح</button>
                </div>
            </div>
            <button class="menu-btn small" data-act="back" style="margin-top:18px">رجوع</button>
        `);
        s.querySelector('#set-music').addEventListener('input', (e) => {
            const v = e.target.value / 100;
            SaveSystem.updateSettings({ musicVolume: v });
            Audio2.setMusicVolume(v);
        });
        s.querySelector('#set-sfx').addEventListener('input', (e) => {
            const v = e.target.value / 100;
            SaveSystem.updateSettings({ sfxVolume: v });
            Audio2.setSfxVolume(v);
            Audio2.play('select');
        });
        s.querySelector('#set-mute').addEventListener('click', (e) => {
            const m = !SaveSystem.data.settings.muted;
            SaveSystem.updateSettings({ muted: m });
            Audio2.setMuted(m);
            e.target.classList.toggle('on', m);
            e.target.textContent = m ? 'مكتوم' : 'مفعّل';
        });
        s.querySelector('#set-shake').addEventListener('click', (e) => {
            const v = !SaveSystem.data.settings.screenShake;
            SaveSystem.updateSettings({ screenShake: v });
            e.target.classList.toggle('on', v);
            e.target.textContent = v ? 'نعم' : 'لا';
        });
        s.querySelector('#set-fps').addEventListener('click', (e) => {
            const v = !SaveSystem.data.settings.showFps;
            SaveSystem.updateSettings({ showFps: v });
            e.target.classList.toggle('on', v);
            e.target.textContent = v ? 'نعم' : 'لا';
        });
        s.querySelector('#set-reset').addEventListener('click', () => {
            if (confirm('هل أنت متأكد من مسح كل التقدم؟')) {
                SaveSystem.reset();
                Audio2.play('back');
                this.showMainMenu();
            }
        });
        s.addEventListener('click', (e) => {
            if (e.target.dataset.act === 'back') { Audio2.play('back'); this.showMainMenu(); }
        });
    }

    /* ================= الإنجازات ================= */
    showAchievements() {
        const s = this.showScreen(`
            <h2 class="screen-title">الإنجازات</h2>
            <div class="ach-list">
                ${GAME_DATA.achievements.map(a => {
                    const done = SaveSystem.data.achievements[a.id];
                    return `<div class="ach-item ${done ? 'done' : ''}">
                        <div class="ach-icon">${done ? a.icon : '🔒'}</div>
                        <div class="ach-info"><h4>${a.name}</h4><p>${a.desc}</p></div>
                    </div>`;
                }).join('')}
            </div>
            <p style="color:#9a8cc8;margin-top:10px">الذكريات: ${SaveSystem.data.memoriesCollected} / ${SaveSystem.data.totalMemories}</p>
            <button class="menu-btn small" data-act="back" style="margin-top:12px">رجوع</button>
        `);
        s.addEventListener('click', (e) => {
            if (e.target.dataset.act === 'back') { Audio2.play('back'); this.showMainMenu(); }
        });
    }

    /* ================= الإيقاف المؤقت ================= */
    showPause() {
        const s = this.showScreen(`
            <h2 class="screen-title">إيقاف مؤقت</h2>
            <button class="menu-btn primary" data-act="resume">استئناف</button>
            <button class="menu-btn" data-act="menu">القائمة الرئيسية</button>
        `, true);
        s.addEventListener('click', (e) => {
            const act = e.target.dataset.act;
            if (act === 'resume') { Audio2.play('confirm'); this.game.resume(); }
            else if (act === 'menu') { Audio2.play('back'); this.game.returnToMenu(); }
        });
    }

    /* ================= نتيجة وضع شارعنا ================= */
    showStreetResult(winner, players, mode) {
        const ranked = [...players].sort((a, b) => b.score - a.score);
        const s = this.showScreen(`
            <div class="result-panel">
                <h1>🏆 ${winner ? winner.char.name : 'تعادل'}</h1>
                <p>${winner ? 'فاز في ' + mode.name + '!' : 'انتهى الوقت بالتعادل'}</p>
                ${ranked.map((p, i) => `<p style="font-size:16px;margin:4px">${i + 1}. ${p.char.name} — ${Math.floor(p.score)} نقطة</p>`).join('')}
                <button class="menu-btn primary" data-act="again" style="margin-top:16px">إعادة اللعب</button>
                <button class="menu-btn" data-act="menu">القائمة الرئيسية</button>
            </div>
        `, true);
        s.addEventListener('click', (e) => {
            const act = e.target.dataset.act;
            if (act === 'again') {
                Audio2.play('confirm');
                if (this.game.online) this.game.online.restart(mode.id);
                else this.game.street.start(mode.id);
                this.clearScreen();
            }
            else if (act === 'menu') { Audio2.play('back'); this.game.returnToMenu(); }
        });
        // في الأونلاين: الهوست فقط يعيد الجولة
        if (this.game.online && !this.game.online.isHost) {
            const btn = s.querySelector('[data-act="again"]');
            if (btn) btn.style.display = 'none';
        }
    }

    /* ================= HUD ================= */
    showHud() { this.hud.classList.add('visible'); }
    hideHud() {
        this.hud.classList.remove('visible');
        this.setTimer(null);
        this.setObjective('');
    }

    buildHudPlayers(players) {
        const wrap = this.hud.querySelector('#hud-players');
        wrap.innerHTML = players.map((p, i) => `
            <div class="hud-player" id="hud-p${i}">
                <div class="hud-name" style="color:${GAME_DATA.playerTagColors[i]}">${p.char.name}</div>
                <div class="hud-health-bar"><div class="hud-health-fill" id="hud-hp${i}"></div></div>
                <div class="hud-ability-row">
                    <div class="hud-ability-icon" style="background:${p.char.colors.shirt}">⚡</div>
                    <div class="hud-cd-bar"><div class="hud-cd-fill" id="hud-cd${i}"></div></div>
                </div>
            </div>`).join('');
    }

    updateHud(players) {
        players.forEach((p, i) => {
            const hp = document.getElementById('hud-hp' + i);
            const cd = document.getElementById('hud-cd' + i);
            if (hp) hp.style.width = Math.max(0, (p.health / p.maxHealth) * 100) + '%';
            if (cd) {
                const ratio = p.abilityCooldown <= 0 ? 1 : 1 - (p.abilityCooldown / p.char.ability.cooldown);
                cd.style.width = (ratio * 100) + '%';
            }
        });
    }

    setObjective(text) {
        const el = this.hud.querySelector('#hud-objective');
        el.textContent = text;
        el.style.display = text ? 'block' : 'none';
    }

    setTimer(seconds, label) {
        const el = document.getElementById('hud-timer');
        if (seconds === null || seconds === undefined) { el.textContent = ''; return; }
        el.textContent = (label ? label + ' ' : '') + seconds;
        el.style.color = seconds <= 10 ? '#ff5e5e' : '#fff';
    }

    setScore(text) {
        document.getElementById('hud-score').textContent = text || '';
    }

    /* ================= الحوار ================= */
    showDialogue(line) {
        this.dlgBox.classList.add('visible');
        document.getElementById('dlg-speaker').textContent = line.speaker;
        document.getElementById('dlg-text').textContent = line.text;
    }
    hideDialogue() { this.dlgBox.classList.remove('visible'); }

    /* ================= الإشعارات ================= */
    showToast(text, isAchievement) {
        const t = document.createElement('div');
        t.className = 'toast' + (isAchievement ? ' achievement' : '');
        t.textContent = text;
        this.toastArea.appendChild(t);
        setTimeout(() => t.classList.add('out'), 2400);
        setTimeout(() => t.remove(), 2900);
    }

    showAchievement(name) {
        Audio2.play('achievement');
        this.showToast('🏆 إنجاز جديد: ' + name, true);
    }

    /* ================= عنوان الفصل ================= */
    showChapterTitle(sub, name) {
        document.getElementById('ch-sub').textContent = sub;
        document.getElementById('ch-name').textContent = name;
        this.chapterEl.classList.add('visible');
        setTimeout(() => this.chapterEl.classList.remove('visible'), 2600);
    }
}
