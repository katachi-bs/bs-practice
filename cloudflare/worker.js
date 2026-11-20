// BATTLE SPIRITS PRACTICE 用 Cloudflare Worker
// ・対戦記録の受け取り(匿名)  ・通知の登録  ・部屋ができたときのプッシュ通知  ・通知文/CPUの重みの配信
// 必要な設定: D1 バインディング DB / 変数 VAPID_PUBLIC / シークレット VAPID_PRIVATE, ADMIN_TOKEN / (任意)変数 VAPID_SUBJECT
const enc = new TextEncoder();
const b64u = b => { let s = ''; new Uint8Array(b).forEach(x => s += String.fromCharCode(x)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const r = atob(s), u = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; };
const cat = (...a) => { const n = a.reduce((s, x) => s + x.length, 0), o = new Uint8Array(n); let p = 0; a.forEach(x => { o.set(x, p); p += x.length; }); return o; };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type,authorization,x-sync', 'access-control-max-age': '86400' };
const J = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json;charset=utf-8', ...CORS } });

/* --- Web Push(RFC 8291 aes128gcm + RFC 8292 VAPID) --- */
async function hkdf(ikm, salt, info, len) { const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8)); }
export async function encryptPayload(sub, text) {
  const ua = unb64u(sub.p256dh), auth = unb64u(sub.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(shared, auth, cat(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 0x10, 0]);   // 4096
  return cat(salt, rs, new Uint8Array([65]), asPub, ct);
}
async function vapidHeader(env, endpoint) {
  const pub = unb64u(env.VAPID_PUBLIC), x = b64u(pub.slice(1, 33)), y = b64u(pub.slice(33, 65));
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE, x, y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'https://bsp.workers.dev' })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body)));
  return 'vapid t=' + head + '.' + body + '.' + b64u(sig) + ', k=' + env.VAPID_PUBLIC;
}
async function pushTo(env, sub, payload) {
  const body = await encryptPayload(sub, JSON.stringify(payload));
  const r = await fetch(sub.endpoint, { method: 'POST', headers: { authorization: await vapidHeader(env, sub.endpoint), 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: '3600', urgency: 'high' }, body });
  if (r.status === 404 || r.status === 410) await env.DB.prepare('DELETE FROM sub WHERE endpoint=?').bind(sub.endpoint).run();
  return r.status;
}

