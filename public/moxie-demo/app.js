import { cues, duration } from "./cues.js";
const byId = id => document.getElementById(id);
const audio = byId('narration'), play = byId('play'), restart = byId('replay'), sound = byId('sound');
const captions = byId('words'), stage = byId('stage'), progress = byId('progress');
const steps = Array.from(document.querySelectorAll('[data-step]'));
const demo = [
 {title:'Tomorrow’s follow-up',sub:'Alex has a transplant follow-up tomorrow. This example shows the records Alex would give Moxie permission to read.',label:'Meet Alex',view:'Visit prep'},
 {title:'Two reports, one measure',sub:'Moxie shows the ALT number, unit, and original report date. Those dates are separate from the latest pull.',label:'Read reports',view:'Example reports'},
 {title:'See the numbers side by side',sub:'The dates and units stay attached to their values. No clinical interpretation is added.',label:'Compare values',view:'Lab comparison'},
 {title:'A question for the care team',sub:'Here is one thing Alex can bring to the visit tomorrow.',label:'Prepare a question',view:'Visit question'}
];
const question = 'What does this trend mean for me, and when should we recheck?';
const message = (label, value) => '<div class="message reveal"><span>'+label+'</span><p>'+value+'</p></div>';
const result = (date,value) => '<article class="result"><strong>'+date+'</strong><b class="measure">'+value+' U/L</b><p>ALT · Fictional '+date+' lab report</p></article>';
const reports = '<div class="results reveal">'+result('Nov 1','68')+result('Nov 9','41')+'</div>';
const card = '<div class="question-card reveal"><label for="care-question">Ask the transplant team</label><textarea id="care-question" rows="2" readonly>'+question+'</textarea><button id="copy-question" type="button">Copy question</button></div>';
const connection = '<aside class="connection reveal" aria-label="Simulated connection details"><div><strong>Simulated MyChart connection</strong><span>Example permission: read-only · Alex Morgan’s record</span></div><div><strong>Example latest pull</strong><span>Nov 10, 9:15 a.m. ET</span></div></aside>';
const screens = {
 welcome:connection+message('Alex · Example patient','“I have two reports. What should I ask at my visit?”'),
 question:connection+message('Moxie · Visit prep','“Let’s keep the dates and values together so you know what to bring up.”'),
 first:connection+'<div class="results reveal">'+result('Nov 1','68')+'</div>',
 second:connection+reports,
 compare:reports,
 limits:reports+message('What Moxie doesn’t do','Moxie doesn’t decide what the change means or recommend a care decision.'),
 questionCard:card,
 ready:card
};
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
   byId('view').textContent = view.view;
   stage.innerHTML = '<div class="stage-kicker">0'+(c.stage+1)+' / '+view.label.toUpperCase()+'</div><h2>'+view.title+'</h2><p class="stage-sub">'+view.sub+'</p><div id="scene-content"></div>';
   byId('status').textContent = 'Chapter '+(c.stage+1)+': '+view.label;
 }
 if (c.action!=='ready' || !byId('care-question')) byId('scene-content').innerHTML = screens[c.action] || '';
 captions.textContent = c.text;
 last=index;
}
function controls(){
 play.textContent = active?'Pause':finished?'Replay demo':(t()>0||last>=0?'Resume demo':'Start narrated demo');
 restart.disabled = t()===0 && last<0 && !active;
 sound.disabled=fallback;
 sound.textContent=fallback?'Captions only':audio.muted?'Sound off':'Sound on';
 sound.setAttribute('aria-pressed',String(audio.muted||fallback));
 sound.setAttribute('aria-label',fallback?'Audio unavailable':audio.muted?'Unmute narration':'Mute narration');
}
function done(){
 active=false; finished=true;
 if(fallback)fallbackAt=duration;
 paint(duration);
 cancelAnimationFrame(raf);
 controls();
 byId('status').textContent = 'Demo finished. You can copy the visit question or replay.';
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

stage.addEventListener('click', async event => {
  if (event.target.id!=='copy-question') return;
  const field=byId('care-question');
  try {
    if (!navigator.clipboard) throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(question);
    if(byId('copy-question')===event.target) event.target.textContent='Copied';
    byId('status').textContent='Visit question copied.';
  } catch {
    field.focus();
    field.select();
    byId('status').textContent='Visit question selected. Use your device’s Copy command.';
    if(byId('copy-question')===event.target) event.target.textContent='Question selected';
  }
});
