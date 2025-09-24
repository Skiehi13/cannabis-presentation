// --- slide state ---
const slides = [...document.querySelectorAll(".slide")];
let i = 0;

// keyboard + buttons
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const fsBtn   = document.getElementById("fsToggle");
const notesBtn= document.getElementById("notesToggle");
const timerBtn= document.getElementById("timerToggle");
const clock   = document.getElementById("clock");
const bar     = document.getElementById("progressBar");
let showingNotes = false;

// durations (seconds) from data-duration
const durations = slides.map(s => Number(s.dataset.duration || 40));
const total = durations.reduce((a,b)=>a+b,0);

// progress helper
function setProgress() {
  const elapsed = durations.slice(0,i).reduce((a,b)=>a+b,0);
  bar.style.width = `${(elapsed/total)*100}%`;
}

function show(k){
  slides[i].classList.remove("current");
  i = (k + slides.length) % slides.length;
  slides[i].classList.add("current");
  setProgress();
  if(showingNotes) toggleNotes(true); // refresh text
}

function next(){ show(i+1); }
function prev(){ show(i-1); }

document.addEventListener("keydown", (e)=>{
  if(e.key==="ArrowRight"||e.key===" ") next();
  if(e.key==="ArrowLeft") prev();
  if(e.key.toLowerCase()==="f") toggleFS();
  if(e.key.toLowerCase()==="n") toggleNotes();
  if(e.key.toLowerCase()==="t") toggleTimer();
});
prevBtn.onclick=prev; nextBtn.onclick=next;
fsBtn.onclick=toggleFS; notesBtn.onclick=()=>toggleNotes();
timerBtn.onclick=()=>toggleTimer();

function toggleFS(){
  const el = document.documentElement;
  if(!document.fullscreenElement){ el.requestFullscreen?.(); }
  else { document.exitFullscreen?.(); }
}

// notes bubble
function toggleNotes(forceShow){
  const cur = slides[i];
  let bubble = cur.querySelector(".notes");
  if(!bubble) return;
  // move bubble to body for fixed positioning
  if(forceShow && !bubble.classList.contains("show")){
    bubble.classList.add("show");
    document.body.appendChild(bubble);
    showingNotes = true;
    return;
  }
  if(bubble.classList.contains("show")){
    bubble.classList.remove("show");
    showingNotes = false;
  } else {
    bubble.classList.add("show");
    document.body.appendChild(bubble);
    showingNotes = true;
  }
}

// simple timer
let t0 = null, ticking = false, rafId=null;
function renderClock(){
  if(!ticking) return;
  const secs = Math.floor((performance.now()-t0)/1000);
  const m = String(Math.floor(secs/60)).padStart(2,"0");
  const s = String(secs%60).padStart(2,"0");
  clock.textContent = `${m}:${s}`;
  rafId = requestAnimationFrame(renderClock);
}
function toggleTimer(){
  if(!ticking){ t0 = performance.now(); ticking = true; renderClock(); }
  else { ticking = false; cancelAnimationFrame(rafId); }
}

// init
setProgress();
document.getElementById("deck").focus();
