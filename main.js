// Ensure the DOM is fully parsed before wiring events
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

  var handoutToggle = document.getElementById("handoutToggle");
  var printBtn      = document.getElementById("printBtn");
  var themeToggle   = document.getElementById("themeToggle");

  // Durations (seconds) from data-duration
  var durations = slides.map(function(s){ return Number(s.getAttribute("data-duration") || 40); });
  var total = durations.reduce(function(a,b){ return a+b; }, 0);

  // --- scale-to-fit helpers ---
  function fitSlide(slide){
    if(!slide || document.body.classList.contains("handout")) return resetSlide(slide);
    var inner = slide.querySelector(".inner");
    if(!inner) return;

    // Reset first to get natural size
    inner.style.transform = "none";
    inner.style.marginTop = "0";

    var pad = 12; // breathing room
    var availW = slide.clientWidth - pad*2;
    var availH = slide.clientHeight - pad*2;

    var rect = inner.getBoundingClientRect();
    var scale = Math.min(availW / rect.width, availH / rect.height);

    // Allow mild upscaling; cap to avoid fuzzy edges
    scale = Math.max(0.5, Math.min(scale, 1.25));

    inner.style.transformOrigin = "center top";
    inner.style.transform = "scale(" + scale + ")";

    // center vertically when scaled down
    var newH = rect.height * scale;
    var y = (availH - newH) / 2;
    inner.style.marginTop = y > 0 ? (y + "px") : "0";
  }
  function resetSlide(slide){
    var inner = slide && slide.querySelector(".inner");
    if(inner){ inner.style.transform = "none"; inner.style.marginTop = "0"; }
  }
  function fitCurrent(){ fitSlide(slides[i]); }

  function setProgress() {
    var elapsed = durations.slice(0,i).reduce(function(a,b){ return a+b; }, 0);
    bar.style.width = ((elapsed/total)*100) + "%";
  }

  function show(k){
    slides[i].classList.remove("current");
    i = (k + slides.length) % slides.length;
    slides[i].classList.add("current");
    setProgress();
    // ensure images loaded -> fit
    fitCurrent();
  }
  function next(){ ensureStarted(); if(!isHandout()) show(i+1); }
  function prev(){ ensureStarted(); if(!isHandout()) show(i-1); }

  document.addEventListener("keydown", function(e){
    if(e.key==="ArrowRight"||e.key===" "){ next(); }
    if(e.key==="ArrowLeft"){ prev(); }
    if(e.key && e.key.toLowerCase()==="f"){ toggleFS(); }
    if(e.key && e.key.toLowerCase()==="t"){ toggleTimer(); }
    if(e.key && e.key.toLowerCase()==="g"){ toggleGlossary(true); }
    if(e.key && e.key.toLowerCase()==="h"){ toggleHandout(); }
    if(e.key && e.key.toLowerCase()==="p"){ doPrint(); }
    if(e.key && e.key.toLowerCase()==="d"){ toggleTheme(); }
  });

  if (prevBtn) prevBtn.onclick = prev;
  if (nextBtn) nextBtn.onclick = next;
  if (fsBtn)   fsBtn.onclick   = function(){ ensureStarted(); toggleFS(); };
  if (timerBtn)timerBtn.onclick= toggleTimer;
  if (handoutToggle) handoutToggle.onclick = toggleHandout;
  if (printBtn)      printBtn.onclick      = doPrint;
  if (themeToggle)   themeToggle.onclick   = toggleTheme;

  // Click anywhere on the deck starts presenting (requests fullscreen) once
  var started = false;
  function ensureStarted(){
    if(started) return;
    started = true;
    document.body.classList.add("presenting");
    // try to enter fullscreen (requires user gesture; this is called from a click/keypress)
    try{
      if(!document.fullscreenElement && document.documentElement.requestFullscreen){
        document.documentElement.requestFullscreen().catch(function(){ /* ignore */ });
      }
    }catch(e){}
    fitCurrent();
  }
  document.getElementById("deck").addEventListener("click", function(){ ensureStarted(); });

  // Fullscreen change toggles 'presenting' chrome
  document.addEventListener("fullscreenchange", function(){
    if(document.fullscreenElement){ document.body.classList.add("presenting"); }
    else { document.body.classList.remove("presenting"); }
    fitCurrent();
  });

  // --- fullscreen toggle ---
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
      // refit in case labels wrap
      fitCurrent();
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
          fitCurrent(); // feedback line height might change
        });
      }
    })(quizzes[q]);
  }

  // --- Presenter tools: reveal notes if ?presenter=1 or Alt+S ---
  var presenterTools = document.getElementById("presenterTools");
  try {
    var qs = new URLSearchParams(location.search);
    if (presenterTools && qs.get("presenter") === "1") presenterTools.hidden = false;
  } catch(e){ /* ignore older browsers */ }

  document.addEventListener("keydown", function(e){
    if (e.altKey && e.key && e.key.toLowerCase() === "s" && presenterTools){
      presenterTools.hidden = !presenterTools.hidden;
      fitCurrent();
    }
  });

  // --- Handout view ---
  function isHandout(){ return document.body.classList.contains("handout"); }
  function toggleHandout(){
    var on = document.body.classList.toggle("handout");
    if(handoutToggle) handoutToggle.setAttribute("aria-pressed", on ? "true" : "false");
    // Reset transforms in handout; refit when leaving
    if(on){
      slides.forEach(resetSlide);
    } else {
      fitCurrent();
    }
  }

  // --- Print helper ---
  function doPrint(){
    var wasHandout = isHandout();
    if(!wasHandout) document.body.classList.add("handout");
    setTimeout(function(){ window.print(); if(!wasHandout) document.body.classList.remove("handout"); }, 50);
  }

  // --- Theme toggle (light/dark) ---
  var saved = null;
  try { saved = localStorage.getItem("stoneyTheme"); } catch(e){}
  if(saved === "dark" || (saved===null && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)){
    document.body.classList.add("dark");
    if(themeToggle) themeToggle.textContent = "☀️";
    if(themeToggle) themeToggle.setAttribute("aria-pressed","true");
  }
  function toggleTheme(){
    var dark = document.body.classList.toggle("dark");
    if(themeToggle){
      themeToggle.textContent = dark ? "☀️" : "🌙";
      themeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
    }
    try { localStorage.setItem("stoneyTheme", dark ? "dark" : "light"); } catch(e){}
    fitCurrent();
  }

  // Refit on resize and when images load
  window.addEventListener("resize", fitCurrent);
  document.querySelectorAll(".slide img").forEach(function(img){
    img.addEventListener("load", function(){
      if(img.closest(".slide") === slides[i]) fitCurrent();
    });
  });

  // init
  setProgress();
  fitCurrent();
  var deck = document.getElementById("deck");
  if (deck) deck.focus();
});
