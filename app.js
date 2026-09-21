'use strict';
const $=id=>document.getElementById(id);
const canvas=$('wheel'),ctx=canvas.getContext('2d');
const colors=['#ffc94f','#579ee5','#f18d81','#70bdab','#ae98db','#edaa61','#81bad0','#bed276'];
const initialChoices=['1','2','3','4','5','6'];
let choices=[],angle=0,busy=false,audioContext;
const parse=text=>text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const color=i=>colors[i%colors.length];
function draw(list=choices){
 ctx.clearRect(0,0,1000,1000);const n=list.length;
 if(!n){ctx.fillStyle='#d8e1ef';ctx.beginPath();ctx.arc(500,500,500,0,Math.PI*2);ctx.fill();return;}
 const step=Math.PI*2/n;
 for(let i=0;i<n;i++){
  const start=angle-Math.PI/2+i*step;
  ctx.beginPath();ctx.moveTo(500,500);ctx.arc(500,500,499,start,start+step);ctx.closePath();ctx.fillStyle=color(i);ctx.fill();
  if(n>1){ctx.strokeStyle='#ffffff90';ctx.lineWidth=3;ctx.stroke();}
  ctx.save();ctx.translate(500,500);ctx.rotate(start+step/2);ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle='#152b46';
  const size=Math.max(12,Math.min(34,600/n));ctx.font=`700 ${size}px "Yu Gothic",Meiryo,sans-serif`;
  let label=list[i];while(ctx.measureText(label).width>300&&label.length>1)label=label.slice(0,-1);if(label!==list[i])label=label.slice(0,-1)+'…';
  if(n<=120)ctx.fillText(label,448,0);ctx.restore();
 }
}
function update(){
 const n=choices.length;$('count').textContent=`${n} 項目`;$('remaining').textContent=`${n} 項目`;
 $('wheelButton').disabled=busy||n===0;$('entries').disabled=busy;$('clear').disabled=busy;$('reset').disabled=busy;$('removeWinner').disabled=busy;
 $('hub').firstChild.textContent=busy?'抽選中':n?'まわす':'入力してね';
 $('chips').replaceChildren();choices.forEach((name,i)=>{
  const chip=document.createElement('span');chip.className='chip';
  const dot=document.createElement('span');dot.className='dot';dot.style.background=color(i);
  const label=document.createElement('span');label.className='name';label.textContent=name;label.title=name;
  const remove=document.createElement('button');remove.textContent='×';remove.type='button';remove.disabled=busy;remove.setAttribute('aria-label',`${name}を削除`);
  remove.onclick=()=>{choices.splice(i,1);sync();$('status').textContent='選択肢を変更しました';};
  chip.append(dot,label,remove);$('chips').append(chip);
 });
}
function sync(){angle=0;$('entries').value=choices.join('\n');update();draw();if(!choices.length)$('status').textContent='右の入力欄に選択肢を入れてください';}
function tone(freq,duration,volume=.035){
 if(!$('sound').checked||!audioContext||audioContext.state!=='running')return;
 const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;
 osc.connect(gain);gain.connect(audioContext.destination);osc.frequency.value=freq;osc.type='sine';gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.start(now);osc.stop(now+duration);
}
function randomIndex(n){const max=4294967296,limit=max-max%n,a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
async function spin(){
 if(busy||!choices.length)return;
 busy=true;update();$('status').textContent='どれに当たるかな…';
 try{if($('sound').checked){audioContext??=new(window.AudioContext||window.webkitAudioContext)();await audioContext.resume();}}catch{}
 const list=[...choices],n=list.length,winner=randomIndex(n),step=Math.PI*2/n;
 const start=angle,target=(Math.PI*2-(winner+.5)*step)%(Math.PI*2),delta=Math.PI*2*6+(target-start%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
 const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?150:4300;
 let began=null,lastTick=-1;
 function frame(time){
  began??=time;const t=Math.min(1,(time-began)/duration);angle=start+delta*(1-Math.pow(1-t,4));draw(list);
  const tick=Math.floor(angle/step);if(tick!==lastTick){tone(720,.035,.025);lastTick=tick;}
  if(t<1){requestAnimationFrame(frame);return;}
  $('winner').textContent=list[winner];$('status').textContent=`「${list[winner]}」が当たりました`;
  const removed=$('removeWinner').checked;if(removed)choices.splice(winner,1);
  $('resultNote').textContent=removed?(choices.length?'この項目を除外しました。残り '+choices.length+' 項目です。':'すべての抽選が終わりました。リセットでまた始められます。'): 'もう一度、ルーレットを回せます。';
  $('entries').value=choices.join('\n');update();$('result').showModal();$('continue').focus();
  [523,659,784].forEach((freq,i)=>setTimeout(()=>tone(freq,.24,.05),i*120));
 }
 requestAnimationFrame(frame);
}
$('entries').addEventListener('input',()=>{choices=parse($('entries').value);angle=0;update();draw();$('status').textContent=choices.length?'ルーレットを押してスタート':'選択肢を入力してください';});
$('wheelButton').addEventListener('click',spin);
$('reset').onclick=()=>{choices=[...initialChoices];$('sound').checked=true;$('removeWinner').checked=false;$('winner').textContent='';$('resultNote').textContent='';sync();$('status').textContent=choices.length?'リセットしました。もう一度どうぞ！':'選択肢を入力してください';};
$('clear').onclick=()=>{choices=[];sync();$('entries').focus();};
$('continue').onclick=()=>$('result').close();
$('result').addEventListener('close',()=>{busy=false;angle=0;update();draw();$('status').textContent=choices.length?'ルーレットを押してスタート':'すべての抽選が終わりました。新しい選択肢を入力してください。';$('wheelButton').focus();});
choices=parse($('entries').value);sync();
