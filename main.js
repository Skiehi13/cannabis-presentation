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

  // Inline def buttons open glossary & scroll to term
  var defBtns = document.querySelectorAll(".def");
  for (var d=0; d<defBtns.length; d++){
    defBtns[d].addEventListener("click", function(){
      toggleGlossary(true);
      var id = "g-" + this.getAttribute("data-term");
      setTimeout(function(){
        var el = document.getElementById(id);
        if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
      }, 25);
    });
  }

  // ====== Existing EC/Osmosis viz ======
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

  // ====== NEW: Freezing point depression sim ======
  (function(){
    var m = document.getElementById("fpdMolality");
    var mVal = document.getElementById("fpdMolalityVal");
    var iSel = document.getElementById("fpdI");
    var dOut = document.getElementById("fpdDelta");
    var tfOut= document.getElementById("fpdTF");
    var mercury = document.getElementById("fpdMercury");
    var bar = document.getElementById("fpdBar");
    var label = document.getElementById("fpdLabel");
    if(!m || !iSel || !mercury || !bar || !label) return;

    var Kf = 1.86; // °C·kg/mol for water
    function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
    function update(){
      var mol = parseFloat(m.value);
      var i = parseFloat(iSel.value);
      if(mVal) mVal.textContent = mol.toFixed(2);
      var dTf = -i * Kf * mol;          // °C change
      var Tf = 0 + dTf;
      dOut.textContent = dTf.toFixed(2) + " °C";
      tfOut.textContent = Tf.toFixed(2) + " °C";
      label.textContent = Tf.toFixed(1) + " °C";

      // Map freezing point -10..0 °C to mercury height
      var frac = clamp((Tf + 10) / 10, 0, 1); // -10 => 0, 0 => 1
      var h = 140 * frac;
      mercury.setAttribute("y", 80 + (140 - h));
      mercury.setAttribute("height", h);

      // progress bar: more depression → more width
      var w = clamp(Math.abs(dTf) * 30, 0, 660);
      bar.setAttribute("width", w);
    }
    m.addEventListener("input", update);
    iSel.addEventListener("input", update);
    update();
  })();

  // ====== NEW: pH simulator ======
  (function(){
    var s = document.getElementById("phSlider");
    if(!s) return;
    var v = document.getElementById("phVal");
    var tone = document.getElementById("phTone");

    var bars = {
      N:  document.getElementById("barN"),
      P:  document.getElementById("barP"),
      K:  document.getElementById("barK"),
      Ca: document.getElementById("barCa"),
      Mg: document.getElementById("barMg"),
      Fe: document.getElementById("barFe"),
      Mn: document.getElementById("barMn"),
    };

    function bell(x, mu, sigma){ return Math.exp(-0.5 * Math.pow((x-mu)/sigma, 2)); } // 0..1
    function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

    function availFor(pH){
      // broad, qualitative maxima typical of hydro/coco
      return {
        N:  bell(pH, 6.2, 0.6),
        P:  bell(pH, 6.3, 0.5),
        K:  bell(pH, 6.2, 0.5),
        Ca: bell(pH, 6.4, 0.5),
        Mg: bell(pH, 6.3, 0.5),
        Fe: bell(pH, 5.8, 0.4),
        Mn: bell(pH, 5.8, 0.4),
      };
    }

    function descriptor(pH){
      if(pH < 5.5) return "acidic";
      if(pH > 7.5) return "alkaline";
      if(pH < 6.2) return "slightly acidic";
      if(pH > 6.8) return "slightly alkaline";
      return "near-neutral";
    }

    function render(){
      var pH = parseFloat(s.value);
      v.textContent = pH.toFixed(1);
      tone.textContent = descriptor(pH);
      var a = availFor(pH);
      Object.keys(bars).forEach(function(k){
        var w = Math.round(clamp(a[k],0,1) * 100);
        bars[k].style.width = w + "%";
      });
    }

    s.addEventListener("input", render);
    render();
  })();

  // ====== Reaction coordinate mini-interactive ======
  (function(){
    var svg = document.getElementById("rcDiagram");
    if(!svg) return;
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

    var Ea_ref_kJ = 120, catalystFactor = 0.75, TrefC = 120, R = 8.314;

    function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
    function kRel(Ea_kJ, T_C){
      var T = T_C + 273.15, Tref = TrefC + 273.15;
      var Ea = Ea_kJ * 1000;
      var exponent = -Ea/R * (1/T - 1/Tref);
      return Math.exp(exponent);
    }
    function yPeakFromEa(Ea_kJ){
      var EaMin = 80, EaMax = 140, yMax = 180, yMin = 120;
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
      var speedFactor = clamp(T/Tref, 0.6, 1.6);
      if (dots) dots.style.setProperty("--dotDur", (durRef / speedFactor).toFixed(2) + "s");

      if (terpWarn) terpWarn.classList.toggle("hidden", T_C < 130);

      // Update E_a arrow group placement
      var xPeak=320, yReact=280, yTop=yPeak;
      eaLine.setAttribute("x1",xPeak); eaLine.setAttribute("x2",xPeak);
      eaLine.setAttribute("y1",yTop);  eaLine.setAttribute("y2",yReact);
      eaArrowUp.setAttribute("points", `${xPeak},${yTop-10} ${xPeak-6},${yTop+4} ${xPeak+6},${yTop+4}`);
      eaArrowDn.setAttribute("points", `${xPeak},${yReact+10} ${xPeak-6},${yReact-4} ${xPeak+6},${yReact-4}`);
      eaText.setAttribute("x",xPeak+8); eaText.setAttribute("y",(yTop+yReact)/2);
    }
    if (chkCat) chkCat.addEventListener("change", sync);
    if (tempSlider) tempSlider.addEventListener("input", sync);
    if (btnReset) btnReset.addEventListener("click", function(){
      if (chkCat) chkCat.checked = false;
      if (tempSlider){ tempSlider.value = TrefC; }
      sync();
    });
    sync();
  })();

  // ====== Theme / handout utilities ======
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

  // ====== UPGRADED Decarb Lab (accurate Arrhenius) ======
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
    var t12Out = document.getElementById("labT12");
    var convOut = document.getElementById("labConv");
    var terpOut = document.getElementById("labTerp");
    var warn = document.getElementById("labWarn");

    var svg = document.getElementById("labSVG");
    var barrier = document.getElementById("labBarrier");
    var particlesG = document.getElementById("labParticles");
    var convBar = document.getElementById("labConvBar");

    var R = 8.314;                 // J/mol·K
    var EaBase = 120e3;            // J/mol
    var A_base = 3e14;             // 1/min — chosen so ~70–80% at 120°C, 40 min
    var catalystFactor = 0.75;     // lowers Ea by 25%
    var matrixFactorEa = { air: 1.00, oil: 0.90, ethanol: 0.85 }; // friendlier media
    var matrixFactorA  = { air: 1.00, oil: 1.15, ethanol: 1.25 }; // pre-exponential bump

    var running = false;
    var simTime = 0; // simulated minutes elapsed while playing
    var lastTS = null;

    // particle system
    var N = 28;
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
      var T_C = Number(tSlider.value);
      var T_K = T_C + 273.15;
      var minsTarget = Number(timeS.value);
      var useCat = !!catChk.checked;
      var mtx = matrix.value;

      var Ea = EaBase * (useCat ? catalystFactor : 1.0) * (matrixFactorEa[mtx] || 1.0); // J/mol
      var A  = A_base * (matrixFactorA[mtx] || 1.0);                                    // 1/min
      var k = A * Math.exp(-Ea/(R*T_K));                                                // 1/min

      return { T_C, T_K, minsTarget, useCat, mtx, Ea, A, k };
    }

    function terpLossPct(T_C, minutes){
      var base = Math.max(0, T_C - 115) * 0.28;
      var accel = T_C >= 130 ? 1.7 : 1.0;
      var timeFactor = Math.log1p(minutes) * 1.15;
      return clamp(base * accel * timeFactor * 0.25, 0, 100);
    }

    function conversionPct(k, minutes){
      var frac = 1 - Math.exp(-k * minutes);
      return clamp(frac*100, 0, 100);
    }

    function morphBarrier(EaJ){
      var Ea_kJ = EaJ/1000;
      var peakY = 160 + (Ea_kJ - 80) * 0.7; // map 80–140 → ~160–202
      peakY = clamp(peakY, 120, 210);
      var d = `M 250,300 C 360,${peakY} 460,${peakY+40} 510,300`;
      barrier.setAttribute("d", d);
    }

    function hopProbability(k){
      // convert k (1/min) to per-second success-ish probability
      return clamp(k/60, 0.005, 0.5);
    }

    function tick(dtSec){
      if (running) simTime += dtSec * 3; // 1 real sec ≈ 3 simulated min

      var S = state();
      if (tOut) tOut.textContent = S.T_C.toFixed(0) + " °C";
      if (timeOut) timeOut.textContent = Math.round(S.minsTarget) + " min";
      if (warn) warn.classList.toggle("hidden", S.T_C < 130);

      morphBarrier(S.Ea);

      var minsUsed = running ? Math.min(simTime, S.minsTarget) : S.minsTarget;
      var conv = conversionPct(S.k, minsUsed);
      var terp = terpLossPct(S.T_C, minsUsed);
      var t12 = S.k > 0 ? Math.log(2)/S.k : Infinity;

      if (kOut) kOut.textContent = S.k.toFixed(3);
      if (t12Out) t12Out.textContent = (isFinite(t12)? t12.toFixed(1) + " min" : "—");
      if (convOut) convOut.textContent = conv.toFixed(0) + "%";
      if (terpOut) terpOut.textContent = Math.round(terp) + "%";
      if (convBar) convBar.setAttribute("width", 6.6 * conv);

      // particle animation
      var pHop = hopProbability(S.k) * dtSec;
      particles.forEach(function(p){
        p.x += rand(-8,8) * dtSec * 6;
        p.y += rand(-4,4) * dtSec * 6;
        p.x = clamp(p.x, 60, 700);
        p.y = clamp(p.y, 220, 305);

        if (p.state === "reactant" && p.x < 250){
          p.x += rand(10,30) * dtSec * (1 + S.k*0.2);
        }

        if (p.state === "reactant" && p.x >= 250 && Math.random() < pHop){
          var bonus = (S.T_C - 100) * 0.002;
          if (Math.random() < 0.5 + bonus){
            p.x = rand(520,680);
            p.y = rand(250,290);
            p.state = "product";
          } else {
            p.x = rand(200,240);
            p.y = rand(250,300);
          }
        }

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
      if (tOut) tOut.textContent = S.T_C.toFixed(0) + " °C";
      if (timeOut) timeOut.textContent = Math.round(S.minsTarget) + " min";
      if (warn) warn.classList.toggle("hidden", S.T_C < 130);

      var conv = conversionPct(S.k, S.minsTarget);
      var terp = terpLossPct(S.T_C, S.minsTarget);
      var t12 = S.k > 0 ? Math.log(2)/S.k : Infinity;

      if (kOut) kOut.textContent = S.k.toFixed(3);
      if (t12Out) t12Out.textContent = (isFinite(t12)? t12.toFixed(1) + " min" : "—");
      if (convOut) convOut.textContent = conv.toFixed(0) + "%";
      if (terpOut) terpOut.textContent = Math.round(terp) + "%";
      if (convBar) convBar.setAttribute("width", 6.6 * conv);
    }

    [tSlider, timeS, catChk, matrix].forEach(function(el){
      if(!el) return;
      el.addEventListener("input", function(){
        simTime = 0;
        updateStatic();
      });
    });

    if (btnPlay) btnPlay.addEventListener("click", function(){ running = true; });
    if (btnPause) btnPause.addEventListener("click", function(){ running = false; });
    if (btnReset) btnReset.addEventListener("click", function(){
      running = false; simTime = 0; lastTS = null; initParticles(); updateStatic();
    });
    (document.querySelectorAll(".preset")||[]).forEach(function(b){ b.addEventListener("click", function(){ applyPreset(this.dataset.preset); }); });

    initParticles();
    updateStatic();
    requestAnimationFrame(loop);
  })();
});
