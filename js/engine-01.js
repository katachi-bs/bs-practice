
/* ================= エンジン(DOMに依存しない) ================= */
const STEPS = ['start','core','draw','refresh','main','attack','main2','end'];
const STEP_JP = { start:'スタート', core:'コア', draw:'ドロー', refresh:'リフレッシュ', main:'メイン', attack:'アタック', main2:'第二メイン', end:'エンド' };
const AUTO = new Set(['start','core','draw','refresh']);
const TYPES = ['spirit','nexus','magic'];
const TYPE_JP = { spirit:'スピリット', nexus:'ネクサス', magic:'マジック' };

let _id = 1;
const nid = p => p + (_id++);
// 乱数: ゲームごとに種(シード)を決める。同じ種と同じ操作の記録があれば、同じ試合を再現できる(リプレイ用)
let RNGF = Math.random;
const RNGS = { a: 0 };
function seedRng(s0) { RNGS.a = s0 >>> 0; RNGF = () => { const a = (RNGS.a + 0x6D2B79F5) | 0; RNGS.a = a; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// リプレイ用の途中保存: 盤面+乱数の位置+IDの連番
function cpSave(G) { return { j: JSON.stringify(G), rs: RNGS.a, id: _id }; }
function cpLoad(cp) { const G = JSON.parse(cp.j); RNGS.a = cp.rs; _id = cp.id; return G; }
const RECDB = {}; let _recN = 0, _actDepth = 0;
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(RNGF() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const mkCore = soul => ({ id: nid('c'), soul: !!soul });
const mkInst = def => ({ iid: nid('k'), def, cores: [], tapped: false });

/* --- カードデータの検証・整形(相手から届くデータも必ず通す) --- */
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const int = (v, lo, hi, df = 0) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : df; };
// 小さなJSONだけを通す(大きさ制限つき)
const jd = (v, n) => { try { const t = JSON.stringify(v); return t && t.length <= n ? JSON.parse(t) : null; } catch (e) { return null; } };
function cleanEffect(e) {
  e = e && typeof e === 'object' ? e : {};
  const t = e.timing && typeof e.timing === 'object' ? e.timing : {};
  return {
    levels: Array.isArray(e.levels) ? e.levels.slice(0, 3).map(x => int(x, 1, 3, 1)) : [], // 空なら全レベルで有効
    shinkai: !!e.shinkai,
    timing: { kind: str(t.kind, 12), when: str(t.when, 24), event: str(t.event, 24), step: str(t.step, 12), turn: str(t.turn, 8), of: str(t.of, 8), label: str(t.label, 80), limit: str(t.limit, 8), nodup: !!t.nodup, flt: t.flt && typeof t.flt === 'object' ? jd(t.flt, 200) : null },
    keyword: str(e.keyword, 20),
    cond: e.cond && typeof e.cond === 'object' ? jd(e.cond, 400) : null,
    cost: e.cost && typeof e.cost === 'object' ? { pay: int(e.cost.pay, 0, 10), tapSelf: !!e.cost.tapSelf, tapNexus: str(e.cost.tapNexus, 20), destroySelf: !!e.cost.destroySelf, soulTrash: !!e.cost.soulTrash, discard: e.cost.discard && typeof e.cost.discard === 'object' ? { n: 1, to: str(e.cost.discard.to, 10), costMax: e.cost.discard.costMax == null ? null : (e.cost.discard.costMax | 0), family: str(e.cost.discard.family, 20) } : null } : null,
    ops: Array.isArray(e.ops) ? e.ops.slice(0, 12).map(o => (o && typeof o === 'object') ? jd(o, 600) : null).filter(Boolean) : [],
    text: str(e.text, 400)
  };
}
// カードテキストの「〔重複不可〕」と書かれた項目に対応する誘発効果に、nodup の印をつける
function markNodup(out) {
  if (!/重複不可/.test(out.text)) return out;
  const nz = x => String(x || '').replace(/\s+/g, ''), lines = out.text.split('\n');
  lines.forEach((ln, i) => {
    if (!ln.includes('重複不可')) return;
    let body = nz(lines[i + 1]); if (!body) return;
    out.effects.forEach(e => { if (e.timing.kind === 'keyword' || e.timing.nodup) return; const et = nz(e.text); if (et && (et.startsWith(body) || body.startsWith(et))) e.timing.nodup = true; });
  });
  return out;
}
function cleanDef(d) {
  d = d && typeof d === 'object' ? d : {};
  const lv = Array.isArray(d.levels) ? d.levels.slice(0, 3).map(l => ({ lv: int(l && l.lv, 1, 3, 1), core: int(l && l.core, 0, 20), bp: int(l && l.bp, 0, 99999) })) : [];
  const sy = d.symbols && typeof d.symbols === 'object' ? d.symbols : {};
  return markNodup({
    id: str(d.id || '?', 24), name: str(d.name || '名称未設定', 60), reading: str(d.reading, 60),
    type: TYPES.includes(d.type) ? d.type : 'spirit', color: str(d.color, 12),
    family: Array.isArray(d.family) ? d.family.slice(0, 6).map(x => str(x, 20)) : [],
    team: Array.isArray(d.team) ? d.team.slice(0, 16).map(x => str(x, 24)) : [],
    cost: int(d.cost, 0, 30), reduction: int(d.reduction, 0, 10),
    symbols: { normal: int(sy.normal, 0, 5), ex: !!sy.ex },
    keywords: Array.isArray(d.keywords) ? d.keywords.slice(0, 10).map(x => str(x, 20)) : [],
    soulMagic: !!d.soulMagic, noMain: !!d.noMain, vanilla: !!d.vanilla && !(Array.isArray(d.team) && d.team.length), auto: !!d.auto, partial: !!d.partial, levels: lv, text: str(d.text, 800),
    effects: Array.isArray(d.effects) ? d.effects.slice(0, 8).map(cleanEffect) : []
  });
}
// テスト用ダミー: マルグリース(効果なしスピリット)
const DUMMY_DEF = cleanDef({ id: '26RSD09-002', name: 'マルグリース', type: 'spirit', color: 'red', family: ['紅雲', '風炎'], cost: 2, reduction: 0,
  symbols: { normal: 0, ex: true }, levels: [{ lv: 1, core: 1, bp: 3000 }, { lv: 2, core: 3, bp: 6000 }], vanilla: true });
function parseDeck(text, opts) {
  opts = opts || {};
  let arr;
  try { arr = JSON.parse(text); } catch (e) { return { err: 'JSON形式が正しくありません(貼り付けが途中で切れていないか確認してください): ' + e.message }; }
  if (!Array.isArray(arr) || !arr.length) return { err: 'カードの配列(JSON)を入力してください' };
  const defs = [], warn = [], cnt = {};
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object') return { err: '配列の要素がカード(オブジェクト)ではありません' };
    const d = cleanDef(raw);
    const n = Math.min(100, raw.count > 0 ? Math.floor(raw.count) : 1);
    cnt[d.name] = (cnt[d.name] || 0) + n;
    for (let i = 0; i < n; i++) defs.push(d);
  }
  if (defs.length > 100) return { err: '枚数が多すぎます(最大100枚)' };
  Object.keys(cnt).forEach(nm => { if (cnt[nm] > 3) warn.push('「' + nm + '」が' + cnt[nm] + '枚です(同名3枚まで)'); });
  if (defs.length < 40) {
    if (opts.fill) {
      const dummy = DUMMY_DEF;
      const add = 40 - defs.length;
      for (let i = 0; i < add; i++) defs.push(dummy);
      warn.push('ダミー(マルグリース)を' + add + '枚補いました');
    } else warn.push('枚数が' + defs.length + '枚です(40枚以上必要)');
  }
  return { defs, warn };
}

/* --- ゲーム状態 --- */
function mkPlayer(defs) {
  return {
    deck: shuffle(defs.map(mkInst)), hand: [], field: [], trash: [], removed: [],
    life: [0, 1, 2, 3, 4].map(() => mkCore(false)),
    reserve: [mkCore(true), mkCore(false), mkCore(false), mkCore(false)],
    coreTrash: [], void: []
  };
}
function lg(G, p, m) { G.log.push({ p, m }); if (G.log.length > 120) G.log.shift(); }
function draw(P, n) { let c = 0; while (n-- > 0 && P.deck.length) { P.hand.push(P.deck.pop()); c++; } return c; }

function newGame(defs0, defs1, settings) {
  const s = Object.assign({ first: 'random', pause: false, test: false, lifeManual: false, autoEnd: true }, settings);
  const choose = s.first === 'choose';
  const seed = s.seed != null ? s.seed >>> 0 : (Math.random() * 4294967296) >>> 0;
  seedRng(seed); _id = 1;
  const first = choose ? 0 : s.first === 'host' ? 0 : s.first === 'guest' ? 1 : Math.floor(RNGF() * 2);
  const G = { p: [mkPlayer(defs0), mkPlayer(defs1)], turn: first, first, turnNo: 1, step: 'start', settings: s, log: [], lifeLost: [0, 0], noAttack: true, queue: [], trace: [], fx: [], evs: [], undo: null, seq: 0, pending: null, battle: null, winner: null, notice: { n: 0, m: '' }, seed };
  if (!s.norec) { G.rid = ++_recN; RECDB[G.rid] = { defs: [defs0, defs1], s: { autoEnd: !!s.autoEnd, first: s.first, test: !!s.test, mulligan: !!s.mulligan, pause: !!s.pause, lifeManual: !!s.lifeManual }, seed, acts: [] }; delete RECDB[G.rid - 3]; }
  G.p.forEach(P => draw(P, 4));
  if (choose) { G.first = null; G.pick = { pi: Math.floor(RNGF() * 2) }; lg(G, -1, 'ゲーム開始: ランダムで選ばれた側が、先攻か後攻を選びます'); return G; }
  lg(G, -1, 'ゲーム開始');
  beginAfterFirst(G);
  return G;
}
// 先攻が決まったあと: マリガン(先攻から) → ゲートオープン → 1ターン目
function beginAfterFirst(G) {
  if (G.settings.mulligan) { G.mull = { order: [G.first, 1 - G.first], idx: 0 }; lg(G, G.first, 'マリガン: 先攻から、手札を全て入れ替えるか選びます'); }
  else beginGame(G);
}
function beginGame(G) { G.evs.push({ t: 'gate' }); lg(G, G.first, '1ターン目'); enterStep(G, 'start'); }

function enterStep(G, s) {
  G.step = s;
  const P = G.p[G.turn];
  const firstTurn = G.turnNo === 1;
  if (s === 'start') {
    lg(G, G.turn, 'スタートステップ'); G.log[G.log.length - 1].turn = G.turnNo; G.evs.push({ t: 'turn', p: G.turn });
  } else if (s === 'core') {
    if (firstTurn) lg(G, G.turn, 'コアステップ(先攻1ターン目のためなし)');
    else { P.reserve.push(mkCore(false)); lg(G, G.turn, 'コアステップ: リザーブにコア+1'); }
  } else if (s === 'draw') {
    const n = draw(P, 1); lg(G, G.turn, n ? 'ドローステップ: 1枚ドロー' : 'ドローステップ: デッキがなくドローできません');
    if (!n && G.winner == null) { G.winner = 1 - G.turn; G.loseWhy = 'deck'; lg(G, -1, 'ドローできなかったため敗北'); }
    if (G.winner == null) { const seenD = new Set(); P.field.forEach(k => k.def.effects.forEach(e => { if (e.timing.kind === 'trigger' && e.timing.event === 'drawStep' && effectActive(k, e) && !seenD.has(k.def.name)) { seenD.add(k.def.name); enqueue(G, G.turn, k, e, { event: 'drawStep' }); } })); if (G.queue.length) runQueue(G); }
  } else if (s === 'refresh') {
    const n = P.coreTrash.length;
    P.reserve.push(...P.coreTrash.splice(0));
    P.field.forEach(k => { if (k.heavy) k.heavy = false; else k.tapped = false; });
    lg(G, G.turn, 'リフレッシュステップ: トラッシュのコア' + n + '個をリザーブへ、疲労回復');
  } else if (s === 'main') lg(G, G.turn, 'メインステップ');
  else if (s === 'attack') lg(G, G.turn, 'アタックステップ' + (G.noAttack ? '(先攻1ターン目のためアタック不可)' : ''));
  else if (s === 'main2') lg(G, G.turn, '第二メインステップ');
  else if (s === 'end') {
    lg(G, G.turn, 'エンドステップ');
    G.endLeft = [];
    P.field.forEach(k => k.def.effects.forEach((e, ei) => { if (e.timing.kind === 'trigger' && e.timing.event === 'endstep' && effectActive(k, e) && !untapNoTarget(G, G.turn, e, k) && !(e.timing.nodup && G.endLeft.some(x => x.k.def.name === k.def.name && x.e.timing.nodup))) G.endLeft.push({ id: k.iid + '#' + ei, k, e }); }));
  }
  if (s === 'attack' && G.winner == null && !G.noAttack) {
    const seen = new Set();
    G.p[1 - G.turn].field.forEach(k => k.def.effects.forEach(e => { if (e.timing.kind === 'trigger' && (e.timing.event === 'oppAttackStart' || e.timing.event === 'bothAtkStart') && effectActive(k, e) && !(e.timing.nodup && seen.has(k.def.name))) { seen.add(k.def.name); enqueue(G, 1 - G.turn, k, e, { event: 'oppAttackStart' }); } }));
    { const seenS = new Set(); P.field.forEach(k => k.def.effects.forEach(e => { if (e.timing.kind === 'trigger' && (e.timing.event === 'atkStart' || e.timing.event === 'bothAtkStart') && effectActive(k, e) && evalCond(G, G.turn, e.cond) && !(e.timing.nodup && seenS.has(k.def.name))) { seenS.add(k.def.name); enqueue(G, G.turn, k, e, { event: 'atkStart' }); } })); }
    if (G.queue.length) runQueue(G);
  }
  if (s === 'main' && G.winner == null) { const seenM = new Set(); P.field.forEach(k => k.def.effects.forEach(e => { if (e.timing.kind === 'trigger' && e.timing.event === 'mainStart' && effectActive(k, e) && evalCond(G, G.turn, e.cond) && !(e.timing.nodup && seenM.has(k.def.name))) { seenM.add(k.def.name); enqueue(G, G.turn, k, e, { event: 'mainStart' }); } })); }
  G.trace.push({ s, t: G.turn, m: G.log[G.log.length - 1].m });
  if (s === 'main' && G.queue.length && G.winner == null) runQueue(G);
  if (s === 'end' && G.endLeft && G.endLeft.length && G.winner == null) runQueue(G);
  if (s === 'end' && G.winner == null && !G.settings.pause && G.settings.autoEnd) { if (!G.pending && !G.queue.length && !(G.endLeft && G.endLeft.length) && !G.battle && G.step === 'end') { nextStep(G); return; } G.autoEnd = G.turnNo; }
  // 自動ステップは一時停止が無効なら続けて進める(効果の発動窓はここに入る)
  if (G.winner == null && AUTO.has(s) && !G.settings.pause) { if (s === 'draw' && (G.pending || G.queue.length)) G.autoAfter = G.turnNo; else nextStep(G); }
}

function nextStep(G) {
  const i = STEPS.indexOf(G.step);
  G.battle = null; nxCleanup(G, 'step'); nxCleanup(G, 'battle');
  if (i < STEPS.length - 1) {
    // 先攻1ターン目は、アタックステップと第二メインステップを自動で飛ばす
    if (G.noAttack && STEPS[i + 1] === 'attack') { lg(G, G.turn, '先攻1ターン目のため、アタックステップと第二メインステップは省略'); enterStep(G, 'end'); return; }
    enterStep(G, STEPS[i + 1]); return;
  }
  clearMods(G); G.turn = 1 - G.turn; G.turnNo++; G.lifeLost = [0, 0]; G.noAttack = false;
  lg(G, G.turn, G.turnNo + 'ターン目');
  enterStep(G, 'start');
}

/* --- コア・カードの移動 --- */
const CZ = ['life', 'reserve', 'coreTrash', 'void'];
function findCore(P, cid) {
  for (const z of CZ) { const i = P[z].findIndex(c => c.id === cid); if (i >= 0) return { zone: z, i, arr: P[z] }; }
  for (const k of P.field) { const i = k.cores.findIndex(c => c.id === cid); if (i >= 0) return { zone: 'card', card: k, i, arr: k.cores }; }
  return null;
}
const ZJP = { life: 'ライフ', reserve: 'リザーブ', coreTrash: 'トラッシュ', void: 'ボイド', card: 'カード' };
function coreFloorSrc(G, card) {
  const b = G.battle; if (!b || b.bgone || b.blocker !== card.iid) return null;
  const AA = G.p[b.pi].field.find(x => x.iid === b.iid); if (!AA || !AA.def.effects.some(e => e.keyword === 'clash' && effectActive(AA, e))) return null;
  const K = G.p[b.pi].field.find(K => K.def.effects.some(e => e.timing.kind === 'static' && e.timing.when === 'coreFloor' && effectActive(K, e)));
  return K ? K.def.name : null;
}
function coreFloorBlock(G, pi, card, rm) {
  if (!card || card.def.type !== 'spirit' || card.cores.length - rm >= 1) return false;
  const nm = coreFloorSrc(G, card); if (!nm) return false;
  G.notice = { n: (G.notice ? G.notice.n : 0) + 1, m: '「' + nm + '」の効果により、ブロックしているスピリットのコアは1個より少なくできないため、実行できません' };
  return true;
}
function moveCore(G, pi, cid, dest) {
  const P = G.p[pi], f = findCore(P, cid);
  if (!f) return false;
  let target, k;
  if (dest.zone === 'card') {
    k = P.field.find(x => x.iid === dest.iid);
    if (!k || f.card === k) return false;
    target = k.cores;
  } else {
    if (!CZ.includes(dest.zone) || dest.zone === 'life' || f.zone === dest.zone) return false;
    target = P[dest.zone];
  }
  if (f.zone === 'card' && coreFloorBlock(G, pi, f.card, 1)) return false;
  const c = f.arr.splice(f.i, 1)[0];
  target.push(c);
  if (f.zone === 'life') G.lifeLost[pi]++;
  if (f.zone === 'card' && f.card.def.type === 'spirit' && f.card.cores.length === 0) { if (G.deferVanish) (G.zeroWait = G.zeroWait || []).push(f.card.iid); else vanishCard(G, pi, f.card); }
  return true;
}
// コアが0になったスピリットは消滅。手動のコア移動中は次の操作まで待つ(コアの入れ替えができるように)
function vanishCard(G, pi, card) {
  const P = G.p[pi]; if (!P.field.includes(card)) return;
  P.field.splice(P.field.indexOf(card), 1); card.tapped = false; card.heavy = false; nxRevert(G, card); P.trash.push(card);
  (G.vanLog = G.vanLog || []).push({ turn: G.turnNo, p: pi, by: G.effPi == null ? -1 : G.effPi });
  markGone(G, card.iid); G.evs.push({ t: 'vanish', p: pi, iid: card.iid, name: card.def.name, color: card.def.color, id: card.def.id });
  lg(G, pi, '「' + card.def.name + '」が消滅');
  if (card.def.type === 'spirit' && G.effPi === 1 - pi) P.field.forEach(X => X.def.effects.forEach(e => {   // 相手の効果で消滅した時
    const t = e.timing; if (t.kind !== 'trigger' || t.event !== 'allyVanishedOpp' || !effectActive(X, e)) return;
    if (t.flt && t.flt.color && card.def.color !== t.flt.color) return;
    enqueue(G, pi, X, e, { event: 'allyVanishedOpp', vanIid: card.iid });
  }));
}
function sweepEmpty(G) { const w = G.zeroWait; if (!w || !w.length) return; G.zeroWait = []; [0, 1].forEach(pi => G.p[pi].field.filter(k => w.includes(k.iid) && k.def.type === 'spirit' && k.cores.length === 0).forEach(k => vanishCard(G, pi, k))); }
function moveCard(G, pi, iid, to) {
  const P = G.p[pi];
  if (!['hand', 'field', 'trash', 'removed', 'deckBottom'].includes(to)) return false;
  let src = null, k = null;
  for (const z of ['hand', 'field', 'trash', 'removed']) {
    const i = P[z].findIndex(x => x.iid === iid);
    if (i >= 0) { src = z; k = P[z].splice(i, 1)[0]; break; }
  }
  if (!k) return false;
  if (src === 'field') { const wasTp = !!k.tapped, wasHv = !!k.heavy; nxRevert(G, k); P.reserve.push(...k.cores.splice(0)); k.tapped = false; k.heavy = false; k.mods = []; k.symx = []; markGone(G, k.iid); if (to === 'trash') G.evs.push({ t: 'destroy', p: pi, iid: k.iid, name: k.def.name, color: k.def.color, id: k.def.id, tapped: wasTp, heavy: wasHv, why: G.inBD ? 'バトルで敗れて破壊' : (G.queue[0] && G.queue[0].name ? '「' + G.queue[0].name + '」の効果で破壊' : '') }); }
  if (k.def.token) { lg(G, pi, '「' + k.def.name + '」(トークン)は場を離れて消えました'); return true; }
  if (to === 'deckBottom') P.deck.unshift(k); else P[to].push(k);
  const JP = { hand: '手札', field: '場', trash: 'トラッシュ', removed: '除外', deckBottom: 'デッキの下' };
  lg(G, pi, '「' + k.def.name + '」を' + (src === 'hand' ? '手札' : JP[src]) + 'から' + JP[to] + 'へ');
  return true;
}

/* --- 操作の受付(ホストが全員分を検証して実行) --- */
const STAMPS = ['😃', '😭', '😤', '😅'];
function act(G, pi, a) {
  if (_actDepth === 0 && G.rid && RECDB[G.rid] && G.winner == null && a && typeof a === 'object' && a.k !== 'stamp') { try { RECDB[G.rid].acts.push([pi, JSON.parse(JSON.stringify(a))]); } catch (e) { } }
  _actDepth++; try { act1(G, pi, a); } finally { _actDepth--; }
}
function act1(G, pi, a) {
  if (a && a.k === 'stamp') { if (STAMPS.includes(a.e)) G.stamp = { p: pi, e: a.e, n: ((G.stamp && G.stamp.n) | 0) + 1 }; return; }   // スタンプ: 盤面には影響しない
  act0(G, pi, a);
  if (G.mustAtk) { mustAtkHook(G); if (G.battle && G.queue.length) runQueue(G); }
}
function act0(G, pi, a) {
  G.trace = []; G.fx = []; G.evs = [];
  // 召喚/使用の取り消し: メインステップで出した直前の1回だけ。ほかの操作をすると取り消せなくなる
  let upSnap = null, upLog = 0, upKind = '';
  const UPK = ['atkCnt', 'battleNo', 'lock', 'blkAtkT', 'blkAtkP', 'noAtk'];
  if (a && a.k === 'undoPlay') {
    const u = G.undoPlay; G.undoPlay = null;
    if (u && u.pi === pi && !G.pending && G.winner == null && (!G.battle || (u.kind === 'attack' && G.battle.pi === pi && !G.battle.passes))) {
      const o = JSON.parse(u.snap); G.p = o.p; G.lifeLost = o.lifeLost; G.log = o.log; G.cast = o.cast; G.mLog = o.mLog; G.discards = o.discards; G.vanLog = o.vanLog; G.ctx = o.ctx; G.queue = []; G.fx = []; G.evs = [{ t: 'undo' }];
      UPK.forEach(k => { if (k in o) G[k] = o[k]; else delete G[k]; });
      G.battle = null; G.pending = null;
      lg(G, pi, '「' + u.name + '」' + u.tail + 'に戻しました'); G.seq++; refreshLv(G);
    }
    return;
  }
  const mainOk = G.turn === pi && !G.battle && !G.pending && G.winner == null;
  if (a && a.k === 'play' && mainOk && (G.step === 'main' || G.step === 'main2')) upKind = 'play';
  else if (a && a.k === 'attack' && mainOk && G.step === 'attack') upKind = 'attack';
  else if (a && a.k === 'ability' && mainOk) upKind = 'ability';
  if (upKind) { const o = { p: G.p, lifeLost: G.lifeLost, log: G.log, cast: G.cast, mLog: G.mLog, discards: G.discards, vanLog: G.vanLog, ctx: G.ctx }; UPK.forEach(k => { if (k in G) o[k] = G[k]; }); upSnap = JSON.stringify(o); upLog = G.log.length; }
  else G.undoPlay = null;
  refreshLv(G); actInner(G, pi, a); refreshLv(G);
  if (upSnap) {
    let nm = '', tail = '';
    if (upKind === 'play') { nm = (G.log.slice(upLog).map(l => (l.m || '').match(/^「(.+?)」を(召喚|配置|使用)/)).find(Boolean) || [])[1] || 'カード'; tail = 'を出す前'; }
    else if (upKind === 'attack') { const k = G.battle && G.p[pi].field.find(x => x.iid === G.battle.iid); nm = k ? k.def.name : 'スピリット'; tail = 'でアタックする前'; }
    else { const l = G.log.slice(upLog).map(l => (l.m || '').match(/^「(.+?)」/)).find(Boolean); nm = l ? l[1] : 'アビリティ'; tail = 'の効果を使う前'; }
    G.undoPlay = G.log.length > upLog ? { snap: upSnap, pi, name: nm, tail, kind: upKind } : null;
  }
  if (G.winner == null) G.p.forEach((Q, i) => { if (!Q.life.length) { G.winner = 1 - i; G.loseWhy = 'life'; G.evs.push({ t: 'lifeZero', p: i }); lg(G, -1, 'ライフが0になりました'); } });
  if (G.trace.length || G.fx.length || G.evs.length) G.seq++;
}
function actInner(G, pi, a) {
  if (!a || typeof a !== 'object' || G.winner != null) return;
  const P = G.p[pi];
  if (G.pick) {   // ランダムで選ばれた側が、先攻か後攻を選ぶ
    if (a.k !== 'setFirst' || pi !== G.pick.pi) return;
    const first = a.first ? pi : 1 - pi;
    G.first = first; G.turn = first; G.pick = null;
    lg(G, pi, (a.first ? '先攻' : '後攻') + 'を選びました(先攻: ' + (first === pi ? 'この側' : '相手側') + ')');
    beginAfterFirst(G);
    return;
  }
  if (G.mull) {   // ゲーム開始時のマリガン(先攻から順に1回ずつ)
    if (a.k !== 'mulligan' || pi !== G.mull.order[G.mull.idx]) return;
    if (a.yes) { P.deck.push(...P.hand.splice(0)); shuffle(P.deck); draw(P, 4); lg(G, pi, 'マリガン: 手札を全て入れ替えました'); }
    else lg(G, pi, 'マリガン: しない');
    G.evs.push({ t: 'mull', p: pi, yes: !!a.yes });
    if (++G.mull.idx >= 2) { G.mull = null; beginGame(G); }
    return;
  }
  G.effPi = null;
  mustAtkHook(G);
  if (a.k === 'vanishZero') { const kz = P.field.find(x => x.iid === String(a.iid)); if (kz && kz.def.type === 'spirit' && kz.cores.length === 0 && G.turn === pi && !G.battle && !G.pending) { G.zeroWait = (G.zeroWait || []).filter(i => i !== kz.iid); vanishCard(G, pi, kz); } return; }
  if (a.k !== 'moveCores') sweepEmpty(G);
  switch (a.k) {
    case 'moveCores':
      if (!(G.turn === pi && (G.step === 'main' || G.step === 'main2')) || G.battle || G.pending) break;   // コアを動かせるのは自分のメインステップだけ
      if (a.to && a.to.zone === 'coreTrash') break;   // トラッシュへ移るのはコストの支払い・効果のときだけ   // アタックステップ中はコアを動かせない
      if (Array.isArray(a.ids) && a.to && typeof a.to === 'object') {
        let n = 0; G.deferVanish = true; a.ids.slice(0, 40).forEach(id => { if (!G.settings.lifeManual && P.life.some(c => c.id === String(id))) return; if (moveCore(G, pi, String(id), { zone: String(a.to.zone), iid: String(a.to.iid || '') })) n++; });
        G.deferVanish = false;
        if (n) lg(G, pi, 'コア' + n + '個を' + ZJP[a.to.zone] + 'へ');
      }
      break;
    case 'play':
      if (G.pending && G.pending.kind === 'sumPay' && G.pending.pi === pi) sumPayAct(G, pi, a); else playAct(G, pi, a); break;
    case 'revTake': {
      const pd = G.pending; if (!pd || pd.kind !== 'reveal' || pd.pi !== pi || pd.x.phase !== 'pick') break;
      const lst = [...new Set((Array.isArray(a.iids) ? a.iids : a.iid == null ? [] : [a.iid]).map(String))].filter(i => pd.x.cands.includes(i));
      if (pd.x.groups) { if (!lst.every(i => pd.x.groups.some(g => g.includes(i))) || !pd.x.groups.every(g => { const n = lst.filter(i => g.includes(i)).length; return n <= 1 && (n === 1 || !g.length || pd.x.optional); })) break; }
      else if (lst.length === 0 ? !(pd.x.optional || !pd.x.cands.length) : lst.length !== Math.min(pd.x.takeN || 1, pd.x.cands.length)) break;
      if (pd.x.mode === 'handReturn') {
        const P2 = G.p[pi], got = [];
        lst.forEach(i => { const c = P2.hand.find(x => x.iid === i); if (c) { P2.hand.splice(P2.hand.indexOf(c), 1); P2.deck.unshift(c); got.push(c); } });
        G.evs.push({ t: 'deckReturn', p: pi, to: 'bottom', cards: got.map(c => ({ iid: c.iid, id: c.def.id, name: c.def.name, color: c.def.color })) });
        got.forEach(c => lg(G, pi, '　' + pd.name + ': 手札の「' + c.def.name + '」をデッキの下に戻した'));
        if (got.length) G.queue[0].acted = true;
        G.fx.push({ n: pd.name, t: '', p: pi, r: got.map(c => '手札の「' + c.def.name + '」をデッキの下に戻しました') });
        G.pending = null; G.undo = null; G.queue[0].i++; runQueue(G); break;
      }
      pd.x.pickedList = lst; pd.x.picked = lst[0] || null; if (a.top && pd.x.rest === 'topOrBottom') pd.x.restTop = true; revAdvance(G); break;
    }
    case 'revLive': {
      const pd = G.pending; if (!pd || pd.kind !== 'reveal' || pd.pi !== pi || pd.x.phase !== 'order') break;
      const o = Array.isArray(a.order) ? a.order.map(String).filter(i => pd.x.restIds.includes(i)) : [];
      pd.x.live = [...new Set(o)]; G.seq++; break;
    }
    case 'revOrder': {
      const pd = G.pending; if (!pd || pd.kind !== 'reveal' || pd.pi !== pi || pd.x.phase !== 'order') break;
      const o = Array.isArray(a.order) ? a.order.map(String) : [];
      if (o.length !== pd.x.restIds.length || !pd.x.restIds.every(i => o.includes(i)) || new Set(o).size !== o.length) break;
      const P2 = G.p[pi]; for (let i = o.length - 1; i >= 0; i--) P2.deck.unshift(pd.x.cards.find(c => c.iid === o[i]).inst);
      lg(G, pi, '　' + pd.name + ': 残りをデッキの下に戻した(下から ' + o.map(i => '「' + pd.x.cards.find(c => c.iid === i).def.name + '」').join('→') + ')');
      revDone(G, (pd.x.pickedList || []).map(i => pd.x.cards.find(c => c.iid === i)).filter(Boolean), o.length); break;
    }
    case 'orderPick': {
      const pd = G.pending; if (!pd || pd.kind !== 'order' || pd.pi !== pi) break;
      const it = G.endLeft.find(x => x.id === String(a.id)); if (!it) break;
      G.endLeft.splice(G.endLeft.indexOf(it), 1); G.pending = null;
      lg(G, pi, 'エンドステップ効果の順番: 「' + it.k.def.name + '」'); enqueue(G, pi, it.k, it.e, { event: 'endstep' }); runQueue(G); break;
    }
    case 'sumSkip':
      if (G.pending && G.pending.kind === 'sumPay' && G.pending.pi === pi && G.pending.limbo) { const pd0 = G.pending; G.pending = null; G.undo = null; limboDone(G, pd0, pi, false); }
      else if (G.pending && G.pending.kind === 'sumPay' && G.pending.pi === pi) { G.pending = null; G.undo = null; lg(G, pi, '　' + G.queue[0].name + ': 発動しない'); G.fx.push({ n: G.queue[0].name, t: '', p: pi, r: ['発動しませんでした'] }); G.queue[0].i++; runQueue(G); }
      break;
    case 'ability': abilityAct(G, pi, String(a.iid), a.ei | 0); break;
    case 'setLifeManual': if (!G.settings.test) break; G.settings.lifeManual = !!a.v; lg(G, pi, 'ライフの手動操作: ' + (a.v ? 'ON' : 'OFF')); break;
    case 'attack': {
      const k = P.field.find(x => x.iid === a.iid);
      if (G.turn === pi && G.step === 'attack' && !G.noAttack && !G.battle && !G.pending && k && k.def.type === 'spirit' && !k.tapped && canAttackNow(G, k) && (!atkToll(G, pi, k) || G.p[pi].reserve.length)) startAttack(G, pi, k);
      break;
    }
    case 'pass': passFlash(G, pi); break;
    case 'block': blockAct(G, pi, a.iid ? String(a.iid) : null); break;
    case 'choose': { const w0 = G.p.some(P => P.field.some(k => k.def.effects.some(e => e.timing.event === 'ampBp'))) ? ampSnap(G) : null; chooseAct(G, pi, a.iids, !!a.alt, a.pay); if (w0) { ampHook(G, w0); runQueue(G); } break; }
    case 'coreSel': coreSelAct(G, pi, a.ids); break;
    case 'endBattle': if (G.battle && !G.pending) { lg(G, pi, 'バトルを強制終了(手動)'); endBattle(G); } break;
    case 'moveCard':
      if (!G.settings.test) break;
      if (String(a.to) === 'trash' && P.field.some(x => x.iid === String(a.iid))) { destroyCard(G, pi, String(a.iid)); runQueue(G); }   // 場からトラッシュへ=破壊(破壊時効果も働く)
      else if (G.step === 'attack' && String(a.to) === 'field') break;
      else moveCard(G, pi, String(a.iid), String(a.to));
      break;
    case 'cancelCast':
      if (G.undo && G.pending && G.pending.pi === pi) {
        const o = JSON.parse(G.undo);
        G.p = o.p; G.lifeLost = o.lifeLost; G.battle = o.battle; G.log = o.log; G.queue = []; G.pending = null; G.undo = null; G.fx = []; G.evs = [];
        lg(G, pi, '使用を取り消して、元に戻しました');
      }
      break;
    case 'tap': { if (!G.settings.test) break; const k = P.field.find(x => x.iid === a.iid); if (k) { k.tapped = !k.tapped; lg(G, pi, '「' + k.def.name + '」を' + (k.tapped ? '疲労' : '回復')); } break; }
    case 'draw': { if (!G.settings.test) break; const n = draw(P, int(a.n, 1, 10, 1)); lg(G, pi, n + '枚ドロー'); break; }
    case 'fromPool': { // テストモード専用: デッキに入っていないカードも、データベースから取り出す
      if (!G.settings.test || !['hand', 'field', 'trash', 'removed'].includes(a.to) || !a.raw) break;
      let def; try { def = cleanDef(a.raw); } catch (e) { break; }
      const k = mkInst(def); P[a.to].push(k);
      lg(G, pi, '(テスト)「' + def.name + '」を' + { hand: '手札', field: '場', trash: 'トラッシュ', removed: '除外' }[a.to] + 'へ');
      break;
    }
    case 'fromDeck': { // テストモード専用: デッキから指定のカードを取り出す
      if (!G.settings.test || !['hand', 'field', 'trash', 'removed'].includes(a.to)) break;
      const i = P.deck.findIndex(x => x.iid === a.iid); if (i < 0) break;
      const k = P.deck.splice(i, 1)[0]; P[a.to].push(k);
      lg(G, pi, '(テスト)「' + k.def.name + '」をデッキから' + { hand: '手札', field: '場', trash: 'トラッシュ', removed: '除外' }[a.to] + 'へ');
      break;
    }
    case 'addCore': if (!G.settings.test) break; P.reserve.push(mkCore(false)); lg(G, pi, 'リザーブにコア+1'); break;
    case 'next': if (G.turn === pi && !G.battle && !G.pending) nextStep(G); break;
    case 'setPause': G.settings.pause = !!a.v; lg(G, pi, 'ステップ1〜4の一時停止: ' + (a.v ? 'ON' : 'OFF')); break;
  }
}

