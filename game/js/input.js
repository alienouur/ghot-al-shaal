/* =====================================================
   نظام الإدخال — لوحة المفاتيح (يدعم 5 لاعبين محليين)
===================================================== */
'use strict';

class InputSystem {
    constructor() {
        this.keys = {};          // الحالة الحالية
        this.pressed = {};       // ضُغط في هذا الإطار فقط
        this.anyKeyPressed = false;

        window.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
            if (!this.keys[e.code]) this.pressed[e.code] = true;
            this.keys[e.code] = true;
            this.anyKeyPressed = true;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }

    isDown(code) { return !!this.keys[code]; }
    wasPressed(code) { return !!this.pressed[code]; }

    /* حالة تحكم لاعب معين حسب خريطة مفاتيحه */
    getPlayerInput(index) {
        const map = GAME_DATA.controls[index] || GAME_DATA.controls[0];
        return {
            left: this.isDown(map.left),
            right: this.isDown(map.right),
            up: this.isDown(map.up),
            down: this.isDown(map.down),
            jump: this.isDown(map.jump),
            jumpPressed: this.wasPressed(map.jump),
            ability: this.wasPressed(map.ability),
            attack: this.wasPressed(map.attack),
            run: index === 0 ? this.isDown('ShiftLeft') : false
        };
    }

    /* يُستدعى نهاية كل إطار */
    endFrame() {
        this.pressed = {};
        this.anyKeyPressed = false;
    }

    /* ========== أزرار اللمس (الهاتف) ========== */
    static isTouchDevice() {
        return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    }

    pressVirtual(code) {
        if (!this.keys[code]) this.pressed[code] = true;
        this.keys[code] = true;
        this.anyKeyPressed = true;
    }

    releaseVirtual(code) {
        this.keys[code] = false;
    }

    initTouchControls() {
        if (!InputSystem.isTouchDevice()) return;
        const wrap = document.createElement('div');
        wrap.id = 'touch-controls';
        wrap.innerHTML = `
            <div class="tc-pad">
                <button class="tc-btn tc-up"    data-k="KeyW">▲</button>
                <button class="tc-btn tc-left"  data-k="KeyA">◀</button>
                <button class="tc-btn tc-right" data-k="KeyD">▶</button>
                <button class="tc-btn tc-down"  data-k="KeyS">▼</button>
            </div>
            <div class="tc-actions">
                <button class="tc-btn tc-big"  data-k="Space">قفز</button>
                <button class="tc-btn"         data-k="KeyF">ضرب</button>
                <button class="tc-btn"         data-k="KeyE">قدرة</button>
                <button class="tc-btn tc-run"  data-k="ShiftLeft">جري</button>
            </div>
            <button class="tc-btn tc-pause" data-k="Escape">⏸</button>`;
        // تُدرج قبل طبقة الواجهة حتى تغطيها القوائم
        const container = document.getElementById('game-container');
        container.insertBefore(wrap, document.getElementById('ui-layer'));

        wrap.querySelectorAll('.tc-btn').forEach(btn => {
            const code = btn.dataset.k;
            const down = (e) => { e.preventDefault(); btn.classList.add('active'); this.pressVirtual(code); };
            const up = (e) => { e.preventDefault(); btn.classList.remove('active'); this.releaseVirtual(code); };
            btn.addEventListener('touchstart', down, { passive: false });
            btn.addEventListener('touchend', up, { passive: false });
            btn.addEventListener('touchcancel', up, { passive: false });
            // دعم الفأرة أيضًا (للاختبار)
            btn.addEventListener('mousedown', down);
            btn.addEventListener('mouseup', up);
            btn.addEventListener('mouseleave', up);
            btn.addEventListener('contextmenu', (e) => e.preventDefault());
        });

        // إظهار الأزرار فقط أثناء اللعب
        this.touchWrap = wrap;
    }

    setTouchVisible(visible) {
        if (this.touchWrap) this.touchWrap.classList.toggle('visible', visible);
    }
}

const Input = new InputSystem();
