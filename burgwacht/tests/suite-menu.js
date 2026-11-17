const {chromium}=require('playwright');
let fails=0;const ok=(c,m,x='')=>{console.log((c?'PASS ':'FAIL ')+m+(x!==''?'  ['+x+']':''));if(!c)fails++};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:360,height:740},deviceScaleFactor:1});
const p=await ctx.newPage();
await ctx.addInitScript(()=>{window.__bwQuiet=true});
const dismiss=async()=>{if(await p.evaluate(()=>!document.getElementById('dialog').hidden))await p.click('#dlg-0')};
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const url='file://'+require('path').resolve(__dirname,'../android/app/src/main/assets/index.html');const E=f=>p.evaluate(f);const vis=id=>p.evaluate(id=>!document.getElementById(id).hidden,id);
await p.goto(url);await E(()=>localStorage.clear());await p.goto(url);await p.waitForTimeout(300);
// Menü
ok(await vis('menu')&&await E(()=>__bw.state().paused),'Startbildschirm erscheint, Spiel steht');
let r=await E(()=>({b:[...document.querySelectorAll('#m-main button')].filter(x=>!x.hidden).map(x=>x.textContent+(x.disabled?'(aus)':'')).join('|'),c:document.getElementById('credit').textContent,v:__bw.VERSION,hud:getComputedStyle(document.getElementById('hud')).visibility}));
ok(r.b==='Spiel starten|Spiel laden(aus)','Menü: Starten aktiv, Laden ohne Spielstand aus, Exit im Browser ausgeblendet',r.b);
ok(r.c==='@made by Brownii (Claude.ai) · v'+r.v,'Fußzeile mit Versionsnummer',r.c);ok(r.hud==='hidden','Spielanzeige im Menü ausgeblendet');
await p.screenshot({path:'menu.png'});
let t0=await E(()=>__bw.state().t);await p.waitForTimeout(400);ok(await E(()=>__bw.state().t)===t0,'Im Menü läuft keine Spielzeit');
await p.click('#m-start');r=await E(()=>[...document.querySelectorAll('.slot span')].map(x=>x.textContent).join('|'));ok(r==='Leer|Leer','Platzwahl zeigt zwei leere Plätze',r);
await p.click('#m-back');ok(await vis('m-main'),'Zurück führt ins Hauptmenü');
await p.click('#m-start');await p.click('#slot-0');r=await E(()=>({d:!document.getElementById('dialog').hidden,t:document.getElementById('dlg-text').textContent,p:__bw.state().paused}));ok(r.d&&r.p&&r.t==='Sire, die Monster greifen an. Nehmt Eure Dolche. Wir müssen uns aufrüsten!','Neues Spiel beginnt mit dem Begrüßungsfenster',r.t);await p.click('#dlg-0');ok(!(await vis('menu'))&&await E(()=>__bw.slot()===0&&!__bw.state().paused),'Neues Spiel in Platz 1 läuft');
// Waffenfenster
r=await E(()=>[...document.getElementById('winfo').children].map(x=>x.textContent).join('|'));ok(r==='Dolche Lvl 1|Schaden 9|alle 2,0 s|Neu ab Lvl 5','Infozeile: Waffe, Schaden, Tempo, nächste Fähigkeit',r);
r=await E(()=>{const w=document.getElementById('winfo'),b=document.getElementById('bar').getBoundingClientRect(),i=w.getBoundingClientRect(),k=document.querySelector('.wps').getBoundingClientRect();return [i.top>k.bottom,w.scrollWidth<=w.clientWidth+1,parseFloat(getComputedStyle(w).fontSize)]});ok(r[0]&&r[1]&&r[2]>=11,'Infozeile steht unter den Waffen, passt in die Breite und ist lesbar groß',r[2]+' px');
r=await E(()=>['sword','star','bow','wand'].map(w=>document.querySelector('#wp-'+w+' .badge').textContent).join('|'));ok(r==='5|10|40|75','Gesperrte Waffen zeigen ihren Preis',r);
// Angriffsgeschwindigkeit
r=await E(()=>{const S=__bw.S,o={};for(const w of['sword','dagger','star']){o[w]=[1,50.5,100].map(l=>{S.lv[w]=l;return +__bw.cdOf(w).toFixed(3)});S.lv[w]=1}return o});
ok(JSON.stringify(r)==='{"sword":[3.5,2,0.5],"dagger":[2,1.15,0.3],"star":[5,3,1]}','Tempo linear: Schwert 3,5→0,5 · Dolche 2,0→0,3 · Morgenstern 5,0→1,0',JSON.stringify(r));
r=await E(()=>{const S=__bw.S;let good=true,prev=9;for(let l=1;l<=100;l++){S.lv.dagger=l;const c=__bw.cdOf('dagger');if(!(c<prev))good=false;prev=c}S.lv.dagger=1;return good});ok(r,'Tempo wird mit jedem Level stetig schneller');
r=await E(()=>{const g=__bw;g.S.lv.dagger=100;g.hud();const t=[...document.getElementById('winfo').children].map(x=>x.textContent).join('|');g.S.lv.dagger=1;g.hud();return t});ok(r==='Dolche Lvl 100|Schaden 89|alle 0,3 s|MAX','Infozeile auf Lvl 100',r);
// Dauerfeuer
r=await E(()=>{const g=__bw;g.ready();const a=g.state().atkCount;g.hold({x:100,y:300});g.step(8);const n=g.state().atkCount-a;g.hold(null);g.step(8);return [n,g.state().atkCount-a]});
ok(r[0]===4&&r[1]===4,'Finger halten: Dauerfeuer im Takt des Cooldowns (Dolche alle 2 s), Loslassen stoppt',r);
await p.mouse.move(120,330);await p.mouse.down();await p.waitForTimeout(150);r=await E(()=>__bw.state().atkCount);await p.mouse.up();ok(r>=4,'Echter Finger-Druck löst Angriff aus',r);
// Pause
await p.click('#b-pause');ok(await vis('pausep')&&await E(()=>__bw.state().paused),'Pause-Knopf hält das Spiel an');
t0=await E(()=>__bw.state().t);await p.waitForTimeout(300);ok(await E(()=>__bw.state().t)===t0,'In der Pause läuft keine Spielzeit');
await p.click('#p-snd');r=await E(()=>[__bw.DB.opts.mute,document.getElementById('p-snd').textContent]);ok(r[0]===true&&r[1]==='Ton: aus','Ton lässt sich ausschalten',r);
await p.click('#p-vib');r=await E(()=>[__bw.DB.opts.vib,document.getElementById('p-vib').textContent]);ok(r[0]===false&&r[1]==='Vibration: aus','Vibration lässt sich ausschalten',r);
await p.click('#p-snd');await p.click('#p-resume');ok(!(await vis('pausep'))&&await E(()=>!__bw.state().paused),'Weiter setzt das Spiel fort');
// Tempo x2
const rate=async()=>{const a=await E(()=>[__bw.state().t,performance.now()]);await p.waitForTimeout(1200);const c=await E(()=>[__bw.state().t,performance.now()]);return (c[0]-a[0])/((c[1]-a[1])/1000)};
const r1=await rate();await p.click('#b-speed');const r2=await rate();ok(r2/r1>1.7&&r2/r1<2.3,'Tempo x2 verdoppelt die Spielgeschwindigkeit',(r2/r1).toFixed(2));
ok(await E(()=>document.getElementById('b-speed').textContent)==='x2','Tempo-Knopf zeigt x2');await p.click('#b-speed');
// Wellen-Fortschritt + Welle halten
const win=()=>E(()=>{const g=__bw;g.step(3);g.clear();g.step(.1);return {w:g.S.wave,gold:g.S.gold,c:g.S.cleared}});
r=await E(()=>{const g=__bw;g.step(3);const el=document.getElementById('wprog');g.ens().forEach(e=>e.sp=0);const a=parseFloat(el.style.width);const e=g.ens()[0];e.hp=1;g.ready();g.attack(e.x,e.y);g.step(.3);return [a,parseFloat(el.style.width)]});
ok(r[1]>r[0],'Wellen-Fortschritt steigt mit besiegten Gegnern',r.join(' → ')+' %');
await p.click('#b-hold');ok(await E(()=>__bw.S.hold&&document.getElementById('b-hold').getAttribute('aria-pressed')==='true'),'Welle halten eingeschaltet');
r=await win();ok(r.w===1&&r.gold===2&&r.c===1,'Welle halten: Welle bleibt, +2 Gold',JSON.stringify(r));
r=await win();ok(r.w===1&&r.gold===4,'Welle halten: Wiederholung gibt wieder Gold',JSON.stringify(r));
ok(await E(()=>!document.getElementById('wup').disabled),'Pfeil hoch nach gehaltener Welle frei');
await p.click('#b-hold');r=await win();ok(r.w===2,'Welle halten aus: es geht wieder weiter',r.w);
// Fähigkeiten-Übersicht
await E(()=>{__bw.S.lv.dagger=27;__bw.hud()});
const bb=await p.locator('#wp-dagger').boundingBox();await p.mouse.move(bb.x+20,bb.y+20);await p.mouse.down();await p.waitForTimeout(650);await p.mouse.up();
r=await E(()=>({v:!document.getElementById('abil').hidden,n:document.querySelectorAll('.ab').length,on:document.querySelectorAll('.ab.on').length,t:document.getElementById('abiltitle').textContent,p:__bw.state().paused}));
ok(r.v&&r.n===13&&r.on===5&&r.p,'Lange drücken zeigt 13 Stufen, 5 davon frei bei Lvl 27',JSON.stringify(r));await p.screenshot({path:'abil.png'});
await p.click('#abil-close');ok(!(await vis('abil'))&&await E(()=>!__bw.state().paused),'Übersicht schließen setzt fort');
const bd=await p.locator('#wp-sword').boundingBox();await p.mouse.move(bd.x+20,bd.y+20);await p.mouse.down();await p.waitForTimeout(650);await p.mouse.up();
r=await E(()=>({on:document.querySelectorAll('.ab.on').length,a:__bw.S.active,t:document.getElementById('abiltitle').textContent}));ok(r.on===0&&r.a==='dagger'&&r.t==='Schwert · gesperrt','Übersicht auch für gesperrte Waffe, ohne sie zu wählen',JSON.stringify(r));await p.click('#abil-close');
await p.click('#wp-dagger');ok(!(await vis('abil')),'Kurzes Tippen öffnet die Übersicht nicht');
// Zurück-Taste
await E(()=>__back());ok(await vis('pausep'),'Zurück-Taste im Spiel öffnet Pause');await E(()=>__back());ok(!(await vis('pausep')),'Zurück-Taste in der Pause setzt fort');
// Spielstände
await E(()=>{__bw.S.gold=7;__bw.S.lv.sword=12;__bw.S.cleared=5;__bw.S.wave=4;__bw.save()});
await p.click('#b-pause');await p.click('#p-menu');ok(await vis('menu')&&await E(()=>__bw.slot()===-1),'Hauptmenü aus der Pause erreichbar');
ok(await E(()=>!document.getElementById('m-load').disabled),'Spiel laden jetzt aktiv');
await p.click('#m-load');r=await E(()=>[...document.querySelectorAll('.slot')].map(x=>x.querySelector('span').textContent+(x.disabled?'(aus)':'')).join('|'));
ok(r==='Welle 4 · 7 Gold · Schwert 12|Leer(aus)','Laden zeigt Platz 1 mit Inhalt, Platz 2 leer und gesperrt',r);await p.screenshot({path:'slots.png'});
await p.click('#m-back');await p.click('#m-start');await p.click('#slot-1');await dismiss();r=await E(()=>({s:__bw.slot(),g:__bw.S.gold,l:__bw.S.lv.sword,w:__bw.S.wave}));ok(r.s===1&&r.g===0&&r.l===1&&r.w===1,'Neues Spiel in Platz 2 startet leer',JSON.stringify(r));
await E(()=>{__bw.S.gold=3;__bw.save();__bw.showMenu()});await p.click('#m-load');await p.click('#slot-0');ok(await E(()=>document.getElementById('dialog').hidden),'Beim Laden erscheint kein Begrüßungsfenster');r=await E(()=>({s:__bw.slot(),g:__bw.S.gold,l:__bw.S.lv.sword,w:__bw.S.wave}));ok(r.s===0&&r.g===7&&r.l===12&&r.w===4,'Platz 1 unverändert geladen',JSON.stringify(r));
await E(()=>__bw.showMenu());await p.click('#m-start');await p.click('#slot-0');r=await E(()=>({m:!document.getElementById('menu').hidden,t:document.querySelector('#slot-0 span').textContent}));ok(r.m&&r.t.startsWith('Überschreiben?'),'Belegter Platz fragt vor dem Überschreiben nach',r.t);
await p.click('#m-back');await p.click('#m-load');await p.click('#slot-1');ok(await E(()=>__bw.S.gold===3),'Abbrechen überschreibt nichts, Platz 2 lädt');
await E(()=>__bw.showMenu());await p.click('#m-start');await p.click('#slot-0');await p.click('#slot-0');await dismiss();r=await E(()=>({s:__bw.slot(),g:__bw.S.gold,l:__bw.S.lv.sword}));ok(r.s===0&&r.g===0&&r.l===1,'Zweites Tippen überschreibt Platz 1',JSON.stringify(r));
await p.goto(url);await p.waitForTimeout(200);r=await E(()=>({a:__bw.DB.slots.map(x=>x&&x.gold),v:__bw.DB.opts.vib}));ok(JSON.stringify(r.a)==='[0,3]'&&r.v===false,'Beide Spielstände und Einstellungen überstehen einen Neustart',JSON.stringify(r));
// Migration
await E(()=>{localStorage.clear();localStorage.setItem('burgwacht-v2',JSON.stringify({lv:{sword:9,dagger:2,star:1},xp:{sword:1,dagger:0,star:0},wave:3,active:'sword',gold:4,cleared:3,heal:1,own:{dagger:true,star:false,soldier:true}}))});
await p.goto(url);await p.waitForTimeout(200);await p.click('#m-load');r=await E(()=>document.querySelector('#slot-0 span').textContent);ok(r==='Welle 3 · 4 Gold · Dolche 2 · Schwert 9','Alter Spielstand wandert in Platz 1 und behält das Schwert',r);
// Exit in der App
const p2=await ctx.newPage();await p2.addInitScript(()=>{window.__exited=0;window.Android={exit(){window.__exited++}}});await p2.goto(url);await p2.waitForTimeout(200);
ok(await p2.evaluate(()=>!document.getElementById('m-exit').hidden),'In der App ist Exit sichtbar');await p2.click('#m-exit');ok(await p2.evaluate(()=>window.__exited)===1,'Exit ruft das Schließen der App auf');
await p2.evaluate(()=>__back());ok(await p2.evaluate(()=>window.__exited)===2,'Zurück-Taste im Hauptmenü schließt die App');await p2.close();
// Belastung
await p.click('#slot-0');
for(const w of['sword','dagger','star','bow','wand']){
  r=await p.evaluate(w=>{const g=__bw,S=g.S;S.own.dagger=S.own.star=S.own.bow=S.own.wand=S.own.soldier=true;S.active=w;S.lv[w]=100;S.cleared=60;S.wave=40;g.hud();g.clear();g.setHp(10);
    let mx={p:0,z:0,f:0,e:0},t0=performance.now(),n=0,k=0;
    for(let i=0;i<60*40;i++){if(i%20===0&&g.state().enemies<60){g.spawn(i%100===0?'boss':i%3?'slime':'ogre')}
      if(g.state().paused)break;const en=g.ens();const t=en[(i*7)%Math.max(1,en.length)];g.hold(t?{x:t.x,y:t.y}:{x:100,y:300});g.setHp(10);g.step(1/60);n++;
      const q=g.state();mx.p=Math.max(mx.p,q.projs);mx.z=Math.max(mx.z,q.zones);mx.f=Math.max(mx.f,q.fx);mx.e=Math.max(mx.e,q.enemies)}
    g.hold(null);return {mx,ms:(performance.now()-t0)/n,n,atk:g.state().atkCount,lv:S.lv[w]}},w);
  ok(r.n===2400&&r.mx.p<400&&r.mx.z<80&&r.mx.f<400&&r.ms<4,`${w} Lvl 100: 40 s Dauerfeuer stabil`,`max. Geschosse ${r.mx.p}, Zonen ${r.mx.z}, Effekte ${r.mx.f}, ${r.ms.toFixed(2)} ms Logik pro Bild`);
}
await p.waitForTimeout(400);await p.evaluate(()=>{const g=__bw;for(let i=0;i<20;i++)g.spawn('slime');g.step(6);const e=g.ens()[0];g.hold({x:e.x,y:e.y});g.step(1.2);g.hold(null)});
const f=await p.evaluate(()=>new Promise(res=>{let n=0,t0=performance.now();const g=__bw;const tick=()=>{const e=g.ens()[0];g.hold(e?{x:e.x,y:e.y}:{x:100,y:300});n++;if(performance.now()-t0<2000)requestAnimationFrame(tick);else{g.hold(null);res(n/2)}};requestAnimationFrame(tick)}));
ok(f>40,'Bildrate bei Lvl-100-Dauerfeuer (Emulator ohne Grafikkarte)',f.toFixed(0)+' Bilder/s');
await p.screenshot({path:'stress.png'});
await p.evaluate(()=>{const g=__bw;g.S.lv={sword:14,dagger:6,star:3};g.S.wave=7;g.S.gold=12;g.clear();g.hud()});await p.waitForTimeout(300);await p.screenshot({path:'game3.png'});
ok(errs.length===0,'Keine Laufzeitfehler im gesamten Lauf',errs.slice(0,3));
console.log(fails?('FEHLER: '+fails):'ALLE TESTS BESTANDEN');await b.close()})();
