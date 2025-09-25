window.addEventListener("DOMContentLoaded", function () {
  var deck   = document.getElementById("deck");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  // Start at slide 0
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

  // Fit-to-viewport (scale the .inner)
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

  // Show a specific slide (only one visible)
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

  // Click anywhere to start presenting & try fullscreen
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

  // Glossary
  var glossary = document.getElementById("glossary");
  var closeGloss = glossary ? glossary.querySelector(".close") : null;
  function toggleGlossary(open){
    if(!glossary) return;
    if(open){ glossary.hidden = false; }
    else { glossary.hidden = true; }
  }
  if (closeGloss)  closeGloss.addEventListener("click", function(){ toggleGlossary(false); });
  if (glossary)    glossary.addEventListener("click", function(e){ if(e.target===glossary) toggleGlossary(false); });

  // Inline def buttons → open glossary and scroll to term
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

  // ---------- Pan/Zoom for the pH infographic ----------
  var pz = document.querySelector(".pz");
  if (pz){
    var viewport = pz.querySelector(".pz-viewport");
    var img = pz.querySelector(".pz-img");
    var zoom = 1, minZ = 0.6, maxZ = 3.5;
    var tx = 0, ty = 0;
    var dragging = false, lastX = 0, lastY = 0;

    function apply(){
      img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + zoom + ")";
    }
    function clamp(){
      zoom = Math.max(minZ, Math.min(maxZ, zoom));
    }
    function zoomAt(px, py, factor){
      var prev = zoom;
      zoom *= factor; clamp();
      // Keep the point under cursor stable
      var rect = viewport.getBoundingClientRect();
      var cx = px - rect.left - tx;
      var cy = py - rect.top  - ty;
      tx -= (cx/prev - cx/zoom);
      ty -= (cy/prev - cy/zoom);
      apply();
    }

    // Wheel to zoom
    viewport.addEventListener("wheel", function(e){
      e.preventDefault();
      var factor = e.deltaY < 0 ? 1.1 : 0.9;
      zoomAt(e.clientX, e.clientY, factor);
    }, {passive:false});

    // Pointer to drag
    viewport.addEventListener("pointerdown", function(e){
      dragging = true; lastX = e.clientX; lastY = e.clientY; viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointermove", function(e){
      if(!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      tx += dx; ty += dy; apply();
    });
    viewport.addEventListener("pointerup", function(e){ dragging = false; viewport.releasePointerCapture(e.pointerId); });
    viewport.addEventListener("pointercancel", function(){ dragging = false; });

    // Buttons
    pz.querySelectorAll(".pz-btn").forEach(function(btn){
      btn.addEventListener("click", function(){
        var act = this.getAttribute("data-action");
        if(act==="in"){ zoomAt(viewport.clientWidth/2, viewport.clientHeight/2, 1.15); }
        if(act==="out"){ zoomAt(viewport.clientWidth/2, viewport.clientHeight/2, 0.87); }
        if(act==="reset"){ zoom = 1; tx = 0; ty = 0; apply(); }
      });
    });

    // Initial fit: center image
    function fitInfographic(){
      // natural size
      var iw = img.naturalWidth || img.width;
      var ih = img.naturalHeight || img.height;
      var vw = viewport.clientWidth, vh = viewport.clientHeight;
      if (iw && ih){
        var s = Math.min(vw/iw, vh/ih);
        zoom = Math.max(minZ, Math.min(1, s * 0.98)); // fit but allow zoom-in
        tx = (vw - iw*zoom)/2;
        ty = (vh - ih*zoom)/2;
        apply();
      } else {
        // try again after load
        img.addEventListener("load", fitInfographic, {once:true});
      }
    }
    fitInfographic();

    // Refit on resize
    window.addEventListener("resize", function(){
      // Keep current zoom/position but re-center if image is smaller than viewport
      apply();
    });
  }

  // Presenter link on refs slide (optional)
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

  // Init
  setProgress();
  fitCurrent();
  if (deck) deck.focus();
});
