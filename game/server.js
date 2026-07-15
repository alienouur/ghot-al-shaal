/* =====================================================
   سيرفر "غوط الشعال: شارعنا" — أونلاين بالرومات
   - يقدّم ملفات اللعبة (HTTP)
   - رومات WebSocket بأكواد (2-5 لاعبين)
   التشغيل:  npm install  ثم  npm start
   الهواتف تفتح:  http://[IP-جهازك]:8430
===================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

let WebSocketServer;
try {
    WebSocketServer = require('ws').WebSocketServer;
} catch (e) {
    console.error('❌ مكتبة ws غير مثبتة. شغّل أولاً:  npm install');
    process.exit(1);
}

const PORT = process.env.PORT || 8430;
const ROOT = __dirname;

/* ---------- خادم الملفات ---------- */
const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(ROOT, path.normalize(urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('404'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
    });
});

/* ---------- الرومات ---------- */
const wss = new WebSocketServer({ server });
const rooms = new Map(); // code → { hostId, players: Map(id → {ws, name, charId}), started }
let nextId = 1;

const CODE_CHARS = 'ابتجدرسعفكلمنهوي23456789';
function makeCode() {
    let code;
    do {
        code = '';
        for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    } while (rooms.has(code));
    return code;
}

function send(ws, obj) {
    if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function roster(room) {
    return [...room.players.entries()].map(([id, p]) => ({
        id, name: p.name, charId: p.charId, host: id === room.hostId
    }));
}

function broadcast(room, obj, exceptId) {
    for (const [id, p] of room.players) {
        if (id !== exceptId) send(p.ws, obj);
    }
}

wss.on('connection', (ws) => {
    ws.playerId = nextId++;
    ws.roomCode = null;

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        switch (msg.t) {
            case 'create': {
                leaveRoom(ws);
                const code = makeCode();
                const room = { hostId: ws.playerId, players: new Map(), started: false };
                room.players.set(ws.playerId, { ws, name: msg.name, charId: msg.charId });
                rooms.set(code, room);
                ws.roomCode = code;
                send(ws, { t: 'created', code, id: ws.playerId, players: roster(room) });
                console.log(`🏠 روم جديد ${code} — ${msg.name}`);
                break;
            }
            case 'join': {
                leaveRoom(ws);
                const room = rooms.get(msg.code);
                if (!room) { send(ws, { t: 'err', msg: 'الروم مش موجود! تأكد من الكود.' }); return; }
                if (room.players.size >= 5) { send(ws, { t: 'err', msg: 'الروم معبّي (5 لاعبين)!' }); return; }
                if (room.started) { send(ws, { t: 'err', msg: 'اللعبة بادية في الروم هذا!' }); return; }
                // منع تكرار الشخصية
                for (const p of room.players.values()) {
                    if (p.charId === msg.charId) { send(ws, { t: 'err', msg: 'الشخصية هذي ماخوذة في الروم! اختر غيرها.' }); return; }
                }
                room.players.set(ws.playerId, { ws, name: msg.name, charId: msg.charId });
                ws.roomCode = msg.code;
                send(ws, { t: 'joined', code: msg.code, id: ws.playerId, players: roster(room) });
                broadcast(room, { t: 'roster', players: roster(room) }, ws.playerId);
                console.log(`➕ ${msg.name} دخل روم ${msg.code}`);
                break;
            }
            case 'start': {
                const room = rooms.get(ws.roomCode);
                if (!room || room.hostId !== ws.playerId) return;
                if (room.players.size < 2) { send(ws, { t: 'err', msg: 'تحتاج على الأقل لاعبين اثنين!' }); return; }
                room.started = true;
                broadcast(room, { t: 'started', modeId: msg.modeId, players: roster(room) });
                console.log(`▶️ روم ${ws.roomCode} بدأ — ${msg.modeId}`);
                break;
            }
            case 'relay': {
                const room = rooms.get(ws.roomCode);
                if (!room) return;
                broadcast(room, { t: 'relay', from: ws.playerId, d: msg.d }, ws.playerId);
                break;
            }
            case 'leave':
                leaveRoom(ws);
                break;
        }
    });

    ws.on('close', () => leaveRoom(ws));
});

function leaveRoom(ws) {
    const room = rooms.get(ws.roomCode);
    if (!room) { ws.roomCode = null; return; }
    room.players.delete(ws.playerId);
    if (room.players.size === 0) {
        rooms.delete(ws.roomCode);
        console.log(`🗑️ روم ${ws.roomCode} اتنحى`);
    } else if (room.hostId === ws.playerId) {
        // الهوست خرج → أقدم لاعب يولّي هوست
        room.hostId = room.players.keys().next().value;
        broadcast(room, { t: 'roster', players: roster(room) });
        broadcast(room, { t: 'peer_left', id: ws.playerId });
    } else {
        broadcast(room, { t: 'roster', players: roster(room) });
        broadcast(room, { t: 'peer_left', id: ws.playerId });
    }
    ws.roomCode = null;
}

server.listen(PORT, () => {
    console.log('====================================');
    console.log('🏘️  سيرفر غوط الشعال: شارعنا');
    console.log(`✅ شغّال على: http://localhost:${PORT}`);
    console.log('📱 من الهواتف (نفس الشبكة): http://[IP-جهازك]:' + PORT);
    console.log('   لمعرفة الـ IP: ipconfig (ابحث عن IPv4)');
    console.log('====================================');
});
