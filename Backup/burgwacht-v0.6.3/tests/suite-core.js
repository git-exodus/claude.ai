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
const fresh=async()=>{await p.goto(url);await E(()=>localStorage.clear());await p.goto(url);await p.waitForTimeout(200);await p.click('#m-start');await p.click('#slot-0');await dismiss()};
await fresh();
// T1 start
let r=await E(()=>({g:__bw.S.gold,l:[...document.querySelectorAll('.wp.locked')].map(x=>x.dataset.w),t:document.getElementById('gold').textContent}));
ok(r.g===0&&r.t==='0','Start: 0 Gold');ok(r.l.join()==='dagger,star,bow,wand','Start: alle Waffen außer dem Schwert gesperrt',r.l);
await p.click('#wp-dagger');ok(await E(()=>__bw.S.active)==='sword','Gesperrte Waffe lässt sich nicht wählen');
ok(await E(()=>document.getElementById('wdown').disabled&&document.getElementById('wup').disabled),'Start: beide Pfeile deaktiviert');
// T2 cooldown
await p.mouse.click(100,300);let a1=await E(()=>__bw.state().atkCount);await p.mouse.click(120,300);let a2=await E(()=>__bw.state().atkCount);
await E(()=>__bw.step(3.6));await p.mouse.click(120,300);let a3=await E(()=>__bw.state().atkCount);
ok(a1===1&&a2===1&&a3===2,'Cooldown blockt zweiten Tipp, nach 3,6 s wieder frei',[a1,a2,a3]);
ok(await E(()=>__bw.cdOf('sword'))===3.5,'Cooldown Lvl 1 = 3,5 s');
// T3 milestones
const LV=[1,5,10,15,25,30,40,50,60,70,80,90,100];
for(const w of['sword','dagger','star','bow','wand']){
  let prev=-1,line=[];
  for(const L of LV){
    const s=await p.evaluate(([w,L])=>{const g=__bw,S=g.S;S.own.dagger=S.own.star=S.own.bow=S.own.wand=true;S.active=w;S.wave=1;g.clear();S.lv[w]=L;S.xp[w]=0;g.setHp(10);
      for(let i=0;i<14;i++)g.spawn(i%5==0?'ogre':'slime');for(const e of g.ens()){e.hp=e.max=1e5}
      g.step(9);g.setHp(10);const en=g.ens();const t=en[0];const hp0=en.reduce((a,e)=>a+e.hp,0);
      for(const e of en){e.hp=e.max=1e5;e.sp=0}
      g.ready();const before=g.state().atkCount;g.attack(t.x,t.y);g.attack(t.x,t.y);g.attack(t.x,t.y);
      const st=g.state(),kinds=[...new Set(g.prj().map(x=>x.k))].join('+');
      g.step(.05);let peak=g.state().projs+g.state().zones+g.state().fx;
      for(let i=0;i<30;i++){g.step(.1);const q=g.state();peak=Math.max(peak,q.projs+q.zones+q.fx)}
      const dmg=g.ens().reduce((a,e)=>a+(e.max-e.hp),0);
      return {n:st.atkCount-before,pr:st.projs,zn:st.zones,fx:st.fx,kinds,dmg:Math.round(dmg),peak,cd:g.cdOf(w)}},[w,L]);
    line.push(`L${L}: dmg ${s.dmg} proj ${s.pr}(${s.kinds}) zones ${s.zn} fx ${s.fx} cd ${s.cd.toFixed(2)}`);
    ok(s.n===1&&s.dmg>0,`${w} Lvl ${L}: greift an und macht Schaden`,s.dmg);prev=Math.max(prev,s.dmg);
  }
  console.log(line.join('\n'));
}
ok(errs.length===0,'Keine Laufzeitfehler bei allen 65 Stufen',errs.slice(0,3));
// T4 xp & level
await fresh();
r=await E(()=>{const g=__bw;g.step(2);g.spawn('slime');const x0=g.S.xp.sword;g.ens().forEach(e=>e.hp=1);const e=g.ens()[0];g.ready();g.attack(e.x,e.y);g.step(.2);
  const x1=g.S.xp.sword;g.S.xp.sword=g.need(1)-.5;g.spawn('slime');const f=g.ens()[g.ens().length-1];f.hp=1;g.step(3.6);g.attack(f.x,f.y);g.step(.2);return {x0,x1,lv:g.S.lv.sword,n:g.need(1)}});
