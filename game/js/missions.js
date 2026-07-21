/* =====================================================
   طور القصة — خمسة فصول + الخاتمة
===================================================== */
'use strict';

class StoryMode {
    constructor(game) {
        this.game = game;
        this.chapterIndex = 0;
        this.phase = 'intro';       // intro | play | outro | done
        this.dialogue = null;       // { lines: [{speaker, text}], index, charShown }
        this.objectiveText = '';
        this.progress = 0;
        this.target = 0;
        this.boss = null;
        this.escapeTimer = 0;
        this.friends = [];          // NPC الأصدقاء
        this.tutorialStep = 0;
        this.epilogue = false;
    }

    startChapter(index) {
        const game = this.game;
        const world = game.world;
        this.chapterIndex = index;
        this.phase = 'intro';
        this.boss = null;
        this.friends = [];
        world.enemies = [];
        world.collectibles = [];
        game.particles.clear();

        const ch = GAME_DATA.story[index];
        SaveSystem.setChapter(index + 1);

        const zone = GAME_DATA.world.zones.find(z => z.id === ch.zone);
        const g = world.groundY;

        // البطل = الشخصية المختارة، والأصدقاء = البقية
        this.hero = game.players[0].char;
        this.buddies = GAME_DATA.characters.filter(c => c.id !== this.hero.id);

        // وضع اللاعب في بداية المنطقة
        game.players[0].respawn(zone.from + 120, g - 120);
        game.players[0].health = game.players[0].maxHealth;
        game.camera.x = Math.max(0, zone.from - 100);

        switch (index) {
            case 0: // الفصل الأول: يوم عادي
                world.timeOfDay = 'day';
                Audio2.playMusic('street');
                this.setupFriends([
                    { id: this.buddies[0].id, x: 700 }, { id: this.buddies[1].id, x: 1350 },
                    { id: this.buddies[2].id, x: 1900 }, { id: this.buddies[3].id, x: 2350 }
                ]);
                world.spawnMemories([
                    { x: 300, y: g - 290 }, { x: 1000, y: g - 290 },
                    { x: 1370, y: g - 140 }, { x: 1560, y: g - 130 },
                    { x: 2450, y: g - 60 }
                ]);
                this.target = 5;
                this.progress = 0;
                this.objectiveText = 'لمّ الذكريات 0/5 واحكي مع أصحابك';
                this.showDialogue([
                    { speaker: 'الراوي', text: 'غوط الشعال... حيّنا. هني كبرنا، وهني كانت أحلى أيامنا.' },
                    { speaker: this.hero.name, text: 'نهار جديد في الشارع! هيا نلفّوا على الربع ونلمّوا ذكرياتنا الباهية.' },
                    { speaker: 'تلميح', text: 'التحرك: A/D — القفز: مسافة — الجري: Shift — القدرة: E — الضربة: F' },
                    { speaker: 'تلميح', text: 'اطلع من السلالم (W/S) باش توصل للذكريات اللي فوق السطوح!' }
                ]);
                break;

            case 1: // الفصل الثاني: خالد بوس
                world.timeOfDay = 'day';
                Audio2.playMusic('danger');
                this.boss = new KhaledBoss(3600, g - 100);
                world.enemies.push(this.boss);
                world.enemies.push(new Enemy(3100, g - 80, { health: 30, colors: { skin: '#d8a878', shirt: '#6a5a3a', pants: '#3a3428', hair: '#221a10' } }));
                world.enemies.push(new Enemy(4300, g - 80, { health: 30, colors: { skin: '#c89868', shirt: '#3a5a6a', pants: '#2a3438', hair: '#181410' } }));
                this.objectiveText = 'اهزم خالد بوس قدام الحانوت!';
                this.showDialogue([
                    { speaker: this.buddies[0].name, text: this.hero.name + '! خالد وشلّته واقفين قدام الحانوت وما يخلّوش حد يعدّي!' },
                    { speaker: 'خالد', text: 'شني؟ هذا شارعنا توا. اللي يبي يعدّي... يخلّص!' },
                    { speaker: this.hero.name, text: 'الشارع متاع الكل يا خالد. وكان تبي نتفاهموا بطريقتك... هيا!' }
                ]);
                this.game.camera.cinematic(3650, g - 150, 1.3, 2.2);
                break;

            case 2: // الفصل الثالث: الأزقة والمبنى
                world.timeOfDay = 'sunset';
                Audio2.playMusic('calm');
                world.spawnMemories([
                    { x: 5750, y: g - 60 }, { x: 6380, y: g - 300 }, { x: 7350, y: g - 60 }
                ]);
                world.enemies.push(new Enemy(6000, g - 80, { health: 35, sightRange: 300 }));
                world.enemies.push(new Enemy(6900, g - 80, { health: 35, sightRange: 300 }));
                this.target = 3;
                this.progress = 0;
                this.objectiveText = 'اعبر الزنقات ولمّ الذكريات 0/3 وبعدين ادخل العمارة المهجورة';
                this.showDialogue([
                    { speaker: this.buddies[1].name, text: 'سمعتوا الحكاية؟ يقولوا في حاجة غريبة في العمارة المهجورة في آخر الزنقة...' },
                    { speaker: this.buddies[2].name, text: 'الزنقات فيهن ممرات سرية تحت الحيوط. طاطوا وادخلوا منهن!' },
                    { speaker: this.hero.name, text: 'هيا نشوفوا بروحنا. ردّوا بالكم، في ناس غريبة في الزنقات.' }
                ]);
                break;

            case 3: // الفصل الرابع: ظهور نورالدين
                world.timeOfDay = 'night';
                Audio2.playMusic('boss');
                this.escapeTimer = 60;
                world.enemies.push(new Enemy(8500, g - 80, { health: 40, chaseSpeed: 260, sightRange: 900 }));
                world.enemies.push(new Enemy(9000, g - 280, { health: 40, chaseSpeed: 260, sightRange: 900 }));
                world.enemies.push(new Enemy(9400, g - 80, { health: 40, chaseSpeed: 260, sightRange: 900 }));
                game.players[0].respawn(8900, g - 450);
                this.objectiveText = 'اهرب من العمارة المهجورة! امشي غرب لمخرج الشارع';
                this.showDialogue([
                    { speaker: '???', text: 'ههههه... شكون قالكم تدخلوا مملكتي؟' },
                    { speaker: 'نورالدين', text: 'أنا نورالدين. الشارع هذا كله باش يولّي تحت إيدي... وانتوا أول العبرة.' },
                    { speaker: this.hero.name, text: 'اجروا!! ما نقدروش عليه هني — لازم نطلعوا للشارع!' }
                ]);
                this.game.camera.cinematic(9100, g - 300, 1.4, 2.5);
                break;

            case 4: // الفصل الخامس: المواجهة النهائية
                world.timeOfDay = 'night';
                Audio2.playMusic('boss');
                this.boss = new NoureddineBoss(11200, g - 120);
                world.enemies.push(this.boss);
                game.players[0].respawn(10150, g - 120);
                this.objectiveText = 'المواجهة الأخيرة: اهزم نورالدين!';
                this.showDialogue([
                    { speaker: 'نورالدين', text: 'وصلتوا للآخر؟ عجبتني شجاعتكم... لكن هني توفى الحكاية.' },
                    { speaker: this.buddies[3].name, text: 'الحكاية ما توفاش كان بنهايتك انت يا نورالدين!' },
                    { speaker: this.hero.name, text: 'كلنا مع بعض... كيف أيام زمان. على خاطر الشارع!' }
                ]);
                this.game.camera.cinematic(11220, g - 200, 1.35, 2.5);
                break;
        }

        this.game.ui.showChapterTitle(GAME_DATA.story[index].title, GAME_DATA.story[index].name);
        this.game.ui.setObjective(this.objectiveText);
    }

