/* =====================================================
   غوط الشعال: شارعنا — بيانات اللعبة
   (نسخة مضمنة لتعمل اللعبة Offline من file:// مباشرة.
    النسخ المرجعية موجودة في /data/*.json)
===================================================== */
'use strict';

const GAME_DATA = {

    /* ---------- الشخصيات ---------- */
    characters: [
        {
            id: 'ali',
            name: 'علي',
            role: 'المندفع',
            ability: { id: 'nida', name: 'نداء الحشرات', desc: 'يستدعي سرب حشرات يشتت الأعداء القريبين', cooldown: 8, duration: 2.5 },
            stats: { speed: 3, power: 3, stealth: 3, intelligence: 4 },
            colors: { skin: '#e8b98a', shirt: '#2e6fd8', pants: '#2b2b3d', hair: '#241a10', accent: '#ffd24a' }
        },
        {
            id: 'asem',
            name: 'عاصم',
            role: 'السريع',
            ability: { id: 'khatfa', name: 'الخطفة', desc: 'اندفاع سريع يدمّج كل اللي يمر عليه', cooldown: 4, duration: 0.3 },
            stats: { speed: 5, power: 2, stealth: 3, intelligence: 2 },
            colors: { skin: '#d9a06b', shirt: '#e33f3f', pants: '#1e2a45', hair: '#100a05', accent: '#ff9d3c' }
        },
        {
            id: 'abdulalim',
            name: 'عبد العليم',
            role: 'القوي',
            ability: { id: 'dafaa', name: 'الدفعة', desc: 'يدفع ويدمّج كل اللي قدامه بضرر قوي', cooldown: 6, duration: 0.4 },
            stats: { speed: 2, power: 5, stealth: 1, intelligence: 3 },
            colors: { skin: '#c98d5e', shirt: '#3d9d4e', pants: '#3a2e22', hair: '#1a120a', accent: '#a8e063' }
        },
        {
            id: 'siddiq',
            name: 'صديق',
            role: 'الماكر',
            ability: { id: 'ain', name: 'العين', desc: 'يجمّد الخصم ويدمّجه دمج مرتفع', cooldown: 9, duration: 2.2 },
            stats: { speed: 3, power: 2, stealth: 4, intelligence: 3 },
            colors: { skin: '#e5b088', shirt: '#8d4fd3', pants: '#242038', hair: '#2a1c0e', accent: '#c8a2ff' }
        },
        {
            id: 'alwani',
            name: 'علوني',
            role: 'الذكي',
            ability: { id: 'tamweh', name: 'التمويه', desc: 'اختفاء طويل مع زيادة السرعة والدمج', cooldown: 10, duration: 5 },
            stats: { speed: 4, power: 1, stealth: 5, intelligence: 5 },
            colors: { skin: '#dba97a', shirt: '#e8c93a', pants: '#33303f', hair: '#151009', accent: '#fff3a0' }
        }
    ],

    /* ---------- إعدادات الفيزياء ---------- */
    physics: {
        gravity: 2200,
        maxFallSpeed: 1400,
        walkSpeed: 240,
        runMultiplier: 1.55,
        jumpVelocity: -780,
        climbSpeed: 160,
        friction: 0.82,
        airControl: 0.75
    },

    /* ---------- مناطق العالم (شارعنا) ---------- */
    world: {
        width: 12000,
        groundY: 620,
        zones: [
            { id: 'street_start',  name: 'بداية شارع غوط الشعال', from: 0,     to: 2600 },
            { id: 'street_mid',    name: 'منتصف الشارع',          from: 2600,  to: 5400 },
            { id: 'alleys',        name: 'الأزقة',                from: 5400,  to: 7800 },
            { id: 'abandoned',     name: 'المبنى المهجور',        from: 7800,  to: 10000 },
            { id: 'street_end',    name: 'نهاية الشارع',          from: 10000, to: 12000 }
        ]
    },

    /* ---------- فصول القصة ---------- */
    story: [
        {
            id: 'ch1',
            title: 'الفصل الأول',
            name: 'يوم عادي في الشارع',
            objective: 'تعلّم الحركة وتحدث مع أصدقائك ثم اجمع 5 ذكريات',
            zone: 'street_start'
        },
        {
            id: 'ch2',
            title: 'الفصل الثاني',
            name: 'المواجهة مع خالد',
            objective: 'اهزم خالد بوس عند الدكان',
            zone: 'street_mid'
        },
        {
            id: 'ch3',
            title: 'الفصل الثالث',
            name: 'اكتشاف المبنى المهجور',
            objective: 'اعبر الأزقة وادخل المبنى المهجور واجمع 3 ذكريات',
            zone: 'alleys'
        },
        {
            id: 'ch4',
            title: 'الفصل الرابع',
            name: 'ظهور نورالدين',
            objective: 'انجُ من حصار نورالدين واهرب من المبنى',
            zone: 'abandoned'
        },
        {
            id: 'ch5',
            title: 'الفصل الخامس',
            name: 'المواجهة النهائية',
            objective: 'اهزم نورالدين بوس في نهاية الشارع',
            zone: 'street_end'
        }
    ],

    /* ---------- أنماط وضع شارعنا ---------- */
    streetModes: [
        { id: 'king',    name: 'ملك الشارع',       desc: 'ابقَ داخل منطقة التاج أطول وقت لتجمع النقاط', time: 90 },
        { id: 'last',    name: 'آخر واحد في الشارع', desc: 'اضرب خصومك وأخرجهم — آخر من يبقى يفوز', time: 120 },
        { id: 'treasure',name: 'كنز الشارع',        desc: 'اجمع أكبر عدد من الكنوز المتساقطة', time: 75 },
        { id: 'chase',   name: 'المطاردة',          desc: 'واحد مطارد والبقية يهربون — اللمسة تنقل المطاردة', time: 90 },
        { id: 'race',    name: 'سباق الأزقة',       desc: 'أول من يصل نهاية المضمار يفوز', time: 120 },
        { id: 'goldball',name: 'الكرة الذهبية',     desc: 'أمسك الكرة الذهبية أطول وقت ممكن', time: 90 },
        { id: 'hide',    name: 'الغميضة',           desc: 'الباحث يمسك المختبئين قبل انتهاء الوقت', time: 80 }
    ],

    /* ---------- الإنجازات ---------- */
    achievements: [
        { id: 'story_done',   icon: '🏆', name: 'حكاية الشارع',   desc: 'أنهِ طور القصة كاملًا' },
        { id: 'beat_khaled',  icon: '🥊', name: 'سقوط خالد',      desc: 'اهزم خالد بوس' },
        { id: 'beat_nour',    icon: '👑', name: 'ملك غوط الشعال', desc: 'اهزم نورالدين بوس' },
        { id: 'memories',     icon: '📸', name: 'صندوق الذكريات', desc: 'اجمع كل الذكريات' },
        { id: 'street_win',   icon: '⭐', name: 'نجم شارعنا',     desc: 'افز في وضع شارعنا' }
    ],

    /* ---------- مفاتيح التحكم للاعبين المحليين ---------- */
    controls: [
        { left: 'KeyA',       right: 'KeyD',       up: 'KeyW',      down: 'KeyS',        jump: 'Space',   ability: 'KeyE',      attack: 'KeyF' },
        { left: 'ArrowLeft',  right: 'ArrowRight', up: 'ArrowUp',   down: 'ArrowDown',   jump: 'ArrowUp', ability: 'Slash',     attack: 'Period' },
        { left: 'KeyJ',       right: 'KeyL',       up: 'KeyI',      down: 'KeyK',        jump: 'KeyI',    ability: 'KeyO',      attack: 'KeyU' },
        { left: 'KeyF',       right: 'KeyH',       up: 'KeyT',      down: 'KeyG',        jump: 'KeyT',    ability: 'KeyY',      attack: 'KeyR' },
        { left: 'Numpad4',    right: 'Numpad6',    up: 'Numpad8',   down: 'Numpad5',     jump: 'Numpad8', ability: 'Numpad9',   attack: 'Numpad7' }
    ],

    playerTagColors: ['#ffd24a', '#5ec8ff', '#7dffa0', '#ff8ad4', '#ff9d5e']
};
