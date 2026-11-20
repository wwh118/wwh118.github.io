(()=>{'use strict';
const story=document.querySelector('.scroll-story'),layers=[...document.querySelectorAll('.scene-layer')],buttons=[...document.querySelectorAll('.time-button')],header=document.querySelector('.timeline'),ending=document.querySelector('.ending'),bubbles=[...document.querySelectorAll('.bubble')],strip=document.querySelector('.ending-strip'),eggs=document.querySelector('.eggs-continuous');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=t=>t*t*(3-2*t),N=layers.length;let raf=0;
function update(){raf=0;const y=window.scrollY,vh=window.innerHeight,top=story.getBoundingClientRect().top+y,range=Math.max(1,story.offsetHeight-vh),p=clamp((y-top)/range);
// 헤더와 첫 장면은 동일한 진행률로 동시에 내려오며, 첫 장면은 다시 사라지지 않는다.
const enter=smooth(clamp((y-top+vh*.015)/(vh*.23)));const inStory=y>=top-vh*.02&&y<top+story.offsetHeight-vh*.03;
header.style.transform=`translateY(${-105*(1-enter)}%)`;header.style.opacity=inStory?enter:0;header.style.pointerEvents=inStory?'auto':'none';
const position=p*N,idx=Math.min(N-1,Math.floor(position));
// 각 장면은 한 번만 아래로 내려오며 나타난다. 장면 경계에서
// 이전 장면과 다음 장면의 상태를 같은 연속 좌표로 계산해 깜빡임을 방지한다.
const arrivalDuration=.18; // 장면별 등장 시간을 늘려 천천히 내려오도록 조정
layers.forEach((el,i)=>{
  const arriving=i===0?enter:smooth(clamp((position-i)/arrivalDuration));
  const leaving=i===N-1?0:smooth(clamp((position-(i+1))/arrivalDuration));
  const opacity=arriving*(1-leaving);
  const dy=-55*(1-arriving)-18*leaving;
  el.style.opacity=opacity;
  el.style.transform=`translateY(${dy}px)`;
});
buttons.forEach((b,i)=>{b.classList.toggle('active',i===idx);if(i===idx)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
const eTop=ending.getBoundingClientRect().top+y,eRange=Math.max(1,ending.offsetHeight-vh),ep=clamp((y-eTop)/eRange);
// 말풍선은 첫 화면에만 속하므로 두 번째 화면으로 넘어갈 때 함께 위로 사라진다.
bubbles.forEach((b,i)=>{const t=smooth(clamp((ep-(.035+i*.115))/.09));b.style.opacity=t;b.style.transform=`translate(-50%,${70*(1-t)}px)`;});
// 0~0.43: 말풍선 순차 등장 및 유지 / 0.43~1: 두 PNG가 겹치지 않고 연속해서 위로 이동.
// 세 말풍선이 모두 내려온 후에만 계란이 나타난다.
// 계란은 strip의 자식으로 함께 이동하므로 화면에 고정되지 않는다.
const eggRise=smooth(clamp((ep-.43)/.23));
eggs.style.opacity=eggRise;
eggs.style.transform=`translateY(${110*(1-eggRise)}px)`;
const travel=smooth(clamp((ep-.43)/.57));strip.style.transform=`translateY(${-50*travel}%)`;

}
function request(){if(!raf)raf=requestAnimationFrame(update)}
buttons.forEach((b,i)=>b.addEventListener('click',()=>{const top=story.getBoundingClientRect().top+window.scrollY,range=story.offsetHeight-window.innerHeight;window.scrollTo({top:top+range*((i+.24)/N),behavior:'instant'});request()}));
window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',request);window.addEventListener('load',request);request();})();