    setupFriends(list) {
        const g = this.game.world.groundY;
        this.friends = list.map(f => {
            const char = GAME_DATA.characters.find(c => c.id === f.id);
            const npc = new Player(char, f.x, g - 80, -1);
            npc.isNpc = true;
            npc.talked = false;
            return npc;
        });
    }

    showDialogue(lines) {
        this.dialogue = { lines, index: 0 };
        this.game.ui.showDialogue(lines[0]);
        Audio2.play('dialogue');
    }

    advanceDialogue() {
        if (!this.dialogue) return;
        this.dialogue.index++;
        if (this.dialogue.index >= this.dialogue.lines.length) {
            this.dialogue = null;
            this.game.ui.hideDialogue();
            if (this.phase === 'intro') this.phase = 'play';
            if (this.phase === 'outro') this.finishChapter();
        } else {
            this.game.ui.showDialogue(this.dialogue.lines[this.dialogue.index]);
            Audio2.play('dialogue');
        }
    }

    update(dt) {
        const game = this.game;
        const world = game.world;
        const player = game.players[0];

        // تقدم الحوار
        if (this.dialogue) {
            if (Input.wasPressed('Space') || Input.wasPressed('Enter') || Input.wasPressed('KeyE')) {
                this.advanceDialogue();
            }
            return; // اللعبة متوقفة أثناء الحوار
        }

        if (this.phase !== 'play') return;

        // NPCs يتحركون قليلًا (Idle)
        for (const f of this.friends) {
            f.animTime += dt;
            Physics.moveEntity(f, world.solids, dt);
        }

        // جمع الذكريات
        for (const c of world.collectibles) {
            if (!c.collected && Physics.aabb(player, c)) {
                c.collected = true;
                this.progress++;
                Audio2.play('collect');
                game.particles.sparkle(c.x + 13, c.y + 13);
                const mems = SaveSystem.addMemory();
                if (mems >= SaveSystem.data.totalMemories && SaveSystem.unlockAchievement('memories')) {
                    game.ui.showAchievement('صندوق الذكريات');
                }
                this.updateObjectiveProgress();
            }
        }

        // التحدث مع الأصدقاء
        for (const f of this.friends) {
            if (!f.talked && Physics.dist(player, f) < 70 && Input.wasPressed('KeyE')) {
                f.talked = true;
                const talks = {
                    ali: 'شوف الشارع اليوم... كل ركن فيه حكاية. نبقوا ديما مع بعض يا خوي!',
                    asem: 'شفت سرعتي الجديدة؟ حتى واحد ما يلحقنيش في الشارع كله!',
                    abdulalim: 'أي حيط يوقف قدامك... عيّطلي ونحيّدهولك.',
                    siddiq: 'عينيّ على كل حاجة تصير في الشارع... كل حاجة.',
                    alwani: 'عندي خطة لكل موقف. بس خلّيها بيني وبينك توا!'
                };
                this.showDialogue([{ speaker: f.char.name, text: talks[f.char.id] }]);
                Audio2.play('confirm');
            }
        }

        // منطق كل فصل
        switch (this.chapterIndex) {
            case 0:
            case 2:
                if (this.progress >= this.target) {
                    if (this.chapterIndex === 2) {
                        // يجب الوصول للمبنى المهجور
                        this.objectiveText = 'ادخل العمارة المهجورة!';
                        this.game.ui.setObjective(this.objectiveText);
                        if (player.x > 8300) this.completeChapter();
                    } else {
                        this.completeChapter();
                    }
                }
                break;

            case 1: // هزيمة خالد
                if (this.boss && !this.boss.alive) {
                    SaveSystem.data.stats.khaledDefeats++;
                    if (SaveSystem.unlockAchievement('beat_khaled')) game.ui.showAchievement('سقوط خالد');
                    this.completeChapter();
                }
                break;

            case 3: // الهروب
                this.escapeTimer -= dt;
                game.ui.setTimer(Math.ceil(this.escapeTimer));
                if (player.x < 7900) {
                    game.ui.setTimer(null);
                    this.completeChapter();
                } else if (this.escapeTimer <= 0) {
                    // فشل — إعادة
                    game.ui.setTimer(null);
                    Audio2.play('lose');
                    this.startChapter(3);
                }
                break;

            case 4: // نورالدين
                if (this.boss && !this.boss.alive) {
                    SaveSystem.data.stats.nourDefeats++;
                    if (SaveSystem.unlockAchievement('beat_nour')) game.ui.showAchievement('ملك غوط الشعال');
                    this.completeChapter();
                }
                break;
        }

        // موت اللاعب = إعادة الفصل
        if (!player.alive) {
            Audio2.play('lose');
            game.ui.setTimer(null);
            this.startChapter(this.chapterIndex);
        }
    }

