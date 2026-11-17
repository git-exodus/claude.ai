const {chromium}=require('playwright');
let fails=0;const ok=(c,m,x='')=>{console.log((c?'PASS ':'FAIL ')+m+(x!==''?'  ['+x+']':''));if(!c)fails++};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:360,height:740},deviceScaleFactor:1});
const p=await ctx.newPage();
await ctx.addInitScript(()=>{window.__bwQuiet=true});
const dismiss=async()=>{if(await p.evaluate(()=>!document.getElementById('dialog').hidden))await p.click('#dlg-0')};
const shopList=()=>p.evaluate(()=>['weapons','castle','troops','boni'].map(t=>{document.getElementById('tab-'+t).click();return t+': '+[...document.querySelectorAll('#items .item')].map(x=>x.querySelector('b').textContent+' → '+x.querySelector('button').textContent+(x.querySelector('button').disabled?'(aus)':'')).join(' | ')}).join('\n'));
const buy=async(tab,id)=>{await p.click('#tab-'+tab);await p.click('#buy-'+id)};
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const url='file://'+require('path').resolve(__dirname,'../android/app/src/main/assets/index.html');const E=f=>p.evaluate(f);
await p.goto(url);await E(()=>localStorage.clear());await p.goto(url);await p.waitForTimeout(200);await p.click('#m-start');await p.click('#slot-0');await dismiss();
// Gegnerzahlen
let r=await E(()=>[1,2,5,6,15,16,30,31,50,51,100].map(w=>__bw.waveCount(w)));
ok(JSON.stringify(r)==='[8,11,20,25,70,80,220,235,520,540,1520]','Gegnerzahl: +3 bis Welle 5, +5 bis 15, +10 bis 30, +15 bis 50, +20 danach',r.join(', '));
r=await E(()=>{const g=__bw,o=[];for(const w of[1,5,15,30,50,100]){g.S.cleared=w;g.S.wave=w;g.showMenu();g.startGame(0,false);o.push([w,g.state().queue,+g.gap().toFixed(3)])}g.S.cleared=0;g.S.wave=1;g.save();g.showMenu();g.startGame(0,true);return o});
ok(r[0][1]===8&&r[1][1]===21&&r[5][1]===1521,'Wellen enthalten die neue Gegnerzahl (plus Boss in 5er-Wellen)',r.map(x=>x[1]).join(', '));
ok(r.every((x,i)=>i===0||x[2]<=r[i-1][2])&&r[0][2]===1.5&&r[5][2]<0.06,'Gegner kommen einzeln, mit jeder Welle in kürzerem Abstand',r.map(x=>'W'+x[0]+': '+x[2]+' s').join(' · '));
// Größe
r=await E(()=>{const g=__bw;g.step(2);g.spawn('slime');const e=g.ens()[g.ens().length-1];return +(e.r/g.pos().U).toFixed(2)});ok(r===7.8,'Gegner auf 60 % verkleinert (Schleim-Radius 13 → 7,8)',r);
// Wackeln im Shop
const lose=()=>E(()=>{const g=__bw;g.setHp(1);g.S.wallHp=0;g.step(2);g.spawn('slime');for(let i=0;i<60&&!g.state().paused;i++){g.ens().forEach(e=>{e.hp=1e6;e.sp=200});g.step(.5)}return g.state()});
r=await lose();ok(r.paused&&r.shake===0&&r.castleFlash===0,'Im Shop wackelt die Burg nicht mehr',`shake ${r.shake}, flash ${r.castleFlash}`);
const px=()=>p.screenshot({clip:{x:120,y:250,width:120,height:120}});const a1=await px();await p.waitForTimeout(250);const a2=await px();ok(a1.equals(a2),'Burg-Bild im Shop bleibt über 250 ms identisch');
// Shop: Soldaten-Tempo und Mauer
r=await E(()=>({cost:__bw.SHOP.map(i=>i.t.reduce((a,c)=>a+c,0)),sum:__bw.SHOP.reduce((a,i)=>a+i.t.reduce((x,c)=>x+c,0),0),inc:Array.from({length:100},(_,i)=>2+3*Math.floor(i/10)).reduce((a,c)=>a+c,0)}));
ok(r.sum===6054&&r.inc===1550,'Gold-Rechnung: alle festen Käufe 6.054, Welle 1–100 einmal geschafft bringt 1.550',r.cost.join('+')+' = '+r.sum);
await E(()=>{__bw.S.gold=1000;__bw.save()});await E(()=>{document.getElementById('shopgo').click()});await dismiss();await lose();
r=await shopList();
ok(r.includes('troops: Soldat → 2 Gold | Soldaten-Tempo: alle 4 s → Erst Soldat(aus)')&&r.includes('castle: Heilung: +2 → 20 Gold | Mauer: 3 HP → 15 Gold'),'Shop-Liste mit Stufen',r.replace(/\n/g,' // '));
await buy('troops','soldier');await p.click('#buy-soldierSpeed');r=await E(()=>[__bw.S.solLv,__bw.S.gold,document.querySelectorAll('#items .item b')[1].textContent,document.getElementById('buy-soldierSpeed').textContent]);ok(r[0]===1&&r[1]===973&&r[2]==='Soldaten-Tempo: alle 3 s'&&r[3]==='80 Gold','Soldaten alle 4 s für 25 Gold',r.join(' / '));
await p.click('#buy-soldierSpeed');r=await E(()=>[__bw.S.solLv,__bw.S.gold,document.getElementById('buy-soldierSpeed').textContent]);ok(r[0]===2&&r[1]===893&&r[2]==='Maximal','Soldaten alle 3 s für 80 Gold',r.join(' / '));
const wallSteps=[];for(let i=0;i<4;i++){await buy('castle','wall');wallSteps.push(await E(()=>[__bw.S.wall,__bw.S.gold].join(':')))}
ok(wallSteps.join(' ')==='1:878 2:848 3:728 4:428','Mauer-Stufen 15, 30, 120, 300 Gold',wallSteps.join(' '));ok(await E(()=>document.getElementById('buy-wall').textContent)==='Maximal','Mauer bei 25 HP ausgereizt');
await p.screenshot({path:'shop2.png'});
await p.click('#shopgo');r=await E(()=>{const w=document.getElementById('wall');return {hp:__bw.S.wallHp,n:w.children.length,off:w.querySelectorAll('.off').length,h:Math.round(w.getBoundingClientRect().height),right:Math.round(w.getBoundingClientRect().right),hid:w.hidden}});
ok(r.hp===25&&r.n===25&&r.off===0&&!r.hid,'Mauer nach Niederlage voll repariert: 25 Symbole',JSON.stringify(r));ok(r.h>=14&&r.right<=344,'Mauer-Symbole stehen in mehreren Zeilen oben rechts',r.h+' px hoch');
// Soldaten-Takt 3 s
r=await E(()=>{const g=__bw;const st=t=>{for(let i=0;i<t*10;i++){g.ens().forEach(e=>e.dead=true);g.step(.1)}};st(2.2);const a=g.state().soldiers;st(3);const c=g.state().soldiers;st(3);return [a,c,g.state().soldiers]});ok(r.join()==='1,2,3','Soldaten erscheinen jetzt alle 3 Sekunden',r);
// Mauer fängt Treffer ab
r=await E(()=>{const g=__bw;g.S.own.soldier=false;g.sols().length=0;g.clear();g.setHp(10);g.step(3);const hit=()=>{g.spawn('slime');const e=g.ens()[g.ens().length-1];e.hp=1e6;e.sp=400;let n=0;const w0=g.S.wallHp,h0=g.state().hp;while(g.S.wallHp===w0&&g.state().hp===h0&&n<900){g.ens().forEach(x=>{if(x!==e)x.dead=true});g.step(1/60);n++}};
  hit();const a=[g.S.wallHp,g.state().hp];hit();hit();const c=[g.S.wallHp,g.state().hp];return {a,c,off:document.querySelectorAll('#wall .off').length}});
