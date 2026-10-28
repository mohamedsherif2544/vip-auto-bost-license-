// Vip auto bost - Complete License Server
// Owner: Dark | Tool: Vip auto bost | Password: Facebook2026
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const VALID_PASSWORD = process.env.VIP_PASSWORD || 'Facebook2026';
const ADMIN_KEY = process.env.ADMIN_KEY || 'DarkAdmin2026';
const MAX_DEVICES = parseInt(process.env.MAX_DEVICES || '3', 10);
const TOOL_NAME = 'Vip auto bost';
const DB_FILE = path.join(__dirname, 'users.json');

let db = { users: {} };
try {
  if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!db.users) db.users = {};
} catch (e) { db = { users: {} }; }
function save() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); } catch (e) {}
}
function now() { return new Date().toISOString(); }
function makeToken(username) {
  return 'VIP-' + Buffer.from(username + ':' + Date.now() + ':' + Math.random()).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 28);
}
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().slice(0, 64);
}

function verifyHandler(req, res) {
  const b = req.body || {};
  const username = String(b.username || b.name || '').trim();
  const password = String(b.password || b.pass || '').trim();
  const deviceId = String(b.deviceId || b.device || '').slice(0, 128) || 'unknown';
  const deviceName = String(b.deviceName || '').slice(0, 128);
  const userAgent = String(b.userAgent || '').slice(0, 256);

  if (!username) return res.status(400).json({ error: 'Username required' });
  if (password !== VALID_PASSWORD) {
    console.log('[' + now() + '] FAIL user=' + username + ' ip=' + clientIp(req));
    return res.status(403).json({ error: 'Invalid password' });
  }
  let u = db.users[username];
  if (!u) {
    u = { username, devices: [], created: now(), lastSeen: now(), count: 0 };
    db.users[username] = u;
  }
  if (u.banned) return res.status(403).json({ error: 'User banned' });
  if (u.devices.indexOf(deviceId) === -1) {
    if (u.devices.length >= MAX_DEVICES) {
      console.log('[' + now() + '] LIMIT user=' + username + ' devices=' + u.devices.length);
      return res.status(403).json({ error: 'device limit reached (' + MAX_DEVICES + '). Contact admin.' });
    }
    u.devices.push(deviceId);
  }
  u.lastSeen = now();
  u.count = (u.count || 0) + 1;
  u.lastIp = clientIp(req);
  u.deviceName = deviceName;
  u.userAgent = userAgent;
  save();
  const token = makeToken(username);
  u.lastToken = token;
  save();
  console.log('[' + now() + '] OK user=' + username + ' device=' + deviceId);
  return res.json({
    ok: true,
    license: {
      token: token,
      tokenEnabled: true,
      enabled: true,
      en: true,
      username: username,
      tool: TOOL_NAME,
      issuedAt: now()
    }
  });
}

const verifyPaths = [
  '/akr/api/license/verify',
  '/akr/api/l/license/verify',
  '/license/verify',
  '/api/license/verify',
  '/verify',
  '/akr/api/license/version'
];
app.post(verifyPaths, verifyHandler);

app.get('/health', (req, res) => res.json({ ok: true, tool: TOOL_NAME, time: now(), users: Object.keys(db.users).length }));
app.get('/', (req, res) => res.send('<h2>Vip auto bost License Server running</h2><p>POST /akr/api/license/verify</p>'));

function needAdmin(req, res, next) {
  const k = String(req.query.adminKey || (req.body && req.body.adminKey) || '');
  if (k !== ADMIN_KEY) return res.status(403).json({ error: 'bad admin key' });
  next();
}
app.get('/api/admin/users', needAdmin, (req, res) => res.json({ ok: true, users: db.users }));
app.post('/api/admin/add', needAdmin, (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  if (!username) return res.status(400).json({ error: 'username required' });
  if (!db.users[username]) db.users[username] = { username, devices: [], created: now(), lastSeen: '', count: 0 };
  save();
  res.json({ ok: true, user: db.users[username] });
});
app.post('/api/admin/revoke', needAdmin, (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  if (db.users[username]) { db.users[username].banned = true; save(); }
  res.json({ ok: true });
});
app.post('/api/admin/unban', needAdmin, (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  if (db.users[username]) { delete db.users[username].banned; save(); }
  res.json({ ok: true });
});
app.post('/api/admin/reset-devices', needAdmin, (req, res) => {
  const username = String((req.body && req.body.username) || '').trim();
  if (db.users[username]) { db.users[username].devices = []; save(); }
  res.json({ ok: true });
});

app.get('/admin', (req, res) => {
  res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Vip Admin</title>
<style>body{font-family:system-ui;background:#111;color:#eee;padding:20px}input,button{padding:8px;margin:4px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:6px;font-size:13px}</style>
</head><body><h2>Vip auto bost - Admin</h2>
<p>Tool password for users: <b>Facebook2026</b></p>
<label>Admin key: <input id=k type=password value=""></label>
<button onclick="load()">Load users</button>
<button onclick="addU()">Add user</button>
<table id=t></table>
<script>
async function load(){const k=document.getElementById('k').value;const r=await fetch('/api/admin/users?adminKey='+encodeURIComponent(k));const j=await r.json();const t=document.getElementById('t');t.innerHTML='<tr><th>user</th><th>devices</th><th>count</th><th>lastSeen</th><th>action</th></tr>'+Object.values(j.users||{}).map(u=>'<tr><td>'+u.username+(u.banned?' (BANNED)':'')+'</td><td>'+(u.devices||[]).join('<br>')+'</td><td>'+(u.count||0)+'</td><td>'+(u.lastSeen||'')+'</td><td><button onclick="resetD(\\''+u.username+'\\')">reset devices</button> <button onclick="ban(\\''+u.username+'\\')">ban</button></td></tr>').join('');}
async function addU(){const k=document.getElementById('k').value;const u=prompt('username:');if(!u)return;await fetch('/api/admin/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminKey:k,username:u})});load();}
async function resetD(u){const k=document.getElementById('k').value;await fetch('/api/admin/reset-devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminKey:k,username:u})});load();}
async function ban(u){const k=document.getElementById('k').value;await fetch('/api/admin/revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminKey:k,username:u})});load();}
</script></body></html>`);
});

app.listen(PORT, () => console.log(TOOL_NAME + ' license server on :' + PORT));
