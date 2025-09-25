// Ensure the DOM is fully parsed before wiring events
window.addEventListener("DOMContentLoaded", function () {
  var deck = document.getElementById("deck");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  var i = 0;
  var bar = document.getElementById("progressBar");

  // Durations (seconds) from data-duration
  var durations = slides.map(function(s){ return Number(s.getAttribute("data-duration") || 40); });
  var total = durations.reduce(function(a,b){ return a+b; }, 0);

  // ---------- Fit-to-viewport logic ----------
  function fitSlide(slide){
    if(!slide || document.body.classList.contains("handout")) return resetSlide(slide);
    var inner = slide.querySelector(".inner");
    if(!inner) return;

    // Reset to natural size
    inner.style.transform = "none";
    inner.style.marginTop = "0";

    var pad = 16;
    var availW = deck.clientWidth  - pad*2;
    var availH = deck.clientHeight - pad*2;

    var rect = inner.getBoundingClientRect();
    var naturalW = Math.max(rect.width, inner.scrollWidth);
    var naturalH = Math.max(rect.height, inner.scrollHeight);

    var scale = Math.min(availW / naturalW, availH / naturalH);
    scale = Math.max(0.5, Math.min(scale, 1.25));

    inner.style.transformOrigin = "center top";
    inner.style.transform = "scale(" + scale + ")";

    var newH = naturalH * scale;
    var y = (availH - newH) / 2;
    inner.style.marginTop = y > 0 ? (y + "px") : "0";
  }
  function resetSlide(slide){
    var inner = slide && slide.querySelector(".inner");
    if(inner){ inner.style.transform = "none"; inner.style.marginTop = "0"; }
  }
  function fitCurrent(){ fitSlide(slides[i]); }

  // ---------- Progress ----------
  function setProgress() {
    var elapsed = durations.slice(0,i).reduce(function(a,b){ return a+b; }, 0);
    if(bar) bar.style.width = ((elapsed/total)*100) + "%";
  }

  function show(k){
    slides[i].classList.remove("current");
    i = (k + slides.length) % slides.length;
    slides[i].classList.add("current");
    setProgress();
    fitCurrent();
  }
  function next(){ ensurePresenting(); if(!isHandout()) show(i+1); }
  function prev(){ ensurePresenting(); if(!isHandout()) show(i-1); }

  document.addEventListener("keydown", function(e){
    if(e.key==="ArrowRight"||e.key===" "){ next(); }
    if(e.key==="ArrowLeft"){ prev(); }
    if(e.key && e.key.toLowerCase()==="f"){ toggleFS(); }
    if(e.key && e.key.toLowerCase()==="g"){ toggleGlossary(true); }
    if(e.key && e.key.toLowerCase()==="h"){ toggleHandout(); }
    if(e.key && e.key.toLowerCase()==="p"){ doPrint(); }
    if(e.key && e.key.toLowerCase()==="d"){ toggleTheme(); }
    if (e.altKey && e.key && e.key.toLowerCase() === "s" && presenterTools){
      presenterTools.hidden = !presenterTools.hidden; fitCurrent();
    }
  });

  // Click anywhere on the deck starts presenting + tries fullscreen
  var started = false;
  function ensurePresenting(){
    if(started) return;
    started = true;
    document.body.classList.add("presenting");
    try{
      if(!document.fullscreenElement && document.documentElement.requestFullscreen){
        document.documentElement.requestFullscreen().catch(function(){});
      }
    }catch(e){}
    fitCurrent();
  }
  if (deck) deck.addEventListener("click", ensurePresenting);

  document.addEventListener("fullscreenchange", function(){
    if(document.fullscreenElement){ document.body.classList.add("presenting"); }
    else { document.body.classList.remove("presenting"); }
    fitCurrent();
  });

  function toggleFS(){
    var el = document.documentElement;
    if(!document.fullscreenElement && el.requestFullscreen){ el.requestFullscreen(); }
    else if (document.exitFullscreen){ document.exitFullscreen(); }
  }

  // ---------- Glossary ----------
  var glossary = document.getElementById("glossary");
  var glossaryBtn = null; // no button now; keyboard (G) opens
  var closeGloss = glossary ? glossary.querySelector(".close") : null;

  function toggleGlossary(open){
    if(!glossary) return;
    if(open){ glossary.hidden = false; }
    else { glossary.hidden = true; }
  }
  if (closeGloss)  closeGloss.addEventListener("click", function(){ toggleGlossary(false); });
  if (glossary)    glossary.addEventListener("click", function(e){ if(e.target===glossary) toggleGlossary(false); });

  // Inline def buttons still open glossary
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

  // ---------- SIM ----------
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

      var t = "isotonic", u = "balanced", inAlpha = 0.9, outAlpha = 0.25;
      if(ec < 1.1){ t = "hypotonic"; u = "water rushes in"; inAlpha = 1; outAlpha = 0.15; }
      else if(ec > 2.0){ t = "hypertonic"; u = "water leaves cells"; inAlpha = 0.15; outAlpha = 1; }
      tonicity.textContent = t;
      uptake.textContent = u;
      if (arrowsIn)  arrowsIn.setAttribute("opacity", String(inAlpha));
      if (arrowsOut) arrowsOut.setAttribute("opacity", String(outAlpha));
      fitCurrent();
    };
    ecRange.addEventListener("input", update);
    update();
  }

  // ---------- Quiz ----------
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
          fitCurrent();
        });
      }
    })(quizzes[q]);
  }

  // ---------- Presenter tools toggle ----------
  var presenterTools = document.getElementById("presenterTools");
  try {
    var qs = new URLSearchParams(location.search);
    if (presenterTools && qs.get("presenter") === "1") presenterTools.hidden = false;
  } catch(e){}

  // ---------- Handout / Print ----------
  function isHandout(){ return document.body.classList.contains("handout"); }
  function toggleHandout(){
    var on = document.body.classList.toggle("handout");
    if(on){ slides.forEach(resetSlide); }
    else { fitCurrent(); }
  }
  function doPrint(){
    var wasHandout = isHandout();
    if(!wasHandout) document.body.classList.add("handout");
    setTimeout(function(){ window.print(); if(!wasHandout) document.body.classList.remove("handout"); }, 50);
  }

  // ---------- Theme ----------
  var saved = null;
  try { saved = localStorage.getItem("stoneyTheme"); } catch(e){}
  if(saved === "dark" || (saved===null && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)){
    document.body.classList.add("dark");
  }
  function toggleTheme(){
    var dark = document.body.classList.toggle("dark");
    try { localStorage.setItem("stoneyTheme", dark ? "dark" : "light"); } catch(e){}
    fitCurrent();
  }

  // ---------- Refit triggers ----------
  window.addEventListener("resize", fitCurrent);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitCurrent);
  }
  document.querySelectorAll(".slide img").forEach(function(img){
    img.addEventListener("load", function(){
      if(img.closest(".slide") === slides[i]) fitCurrent();
    });
  });

  // init
  setProgress();
  fitCurrent();
  if (deck) deck.focus();
});