ok(r.x1>r.x0,'XP pro besiegtem Gegner',[r.x0,r.x1.toFixed(2)]);ok(r.lv===2,'Level-Up bei voller XP-Leiste',r.lv);
// T5 waves & gold
await fresh();
const win=()=>E(()=>{const g=__bw;g.step(3);g.clear();g.step(.1);return {w:g.S.wave,gold:g.S.gold,c:g.S.cleared,hp:g.state().hp}});
await E(()=>__bw.setHp(5));r=await win();ok(r.w===2&&r.gold===1&&r.c===1,'Welle 1 geschafft: +1 Gold, weiter zu Welle 2',JSON.stringify(r));ok(r.hp===6,'Heilung +1 nach Welle',r.hp);
ok(await E(()=>!document.getElementById('wdown').disabled&&document.getElementById('wup').disabled),'Pfeil runter aktiv, hoch gesperrt (höchste Welle)');
await E(()=>__bw.step(4));let e0=await E(()=>__bw.state().enemies);await p.click('#wdown');r=await E(()=>({w:__bw.S.wave,e:__bw.state().enemies}));
ok(e0>0&&r.w===1&&r.e===0,'Pfeil runter: Welle 1, Gegner zurückgesetzt',[e0,r.w,r.e]);
r=await win();ok(r.w===2&&r.gold===1,'Alte Welle erneut geschafft: kein Gold',JSON.stringify(r));
r=await win();ok(r.w===3&&r.gold===3&&r.c===2,'Neue Welle 2 geschafft: +2 Gold',JSON.stringify(r));
await p.click('#wdown');await p.click('#wup');ok(await E(()=>__bw.S.wave===3&&document.getElementById('wup').disabled),'Pfeil hoch geht nur bis zur höchsten erreichten Welle');
// T6 defeat & shop
const lose=()=>E(()=>{const g=__bw;g.setHp(1);g.step(2);g.spawn('slime');for(let i=0;i<60&&!g.state().paused;i++){g.ens().forEach(e=>{e.hp=1e6;e.sp=200});g.step(.5)}return g.state().paused});
ok(await lose(),'Niederlage pausiert das Spiel');ok(await E(()=>!document.getElementById('shop').hidden),'Shop öffnet sich nach Niederlage');
r=await shopList();
ok(r==='weapons: Dolche → 5 Gold(aus) | Morgenstern → 10 Gold(aus) | Bogen → 40 Gold(aus) | Feuerstab → 75 Gold(aus)\ncastle: Heilung: +2 → 20 Gold(aus) | Mauer: 3 HP → 15 Gold(aus) | Burg-Leben: 12 Leben → 60 Gold(aus) | Turmschütze → 120 Gold(aus)\ntroops: Soldat → 2 Gold | Soldaten-Tempo: alle 4 s → Erst Soldat(aus) | Rüstung → Erst Soldat(aus) | Verstärkung → Erst Soldat(aus)\nboni: Goldbonus: +25 % → 80 Gold(aus) | XP-Bonus: +25 % → 60 Gold(aus)','Shop-Preise und Sperren bei 3 Gold in allen vier Reitern',r.replace(/\n/g,' // '));
await p.screenshot({path:'shop.png'});
await buy('troops','soldier');r=await E(()=>({g:__bw.S.gold,s:__bw.S.own.soldier,t:document.getElementById('buy-soldier').textContent}));ok(r.g===1&&r.s&&r.t==='Gekauft','Soldat gekauft für 2 Gold',JSON.stringify(r));
let ac=await E(()=>__bw.state().atkCount);await E(()=>{__bw.ready();__bw.attack(100,300)});ok(await E(()=>__bw.state().atkCount)===ac,'Kein Angriff, solange der Shop offen ist');
await p.click('#shopgo');ok(await E(()=>!document.getElementById('dialog').hidden&&document.getElementById('dlg-text').textContent.includes('Oben links')),'Nach der ersten Niederlage erscheint der Hinweis auf die Wellen-Pfeile');await dismiss();r=await E(()=>({w:__bw.S.wave,st:__bw.state(),h:document.getElementById('shop').hidden,c:__bw.S.cleared}));
ok(r.w===1&&r.st.hp===10&&!r.st.paused&&r.h&&r.st.enemies===0,'Nach dem Shop: Welle 1, volle Leben, Feld leer',r.w);ok(r.c===2,'Höchste Welle bleibt erhalten (Pfeile)',r.c);
// T7 soldiers
r=await E(()=>{const g=__bw;const st=t=>{for(let i=0;i<t*10;i++){g.ens().forEach(e=>e.dead=true);g.step(.1)}};st(2.2);const a=g.state().soldiers;st(5);const b2=g.state().soldiers;let mx=0;for(let i=0;i<60;i++){g.clear();g.S.wave=1;g.step(1);mx=Math.max(mx,g.state().soldiers)}return {a,b:b2,mx}});
ok(r.a===1&&r.b===2,'Soldat erscheint alle 5 Sekunden',[r.a,r.b]);ok(r.mx===4,'Höchstens 4 Soldaten gleichzeitig',r.mx);
r=await E(()=>{const g=__bw;g.clear();g.sols().length=1;g.S.own.soldier=false;const s=g.sols()[0];s.hp=3;g.step(.05);g.spawn('ogre');const e=g.ens()[g.ens().length-1];e.hp=e.max=1e6;let t=0;
  while(e.blocked<=0&&t<40){g.ens().forEach(x=>{if(x!==e)x.hp=0,x.dead=true});g.step(1/60);t+=1/60}
  const x0=e.x,y0=e.y;let life=0,hits=1,last=s.hp,moved=0;while(s.hp>0&&life<8){g.step(1/60);life+=1/60;if(s.hp<last){hits+=last-s.hp;last=s.hp}moved=Math.max(moved,Math.hypot(e.x-x0,e.y-y0))}
  const dmg=e.max-e.hp;g.step(.3);g.ens().forEach(x=>{if(x!==e)x.dead=true});const xa=e.x,ya=e.y;g.step(.5);const free=Math.hypot(e.x-xa,e.y-ya);g.S.own.soldier=true;
  return {blocked:t<40,moved,start:3-last+0,hits,life,dmg,free}});