ok(r.a.join()==='24,10'&&r.c.join()==='22,10'&&r.off===3,'Mauer verliert 1 HP pro Treffer, Burg bleibt heil',JSON.stringify(r));
r=await E(()=>{const g=__bw;g.step(3);g.clear();g.step(.1);return [g.S.wallHp,g.S.wave]});ok(r[0]===22,'Mauer wird nach geschaffter Welle nicht repariert',r);
r=await E(()=>{const g=__bw;g.S.wallHp=1;g.hud();const hit=()=>{g.spawn('slime');const e=g.ens()[g.ens().length-1];e.hp=1e6;e.sp=400;let n=0;const w0=g.S.wallHp,h0=g.state().hp;while(g.S.wallHp===w0&&g.state().hp===h0&&n<900){g.ens().forEach(x=>{if(x!==e)x.dead=true});g.step(1/60);n++}};g.setHp(10);g.step(3);hit();const a=[g.S.wallHp,g.state().hp];hit();return {a,c:[g.S.wallHp,g.state().hp]}});
ok(r.a.join()==='0,10'&&r.c.join()==='0,9','Ohne Mauer trifft der nächste Gegner die Burg',JSON.stringify(r));
await E(()=>{__bw.S.wallHp=7;__bw.save()});await p.goto(url);await p.waitForTimeout(200);await p.click('#m-load');await p.click('#slot-0');r=await E(()=>[__bw.S.wall,__bw.S.wallHp,__bw.S.solLv]);ok(r.join()==='4,7,2','Mauer-Stand und Soldaten-Tempo werden gespeichert',r);
await lose();await p.click('#shopgo');ok(await E(()=>__bw.S.wallHp)===25,'Nach erneuter Niederlage wieder 25 HP');
await E(()=>{__bw.step(3)});await p.waitForTimeout(300);await p.screenshot({path:'wall.png'});
// Serie
r=await E(()=>{const g=__bw;g.clear();g.step(3);for(let i=0;i<12;i++)g.spawn('slime');g.clear();const c=g.state().combo;g.step(2);return [c,g.state().combo]});ok(r[0]>=12&&r[1]===0,'Treffer-Serie zählt hoch und läuft nach 1,5 s aus',r);
// Welle 100
r=await E(()=>{const g=__bw,S=g.S;S.own.dagger=S.own.star=S.own.bow=S.own.wand=S.own.soldier=true;S.lv={sword:100,dagger:100,star:100,bow:100,wand:100};S.cleared=120;S.wave=100;g.save();g.showMenu();g.startGame(0,false);
  let mx=0,t0=performance.now(),n=0,spawned=0;const tot=g.state().queue;
  for(let i=0;i<60*30;i++){if(g.state().paused)break;const en=g.ens();g.setHp(10);S.wallHp=25;const t=en[(i*13)%Math.max(1,en.length)];if(i>600)g.hold(t?{x:t.x,y:t.y}:null);g.step(1/60);n++;mx=Math.max(mx,g.state().enemies)}
  g.hold(null);return {tot,mx,left:g.state().queue,ms:(performance.now()-t0)/n,n}});