    updateObjectiveProgress() {
        if (this.chapterIndex === 0) {
            this.objectiveText = `لمّ الذكريات ${this.progress}/${this.target} واحكي مع أصحابك`;
        } else if (this.chapterIndex === 2) {
            this.objectiveText = `اعبر الزنقات ولمّ الذكريات ${this.progress}/${this.target}`;
        }
        this.game.ui.setObjective(this.objectiveText);
    }

    completeChapter() {
        this.phase = 'outro';
        Audio2.play('win');
        const hero = this.hero.name;
        const outros = [
            [{ speaker: hero, text: 'نهار باهي كيف كل أيام شارعنا... بس حاسس في حاجة غريبة جاية.' }],
            [{ speaker: 'خالد', text: 'باهي باهي... ربحتوا. بس اسمعوني: في واحد اسمه نورالدين، جاي ياخذ الشارع كله!' },
             { speaker: hero, text: 'نورالدين؟ شكون هذا؟ لازم نعرفوا أكثر...' }],
            [{ speaker: this.buddies[1].name, text: 'العمارة هذي... فيها حركة غريبة. حسيت بعيون تراقب فينا.' }],
            [{ speaker: this.buddies[2].name, text: 'نجينا! بس نورالدين مش باش يوقف. لازم نواجهوه قبل ما ياخذ الشارع.' },
             { speaker: hero, text: 'خلاص القرار اتخذ. غدوة... المواجهة الأخيرة في آخر الشارع.' }],
            [{ speaker: 'نورالدين', text: 'خسرت... قدام شلة عيال زنقة؟!' },
             { speaker: hero, text: 'مش عيال زنقة بس... إحنا خوة. وهذا الفرق اللي عمرك ما باش تفهمه.' }]
        ];
        this.showDialogue(outros[this.chapterIndex]);
    }

