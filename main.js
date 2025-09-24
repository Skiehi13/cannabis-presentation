// Run after DOM is fully parsed to avoid nulls
window.addEventListener("DOMContentLoaded", function () {
  // --- slide state ---
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  var i = 0;

  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var fsBtn   = document.getElementById("fsToggle");
  var timerBtn= document.getElementById("timerToggle");
  var clock   = document.getElementById("clock");
  var bar     = document.getElementById("progressBar");

  // Durations (seconds) from data-duration
  var durations = slides.map(function(s){ return Number(s.getAttribute("data-duration") || 40); });
  var total = durations.reduce(function(a,b){ return a+b; }, 0);

  function setProgress() {
    var elapsed = durations.slice(0,i).reduce(function(a,b){ return a+b; }, 0);
    bar.style.width = ((elapsed/total)*100) + "%";
  }

  function show(k){
    slides[i].classList.remove("current");
    i = (k + slides.length) % slides.length;
    slides[i].classList.add("current");
    setProgress();
  }
  function next(){ show(i+1); }
  function prev(){ show(i-1); }

  document.addEventListener("keydown", function(e){
    if(e.key==="ArrowRight"||e.key===" ") next();
    if(e.key==="ArrowLeft") prev();
    if(e.key.toLowerCase()==="f") toggleFS();
    if(e.key.toLowerCase()==="t") toggleTimer();
    if(e.key.toLowerCase()==="g") toggleGlossary(true);
  });

  if (prevBtn) prevBtn.onclick = prev;
  if (nextBtn) nextBtn.onclick = next;
  if (fsBtn)   fsBtn.onclick   = toggleFS;
  if (timerBtn)timerBtn.onclick= toggleTimer;

  // --- fullscreen ---
  function toggleFS(){
    var el = document.documentElement;
    if(!document.fullscreenElement && el.requestFullscreen){ el.requestFullscreen(); }
    else if (document.exitFullscreen){ document.exitFullscreen(); }
  }

  // --- simple timer ---
  var t0 = null, ticking = false, rafId=null;
  function renderClock(){
    if(!ticking) return;
    var secs = Math.floor((performance.now()-t0)/1000);
    var m = String(Math.floor(secs/60)).padStart(2,"0");
    var s = String(secs%60).padStart(2,"0");
    clock.textContent = m + ":" + s;
    rafId = requestAnimationFrame(renderClock);
  }
  function toggleTimer(){
    if(!ticking){ t0 = performance.now(); ticking = true; renderClock(); }
    else { ticking = false; cancelAnimationFrame(rafId); }
  }

  // --- Glossary modal & inline defs ---
  var glossary = document.getElementById("glossary");
  var glossaryBtn = document.getElementById("glossaryBtn");
  var closeGloss = glossary ? glossary.querySelector(".close") : null;

  function toggleGlossary(open){
    if(!glossary) return;
    if(open){ glossary.hidden = false; if(glossaryBtn) glossaryBtn.setAttribute("aria-expanded","true"); }
    else { glossary.hidden = true; if(glossaryBtn) glossaryBtn.setAttribute("aria-expanded","false"); }
  }
  if (glossaryBtn) glossaryBtn.addEventListener("click", function(){ toggleGlossary(true); });
  if (closeGloss)  closeGloss.addEventListener("click", function(){ toggleGlossary(false); });
  if (glossary)    glossary.addEventListener("click", function(e){ if(e.target===glossary) toggleGlossary(false); });

  // Inline definition buttons jump to the right term
  var defBtns = document.querySelectorAll(".def");
  for (var d=0; d<defBtns.length; d++){
    defBtns[d].addEventListener("click", function(){
      toggleGlossary(true);
      var id = "g-" + this.getAttribute("data-term");
      setTimeout(function(){
        var el = document.getElementById(id);
        if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
      }, 50);
    });
  }

  // --- SIM: EC -> tonicity/uptake + svg arrows ---
  var ecRange = document.getElementById("ecRange");
  if(ecRange){
    var ecVal = document.getElementById("ecVal");
    var tonicity = document.getElementById("tonicity");
    var uptake = document.getElementById("uptake");
    var arrowsIn  = document.getElementById("arrowsIn");
    var arrowsOut = document.getElementById("arrowsOut");
    var update = function(){
      var ec = Number(ecRange.value);
      ecVal.textContent = ec.toFixed(1);

      // teaching bands
      var t = "isotonic", u = "balanced", inAlpha = 0.9, outAlpha = 0.25;
      if(ec < 1.1){ t = "hypotonic"; u = "water rushes in"; inAlpha = 1; outAlpha = 0.15; }
      else if(ec > 2.0){ t = "hypertonic"; u = "water leaves cells"; inAlpha = 0.15; outAlpha = 1; }
      tonicity.textContent = t;
      uptake.textContent = u;
      if (arrowsIn)  arrowsIn.setAttribute("opacity", String(inAlpha));
      if (arrowsOut) arrowsOut.setAttribute("opacity", String(outAlpha));
    };
    ecRange.addEventListener("input", update);
    update();
  }

  // --- Quiz blocks ---
  var quizzes = document.querySelectorAll(".quiz");
  for (var q=0; q<quizzes.length; q++){
    (function(block){
      var correct = block.getAttribute("data-correct");
      var fb = block.querySelector(".feedback");
      var opts = block.querySelectorAll(".opt");
      for (var k=0; k<opts.length; k++){
        opts[k].addEventListener("click", function(ev){
          ev.preventDefault();
          for (var m=0; m<opts.length; m++){ opts[m].classList.remove("correct","wrong"); }
          if(this.getAttribute("data-key") === correct){
            this.classList.add("correct"); if(fb) fb.textContent = "Nice — particle count rules colligative effects.";
          } else {
            this.classList.add("wrong"); if(fb) fb.textContent = "Not quite — think number of particles, not identity.";
          }
        });
      }
    })(quizzes[q]);
  }

  // init
  setProgress();
  var deck = document.getElementById("deck");
  if (deck) deck.focus();
});
