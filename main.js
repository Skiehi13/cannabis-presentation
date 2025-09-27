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

  // Reaction Coordinates interactivity (kept for other slides if present)
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

      var durRef=2.2; var T=T_C+273.15, Tref=TrefC+273.15;
      var speedFactor = Math.max(0.6, Math.min(1.5, T/Tref));
      if (dots) dots.style.setProperty("--dotDur", (2.2 / speedFactor).toFixed(2) + "s");

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

  // === NEW: Decarb Lab (fun interactive) ===
  (function(){
    var wrap = document.getElementById("labWrap");
    if(!wrap) return;

    var tSlider = document.getElementById("labTemp");
    var tOut    = document.getElementById("labTempVal");
    var timeS   = document.getElementById("labTime");
    var timeOut = document.getElementById("labTimeVal");
    var catChk  = document.getElementById("labCatalyst");
    var matrix  = document.getElementById("labMatrix");

    var btnPlay = document.getElementById("labPlay");
    var btnPause= document.getElementById("labPause");
    var btnReset= document.getElementById("labReset");
    var presets = document.querySelectorAll(".preset");

    var kOut = document.getElementById("labK");
    var convOut = document.getElementById("labConv");
    var terpOut = document.getElementById("labTerp");
    var warn = document.getElementById("labWarn");

    var svg = document.getElementById("labSVG");
    var barrier = document.getElementById("labBarrier");
    var particlesG = document.getElementById("labParticles");
    var convBar = document.getElementById("labConvBar");

    var R = 8.314;
    // Base Ea (kJ/mol); matrix and catalyst will scale it down
    var EaBase = 120; // ~25–30 kcal/mol
    var catalystFactor = 0.75; // 25% drop with catalyst
    var matrixFactorMap = { air: 1.00, oil: 0.90, ethanol: 0.85 };

    var running = false;
    var simTime = 0; // simulated minutes elapsed while playing
    var lastTS = null;

    // particle system
    var N = 28; // number of dots
    var particles = [];

    function rand(min,max){ return Math.random()*(max-min)+min; }
    function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

    function initParticles(){
      particles = [];
      particlesG.innerHTML = "";
      for (var n=0; n<N; n++){
        var cx = rand(80,230);
        var cy = rand(260,295);
        var dot = document.createElementNS("http://www.w3.org/2000/svg","circle");
        dot.setAttribute("r", 6);
        dot.setAttribute("cx", cx);
        dot.setAttribute("cy", cy);
        dot.setAttribute("fill", ["#7b61ff","#76a9fa","#ff8a00","#2f7d32"][n%4]);
        dot.setAttribute("stroke", "#222");
        dot.setAttribute("stroke-width","2");
        particlesG.appendChild(dot);
        particles.push({el:dot, x:cx, y:cy, state:"reactant"});
      }
    }

    function state(){
      var T = Number(tSlider.value);
      var minsTarget = Number(timeS.value);
      var useCat = !!catChk.checked;
      var mtx = matrix.value;

      var Ea = EaBase * (useCat ? catalystFactor : 1.0) * (matrixFactorMap[mtx] || 1.0); // kJ/mol
      var TrefC = 120, TrefK = TrefC + 273.15;
      var T_K = T + 273.15;

      var EaJ = Ea*1000;
      // Relative rate constant normalized around 120 °C, EaBase without modifiers
      var kRef = Math.exp( -(EaBase*1000)/R * (1/TrefK - 1/TrefK) ); // = 1
      var kRel = Math.exp( -EaJ/R * (1/T_K - 1/TrefK) ); // relative to 120°C
      // Slight amplification so changes are visible
      var kScaled = Math.pow(kRel, 1.0);

      return { T, minsTarget, useCat, mtx, Ea, kScaled };
    }

    function terpLossPct(T, minutes){
      // terp loss grows with T and time; accelerate above 130°C
      var base = Math.max(0, T - 115) * 0.28;
      var accel = T >= 130 ? 1.7 : 1.0;
      var timeFactor = Math.log1p(minutes) * 1.15;
      return clamp(base * accel * timeFactor * 0.25, 0, 100);
    }

    function conversionPct(kScaled, minutes){
      // simple pseudo-first-order feel: fraction = 1 - e^(-k * t/10)
      var frac = 1 - Math.exp(-kScaled * (minutes/10));
      return clamp(frac*100, 0, 100);
    }

    function morphBarrier(Ea){
      // Lower Ea → lower peak
      var peakY = 170 + (Ea - 80) * 0.6; // map Ea 80–140 to y ~170–206
      peakY = clamp(peakY, 120, 210);
      var d = `M 250,300 C 360,${peakY} 460,${peakY+40} 510,300`;
      barrier.setAttribute("d", d);
    }

    function hopProbability(kScaled){
      // probability per second that an individual particle attempts/finishes a hop
      return clamp(0.05 * kScaled, 0.01, 0.45);
    }

    function tick(dtSec){
      // advance simulated time if playing
      if (running){
        // scale sim time so 1 real sec ≈ 3 simulated min (feels snappy)
        simTime += dtSec * 3;
      }

      var S = state();
      if (tOut) tOut.textContent = S.T.toFixed(0) + " °C";
      if (timeOut) timeOut.textContent = Math.round(S.minsTarget) + " min";
      if (warn) warn.classList.toggle("hidden", S.T < 130);

      morphBarrier(S.Ea);

      // live metrics based on current simTime but capped at target minutes
      var minsUsed = running ? Math.min(simTime, S.minsTarget) : S.minsTarget;
      var conv = conversionPct(S.kScaled, minsUsed);
      var terp = terpLossPct(S.T, minsUsed);

      if (kOut) kOut.textContent = S.kScaled.toFixed(2) + "×";
      if (convOut) convOut.textContent = conv.toFixed(0) + "%";
      if (terpOut) terpOut.textContent = Math.round(terp) + "%";
      if (convBar) convBar.setAttribute("width", 6.6 * conv); // 0..660 px

      // particle animation: random walks + hops with probability
      var pHop = hopProbability(S.kScaled) * dtSec; // per-frame prob
      particles.forEach(function(p){
        // jitter
        p.x += rand(-8,8) * dtSec * 6;
        p.y += rand(-4,4) * dtSec * 6;
        // keep inside world bounds
        p.x = clamp(p.x, 60, 700);
        p.y = clamp(p.y, 220, 305);

        if (p.state === "reactant" && p.x < 250){
          // drift toward barrier
          p.x += rand(10,30) * dtSec * (1 + S.kScaled*0.3);
        }

        if (p.state === "reactant" && p.x >= 250 && Math.random() < pHop){
          // attempt hop: chance also boosted a bit by temp
          var bonus = (S.T - 100) * 0.002;
          if (Math.random() < 0.5 + bonus){
            // success: jump over crest to product side
            p.x = rand(520,680);
            p.y = rand(250,290);
            p.state = "product";
          } else {
            // bounce back
            p.x = rand(200,240);
            p.y = rand(250,300);
          }
        }

        // gentle drift on product side
        if (p.state === "product"){
          p.x += rand(-6, 6) * dtSec * 5;
          p.y += rand(-3, 3) * dtSec * 5;
          p.x = clamp(p.x, 520, 700);
        }

        p.el.setAttribute("cx", p.x);
        p.el.setAttribute("cy", p.y);
      });
    }

    function loop(ts){
      if (lastTS == null) lastTS = ts;
      var dt = (ts - lastTS) / 1000;
      lastTS = ts;
      tick(dt);
      requestAnimationFrame(loop);
    }

    function applyPreset(name){
      if (name === "slow"){
        tSlider.value = 110;
        timeS.value = 60;
        catChk.checked = false;
        matrix.value = "oil";
      } else if (name === "balanced"){
        tSlider.value = 120;
        timeS.value = 40;
        catChk.checked = true;
        matrix.value = "oil";
      } else if (name === "toasty"){
        tSlider.value = 140;
        timeS.value = 20;
        catChk.checked = true;
        matrix.value = "ethanol";
      }
      simTime = 0;
      lastTS = null;
      updateStatic();
    }

    function updateStatic(){
      var S = state();
      morphBarrier(S.Ea);
      if (tOut) tOut.textContent = S.T.toFixed(0) + " °C";
      if (timeOut) timeOut.textContent = Math.round(S.minsTarget) + " min";
      if (warn) warn.classList.toggle("hidden", S.T < 130);

      var conv = conversionPct(S.kScaled, S.minsTarget);
      var terp = terpLossPct(S.T, S.minsTarget);
      if (kOut) kOut.textContent = S.kScaled.toFixed(2) + "×";
      if (convOut) convOut.textContent = conv.toFixed(0) + "%";
      if (terpOut) terpOut.textContent = Math.round(terp) + "%";
      if (convBar) convBar.setAttribute("width", 6.6 * conv);
    }

    // wire events
    [tSlider, timeS, catChk, matrix].forEach(function(el){
      if(!el) return;
      el.addEventListener("input", function(){
        simTime = 0; // whenever a control changes, reset sim clock for clarity
        updateStatic();
      });
    });

    if (btnPlay) btnPlay.addEventListener("click", function(){ running = true; });
    if (btnPause) btnPause.addEventListener("click", function(){ running = false; });
    if (btnReset) btnReset.addEventListener("click", function(){
      running = false; simTime = 0; lastTS = null; initParticles(); updateStatic();
    });
    presets.forEach(function(b){ b.addEventListener("click", function(){ applyPreset(this.dataset.preset); }); });

    // boot
    initParticles();
    updateStatic();
    requestAnimationFrame(loop);
  })();
});
