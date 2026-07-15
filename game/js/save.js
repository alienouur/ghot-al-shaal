/* =====================================================
   نظام الحفظ — localStorage
   (تقدم القصة، الشخصيات، الإنجازات، الإعدادات)
===================================================== */
'use strict';

const SaveSystem = {
    KEY: 'ghot_alshaal_sharena_save_v1',

    defaults() {
        return {
            storyChapter: 0,          // آخر فصل تم الوصول إليه (0 = لم يبدأ)
            storyCompleted: false,
            unlockedCharacters: ['ali', 'asem', 'abdulalim', 'siddiq', 'alwani'],
            achievements: {},         // id -> true
            memoriesCollected: 0,
            totalMemories: 8,
            settings: {
                musicVolume: 0.5,
                sfxVolume: 0.7,
                muted: false,
                screenShake: true,
                showFps: false
            },
            stats: { streetWins: 0, khaledDefeats: 0, nourDefeats: 0 }
        };
    },

    data: null,

    load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.data = Object.assign(this.defaults(), parsed);
                this.data.settings = Object.assign(this.defaults().settings, parsed.settings || {});
            } else {
                this.data = this.defaults();
            }
        } catch (e) {
            console.warn('فشل تحميل الحفظ، بدء جديد', e);
            this.data = this.defaults();
        }
        return this.data;
    },

    save() {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('فشل الحفظ', e);
        }
    },

    /* تقدم القصة */
    setChapter(n) {
        if (n > this.data.storyChapter) {
            this.data.storyChapter = n;
            this.save();
        }
    },

    completeStory() {
        this.data.storyCompleted = true;
        this.save();
    },

    /* الإنجازات — ترجع true إذا كان جديدًا */
    unlockAchievement(id) {
        if (!this.data.achievements[id]) {
            this.data.achievements[id] = true;
            this.save();
            return true;
        }
        return false;
    },

    addMemory() {
        this.data.memoriesCollected++;
        this.save();
        return this.data.memoriesCollected;
    },

    updateSettings(patch) {
        Object.assign(this.data.settings, patch);
        this.save();
    },

    reset() {
        this.data = this.defaults();
        this.save();
    }
};

SaveSystem.load();
