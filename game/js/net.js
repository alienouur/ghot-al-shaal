/* =====================================================
   عميل الشبكة — اتصال WebSocket مع سيرفر الرومات
===================================================== */
'use strict';

class NetClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.myId = null;
        this.roomCode = null;
        this.handlers = {};
    }

    /* هل الصفحة مفتوحة عبر سيرفر (مش file://)؟ */
    canConnect() {
        return location.protocol === 'http:' || location.protocol === 'https:';
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.connected) { resolve(); return; }
            if (!this.canConnect()) { reject(new Error('no-server')); return; }
            const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
            try {
                this.ws = new WebSocket(proto + location.host);
            } catch (e) { reject(e); return; }

            this.ws.onopen = () => { this.connected = true; resolve(); };
            this.ws.onerror = () => { if (!this.connected) reject(new Error('connect-failed')); };
            this.ws.onclose = () => {
                this.connected = false;
                this.emit('disconnected', {});
            };
            this.ws.onmessage = (ev) => {
                let msg;
                try { msg = JSON.parse(ev.data); } catch { return; }
                if (msg.t === 'created' || msg.t === 'joined') {
                    this.myId = msg.id;
                    this.roomCode = msg.code;
                }
                this.emit(msg.t, msg);
            };
        });
    }

    on(type, cb) { this.handlers[type] = cb; }
    off(type) { delete this.handlers[type]; }
    emit(type, msg) { if (this.handlers[type]) this.handlers[type](msg); }

    send(obj) {
        if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
    }

    createRoom(name, charId) { this.send({ t: 'create', name, charId }); }
    joinRoom(code, name, charId) { this.send({ t: 'join', code, name, charId }); }
    startGame(modeId) { this.send({ t: 'start', modeId }); }
    relay(d) { this.send({ t: 'relay', d }); }

    leave() {
        this.send({ t: 'leave' });
        this.myId = null;
        this.roomCode = null;
        this.handlers = {};
    }
}

const Net = new NetClient();
