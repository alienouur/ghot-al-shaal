/* =====================================================
   نظام الفيزياء — جاذبية، تصادم AABB، كشف الأرض
===================================================== */
'use strict';

const Physics = {

    /* تقاطع مستطيلين */
    aabb(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    },

    /* مسافة بين مركزي كيانين */
    dist(a, b) {
        const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
        const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
        return Math.hypot(dx, dy);
    },

    /*
      تحريك كيان مع حل التصادم ضد قائمة أجسام صلبة.
      يضبط: entity.onGround / entity.vx / entity.vy
    */
    moveEntity(entity, solids, dt) {
        const P = GAME_DATA.physics;

        // الجاذبية
        if (!entity.climbing) {
            entity.vy += P.gravity * dt;
            if (entity.vy > P.maxFallSpeed) entity.vy = P.maxFallSpeed;
        }

        entity.onGround = false;

        // المحور الأفقي
        entity.x += entity.vx * dt;
        for (let i = 0; i < solids.length; i++) {
            const s = solids[i];
            if (s.oneWay) continue;
            if (Physics.aabb(entity, s)) {
                if (entity.vx > 0) entity.x = s.x - entity.w;
                else if (entity.vx < 0) entity.x = s.x + s.w;
                entity.vx = 0;
                entity.hitWall = true;
            }
        }

        // المحور الرأسي
        entity.y += entity.vy * dt;
        for (let i = 0; i < solids.length; i++) {
            const s = solids[i];
            if (Physics.aabb(entity, s)) {
                if (entity.vy > 0) {
                    // منصات أحادية الاتجاه: الهبوط فقط من الأعلى
                    if (s.oneWay && entity.y + entity.h - entity.vy * dt > s.y + 6) continue;
                    entity.y = s.y - entity.h;
                    entity.vy = 0;
                    entity.onGround = true;
                } else if (entity.vy < 0 && !s.oneWay) {
                    entity.y = s.y + s.h;
                    entity.vy = 0;
                }
            }
        }

        // حدود العالم
        if (entity.x < 0) { entity.x = 0; entity.vx = 0; }
        const maxX = GAME_DATA.world.width - entity.w;
        if (entity.x > maxX) { entity.x = maxX; entity.vx = 0; }
    },

    /* هل الكيان ملامس لسلّم / جدار تسلق؟ */
    touchingClimbable(entity, climbables) {
        for (let i = 0; i < climbables.length; i++) {
            if (Physics.aabb(entity, climbables[i])) return true;
        }
        return false;
    },

    /* دفعة ارتدادية */
    knockback(entity, fromX, force, upForce) {
        const dir = (entity.x + entity.w / 2) >= fromX ? 1 : -1;
        entity.vx = dir * force;
        entity.vy = -(upForce || 300);
    }
};
