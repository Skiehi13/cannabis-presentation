// --- basic slide state ---
const slides = [...document.querySelectorAll(".slide")];
let i = 0;

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const fsBtn   = document.getElementById("fsToggle");
const timerBtn= document.getElementById("timerToggle");
const clock   = document.getElementById("clock");
const bar     = document.getElementById("progressBar");

// Durations (seconds) from data-duration
const durations = slides.map(s => Number(s.dataset.duration || 40));
const total = durations.reduce((a,b)=>a+b,0);

function setProgress() {
  const elapsed = durations.slice(0,i).reduce((a,b)=>a+b,0);
  bar.style.width = `${(elapsed/total)*100}%`;
}

function show(k){
  slides[i].classList.remove("current");
  i = (k + slides.length) % slides.length;
  slides[i].classList.add("current");
  setProgress();
}
function next(){ show(i+1); }
function prev(){ show(i-1); }

document.addEventListener("keydown", (e)=>{
  if(e.key==="ArrowRight"||e.key===" ") next();
  if(e.key==="ArrowLeft") prev();
  if(e.key.toLowerCase()==="f") toggleFS();
  if(e.key.toLowerCase()==="t") toggleTimer();
  if(e.key.toLowerCase()==="g") toggleGlossary(true);
});
prevBtn.onclick=prev; nextBtn.onclick=next;
fsBtn.onclick=toggleFS; timerBtn.onclick=toggleTimer;

// --- fullscreen ---
function toggleFS(){
  const el = document.documentElement;
  if(!document.fullscreenElement){ el.requestFullscreen?.(); }
  else { document.exitFullscreen?.(); }
}

// --- simple timer ---
let t0 = null, ticking = false, rafId=null;
function renderClock(){
  if(!ticking) return;
  const secs = Math.floor((performance.now()-t0)/1000);
  const m = String(Math.floor(secs/60)).padStart(2,"0");
  const s = String(secs%60).padStart(2,"0");
  clock.textContent = `${m}:${s}`;
  rafId = requestAnimationFrame(
