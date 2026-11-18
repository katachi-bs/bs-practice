// 1つにまとまった bs-practice.html を、小さいファイルに分けて書き出す(GitHubに、変更したファイルだけを上げられるようにするため)
// 使い方: node tools/split_app.js [--init] [元のhtml] [出力フォルダ]
//   --init : 分ける位置(アンカー)を決め直して tools/split_anchors.json に保存する
//   なし   : 保存済みのアンカーで分ける(アンカーの行が見つからないときは止まる)
const fs=require('fs'),vm=require('vm'),path=require('path');
const args=process.argv.slice(2),INIT=args[0]==='--init';if(INIT)args.shift();
const SRC=args[0]||path.join(__dirname,'..','bs-practice.html'),OUT=args[1]||path.join(__dirname,'..','dist'),AF=path.join(__dirname,'split_anchors.json');
const TARGET=+process.env.TARGET||25000, MAXC=+process.env.MAXC||60000;
const html=fs.readFileSync(SRC,'utf8');
const cssM=html.match(/<style>([\s\S]*?)<\/style>/), engM=html.match(/<script id="engine">([\s\S]*?)<\/script>/), uiM=html.match(/<script id="ui">([\s\S]*?)<\/script>/);
if(!cssM||!engM||!uiM)throw new Error('style/engine/ui が見つかりません');
const bl=s=>Buffer.byteLength(s);
// --- 書き方の確認 ---
const jsOk=t=>{try{new vm.Script(t);return true}catch(e){return false}};
function cssBalanced(t){let d=0,i=0,n=t.length;while(i<n){const c=t[i];
  if(c==='/'&&t[i+1]==='*'){const j=t.indexOf('*/',i+2);if(j<0)return false;i=j+2;continue}
  if(c==='"'||c==="'"){let j=i+1;while(j<n&&t[j]!==c){if(t[j]==='\\')j++;j++}i=j+1;continue}
  if(c==='u'&&t.startsWith('url(',i)){let j=i+4;while(t[j]===' ')j++;if(t[j]!=='"'&&t[j]!=="'"){const k=t.indexOf(')',j);if(k<0)return false;i=k+1;continue}}
  if(c==='{')d++;else if(c==='}'){d--;if(d<0)return false}i++}return d===0}
const JS_START=/^(async function |function |const |let |class |var |\/\*|\/\/|\(function|try \{|window\.|document\.|[A-Za-z_$][\w$]*[ .(=])/;
const CSS_START=/^[^\s}]/;
function chooseAnchors(text,ok,startRe){
  const L=text.split('\n'),cnt=new Map();L.forEach(l=>cnt.set(l,(cnt.get(l)||0)+1));
  const anchors=[];let a=0,size=0;
  for(let i=0;i<L.length;i++){
    if(i>a&&size>=TARGET&&startRe.test(L[i])&&cnt.get(L[i])===1&&L[i].length<200&&L[i].length>3){
      const pre=L.slice(a,i).join('\n')+'\n';
      if(ok(pre)){anchors.push(L[i]);a=i;size=0}
    }
    size+=bl(L[i])+1;
  }
  return anchors;
}
function splitBy(text,anchors){
  const L=text.split('\n'),idx=[0];let from=0;
  anchors.forEach(an=>{const i=L.indexOf(an,from);if(i<0)throw new Error('分ける位置の行が見つかりません(--init で決め直してください): '+an.slice(0,80));if(L.indexOf(an,i+1)>=0&&0)throw 0;idx.push(i);from=i+1});
  const out=[];for(let k=0;k<idx.length;k++){out.push(L.slice(idx[k],k+1<idx.length?idx[k+1]:L.length).join('\n')+(k+1<idx.length?'\n':''))}
  return out;
}
let A;
if(INIT){A={css:chooseAnchors(cssM[1],cssBalanced,CSS_START),engine:chooseAnchors(engM[1],jsOk,JS_START),ui:chooseAnchors(uiM[1],jsOk,JS_START)};fs.writeFileSync(AF,JSON.stringify(A,null,1));console.log('anchors',A.css.length,A.engine.length,A.ui.length)}
else A=JSON.parse(fs.readFileSync(AF,'utf8'));
const parts={css:splitBy(cssM[1],A.css),engine:splitBy(engM[1],A.engine),ui:splitBy(uiM[1],A.ui)};
// --- 確認: つなぐと元に戻る / 1つずつ書き方が正しい / 大きすぎない ---
if(parts.css.join('')!==cssM[1]||parts.engine.join('')!==engM[1]||parts.ui.join('')!==uiM[1])throw new Error('分けたものをつなぐと元と違います');
parts.engine.concat(parts.ui).forEach((t,i)=>{if(!jsOk(t))throw new Error('JSの書き方が崩れた分割があります #'+i)});
parts.css.forEach((t,i)=>{if(!cssBalanced(t))throw new Error('CSSの括弧が崩れた分割があります #'+i)});
const pad=n=>String(n+1).padStart(2,'0');
const files={};let big=[];
parts.css.forEach((t,i)=>files['css/app-'+pad(i)+'.css']=t);
parts.engine.forEach((t,i)=>files['js/engine-'+pad(i)+'.js']=t);
parts.ui.forEach((t,i)=>files['js/ui-'+pad(i)+'.js']=t);
Object.keys(files).forEach(f=>{if(bl(files[f])>MAXC)big.push(f+' '+bl(files[f]))});
const links=parts.css.map((_,i)=>'<link rel="stylesheet" href="css/app-'+pad(i)+'.css">').join('\n');
const engS=parts.engine.map((_,i)=>'<script src="js/engine-'+pad(i)+'.js"></script>').join('\n');
const uiS=parts.ui.map((_,i)=>'<script src="js/ui-'+pad(i)+'.js"></script>').join('\n');
let idx=html.replace(cssM[0],()=>links).replace(engM[0],()=>engS).replace(uiM[0],()=>uiS);
files['index.html']=idx;
fs.rmSync(OUT,{recursive:true,force:true});
Object.keys(files).forEach(f=>{const p=path.join(OUT,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,files[f])});
console.log('files',Object.keys(files).length,'index.html',bl(idx),'bytes','max',Math.max(...Object.values(files).map(bl)));
if(big.length)console.log('大きいファイル(--init で分け直すと小さくなります):',big.join(', '));
