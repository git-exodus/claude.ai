const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:360,height:740}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const url='file://'+require('path').resolve(__dirname,'../android/app/src/main/assets/index.html');await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.goto(url);await p.click('#m-start');await p.click('#slot-0');
for(const wave of[50,100]){console.log('--- Welle '+wave+' ---');
 for(const w of['sword','dagger','star','bow','wand']){const runs=[];
  for(let k=0;k<3;k++){runs.push(await p.evaluate(([w,wave])=>{const g=__bw,S=g.S;Object.assign(S.own,{dagger:true,star:true,bow:true,wand:true,soldier:false});S.lv={sword:1,dagger:1,star:1,bow:1,wand:1};S.lv[w]=100;S.xp[w]=0;
    S.active=w;S.wall=0;S.wallHp=0;S.cleared=200;S.wave=wave;S.hold=true;g.save();g.showMenu();g.startGame(0,false);const tot=g.state().queue;
    let t=0,leaks=0,peak=0;const c=g.pos();
    while(t<300){const en=g.ens();let best=null,bd=1e9;for(const e of en){if(e.dead)continue;const d=Math.hypot(e.x-c.cx,e.y-c.cy);if(d<bd){bd=d;best=e}}
      g.hold(best?{x:best.x,y:best.y}:null);g.setHp(10);g.step(1/60);t+=1/60;const st=g.state();if(st.paused)break;leaks+=10-st.hp;peak=Math.max(peak,st.enemies);
      if(st.queue===0&&st.enemies===0&&t>3)break;if(st.pause>2&&t>5)break}
    g.hold(null);return {tot,t,leaks,peak}},[w,wave]))}
  const av=k=>runs.reduce((a,r)=>a+r[k],0)/runs.length;
  console.log(w.padEnd(7),'Gegner',runs[0].tot,'| Dauer',av('t').toFixed(0).padStart(4),'s | durchgekommen',av('leaks').toFixed(0).padStart(4),'| max. gleichzeitig',av('peak').toFixed(0).padStart(4))}}
console.log('errors',errs.slice(0,3));await b.close()})();
