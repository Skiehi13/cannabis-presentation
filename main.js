window.addEventListener("DOMContentLoaded", function () {
  var deck   = document.getElementById("deck");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  // Start at slide 0; no stacking
  var i = 0;
  slides.forEach(function(s){ s.classList.remove("current","anim-left","anim-right"); });
  slides[0].classList.add("current");

  var bar = document.getElementById("progressBar");
  var durations = slides.map(function(s){ return Number(s.getAttribute("data-duration") || 40); });
  var total = durations.reduce(function(a,b){ return a+b; }, 0);

  function setProgress(){
    var elapsed = durations.slice(0,i).reduce(function(a,b){ return a+b; }, 0);
    if (bar) bar.style.width = ((elapsed/total)*100) + "%";
  }

  // Fit-to-viewport scaler for each slide's .inner
  function fitSlide(slide){
    if(!slide || document.body.classList.contains("handout")) return resetSlide(slide);
    var inner = slide.querySelector(".inner");
    if(!inner) return;

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

  // Show a specific slide
  function show(k){
    var nextIdx = (k + slides.length) % slides.length;
    if (nextIdx === i) return;

    var forward = (nextIdx > i) || (i === slides.length - 1 && nextIdx === 0);

    slides.forEach(function(s){ s.classList.remove("current","anim-left","anim-right"); });

    i = nextIdx;
    var next = slides[i];
    next.classList.add("current", forward ? "anim-right" : "anim-left");

    setProgress();
    fitCurrent();
  }

  function next(){ ensurePresenting(); if(!isHandout()) show(i+1); }
  function prev(){ ensurePresenting(); if(!isHandout()) show(i-1); }

  // Keys
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

  // Click to enter presenting mode & try fullscreen
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

  // Glossary modal
  var glossary = document.getElementById("glossary");
  var closeGloss = glossary ? glossary.querySelector(".close") : null;
  function toggleGlossary(open){
    if(!glossary) return;
    glossary.hidden = !open;
  }
  if (closeGloss)  closeGloss.addEventListener("click", function(){ toggleGlossary(false); });
  if (glossary)    glossary.addEventListener("click", function(e){ if(e.target===glossary) toggleGlossary(false); });

  // Inline def buttons
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

  // RC diagram interactivity
  (function(){
    var svg = document.getElementById("rcDiagram");
    if(!svg) return;

    var chkEa = document.getElementById("rcEa");
    var chkCat = document.getElementById("rcCatalyst");
    var chkTemp = document.getElementById("rcTemp");
    var btnReset = document.getElementById("rcReset");

    var cat = document.getElementById("curve-cat");
    var ea = document.getElementById("eaGroup");
    var dots = document.getElementById("tempDots");

    function sync(){
      ea.style.display   = chkEa && chkEa.checked ? "block" : "none";
      cat.classList.toggle("hidden", !(chkCat && chkCat.checked));
      dots.classList.toggle("hidden", !(chkTemp && chkTemp.checked));
    }
    if (chkEa) chkEa.addEventListener("change", sync);
    if (chkCat) chkCat.addEventListener("change", sync);
    if (chkTemp) chkTemp.addEventListener("change", sync);
    if (btnReset) btnReset.addEventListener("click", function(){
      if (chkEa) chkEa.checked = true;
      if (chkCat) chkCat.checked = false;
      if (chkTemp) chkTemp.checked = false;
      sync();
    });

    sync();
  })();

  // Presenter tools toggle (optional)
  var presenterTools = document.getElementById("presenterTools");
  try {
    var qs = new URLSearchParams(location.search);
    if (presenterTools && qs.get("presenter") === "1") presenterTools.hidden = false;
  } catch(e){}

  // Handout / Print / Theme
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

  // Refit triggers
  window.addEventListener("resize", fitCurrent);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCurrent);
  document.querySelectorAll(".slide img").forEach(function(imgEl){
    imgEl.addEventListener("load", function(){
      if(imgEl.closest(".slide") === slides[i]) fitCurrent();
    });
  });

  // Osmosis slider behavior
  (function(){
    var r = document.getElementById("ecRange");
    if(!r) return;
    var ecVal = document.getElementById("ecVal");
    var tone = document.getElementById("tonicity");
    var up = document.getElementById("uptake");
    var arrowsIn = document.getElementById("arrowsIn");
    var arrowsOut= document.getElementById("arrowsOut");
    function update(){
      var v = parseFloat(r.value);
      if(ecVal) ecVal.textContent = v.toFixed(1);
      if(v < 1.1){ tone.textContent="hypotonic"; up.textContent="water in"; arrowsIn.style.opacity=1; arrowsOut.style.opacity=.15; }
      else if(v > 1.9){ tone.textContent="hypertonic"; up.textContent="water out"; arrowsIn.style.opacity=.15; arrowsOut.style.opacity=1; }
      else { tone.textContent="isotonic"; up.textContent="balanced"; arrowsIn.style.opacity=.8; arrowsOut.style.opacity=.25; }
    }
    r.addEventListener("input", update);
    update();
  })();

  // Init
  setProgress();
  fitCurrent();
  if (deck) deck.focus();
});
