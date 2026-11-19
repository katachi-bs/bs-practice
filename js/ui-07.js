function whyText(t, x, y) {   // 破壊された理由を、カードのそばに少し長めに出す
  const el = document.createElement('div'); el.className = 'whypop'; el.textContent = t; document.body.appendChild(el);
  const w = el.offsetWidth || 200, lx = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2));
  el.style.left = lx + 'px'; el.style.top = Math.max(8, y - 14) + 'px';
  el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none', offset: .15 }, { opacity: 1, transform: 'none', offset: .8 }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 2200, fill: 'both' }).onfinish = () => el.remove();
}
function popText(t, x, y) {
  const el = document.createElement('div'); el.className = 'corepop'; el.textContent = t; document.body.appendChild(el);
  el.animate([{ transform: 'translate(' + (x - 20) + 'px,' + y + 'px)', opacity: 0 }, { transform: 'translate(' + (x - 20) + 'px,' + (y - 20) + 'px)', opacity: 1, offset: .3 }, { transform: 'translate(' + (x - 20) + 'px,' + (y - 50) + 'px)', opacity: 0 }], { duration: 1500, delay: 900 }).onfinish = () => el.remove();
}
// 【地鳴】: デッキの上から指定枚数がぱらぱらと盤面近くに開かれ、少し待ってからトラッシュへ
const millHold = {};
function holdTrash(key, ids, ms, noRender) { const o = millHold[key]; if (o && Date.now() < o.until) { ids.forEach(i => o.ids.add(i)); o.until = Math.max(o.until, Date.now() + ms); } else millHold[key] = { until: Date.now() + ms, ids: new Set(ids) }; if (!noRender) render(); setTimeout(() => { if (millHold[key] && Date.now() >= millHold[key].until) { delete millHold[key]; render(); } }, ms + 30); }
function faceEl(c, back) {
  const el = document.createElement('div'); el.className = 'milc'; el.title = c.name;
  const paint = b => { const u = artSm(c.id); el.style.backgroundImage = b ? '' : (u ? 'url(' + u + ')' : ''); el.textContent = b ? '' : (u ? '' : c.name); el.style.background = b ? 'repeating-linear-gradient(45deg,#26305a,#26305a 6px,#303c70 6px,#303c70 12px)' : ''; if (!b && u) el.style.backgroundImage = 'url(' + u + ')'; el.style.borderColor = b ? '#9aa1bd' : (COLOR_HEX[c.color] || '#9aa1bd'); };
  paint(back); el.paint = paint; document.body.appendChild(el); return el;
}
const rectC = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; };
// 【地鳴】: トランプのように、デッキから1枚ずつ配られて表になり、少し見せてから、まとめてトラッシュへ払われる
let millBusy = { until: 0, key: '', bottom: 0 };
function millAnim(ev) {
  const key = ev.p === V.me ? 'me' : 'opp', n = ev.cards.length;
  const dk = rectC(document.querySelector('#' + key + ' .deck')) || { x: innerWidth - 60, y: innerHeight / 2 }, fd = rectC(document.querySelector('#' + key + ' .field')) || { x: innerWidth / 2, y: innerHeight / 2, w: 600 };
  const tp = trashPt(key) || dk, perRow = Math.max(3, Math.floor(((fd.w || 600) - 24) / 62)), rows = Math.ceil(n / perRow), DEAL = 190, FLIP = 160, HOLD = 1500, SWEEP = 650;
  const total = 250 + (n - 1) * DEAL + 520 + FLIP * 2 + HOLD + SWEEP + (n - 1) * 70;
  holdTrash(key, ev.cards.map(c => c.iid), total);
  // 地鳴の破棄が表示中なら、効果による別の破棄(マンデアなど)はその下に、枠つきで並べる
  const nowT = performance.now(), shiftY = ev.sep && millBusy.until > nowT && millBusy.key === key ? millBusy.bottom + 70 - fd.y + (rows - 1) * 42 : 0;
  millBusy = { until: nowT + total, key, bottom: fd.y + shiftY + (rows - 1) * 42 + 38 };
  { const topY = fd.y + shiftY - (rows - 1) * 42, wid = Math.min(perRow, n) * 62 + 16, cap = ev.sep ? '「' + (ev.src || '') + '」の効果で破棄' : (ev.note || '');
    if (cap || ev.sep) {
      const box = document.createElement('div'); box.className = 'millbox' + (ev.sep ? ' sep' : ''); box.style.cssText = 'position:fixed;z-index:9990;pointer-events:none;left:' + (fd.x - wid / 2) + 'px;top:' + (topY - 46) + 'px;width:' + wid + 'px;height:' + (rows * 84 + 8) + 'px;' + (ev.sep ? 'border:2px dashed #ffd54a;border-radius:10px;background:rgba(255,213,74,.08);' : '');
      const lab = document.createElement('div'); lab.className = 'millcap'; lab.textContent = cap; lab.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:100%;margin-bottom:3px;white-space:nowrap;font-size:12px;font-weight:700;color:#fff;background:rgba(20,24,40,.88);border:1px solid #ffd54a;border-radius:8px;padding:2px 8px;max-width:92vw;overflow:hidden;text-overflow:ellipsis';
      box.appendChild(lab); document.body.appendChild(box); setTimeout(() => box.remove(), total);
    } }
  ev.cards.forEach((c, i) => {
    const rw = Math.floor(i / perRow), cnt = Math.min(perRow, n - rw * perRow), el = faceEl(c, true), ex = fd.x + ((i % perRow) - (cnt - 1) / 2) * 62, ey = fd.y + shiftY + (rw - (rows - 1) / 2) * 84, rot = 0;
    const t0 = 250 + i * DEAL, W = 55, H = 77.5;
    const at = (x, y, r, sx) => 'translate(' + (x - W) + 'px,' + (y - H) + 'px) rotate(' + r + 'deg) scale(.49) scaleX(' + sx + ')';
    const a1 = el.animate([{ transform: at(dk.x, dk.y, 0, 1), opacity: 0 }, { transform: at(dk.x, dk.y, 0, 1), opacity: 1, offset: .08 }, { transform: at(ex, ey, rot, 1), opacity: 1 }], { duration: 520, delay: t0, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    setTimeout(() => { el.animate([{ transform: at(ex, ey, rot, 1) }, { transform: at(ex, ey, rot, 0) }], { duration: FLIP, fill: 'both' }).onfinish = () => { el.paint(false); el.animate([{ transform: at(ex, ey, rot, 0) }, { transform: at(ex, ey - 10, rot, 1), offset: .5 }, { transform: at(ex, ey, rot, 1) }], { duration: FLIP, fill: 'both' }); }; }, t0 + 520);
    const t1 = 250 + (n - 1) * DEAL + 520 + FLIP * 2 + HOLD + (n - 1 - i) * 70;
    setTimeout(() => { el.animate([{ transform: at(ex, ey, rot, 1), opacity: 1 }, { transform: at(tp.x, tp.y, rot * 3, .55), opacity: .2 }], { duration: SWEEP, easing: 'ease-in', fill: 'both' }).onfinish = () => el.remove(); }, t1);
  });
}
// デッキの上から1枚をオープン: デッキから出て、表になって見せてから、行き先(デッキ/手札)へ。相手側にも同じように見える
function openAnim(ev, idx) {
  const key = ev.p === V.me ? 'me' : 'opp', c = ev.cards[0]; if (!c) return;
  const dk = rectC(document.querySelector('#' + key + ' .deck')) || { x: innerWidth - 60, y: innerHeight / 2 }, fd = rectC(document.querySelector('#' + key + ' .field')) || { x: innerWidth / 2, y: innerHeight / 2 };
  const hd = ev.to === 'hand' ? (rectC($(key === 'me' ? 'hand' : 'opp')) || dk) : dk;
  const el = faceEl(c, true), W = 55, H = 77.5, at = (x, y, sc, sx) => 'translate(' + (x - W) + 'px,' + (y - H) + 'px) scale(' + (sc * .49) + ') scaleX(' + sx + ')';
  const D0 = 250 + (idx | 0) * 2000, FLY = 500, FLIP = 160, HOLD = 1000, BACK = 500;
  el.style.opacity = 0;
  el.animate([{ transform: at(dk.x, dk.y, 1, 1), opacity: 0 }, { transform: at(dk.x, dk.y, 1, 1), opacity: 1, offset: .1 }, { transform: at(fd.x, fd.y, 1.9, 1), opacity: 1 }], { duration: FLY, delay: D0, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
  setTimeout(() => { el.animate([{ transform: at(fd.x, fd.y, 1.9, 1) }, { transform: at(fd.x, fd.y, 1.9, 0) }], { duration: FLIP, fill: 'both' }).onfinish = () => { el.paint(false); el.animate([{ transform: at(fd.x, fd.y, 1.9, 0) }, { transform: at(fd.x, fd.y, 1.9, 1) }], { duration: FLIP, fill: 'both' }); }; }, D0 + FLY);
  setTimeout(() => { el.animate([{ transform: at(fd.x, fd.y, 1.9, 1), opacity: 1 }, { transform: at(hd.x, hd.y, .8, 1), opacity: .2 }], { duration: BACK, easing: 'ease-in', fill: 'both' }).onfinish = () => el.remove(); }, D0 + FLY + FLIP * 2 + HOLD);
  setTimeout(() => { try { el.remove(); } catch (e) { } }, D0 + FLY + FLIP * 2 + HOLD + BACK + 400);
}
// オープンした1枚をデッキの上/下へ戻す
function deckRetAnim(ev) {
  const key = ev.p === V.me ? 'me' : 'opp', dk = rectC(document.querySelector('#' + key + ' .deck')); if (!dk) return;
  const at = (x, y, r, sc) => 'translate(' + (x - 55) + 'px,' + (y - 77.5) + 'px) rotate(' + r + 'deg) scale(' + (sc * .49) + ')';
  ev.cards.forEach(c => {
    const el = faceEl(c, false), o = revRects[c.iid] || { x: innerWidth / 2, y: innerHeight * .4 }, ty = dk.y + (ev.to === 'top' ? -8 : 8);
    el.animate([{ transform: at(o.x, o.y, 0, 1.5), opacity: 1 }, { transform: at(o.x, o.y, 0, 1.5), opacity: 1, offset: .25 }, { transform: at(dk.x, ty, ev.to === 'top' ? -6 : 6, .6), opacity: .35 }], { duration: 1100, easing: 'ease-in-out', fill: 'both' }).onfinish = () => el.remove();
  });
  popText(ev.to === 'top' ? 'デッキの上へ' : 'デッキの下へ', dk.x, dk.y - 34);
}
// オープンしたカードを破棄: 表示されていた位置から、そのままトラッシュへ払われる
function sweepAnim(ev) {
  const key = ev.p === V.me ? 'me' : 'opp', tp = trashPt(key); if (!tp) return;
  const n = ev.cards.length; holdTrash(key, ev.cards.map(c => c.iid), 1300 + n * 120);
  ev.cards.forEach((c, i) => {
    const el = faceEl(c, false), o = revRects[c.iid] || { x: innerWidth / 2 + (i - (n - 1) / 2) * 70, y: innerHeight * .4 }, rot = (i - (n - 1) / 2) * 6;
    const at = (x, y, r, sc) => 'translate(' + (x - 55) + 'px,' + (y - 77.5) + 'px) rotate(' + r + 'deg) scale(' + (sc * .49) + ')';
    el.animate([{ transform: at(o.x, o.y, 0, 1.5), opacity: 1 }, { transform: at(o.x, o.y, 0, 1.5), opacity: 1, offset: .3 }, { transform: at(tp.x, tp.y, rot * 3, .55), opacity: .3 }], { duration: 1100, delay: 100 + i * 120, easing: 'ease-in', fill: 'both' }).onfinish = () => el.remove();
  });
}
// トラッシュ/デッキから手札へ: カードが表になって飛んでいく
function recoverAnim(ev) {
  const key = ev.p === V.me ? 'me' : 'opp', hand = rectC(document.getElementById(ev.p === V.me ? 'hand' : 'oppHand')) || { x: innerWidth / 2, y: innerHeight - 60 };
  const bx = ev.from === 'deck' && ev.cards[0] && revRects[ev.cards[0].iid], from = bx ? { x: bx.x, y: bx.y } : ev.from === 'deck' ? rectC(document.querySelector('#' + key + ' .deck')) : (trashPt(key) || null); if (!from) return;
  const fx = from.x, fy = from.y, n = ev.cards.length, total = 1500 + n * 250;
  if (ev.from === 'trash') holdTrash(key, ev.cards.map(c => c.iid), 700 + n * 250);
  ev.cards.forEach((c, i) => {
    const el = faceEl(c, false), mx = (fd => fd ? fd.x : innerWidth / 2)(rectC(document.querySelector('#' + key + ' .field'))) + (i - (n - 1) / 2) * 70, my = (fd => fd ? fd.y : innerHeight / 2)(rectC(document.querySelector('#' + key + ' .field')));
    const at = (x, y, r, sc) => 'translate(' + (x - 55) + 'px,' + (y - 77.5) + 'px) rotate(' + r + 'deg) scale(' + (sc * .49) + ')';
    el.animate([{ transform: at(fx, fy, 0, .6), opacity: 0 }, { transform: at(mx, my, -4, 1.5), opacity: 1, offset: .35 }, { transform: at(mx, my, -4, 1.5), opacity: 1, offset: .65 }, { transform: at(hand.x, hand.y, 0, .8), opacity: .1 }], { duration: total, delay: i * 250, easing: 'ease-in-out', fill: 'both' }).onfinish = () => el.remove();
  });
}
function discardAnim(ev) {
  const key = ev.p === V.me ? 'me' : 'opp', hand = rectC(document.getElementById(ev.p === V.me ? 'hand' : 'oppHand')) || { x: innerWidth / 2, y: innerHeight - 60 };
  const to = trashPt(key) || { x: innerWidth - 60, y: innerHeight / 2 }, fd = rectC(document.querySelector('#' + key + ' .field')) || { x: innerWidth / 2, y: innerHeight / 2 }, n = ev.cards.length, total = 1500 + n * 250;
  holdTrash(key, ev.cards.map(c => c.iid), total + 100);
  ev.cards.forEach((c, i) => {
    const el = faceEl(c, false), mx = fd.x + (i - (n - 1) / 2) * 70, my = fd.y;
    const at = (x, y, r, sc) => 'translate(' + (x - 27) + 'px,' + (y - 38) + 'px) rotate(' + r + 'deg) scale(' + sc + ')';
    el.animate([{ transform: at(hand.x, hand.y, 0, .8), opacity: .2 }, { transform: at(mx, my, 4, 1.5), opacity: 1, offset: .35 }, { transform: at(mx, my, 4, 1.5), opacity: 1, offset: .62 }, { transform: at(to.x, to.y, 160, .55), opacity: .9 }], { duration: total, delay: i * 250, easing: 'ease-in-out', fill: 'both' }).onfinish = () => el.remove();
  });
}
// 効果でスピリットからスピリットへコアが移る: コアが1つずつ飛んでいく
/* ボイドから増えるコアは、盤面の外(画面の外側)から飛んでくる */
function voidOrigin(p, tgt) {
  const mine = p === V.me;
  if (BC.on) return { cx: mine ? -40 : innerWidth + 40, cy: tgt.cy };
  return { cx: tgt.cx, cy: mine ? innerHeight + 40 : -40 };
}
function coreFly(a, b, n, soul, dl) {
  dl = dl | 0;
  if (!a || !b) return;
  for (let i = 0; i < Math.min(n, 6); i++) {
    const el = document.createElement('div'); el.className = 'fly' + (soul ? ' soul' : ''); document.body.appendChild(el);
    el.animate([{ transform: 'translate(' + (a.cx - 11) + 'px,' + (a.cy - 11) + 'px) scale(1.4)', opacity: 0 }, { transform: 'translate(' + (a.cx - 11) + 'px,' + (a.cy - 11) + 'px) scale(1.7)', opacity: 1, offset: .18 },
      { transform: 'translate(' + (b.cx - 11) + 'px,' + (b.cy - 11) + 'px) scale(1.1)', opacity: 1 }], { duration: 850, delay: 200 + dl + i * 220, easing: 'ease-in-out', fill: 'both' }).onfinish = () => el.remove();
  }
}
let pendingFly = [], evQ = [], lifeQ = [];
function grabRects() {
  const cards = {}, life = {};
  document.querySelectorAll('#mat [data-card][data-zone="field"]').forEach(el => { const r = el.getBoundingClientRect(); const hh = el.offsetHeight || Math.max(r.width, r.height); cards[el.dataset.card] = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: hh / 1.4, h: hh }; });
  document.querySelectorAll('#mat .lc[data-lcid]').forEach(el => { const r = el.getBoundingClientRect(); life[el.dataset.lcid] = { x: r.left + r.width / 2, y: r.top + r.height / 2, soul: el.dataset.lsoul === '1' }; });
  return { cards, life };
}
const trashPt = key => { const el = document.querySelector((key === 'me' ? '#me' : '#opp') + ' .zone.trash'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const rnd = (a, b) => a + Math.random() * (b - a);
function cardFace(rc, ev, clip) {
  const el = document.createElement('div'); el.className = 'shard';
  const tp = !!ev.tapped, W0 = rc.w, H0 = rc.h;   // 疲労(横向き)のまま壊す: 縦長の箱を90度回して横向きにする(箱の縦横を入れ替えると比率が崩れる)
  el.style.cssText = 'left:' + (rc.cx - W0 / 2) + 'px;top:' + (rc.cy - H0 / 2) + 'px;width:' + W0 + 'px;height:' + H0 + 'px;--cc:' + (COLOR_HEX[ev.color] || '#6a7499') + (clip ? ';clip-path:' + clip : '');
  { const rot = (BC.on ? ((ev.p != null && V && ev.p !== V.me) ? 270 : 90) : ((ev.p != null && V && ev.p !== V.me) ? 180 : 0)) + (tp ? (ev.heavy ? 180 : 90) : 0); if (rot) el.style.rotate = rot + 'deg'; }   // 相手のカードは相手向き・疲労は横向きのまま壊す
  const art = ev.id ? artOf(ev.id) : '';
  if (art) { el.style.backgroundImage = 'url(' + art + ')'; el.style.backgroundSize = '100% 100%'; el.style.border = '2px solid var(--cc)'; } else el.innerHTML = '<span>' + esc(ev.name) + '</span>';
  document.body.appendChild(el); return el;
}
// 破壊: ガラスのようにヒビが入って割れ、破片がトラッシュへ飛んでいく
function shatter(rc, ev, to, delay) {
  const polys = ['polygon(0 0,56% 0,40% 42%,0 30%)', 'polygon(56% 0,100% 0,100% 38%,40% 42%)', 'polygon(0 30%,40% 42%,28% 100%,0 100%)', 'polygon(40% 42%,100% 38%,100% 100%,28% 100%)'];
  const D = 1100;
  const cr = document.createElement('div'); cr.className = 'crack';
  cr.style.cssText = 'left:' + (rc.cx - rc.w / 2) + 'px;top:' + (rc.cy - rc.h / 2) + 'px;width:' + rc.w + 'px;height:' + rc.h + 'px' + (ev.tapped ? ';rotate:' + (ev.heavy ? 180 : 90) + 'deg' : '');
  cr.innerHTML = '<svg viewBox="0 0 100 140" preserveAspectRatio="none" width="100%" height="100%"><g stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"><polyline points="0,42 40,59 56,0"/><polyline points="40,59 100,53"/><polyline points="40,59 28,140"/><polyline points="40,59 62,92 100,110"/></g></svg>';
  document.body.appendChild(cr);
  cr.animate([{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .26 }, { opacity: 0, offset: .34 }, { opacity: 0, offset: 1 }], { duration: D, delay, fill: 'both' }).onfinish = () => cr.remove();
  polys.forEach((cl, i) => {
    const el = cardFace(rc, ev, cl), dx = (i % 2 ? 1 : -1) * rnd(5, 12), dy = (i < 2 ? -1 : 1) * rnd(4, 12);
    const tx = (to ? to.x - rc.cx : 0) + rnd(-18, 18), ty = (to ? to.y - rc.cy : 0) + rnd(-18, 18), rot = rnd(-200, 200);
    el.animate([
      { transform: 'none', opacity: 1, filter: 'brightness(1)', offset: 0 },
      { transform: 'none', opacity: 1, filter: 'brightness(2.4)', offset: .2 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (rot / 12) + 'deg)', opacity: 1, filter: 'brightness(1.3)', offset: .38, easing: 'ease-in' },
      { transform: 'translate(' + tx + 'px,' + ty + 'px) rotate(' + rot + 'deg) scale(.22)', opacity: 0, filter: 'brightness(1)', offset: 1 }], { duration: D, delay, fill: 'both' }).onfinish = () => el.remove();
  });
}
// 消滅: ふわっと消えながら、粒子がトラッシュへ
function dissolve(rc, ev, to, delay) {
  const el = cardFace(rc, ev, '');
  el.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: .85, offset: .25 }, { opacity: 0, transform: 'translateY(-18px) scale(1.07)', filter: 'blur(7px)' }], { duration: 420, delay, fill: 'both', easing: 'ease-out' }).onfinish = () => el.remove();
  const col = COLOR_HEX[ev.color] || '#9db4ff';
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div'); p.className = 'part'; p.style.background = col; p.style.boxShadow = '0 0 8px ' + col; document.body.appendChild(p);
    const sx = rc.cx + rnd(-rc.w / 2, rc.w / 2), sy = rc.cy + rnd(-rc.h / 2, rc.h / 2), tx = (to ? to.x : sx) + rnd(-14, 14), ty = (to ? to.y : sy - 60) + rnd(-14, 14);
    p.animate([{ transform: 'translate(' + sx + 'px,' + sy + 'px) scale(.6)', opacity: 0 }, { transform: 'translate(' + sx + 'px,' + (sy - 20) + 'px) scale(1.2)', opacity: 1, offset: .25 },
      { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.3)', opacity: 0 }], { duration: rnd(420, 640), delay: delay + 60 + i * 14, fill: 'both', easing: 'ease-in-out' }).onfinish = () => p.remove();
  }
}
// ライフで受けた: ライフのコアが光って弾け、リザーブへ飛んでいく
function lifeBurst(q) {
  const to = zoneRect(q.key === 'me' ? '#me' : '#opp', 'reserve');
  q.rects.forEach((r, i) => {
    const d = Math.max(0, q.at - Date.now()) + i * 160;
    const ring = document.createElement('div'); ring.className = 'ring'; document.body.appendChild(ring);
    ring.animate([{ transform: 'translate(' + (r.x - 13) + 'px,' + (r.y - 13) + 'px) scale(.6)', opacity: 1 }, { transform: 'translate(' + (r.x - 13) + 'px,' + (r.y - 13) + 'px) scale(3)', opacity: 0 }], { duration: 550, delay: d, fill: 'both' }).onfinish = () => ring.remove();
    if (to) {
      const dot = document.createElement('div'); dot.className = 'fly'; if (r.soul) dot.classList.add('soul'); document.body.appendChild(dot);
      dot.animate([{ transform: 'translate(' + (r.x - 11) + 'px,' + (r.y - 11) + 'px) scale(1.2)', opacity: 1 }, { transform: 'translate(' + (to.x - 11) + 'px,' + (to.y - 11) + 'px) scale(.9)', opacity: 1 }], { duration: 650, delay: d, easing: 'ease-in-out', fill: 'both' }).onfinish = () => dot.remove();
    }
  });
  // リザーブが増えた弾み
  const el = document.querySelector((q.key === 'me' ? '#me' : '#opp') + ' .cores[data-zloc="reserve"]');
  if (el) anim.pop[q.key] = Date.now() + Math.max(0, q.at - Date.now()) + 250 + q.rects.length * 160 + 750, anim.until = Date.now() + 5000;
}
function flushEv() {
  const L = evQ, Q = lifeQ; evQ = []; lifeQ = [];
  L.forEach(x => { if (!x.rc) return; const to = trashPt(x.key), d = Math.max(0, x.at - Date.now()); (x.ev.t === 'vanish' ? dissolve : shatter)(x.rc, x.ev, to, d); if (x.ev.why) setTimeout(() => whyText(x.ev.name + ': ' + x.ev.why, x.rc.cx, x.rc.cy), d); });
  Q.forEach(lifeBurst);
}
function flushFly() {
  const list = pendingFly; pendingFly = [];
  list.forEach(f => {
    const root = f.key === 'me' ? '#me' : '#opp', to = zoneRect(root, 'reserve'), from = f.from || zoneRect(root, 'coreTrash'); if (!from || !to) return;
    f = Object.assign({}, f, { from });
    for (let i = 0; i < Math.min(f.n, 8); i++) {
      const el = document.createElement('div'); el.className = 'fly'; document.body.appendChild(el);
      const a = el.animate([{ transform: 'translate(' + (f.from.x - 11) + 'px,' + (f.from.y - 11) + 'px) scale(1)', opacity: 0 },
        { transform: 'translate(' + (f.from.x - 11) + 'px,' + (f.from.y - 11) + 'px) scale(1.3)', opacity: 1, offset: .15 },
        { transform: 'translate(' + (to.x - 11) + 'px,' + (to.y - 11) + 'px) scale(.9)', opacity: 1 }],
        { duration: 700, delay: Math.max(0, f.at - Date.now()) + i * 90, easing: 'ease-in-out', fill: 'both' });
      a.onfinish = () => el.remove();
    }
  });
}
// 描画のたびに、進行中の動き(ドロー・回復・コア増加)を付け直す(開始時刻からの経過に合わせる)
function toLocalVec(el, dx, dy) {   // 画面上の移動量を、要素自身の座標(親の回転込み)での移動量に直す
  const r0 = el.getBoundingClientRect(), keep = el.style.translate;
  el.style.translate = '100px 0'; const rx = el.getBoundingClientRect(); el.style.translate = '0 100px'; const ry = el.getBoundingClientRect(); el.style.translate = keep;
  const a = (rx.left - r0.left) / 100, b = (rx.top - r0.top) / 100, c = (ry.left - r0.left) / 100, d = (ry.top - r0.top) / 100, det = a * d - b * c;
  if (Math.abs(det) < 1e-6) return { x: dx, y: dy };
  return { x: (d * dx - c * dy) / det, y: (-b * dx + a * dy) / det };
}
function applyHandFlip() {
  const now = Date.now();
  if (anim.prevHand) { anim.handFlip = { hr: anim.prevHand, t0: now }; anim.prevHand = null; }
  if (!anim.handFlip) return;
  const hf = anim.handFlip; if (now > hf.t0 + 700) { anim.handFlip = null; return; }
  document.querySelectorAll('#hand [data-card],#oppHand [data-card]').forEach(el => {
    if (el._hf === hf.t0) return; el._hf = hf.t0;
    const o = hf.hr[el.dataset.card]; if (!o || anim.drawn.has(el.dataset.card)) return;
    const r = el.getBoundingClientRect(), dx = o.x - (r.left + r.width / 2), dy = o.y - (r.top + r.height / 2);
    if (!(Math.abs(dx) + Math.abs(dy) > 4 && Math.abs(dx) + Math.abs(dy) < 900)) return;
    const opt = { duration: 320, delay: 300 - (now - hf.t0), fill: 'backwards', easing: 'cubic-bezier(.2,.8,.3,1)' };
    if (BC.on) { const v = toLocalVec(el, dx, dy); el.animate([{ translate: v.x + 'px ' + v.y + 'px' }, { translate: '0px 0px' }], opt); }   // 配信画面は transform が固定されているので、独立した translate で動かす
    else el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], opt);
  });
}
function applyAnim() {
  const now = Date.now();
  if (!BC.on) applyHandFlip();
  anim.flip.forEach((f, id) => {
    if (now > f.start + f.dur) { anim.flip.delete(id); return; }
    const el = document.querySelector('.slot[data-slot="' + id + '"]');
    if (el) el.animate([{ transform: 'translate(' + f.dx + 'px,' + f.dy + 'px)' }, { transform: 'none' }], { duration: f.dur, delay: f.start - now, fill: 'both', easing: 'ease-in-out' });
  });
  if (now > anim.until) return;
  document.querySelectorAll('#hand [data-card],#mullbox [data-card],#oppHand [data-card]').forEach(el => { const t = anim.drawn.get(el.dataset.card); if (t !== undefined && now < t + 1200) { el.classList.add('drawin'); el.style.setProperty('animation-delay', (t - now) + 'ms', 'important'); } });
  document.querySelectorAll('.slot[data-slot]').forEach(sl => { const lc = anim.lvchg.get(sl.dataset.slot); if (lc && Date.now() < lc.t + 2200) { sl.querySelectorAll('.lvb').forEach(b => { b.classList.add(lc.up ? 'lvup' : 'lvdn'); b.style.setProperty('animation-delay', Math.max(0, lc.t + 650 - Date.now()) + 'ms'); }); } });
  document.querySelectorAll('.slot[data-slot]').forEach(sl => { const t = anim.summon.get(sl.dataset.slot); if (t !== undefined && now < t + 1300) { if (!sumFxDone.has(sl.dataset.slot + ':' + t)) { sumFxDone.add(sl.dataset.slot + ':' + t); try { secShineSlot(sl); } catch (e) { } const rr = sl.getBoundingClientRect(), fx = document.createElement('div'); fx.className = 'sumfx' + (slotHasSummonFx(sl.dataset.slot) ? '' : ' lite'); fx.style.cssText = 'left:' + (rr.left + rr.width / 2) + 'px;top:' + (rr.top + rr.height / 2) + 'px;width:' + rr.width + 'px;height:' + rr.height + 'px'; fx.innerHTML = '<i></i><i></i>' + Array.from({ length: slotHasSummonFx(sl.dataset.slot) ? 10 : 5 }, (_, j) => '<b style="--a:' + (j * 36) + 'deg"></b>').join(''); document.body.appendChild(fx); setTimeout(() => fx.remove(), 1200); } sl.classList.add('summonin'); sl.style.setProperty('--sy', sl.dataset.own === '1' ? '38vh' : '-38vh'); sl.style.setProperty('animation-delay', (t - now) + 'ms', 'important'); } });
  document.querySelectorAll('.cardbox.tapped').forEach(cb => { const c = cb.querySelector('[data-card]'); if (!c) return; const t = anim.tap.get(c.dataset.card); if (t !== undefined && now < t + 700) { c.classList.add(cb.classList.contains('heavy') ? (anim.hv90.has(c.dataset.card) ? 'tapinh' : 'tapinh') : 'tapin'); if (cb.classList.contains('heavy') && anim.hv90.has(c.dataset.card)) c.classList.add('tapinh9'); c.style.setProperty('animation-delay', (t - now) + 'ms', 'important'); cb.classList.add('tapping'); cb.style.setProperty('animation-delay', (t - now) + 'ms', 'important'); } });
  document.querySelectorAll('.cardbox').forEach(cb => {
    const c0 = cb.querySelector('[data-card]'); const cu = c0 && anim.coreUp.get(c0.dataset.card);
    if (cu && now < cu.at + 1600) { cb.classList.add('coreup'); cb.style.setProperty('animation-delay', (cu.at - now) + 'ms', 'important'); if (cu.pop && !cu.done) { cu.done = true; const r = cb.getBoundingClientRect(); setTimeout(() => popText('コア+' + cu.n, r.left + r.width / 2, r.top + r.height / 2), Math.max(0, cu.at - now)); } }
  });
  document.querySelectorAll('.cardbox.tapped:not(.heavy)').forEach(cb => { const c = cb.querySelector('[data-card]'); if (!c) return; const t = anim.hvrel.get(c.dataset.card); if (t !== undefined && now < t + 1000) { c.classList.add('hvrel'); c.style.setProperty('animation-delay', (t - now) + 'ms', 'important'); cb.classList.add('untapping'); cb.style.setProperty('animation-delay', (t - now) + 'ms', 'important'); } });
  document.querySelectorAll('.cardbox').forEach(cb => {
    const c = cb.querySelector('[data-card]'); if (!c || cb.classList.contains('tapped')) return;
    const t = anim.untap.get(c.dataset.card); if (t !== undefined && now < t + 1000) { c.classList.add('untap'); c.style.setProperty('animation-delay', (t - now) + 'ms', 'important'); cb.classList.add('untapping'); cb.style.setProperty('animation-delay', (t - now) + 'ms', 'important'); }
  });
  ['me', 'opp'].forEach(k => {
    const t = anim.pop[k]; if (t === undefined || now > t + 800) return;
    const el = document.querySelector((k === 'me' ? '#me' : '#opp') + ' .cores[data-zloc="reserve"]'); if (el) { el.classList.add('pop'); el.style.setProperty('animation-delay', (t - now) + 'ms', 'important'); }
  });
  if (anim.oppN && now < anim.oppAt + 1200) [...document.querySelectorAll('#oppHand .mb')].slice(-anim.oppN).forEach(el => { el.classList.add('drawin'); el.style.setProperty('animation-delay', (anim.oppAt - now) + 'ms', 'important'); });
}
