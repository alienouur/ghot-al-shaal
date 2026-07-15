/* =====================================================
   نقطة الانطلاق — غوط الشعال: شارعنا
===================================================== */
'use strict';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    window.GAME = game; // للتصحيح من الكونسول
    Input.initTouchControls();
    game.start();
    console.log('%cغوط الشعال: شارعنا 🏘️', 'font-size:20px;color:#f5a623;font-weight:bold');
    console.log('لعبة 2D مبنية بالكامل بـ HTML5 + Canvas + JavaScript خام — بدون أي محرك ألعاب.');
});