    finishChapter() {
        if (this.epilogue) {
            this.handleEpilogueEnd();
            return;
        }
        if (this.chapterIndex >= 4) {
            // الخاتمة
            this.startEpilogue();
        } else {
            this.startChapter(this.chapterIndex + 1);
        }
    }

    startEpilogue() {
        this.epilogue = true;
        this.phase = 'play';
        const game = this.game;
        game.world.timeOfDay = 'sunset';
        game.world.enemies = [];
        Audio2.playMusic('calm');
        SaveSystem.completeStory();
        if (SaveSystem.unlockAchievement('story_done')) game.ui.showAchievement('حكاية الشارع');
        // الأصدقاء مجتمعون في بداية الشارع
        this.setupFriends([
            { id: this.buddies[0].id, x: 1180 }, { id: this.buddies[1].id, x: 1260 },
            { id: this.buddies[2].id, x: 1420 }, { id: this.buddies[3].id, x: 1500 }
        ]);
        game.players[0].respawn(1330, game.world.groundY - 120);
        game.camera.cinematic(1340, game.world.groundY - 150, 1.2, 5);
        this.objectiveText = '';
        game.ui.setObjective('');
        this.phase = 'outro';
        this.showDialogue([
            { speaker: 'الراوي', text: 'وبعد سنين... رجعنا للشارع. كبرنا، وتبدلت الدنيا...' },
            { speaker: 'الراوي', text: 'لكن غوط الشعال باقي في قلوبنا. الشارع مش أسفلت وحيوط...' },
            { speaker: this.hero.name, text: 'الشارع هو إحنا. شارعنا... للأبد.' },
            { speaker: 'النهاية', text: 'يعطيكم الصحة على اللعب "غوط الشعال: شارعنا" — مصنوعة بحب لذكرى الشارع.' }
        ]);
        // بعد الحوار الأخير سيستدعى finishChapter مجددًا
        this.chapterIndex = 5;
    }

    /* استدعاء عند انتهاء حوار الخاتمة */
    handleEpilogueEnd() {
        this.game.returnToMenu();
    }

    draw(ctx) {
        // رسم الأصدقاء NPC
        for (const f of this.friends) {
            f.draw(ctx);
            if (!f.talked && this.game.players[0] && Physics.dist(this.game.players[0], f) < 90) {
                ctx.save();
                ctx.fillStyle = '#ffe27a';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('E للحكي', f.cx, f.y - 16);
                ctx.restore();
            }
        }
        // شريط صحة البوس
        if (this.boss && this.boss.alive && this.phase === 'play') {
            this.drawBossBar(ctx);
        }
    }

    drawBossBar(ctx) {
        const cam = this.game.camera;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const w = Math.min(500, cam.viewW * 0.55);
        const x = (cam.viewW - w) / 2;
        const y = cam.viewH - 56;
        const name = this.boss.type === 'khaled' ? 'خالد بوس' : 'نورالدين بوس' +
            (this.boss.phase ? ' — المرحلة ' + this.boss.phase : '');
        ctx.fillStyle = 'rgba(10,5,20,0.75)';
        ctx.fillRect(x - 8, y - 26, w + 16, 48);
        ctx.fillStyle = '#ff9a9a';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, cam.viewW / 2, y - 8);
        ctx.fillStyle = '#3a1a2a';
        ctx.fillRect(x, y, w, 14);
        const ratio = this.boss.health / this.boss.maxHealth;
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, '#e03050');
        grad.addColorStop(1, '#ff7a5a');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w * ratio, 14);
        ctx.strokeStyle = '#8a4a5a';
        ctx.strokeRect(x, y, w, 14);
        ctx.restore();
    }
}
