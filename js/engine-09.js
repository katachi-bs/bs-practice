// 効果が今のレベルで有効か(場に出ているスピリットはコアの数で決まるレベルを見る)
function effectActive(k, e) {
  if (!e.levels.length) return true;
  const li = lvInfo(k);
  return !!li && e.levels.includes(li.lv);
}
const EVENT_JP = { attack: 'アタック時', block: 'ブロック時', summon: '召喚時', destroyed: '破壊時', endstep: '自分のエンドステップ', magicUsed: 'マジック使用時', oppDestroy: '相手のスピリットを破壊した時', bpWin: 'BP比べで勝った時', attackstart: 'アタックステップ開始時', atkStart: '自分のアタックステップ開始時', bp0Kill: 'BP0の相手スピリットを破壊した時', allyDestroyed: '雷竜が破壊された時', oppAttack: '相手のスピリットがアタックした時', lifeHit: '相手のライフを減らした時', ampBp: '増幅スピリットのBPが8000以上になった時', drawStep: '自分のドローステップ', allyAttack: '自分のスピリットがアタックした時', allyBattleEnd: '自分のスピリットのバトル終了時', allyLifeHit: '自分のスピリットが相手のライフを減らした時', lifeLoss: '相手によって自分のライフが減った時', allyBpDestroyed: '自分のスピリットがBP比べで破壊された時', battleEnd: 'バトル終了時', allySummon: '自分のスピリットが召喚された時', ampMagicKill: '雷竜のマジックで相手のスピリットを破壊した時', blocked: '自分のスピリットがブロックされた時', mainStart: '自分のメインステップ開始時', oppAttackStart: '相手のアタックステップ開始時', quakeEx: '自分の地鳴でEXシンボルを持つカードを破棄した時', quakeOther: '他の自分の地鳴で相手のデッキを破棄した時', selfTapped: 'このカードが疲労した時', allyDestroyedAny: '自分のスピリットが破壊された時', selfUntapped: 'このスピリットが回復した時', lifeUp: '自分のライフが増えた時' };
const KW_JP = { flashSummon: 'フラッシュ『相手のアタックステップ』', inheritance: '継召', shinkai: '真界放', soulmagic: 'ソウルマジック:[赤]', clash: '激突', amp: '増幅', puppet: '操霊', flow: '水流', quake: '地鳴', spell: '魔述', camo: '迷彩', todo: '未実装', levelup: 'レベルアップ', fchange: 'Fチェンジ', fc5: '', costRule: '', allYellow: '', atkCap1: '', bp0Bottom: '' };
function timingLabel(t) {
  if (t.kind === 'text') return t.label || '効果';
  if (t.when === 'attacking') return 'アタック中';
  if (t.when === 'attblk') return 'アタック/ブロック中';
  if (t.when === 'blocking') return 'ブロック中';
  if (t.kind === 'static' && t.when === 'step' && t.step && STEP_JP[t.step]) return (t.turn === 'you' ? '自分の' : t.turn === 'opp' ? '相手の' : 'お互いの') + STEP_JP[t.step] + 'ステップ';
  if (t.kind === 'static') return '';
  if (t.kind === 'trigger') return EVENT_JP[t.event] || '';
  if (t.kind === 'flash') return 'フラッシュ';
  if (t.kind === 'main') return 'メイン';
  return t.step && STEP_JP[t.step] ? STEP_JP[t.step] + 'ステップ' : '(未設定)';
}
const lvLabel = lv => lv.length ? 'Lv' + (lv.length > 1 ? lv[0] + '-' + lv[lv.length - 1] : lv[0]) : '';
