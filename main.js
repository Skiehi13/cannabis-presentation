window.addEventListener("DOMContentLoaded", function () {
  var deck = document.getElementById("deck");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  // Start
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
    initMolViewersOnSlide(next);
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
  });

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
  function toggleGlossary(open){ if(glossary) glossary.hidden = !open; }
  if (closeGloss)  closeGloss.addEventListener("click", function(){ toggleGlossary(false); });
  if (glossary)    glossary.addEventListener("click", function(e){ if(e.target===glossary) toggleGlossary(false); });

  // Inline def buttons open glossary
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

  // Reaction Coordinates interactivity
  (function(){
    var svg = document.getElementById("rcDiagram");
    if(!svg) return;
    var chkEa = document.getElementById("rcEa");
    var chkCat = document.getElementById("rcCatalyst");
    var tempSlider = document.getElementById("rcTemp");
    var tempVal = document.getElementById("rcTempVal");
    var btnReset = document.getElementById("rcReset");
    var eaVal = document.getElementById("rcEaVal");
    var relRate = document.getElementById("rcRelRate");
    var pathUncat = document.getElementById("curve-uncat");
    var pathCat   = document.getElementById("curve-cat");
    var eaGroup   = document.getElementById("eaGroup");
    var eaLine    = document.getElementById("eaLine");
    var eaArrowUp = document.getElementById("eaArrowUp");
    var eaArrowDn = document.getElementById("eaArrowDown");
    var eaText    = document.getElementById("eaText");
    var dots      = document.getElementById("tempDots");
    var terpWarn  = document.getElementById("terpCaution");

    var Ea_ref_kJ = 120, catalystFactor = 0.70, TrefC = 120, R = 8.314;

    function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
    function kRel(Ea_kJ, T_C){
      var T = T_C + 273.15, Tref = TrefC + 273.15;
      var Ea = Ea_kJ * 1000;
      var exponent = -Ea/R * (1/T - 1/Tref);
      return Math.exp(exponent);
    }
    function yPeakFromEa(Ea_kJ){
      var EaMin = 70, EaMax = 140, yMax = 160, yMin = 90;
      var t = clamp((Ea_kJ - EaMin)/(EaMax - EaMin), 0, 1);
      return yMax - t * (yMax - yMin);
    }
    function buildCurve(yPeak){
      var x0=80,y0=280,x3=620,y3=240,x1=220,x2=460;
      var y1=(y0+yPeak)*0.45, y2=(y3+yPeak)*0.55+40;
      return `M ${x0},${y0} C ${x1},${y1} ${x2},${y2} ${x3},${y3}`;
    }
    function sync(){
      var useCat = !!(chkCat && chkCat.checked);
      var T_C = tempSlider ? Number(tempSlider.value) : TrefC;
      var Ea_kJ = useCat ? Ea_ref_kJ * catalystFactor : Ea_ref_kJ;

      if (tempVal) tempVal.textContent = T_C.toFixed(0) + " °C";
      if (eaVal) eaVal.textContent = Ea_kJ.toFixed(0);
      if (relRate) relRate.textContent = kRel(Ea_kJ, T_C).toFixed(2) + "×";

      var yPeak = yPeakFromEa(Ea_kJ);
      var d = buildCurve(yPeak);
      if (useCat){ pathCat.classList.remove("hidden"); pathUncat.classList.add("hidden"); pathCat.setAttribute("d", d); }
      else { pathCat.classList.add("hidden"); pathUncat.classList.remove("hidden"); pathUncat.setAttribute("d", d); }

      if (chkEa && chkEa.checked){
        eaGroup.style.display="block";
        var xPeak=320, yReact=280, yTop=yPeak;
        eaLine.setAttribute("x1",xPeak); eaLine.setAttribute("x2",xPeak);
        eaLine.setAttribute("y1",yTop);  eaLine.setAttribute("y2",yReact);
        eaArrowUp.setAttribute("points", `${xPeak},${yTop-10} ${xPeak-6},${yTop+4} ${xPeak+6},${yTop+4}`);
        eaArrowDn.setAttribute("points", `${xPeak},${yReact+10} ${xPeak-6},${yReact-4} ${xPeak+6},${yReact-4}`);
        eaText.setAttribute("x",xPeak+8); eaText.setAttribute("y",(yTop+yReact)/2);
      } else { eaGroup.style.display="none"; }

      var durRef=2.2; var T=T_C+273.15, Tref=TrefC+273.15;
      var speedFactor = clamp(T/Tref, 0.6, 1.5);
      if (dots) dots.style.setProperty("--dotDur", (durRef / speedFactor).toFixed(2) + "s");

      if (terpWarn) terpWarn.classList.toggle("hidden", T_C < 130);
    }
    if (chkEa)  chkEa.addEventListener("change", sync);
    if (chkCat) chkCat.addEventListener("change", sync);
    if (tempSlider) tempSlider.addEventListener("input", sync);
    if (btnReset) btnReset.addEventListener("click", function(){
      if (chkEa) chkEa.checked = true;
      if (chkCat) chkCat.checked = false;
      if (tempSlider){ tempSlider.value = TrefC; }
      sync();
    });
    sync();
  })();

  // ---------- Robust 3Dmol loader with CDN fallback ----------
  function ensure3Dmol(cb){
    if (window.$3Dmol) { cb(); return; }
    // Try primary CDN
    var s = document.createElement('script');
    s.src = "https://3dmol.csb.pitt.edu/build/3Dmol-min.js";
    s.async = true;
    s.onload = function(){ cb(); };
    s.onerror = function(){
      // Fallback to unpkg
      var f = document.createElement('script');
      f.src = "https://unpkg.com/3dmol/build/3Dmol-min.js";
      f.async = true;
      f.onload = function(){ cb(); };
      f.onerror = function(){
        console.error("Failed to load 3Dmol from both CDNs.");
        // Put a user-visible message in any viewers:
        document.querySelectorAll(".viewer").forEach(function(v){
          v.innerHTML = '<div class="viz-note">3D viewer library could not be loaded. Check network/CDN restrictions.</div>';
        });
      };
      document.head.appendChild(f);
    };
    document.head.appendChild(s);
  }

  var inited = {};
  function initMolViewersOnSlide(slideEl){
    if(!slideEl) return;
    var toolbars = slideEl.querySelectorAll(".viewer-toolbar");
    if(!toolbars.length) return;

    ensure3Dmol(function(){
      toolbars.forEach(function(tb){
        var vid = tb.getAttribute("data-viewer");
        var url = tb.getAttribute("data-url");
        if(!vid || !url) return;
        if(inited[vid]) return;

        var container = document.getElementById(vid);
        if(!container){ return; }

        var bg = document.body.classList.contains('dark') ? '#12171c' : '#ffffff';
        var viewer = $3Dmol.createViewer(container, { backgroundColor: bg });

        fetch(url)
          .then(function(r){
            if(!r.ok){ throw new Error('HTTP '+r.status+' for '+url); }
            return r.text();
          })
          .then(function(mol){
            viewer.addModel(mol, 'mol');
            setStyle(viewer, 'stick'); // default
            viewer.zoomTo();
            viewer.render();
          })
          .catch(function(err){
            console.error(err);
            container.innerHTML = '<div class="viz-note">Could not load <code>'+url+'</code><br>'+String(err)+'</div>';
          });

        // Style toggles
        tb.addEventListener('change', function(ev){
          var t = ev.target;
          if(!(t instanceof HTMLInputElement)) return;
          if(t.name.endsWith('Style') && t.checked){
            setStyle(viewer, t.value);
            viewer.zoomTo(); viewer.render();
          }
        });
        // Buttons
        tb.addEventListener('click', function(ev){
          var btn = ev.target;
          if(!(btn instanceof HTMLElement)) return;
          var act = btn.getAttribute('data-action');
          if(act==='reset'){ viewer.zoomTo(); viewer.render(); }
          if(act==='spin'){ var spinning = viewer.spin(); viewer.spin(!spinning); }
        });

        inited[vid] = true;
      });
    });
  }

  function setStyle(viewer, mode){
    viewer.setStyle({}, {}); // clear
    if(mode === 'sphere'){
      viewer.setStyle({}, {sphere:{scale:0.28}});
    } else {
      viewer.setStyle({}, {stick:{radius:0.2}, sphere:{scale:0.22}});
    }
  }

  // Init viewers that might be on the first visible slide
  initMolViewersOnSlide(slides[i]);

  // Theme / handout utilities
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

  window.addEventListener("resize", fitCurrent);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCurrent);
  document.querySelectorAll(".slide img").forEach(function(imgEl){
    imgEl.addEventListener("load", function(){
      if(imgEl.closest(".slide") === slides[i]) fitCurrent();
    });
  });

  setProgress();
  fitCurrent();
  if (deck) deck.focus();
});