ok(r.blocked&&r.moved<1,'Gegner bleibt am Soldaten stehen',r.moved.toFixed(2));ok(r.hits===3&&r.life>2&&r.life<3,'Soldat fällt nach genau 3 Schlägen',r.hits+' Treffer in '+r.life.toFixed(1)+' s');
ok(r.dmg>0&&r.dmg<30,'Soldat macht nur minimalen Schaden',r.dmg.toFixed(1));ok(r.free>2,'Ohne Soldat läuft der Gegner weiter',r.free.toFixed(1));
// T8 shop full purchase + heal
await E(()=>{__bw.S.gold=70;__bw.clear()});ok(await lose(),'Zweite Niederlage');
await buy('weapons','dagger');await buy('weapons','star');await p.click('#tab-castle');r=await E(()=>document.querySelectorAll('#items .item b')[0].textContent);ok(r==='Heilung: +2','Heilung zeigt zuerst Stufe +2',r);
await p.click('#buy-heal');await p.click('#buy-heal');ok(await E(()=>document.getElementById('buy-heal').textContent)==='Maximal','Heilung nach +3 ausgereizt');r=await E(()=>({g:__bw.S.gold,o:__bw.S.own,h:__bw.S.heal}));
ok(r.g===3&&r.o.dagger&&r.o.star&&r.h===3,'Dolche 5, Morgenstern 10, Heilung 20 und 32 abgezogen',JSON.stringify(r));
await p.click('#shopgo');ok(await E(()=>document.getElementById('dialog').hidden),'Der Hinweis erscheint nur einmal');ok(await E(()=>[...document.querySelectorAll('.wp.locked')].map(x=>x.dataset.w).join())==='bow,wand','Gekaufte Waffen entsperrt, Bogen und Feuerstab noch nicht');
await p.click('#wp-dagger');ok(await E(()=>__bw.S.active)==='dagger','Dolche wählbar');await p.click('#wp-star');ok(await E(()=>__bw.S.active)==='star','Morgenstern wählbar');
await E(()=>__bw.setHp(4));r=await win();ok(r.hp===7,'Heilung +3 nach Welle',r.hp);
r=await E(()=>{__bw.setHp(9);__bw.S.wave=1;return 0});r=await win();ok(r.hp===10,'Heilung nie über 10 Leben',r.hp);
// T9 castle damage
r=await E(()=>{const g=__bw;g.clear();g.sols().length=0;g.S.own.soldier=false;g.setHp(10);g.step(2);g.spawn('slime');const e=g.ens()[g.ens().length-1];e.hp=1e6;e.sp=300;g.ens().forEach(x=>{if(x!==e)x.dead=true});let n=0;while(g.state().hp===10&&n<900){g.step(1/60);n++}return g.state().hp});
ok(r===9,'Burg verliert genau 1 Leben pro Treffer',r);
// T10 boss
r=await E(()=>{const g=__bw;g.step(.2);g.S.cleared=10;g.S.wave=6;g.hud();return 0});await p.click('#wdown');
r=await E(()=>{const g=__bw;let boss=false;let w=0;for(let i=0;i<80&&!boss;i++){g.setHp(10);g.step(.5);if(g.ens().some(e=>e.boss)){boss=true;w=g.S.wave}}return {boss,w}});ok(r.boss&&r.w===5,'Boss in Welle 5',JSON.stringify(r));
// T11 save / load
await E(()=>{__bw.S.own.soldier=true;__bw.S.lv.sword=37;__bw.S.wave=4;__bw.save()});const s1=await E(()=>JSON.stringify(__bw.S));await p.goto(url);await p.waitForTimeout(200);await p.click('#m-load');await p.click('#slot-0');const s2=await E(()=>JSON.stringify(__bw.S));
ok(s1===s2,'Speichern und Laden erhält den ganzen Spielstand');
await E(()=>{__bw.step(14)});await p.mouse.click(110,330);await p.waitForTimeout(500);await p.screenshot({path:'main2.png'});
ok(errs.length===0,'Keine Laufzeitfehler im gesamten Lauf',errs.slice(0,3));
console.log(fails?('FEHLER: '+fails):'ALLE TESTS BESTANDEN');await b.close()})();
