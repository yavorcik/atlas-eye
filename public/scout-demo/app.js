import { cues, duration } from "./cues.js";
const byId = id => document.getElementById(id);
const audio = byId('narration'), play = byId('play'), restart = byId('replay'), sound = byId('sound');
const captions = byId('words'), stage = byId('stage'), progress = byId('progress');
const steps = Array.from(document.querySelectorAll('[data-step]'));
const demo = [
 {title:'Meet Jamie Rivera.',sub:'A fictional client has started a Chapter 7 intake.',label:'Client intake'},
 {title:'Scout asks the next question.',sub:'The client mentioned a vehicle with shared ownership.',label:'Follow-up'},
 {title:'Scout checks the uploads.',sub:'Five sample pay stubs were requested for this intake.',label:'Document check'},
 {title:'The handoff is ready. Intake isn’t complete.',sub:'The paralegal sees what came in, what’s missing, and what needs counsel.',label:'Staff handoff'}
];
const msg = (label, value, scout=false) => '<div class="message reveal'+(scout?' scout':'')+'"><span>'+label+'</span><p>'+value+'</p></div>';
const inputs = [
 ['',msg('JAMIE · CLIENT','“I own a car with my sister, and I uploaded the pay stubs I could find.”')],
 [msg('SCOUT','“Whose names are on the title? Is there a loan on the car?”',true),msg('JAMIE · CLIENT','“Both names are on the title. There is a loan, but I don’t know the balance.”')+msg('ATTORNEY REVIEW','Shared title and unconfirmed loan balance. No conclusion about how to treat the vehicle.',true)],
 ['<div class="tiles reveal"><div class="tile good"><strong>3 received</strong><p>Sep 4, Sep 18, Oct 2</p></div><div class="tile"><strong>5 requested</strong><p>Sample intake checklist</p></div><div class="tile review"><strong>2 not found</strong><p>Confirm against the checklist</p></div></div>',msg('MISSING · FOLLOW UP','Please send the pay stubs dated October 16 and October 30.',true)],
 ['<div class="tiles reveal"><div class="tile good"><strong>Received</strong><p>Three pay stubs and the client’s vehicle answers.</p></div><div class="tile review"><strong>Still needed</strong><p>Two pay stubs: October 16 and October 30.</p></div><div class="tile review"><strong>Attorney review</strong><p>Joint title and unconfirmed loan balance.</p></div></div>','<div class="actions reveal"><details><summary>Preview document request</summary><p>Jamie, please send the pay stubs dated October 16 and October 30.</p></details><details><summary>Preview attorney note</summary><p>Client reports joint title with sister and an outstanding loan. Balance unconfirmed. Please review how to handle the vehicle.</p></details></div>']
];
const starts = demo.map((_,i)=>cues.find(c=>c.stage===i).at);
let last = -2, active = false, finished = false, fallback = false, fallbackAt = 0, anchor = 0, raf = 0;
const now = () => performance.now()/1000;
const t = () => fallback ? Math.min(duration,fallbackAt+(active?now()-anchor:0)) : audio.currentTime;
const fmt = seconds => Math.floor(seconds/60)+':'+String(Math.floor(seconds)%60).padStart(2,'0');
const total = Math.round(duration);
byId('total').textContent = fmt(total);
progress.max = duration;
function paint(time, force=false) {
 let index = cues.findLastIndex(c=>c.at<=time);
 if(index<0)index=0;
 byId('elapsed').textContent = fmt(time>=duration-.05?total:time);
 progress.value = time;
 if(index===last&&!force)return;
 const c = cues[index], view = demo[c.stage];
 const newStage = last<0 || c.stage !== cues[last].stage || force;
 if(newStage) {
   steps.forEach((button,i)=>i===c.stage?button.setAttribute('aria-current','step'):button.removeAttribute('aria-current'));
   byId('view').textContent = c.stage===3?'Paralegal view':'Client view';
   stage.innerHTML = '<div class="stage-kicker">0'+(c.stage+1)+' / '+view.label.toUpperCase()+'</div><h2>'+view.title+'</h2><p class="stage-sub">'+view.sub+'</p><div id="scene-content"></div>';
   byId('status').textContent = 'Chapter '+(c.stage+1)+': '+view.label;
 }
 const count = c.action===cues.find(a=>a.stage===c.stage).action?1:2;
 byId('scene-content').innerHTML = inputs[c.stage].slice(0,count).join('');
 if(c.action==='missing') stage.querySelector('.review p').textContent = 'Oct 16 and Oct 30';
 if(c.action==='decision' && active) {
   const preview = stage.querySelector('details');
   if(preview) preview.open=true;
 }
 captions.textContent = c.text;
 last=index;
}
function controls(){
 play.textContent = active?'Pause':finished?'Replay demo':(t()>0||last>=0?'Resume demo':'Start narrated demo');
 restart.disabled = t()===0 && last<0 && !active;
 sound.disabled=fallback;
 sound.textContent=fallback?'Captions only':audio.muted?'Sound off':'Sound on';
 sound.setAttribute('aria-pressed',String(audio.muted||fallback));
}
function done(){
 active=false; finished=true;
 if(fallback)fallbackAt=duration;
 paint(duration);
 cancelAnimationFrame(raf);
 controls();
 byId('status').textContent = 'Demo finished. Explore the two handoff previews or replay.';
}
function frame(){
 const time=t();
 paint(time);
 if(time>=duration || audio.ended&&!fallback){done();return;}
 if(active)raf=requestAnimationFrame(frame);
}
function captionsOnly(){
 if(fallback)return;
 fallbackAt=audio.currentTime || 0; anchor=now(); fallback=true; audio.pause();
 byId('status').textContent='Audio unavailable. The walkthrough will continue with captions.';
 controls();
}
async function start(){
 if(active)return;
 if(finished){jump(0);finished=false;}
 active=true;
 if(fallback){anchor=now();}
 else {
  try{ await audio.play(); }catch(e){ if(active && e.name!=='AbortError')captionsOnly(); }
 }
 if(active){paint(t());cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}
 controls();
}
function stop(){
 if(fallback)fallbackAt=t();else audio.pause();
 active=false; cancelAnimationFrame(raf); controls();
}
function jump(time) {
 finished=false;
 if(fallback){fallbackAt=time;anchor=now();}else{audio.currentTime=time;}
 paint(time,true);controls();
}
play.addEventListener('click',()=>active?stop():start());
restart.addEventListener('click',()=>{jump(0); if(!active)start();});
sound.addEventListener('click',()=>{audio.muted=!audio.muted;controls();});
steps.forEach((b,i)=> b.addEventListener('click',()=>jump(starts[i])));
audio.addEventListener('ended',()=>{if(active&&!fallback)done();});
audio.addEventListener('error',captionsOnly);