ok(r.tot===1521&&r.mx<=260&&r.mx>100&&r.ms<6,'Welle 100: 1.521 Gegner, viele gleichzeitig, Logik bleibt schnell',`bis zu ${r.mx} gleichzeitig, ${r.ms.toFixed(2)} ms pro Bild`);
await E(()=>{const g=__bw;g.S.active='star';g.hud();for(let i=0;i<300;i++){g.setHp(10);g.S.wallHp=25;g.step(1/60)}});
const f=await p.evaluate(()=>new Promise(res=>{let n=0,t0=performance.now();const g=__bw;const tick=()=>{g.setHp(10);g.S.wallHp=25;n++;if(performance.now()-t0<2500)requestAnimationFrame(tick);else res([n/2.5,g.state().enemies])};requestAnimationFrame(tick)}));
ok(f[0]>30,'Bildrate in Welle 100 ohne Angriff (Emulator ohne Grafikkarte)',f[0].toFixed(0)+' Bilder/s bei '+f[1]+' Gegnern');
await p.screenshot({path:'w100.png'});
ok(errs.length===0,'Keine Laufzeitfehler im gesamten Lauf',errs.slice(0,3));
console.log(fails?('FEHLER: '+fails):'ALLE TESTS BESTANDEN');await b.close()})();