/* --- 補助 --- */
const ipOf = req => req.headers.get('cf-connecting-ip') || 'x';
async function ipHash(ip) { return b64u(await crypto.subtle.digest('SHA-256', enc.encode('bsp:' + ip))).slice(0, 16); }
async function limited(env, req, kind, max, winSec) {   // 簡単な回数制限(同じ回線から、一定時間に何回まで)
  const h = await ipHash(ipOf(req)), now = Math.floor(Date.now() / 1000), k = kind + ':' + h, row = await env.DB.prepare('SELECT n,t FROM lim WHERE k=?').bind(k).first();
  if (!row || now - row.t > winSec) { await env.DB.prepare('INSERT OR REPLACE INTO lim(k,n,t) VALUES(?,1,?)').bind(k, now).run(); return false; }
  if (row.n >= max) return true; await env.DB.prepare('UPDATE lim SET n=n+1 WHERE k=?').bind(k).run(); return false;
}
// デッキの預かり(管理者トークンでも、引き継ぎコードでも読み書きできる。どちらも、デッキの預かり場所だけ)
async function putDecks(env, txt) {
  if (txt.length > 600000) return J({ err: 'big' }, 413);
  let b; try { b = JSON.parse(txt); } catch (e) { return J({ err: 'bad' }, 400); }
  if (!b || typeof b.decks !== 'object' || Array.isArray(b.decks)) return J({ err: 'bad' }, 400);
  const names = Object.keys(b.decks); if (names.length > 300) return J({ err: 'many' }, 400);
  const out = {};
  for (const n of names) {
    const d = b.decks[n]; if (!d || !Array.isArray(d.cards) || d.cards.length > 120) return J({ err: 'bad deck' }, 400);
    const cards = []; for (const c of d.cards) { if (!Array.isArray(c) || typeof c[0] !== 'string' || c[0].length > 40 || !(c[1] >= 1 && c[1] <= 50)) return J({ err: 'bad card' }, 400); cards.push([c[0], c[1] | 0]); }
    const o = { cards, t: +d.t || 0 }; if (typeof d.cover === 'string' && d.cover.length <= 40) o.cover = d.cover; out[clip(n, 40)] = o;
  }
  const v = { decks: out, t: Date.now() }; await env.DB.prepare('INSERT OR REPLACE INTO cfg(k,v) VALUES(?,?)').bind('admdecks', JSON.stringify(v)).run(); return J({ ok: 1, n: Object.keys(out).length, t: v.t });
}
async function syncHash(code) { return b64u(await crypto.subtle.digest('SHA-256', enc.encode('bsp-sync:' + code))); }
async function syncOk(env, code) {
  code = String(code || ''); if (code.length < 16 || code.length > 64) return false;
  const h = await getCfg(env, 'synchash', null); if (!h) return false;
  const a = enc.encode(await syncHash(code)), b = enc.encode(String(h)); let d = a.length ^ b.length; for (let i = 0; i < b.length; i++) d |= (a[i] || 0) ^ b[i]; return d === 0;
}
// 管理者の確認: 同じ長さで比べる(文字を1つずつ早く打ち切らない)
function isAdmin(req, env) {
  const t = String(env.ADMIN_TOKEN || ''); if (!t) return false;
  const a = enc.encode(req.headers.get('authorization') || ''), b = enc.encode('Bearer ' + t); let d = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) d |= (a[i] || 0) ^ b[i];
  return d === 0;
}
let _ens = false;
async function ensure(env) {   // ロビー・ログイン記録の表を、なければ自動で作る(D1コンソールでの作業は不要)
  if (_ens) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS lobby (id TEXT PRIMARY KEY, data TEXT, t INTEGER)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS seen (name TEXT, dev TEXT, t INTEGER, t0 INTEGER, plat TEXT, n INTEGER, PRIMARY KEY(name, dev))').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS seen_t ON seen(t)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS seen_day (dev TEXT, day TEXT, n INTEGER, m INTEGER, PRIMARY KEY(dev, day))').run();   // 日ごとの利用(使用推移)
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS lobby_t ON lobby(t)').run();
  _ens = true;
}
const SEEN_KEEP = 7 * 24 * 3600 * 1000, ROOM_TTL = 50 * 1000;
async function touchSeen(env, name, dev, plat) {   // 最終ログイン・オンライン状態の記録(同じ端末は30秒に1回だけ書き込む。回数は、30分以上あいてから開いたときだけ増える)
  name = clip(name, 12).trim(); dev = clip(dev, 24).replace(/[^A-Za-z0-9_-]/g, ''); if (!name || dev.length < 6) return;
  const now = Date.now();
  const prev = await env.DB.prepare('SELECT t FROM seen WHERE name=? AND dev=?').bind(name, dev).first();
  if (!prev || now - prev.t > 30000) {   // 日ごとの記録(n=30分以上あけて開いた回数, m=記録した回数)
    const day = new Date(now + 9 * 3600e3).toISOString().slice(0, 10), ns = (!prev || now - prev.t > 1800000) ? 1 : 0;
    await env.DB.prepare('INSERT INTO seen_day(dev,day,n,m) VALUES(?,?,?,1) ON CONFLICT(dev,day) DO UPDATE SET n=n+excluded.n, m=m+1').bind(dev, day, ns).run();
    if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM seen_day WHERE day < ?').bind(new Date(now - 14 * 864e5 + 9 * 3600e3).toISOString().slice(0, 10)).run();
  }
  await env.DB.prepare('INSERT INTO seen(name,dev,t,t0,plat,n) VALUES(?,?,?,?,?,1) ON CONFLICT(name,dev) DO UPDATE SET t=excluded.t, plat=excluded.plat, n=n+(CASE WHEN excluded.t - seen.t > 1800000 THEN 1 ELSE 0 END) WHERE seen.t < excluded.t - 30000').bind(name, dev, now, now, clip(plat, 12)).run();
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM seen WHERE t < ?').bind(now - SEEN_KEEP).run();   // 1週間ログインがない記録は消す
}
async function getCfg(env, k, def) { const r = await env.DB.prepare('SELECT v FROM cfg WHERE k=?').bind(k).first(); if (!r) return def; try { return JSON.parse(r.v); } catch (e) { return def; } }
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const u = new URL(req.url), p = u.pathname.replace(/\/+$/, '') || '/';
    try {
      if (p === '/' ) return J({ ok: 1, name: 'bsp-api' });
      // 公開: 通知文・CPUの重み
      if (p === '/cfg' && req.method === 'GET') { const n = await getCfg(env, 'notify', { title: '{name}が部屋を作成しました', body: '{msg}', only: [] }); return J({ title: n.title, body: n.body, w: await getCfg(env, 'weights', null), vapid: env.VAPID_PUBLIC || '', notice: await getCfg(env, 'notice', null), flags: Object.assign({ cpuRec: true, lobby: true }, await getCfg(env, 'flags', {})), samples: await getCfg(env, 'samples', null) }); }
      // 通知の登録・解除
      if (p === '/sub' && req.method === 'POST') {
        if (await limited(env, req, 'sub', 30, 3600)) return J({ err: 'limit' }, 429);
        const b = await req.json(), s = b.sub || b, name = clip(b.name, 12).trim();
        if (!s || typeof s.endpoint !== 'string' || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 600 || !s.keys || !s.keys.p256dh || !s.keys.auth) return J({ err: 'bad' }, 400);
        await env.DB.prepare('INSERT INTO sub(endpoint,p256dh,auth,name,t) VALUES(?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,name=excluded.name,t=excluded.t').bind(s.endpoint, s.keys.p256dh, s.keys.auth, name, Date.now()).run();
        return J({ ok: 1 });
      }
      if (p === '/sub' && req.method === 'DELETE') { const b = await req.json(); if (b && typeof b.endpoint === 'string') await env.DB.prepare('DELETE FROM sub WHERE endpoint=?').bind(b.endpoint).run(); return J({ ok: 1 }); }
      // 部屋ができたとき: 通知を送る
      if (p === '/room' && req.method === 'POST') {
        if (await limited(env, req, 'room', 12, 3600)) return J({ err: 'limit' }, 429);
        const b = await req.json(), name = clip(b.name, 12) || 'プレイヤー', msg = clip(b.msg, 24), self = typeof b.self === 'string' ? b.self : '';
        const n = await getCfg(env, 'notify', { title: '{name}が部屋を作成しました', body: '{msg}', only: [] });
        const fm = s => String(s || '').replace(/\{name\}/g, name).replace(/\{msg\}/g, msg);
        const rows = (await env.DB.prepare('SELECT endpoint,p256dh,auth,name FROM sub').all()).results || [];
        const only = (n.only || []).map(x => String(x).trim()).filter(Boolean);
        const targets = rows.filter(r => r.endpoint !== self && (!only.length || only.includes(r.name)));
        const payload = { title: fm(n.title), body: fm(n.body), tag: 'bs-room', url: './' };
        let ok = 0; await Promise.all(targets.slice(0, 200).map(async t => { try { const st = await pushTo(env, t, payload); if (st >= 200 && st < 300) ok++; } catch (e) { } }));
        return J({ sent: ok, targets: targets.length });
      }
      // 対戦記録の受け取り(匿名)
      if (p === '/rec' && req.method === 'POST') {
        if (await limited(env, req, 'rec', 60, 3600)) return J({ err: 'limit' }, 429);
        const txt = await req.text(); if (txt.length > 300000) return J({ err: 'big' }, 413);
        let o; try { o = JSON.parse(txt); } catch (e) { return J({ err: 'bad' }, 400); }
        if (!o || !Array.isArray(o.acts) || !o.acts.length || o.acts.length > 6000 || !Array.isArray(o.defs)) return J({ err: 'bad' }, 400);
        delete o.names;   // 念のため名前は保存しない
        o.mode = o.mode === 'cpu' ? 'cpu' : 'pvp'; if (o.hs !== 0 && o.hs !== 1) delete o.hs;   // CPU対戦のときは、人間の席(hs)だけを学習に使う
        await env.DB.prepare('INSERT INTO rec(t,ver,data) VALUES(?,?,?)').bind(Date.now(), clip(o.ver, 24), JSON.stringify(o)).run();
        return J({ ok: 1 });
      }
      // ロビー(募集中の部屋の一覧)。対戦そのものは、これまでどおり端末同士の直接通信
      if (p === '/lobby/list' && req.method === 'POST') {
        await ensure(env); const o = await req.json().catch(() => ({})), now = Date.now();
        await env.DB.prepare('DELETE FROM lobby WHERE t < ?').bind(now - ROOM_TTL).run();   // 誰もいなくなった(知らせが途絶えた)部屋は、すぐ消す
        const rows = (await env.DB.prepare('SELECT data FROM lobby WHERE t > ? ORDER BY t DESC LIMIT 200').bind(now - ROOM_TTL).all()).results || [];
        if (o && o.name) await touchSeen(env, o.name, o.dev, o.plat);
        return J({ rooms: rows.map(r => { try { return JSON.parse(r.data); } catch (e) { return null; } }).filter(Boolean) });
      }
      if (p === '/lobby/reg' && req.method === 'POST') {
        if (await limited(env, req, 'lobby', 120, 60)) return J({ err: 'limit' }, 429);
        await ensure(env); const o = await req.json().catch(() => null); if (!o || typeof o.id !== 'string' || o.id.length < 4 || o.id.length > 40) return J({ err: 'bad' }, 400);
        const r = { ic: (typeof o.ic === 'string' && o.ic.length < 4000 && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(o.ic)) ? o.ic : '', id: o.id, name: clip(o.name, 12) || 'プレイヤー', msg: clip(o.msg, 24), st: o.st === 'play' ? 'play' : 'wait', n2: clip(o.n2, 12), sp: o.sp ? 1 : 0, ns: Math.min(99, +o.ns || 0), nt: o.nt ? 1 : 0 };
        await env.DB.prepare('INSERT OR REPLACE INTO lobby(id,data,t) VALUES(?,?,?)').bind(r.id, JSON.stringify(r), Date.now()).run();
        if (o.dev) await touchSeen(env, r.name, o.dev, o.plat);
        return J({ ok: 1 });
      }
      if (p === '/lobby/unreg' && req.method === 'POST') { await ensure(env); const o = await req.json().catch(() => null); if (o && typeof o.id === 'string') await env.DB.prepare('DELETE FROM lobby WHERE id=?').bind(o.id.slice(0, 40)).run(); return J({ ok: 1 }); }
      // ログインの記録(アプリを開いたとき・名前を変えたとき)
      if (p === '/seen' && req.method === 'POST') { if (await limited(env, req, 'seen', 30, 60)) return J({ err: 'limit' }, 429); await ensure(env); const o = await req.json().catch(() => ({})); await touchSeen(env, o.name, o.dev, o.plat); return J({ ok: 1 }); }
      // 引き継ぎコードでの、デッキの読み書き(メインアプリとBSP ADMINの間で、デッキを同じにする)
      if (p === '/sync/decks' && (req.method === 'GET' || req.method === 'PUT')) {
        if (!(await syncOk(env, req.headers.get('x-sync')))) {
          try { if (await limited(env, req, 'syncfail', 10, 600)) return J({ err: 'locked' }, 429); } catch (e) { }
          return J({ err: 'auth' }, 401);
        }
        if (req.method === 'GET') return J(await getCfg(env, 'admdecks', { decks: {}, t: 0 }));
        if (await limited(env, req, 'syncput', 60, 600)) return J({ err: 'limit' }, 429);
        return putDecks(env, await req.text());
      }
      // 管理者用
      if (p.startsWith('/admin')) {
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
        if (!isAdmin(req, env)) {   // 間違ったトークンが続いたら、その回線からの試行を10分間止める(10回まで)
          try { if (await limited(env, req, 'admfail', 10, 600)) return J({ err: 'locked' }, 429); } catch (e) { }
          return J({ err: 'auth' }, 401);
        }
        if (p === '/admin/stats') { const a = await env.DB.prepare('SELECT COUNT(*) n FROM rec').first(), b = await env.DB.prepare('SELECT COUNT(*) n FROM sub').first(); return J({ rec: a.n, sub: b.n, weak: String(env.ADMIN_TOKEN || '').length < 24 }); }
        if (p === '/admin/recs') { const since = +u.searchParams.get('since') || 0, lim = Math.min(500, +u.searchParams.get('limit') || 200); const r = (await env.DB.prepare('SELECT id,t,data FROM rec WHERE id>? ORDER BY id LIMIT ?').bind(since, lim).all()).results || []; return J({ recs: r.map(x => ({ id: x.id, t: x.t, rec: JSON.parse(x.data) })) }); }
        if (p === '/admin/notify' && req.method === 'PUT') { const b = await req.json(); const v = { title: clip(b.title, 80) || '{name}が部屋を作成しました', body: clip(b.body, 120), only: (Array.isArray(b.only) ? b.only : []).map(x => clip(x, 12).trim()).filter(Boolean).slice(0, 200) }; await env.DB.prepare('INSERT OR REPLACE INTO cfg(k,v) VALUES(?,?)').bind('notify', JSON.stringify(v)).run(); return J({ ok: 1, v }); }
        if (p === '/admin/notify' && req.method === 'GET') return J(await getCfg(env, 'notify', { title: '{name}が部屋を作成しました', body: '{msg}', only: [] }));
        if (p === '/admin/weights' && req.method === 'PUT') { const b = await req.json(); if (!b || typeof b !== 'object') return J({ err: 'bad' }, 400); const w = {}; Object.keys(b).slice(0, 60).forEach(k => { if (typeof b[k] === 'number' && isFinite(b[k])) w[k] = b[k]; }); await env.DB.prepare('INSERT OR REPLACE INTO cfg(k,v) VALUES(?,?)').bind('weights', JSON.stringify(w)).run(); return J({ ok: 1, w }); }
        if (p === '/admin/seen' && req.method === 'GET') { await ensure(env); const now = Date.now(); await env.DB.prepare('DELETE FROM seen WHERE t < ?').bind(now - SEEN_KEEP).run(); const r = (await env.DB.prepare('SELECT name,dev,t,t0,plat,n FROM seen ORDER BY t DESC LIMIT 500').all()).results || []; const dd = (await env.DB.prepare('SELECT dev,day,n,m FROM seen_day WHERE day >= ? ORDER BY day').bind(new Date(now - 7 * 864e5 + 9 * 3600e3).toISOString().slice(0, 10)).all()).results || []; return J({ now, seen: r.map(x => ({ name: x.name, dev: x.dev.slice(0, 6), t: x.t, t0: x.t0, plat: x.plat, n: x.n })), days: dd.map(x => ({ dev: x.dev.slice(0, 6), day: x.day, n: x.n, m: x.m })) }); }
        if (p === '/admin/samples' && req.method === 'PUT') {   // サンプルデッキの差し替え(全員に配信される)
          const b = await req.json().catch(() => null); if (!Array.isArray(b) || !b.length || b.length > 20) return J({ err: 'bad' }, 400);
          const out = [];
          for (const d of b) {
            if (!d || typeof d.name !== 'string' || !Array.isArray(d.cards) || !d.cards.length || d.cards.length > 80) return J({ err: 'bad deck' }, 400);
            const cards = []; for (const c of d.cards) { if (!Array.isArray(c) || typeof c[0] !== 'string' || c[0].length > 30 || !(c[1] >= 1 && c[1] <= 50)) return J({ err: 'bad card' }, 400); cards.push([c[0], c[1] | 0]); }
            const o = { name: clip(d.name, 40), cards }; if (typeof d.cover === 'string' && d.cover.length <= 30) o.cover = d.cover; out.push(o);
          }
          await env.DB.prepare('INSERT OR REPLACE INTO cfg(k,v) VALUES(?,?)').bind('samples', JSON.stringify(out)).run(); return J({ ok: 1, n: out.length });
        }
        if (p === '/admin/samples' && req.method === 'DELETE') { await env.DB.prepare('DELETE FROM cfg WHERE k=?').bind('samples').run(); return J({ ok: 1 }); }
        if (p === '/admin/flags' && req.method === 'PUT') { const b = await req.json(); const f = { cpuRec: !(b && b.cpuRec === false), lobby: !(b && b.lobby === false) }; await env.DB.prepare('INSERT OR REPLACE INTO cfg(k,v) VALUES(?,?)').bind('flags', JSON.stringify(f)).run(); return J({ ok: 1, flags: f }); }
        if (p === '/admin/notice' && req.method === 'PUT') { const b = await req.json(); if (!b || !b.on || !clip(b.text, 400).trim()) { await env.DB.prepare('DELETE FROM cfg WHERE k=?').bind('notice').run(); return J({ ok: 1, on: 0 }); } const v = { text: clip(b.text, 400), url: /^https:\/\//.test(b.url || '') ? clip(b.url, 300) : '', label: clip(b.label, 24) || '開く', id: Date.now() }; await env.DB.prepare('INSERT OR REPLACE INTO cfg(k,v) VALUES(?,?)').bind('notice', JSON.stringify(v)).run(); return J({ ok: 1, on: 1, v }); }
        if (p === '/admin/test' && req.method === 'POST') { const b = await req.json(), rows = (await env.DB.prepare('SELECT endpoint,p256dh,auth,name FROM sub WHERE name=?').bind(clip(b.name, 12)).all()).results || []; let ok = 0; for (const t of rows) { try { const st = await pushTo(env, t, { title: 'テスト通知', body: 'BATTLE SPIRITS PRACTICE', tag: 'bs-test', url: './' }); if (st >= 200 && st < 300) ok++; } catch (e) { } } return J({ sent: ok, targets: rows.length }); }
        // 管理者のデッキ預かり(スマホとPCで同じデッキを使うため。管理者トークンが必要)
        if (p === '/admin/decks' && req.method === 'GET') { const v = await getCfg(env, 'admdecks', { decks: {}, t: 0 }); return J(v); }
        if (p === '/admin/decks' && req.method === 'PUT') return putDecks(env, await req.text());
        if (p === '/admin/synccode' && req.method === 'POST') {   // 引き継ぎコードを新しく発行する(前のコードは使えなくなる)。コードそのものは保存せず、照合用の値だけ保存する
          const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(24)); let c = ''; r.forEach(x => { c += AL[x % 32]; });
          await env.DB.prepare('INSERT OR REPLACE INTO cfg(k,v) VALUES(?,?)').bind('synchash', JSON.stringify(await syncHash(c))).run(); return J({ ok: 1, code: c });
        }
        if (p === '/admin/synccode' && req.method === 'DELETE') { await env.DB.prepare('DELETE FROM cfg WHERE k=?').bind('synchash').run(); return J({ ok: 1 }); }
        return J({ err: 'nf' }, 404);
      }
      return J({ err: 'nf' }, 404);
    } catch (e) { return J({ err: 'server', m: String(e && e.message || e).slice(0, 120) }, 500); }
  },
  // 古いデータの掃除(任意: Cron トリガーを足したとき)
  async scheduled(ev, env) { await env.DB.prepare('DELETE FROM lim WHERE t<?').bind(Math.floor(Date.now() / 1000) - 86400).run(); await env.DB.prepare('DELETE FROM sub WHERE t<?').bind(Date.now() - 120 * 86400000).run(); }
};
