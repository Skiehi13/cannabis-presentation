/* Stoney Science — Presentation Engine + Interactives
   ---------------------------------------------------
   - Deck navigation, fit-to-frame, theme, handout/print
   - Glossary launcher + focus scroll
   - Osmosis (EC) slider
   - Freezing Point Depression (FPD) simulator (with labels/ticks)
   - pH Nutrient Availability simulator (0–14 range, starts balanced)
   - Reaction Coordinate (mini) — relative rate & Ea visuals
   - Decarb Lab (Canvas): THCA -> THC + CO2 with Arrhenius rate
*/

window.addEventListener("DOMContentLoaded", function () {
  var deck = document.getElementById("deck");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  // ---------------------
  // Start / Progress Bar
  // ---------------------
  var i = 0;
  slides.forEach(function (s) { s.classList.remove("current","anim-left","anim-right"); });
  slides[0].classList.add("current");

  var bar = document.getElementById("progressBar");
  var durations = slides.map(function(s){ return Number(s.getAttribute("data-duration") || 40); });
  var total = durations.reduce(function(a,b){ return a+b; }, 0);

  function setProgress(){
    var elapsed = durations.slice(0,i).reduce(function(a,b){ return a+b; }, 0);
    if (bar) bar.style.width = ((elapsed/total)*100) + "%";
  }

  // ---------------------
  // Fit slides to stage
  // ---------------------
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

  // ---------------------
  // Glossary modal
  // ---------------------
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
      }, 50);
    });
  }

  // ---------------------
  // Osmosis (EC) slider
  // ---------------------
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
      if(v < 1.1){ if(tone) tone.textContent="hypotonic"; if(up) up.textContent="water in"; if(arrowsIn)arrowsIn.style.opacity=1; if(arrowsOut)arrowsOut.style.opacity=.15; }
      else if(v > 1.9){ if(tone) tone.textContent="hypertonic"; if(up) up.textContent="water out"; if(arrowsIn)arrowsIn.style.opacity=.15; if(arrowsOut)arrowsOut.style.opacity=1; }
      else { if(tone) tone.textContent="isotonic"; if(up) up.textContent="balanced"; if(arrowsIn)arrowsIn.style.opacity=.8; if(arrowsOut)arrowsOut.style.opacity=.25; }
    }
    r.addEventListener("input", update);
    update();
  })();

  // -----------------------------------
  // Freezing Point Depression sim (with labels/ticks)
  // -----------------------------------
  (function () {
    var mSlider = document.getElementById("fpdMolality");
    var mVal = document.getElementById("fpdMolalityVal");
    var iSel = document.getElementById("fpdI");
    var deltaEl = document.getElementById("fpdDelta");
    var tfEl = document.getElementById("fpdTF");
    var bar = document.getElementById("fpdBar");
    var mercury = document.getElementById("fpdMercury");
    var label = document.getElementById("fpdLabel");
    if (!mSlider || !iSel || !deltaEl || !tfEl || !bar || !mercury || !label) return;

    var Kf = 1.86; // °C·kg/mol for water
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function update() {
      var m = parseFloat(mSlider.value || "0");
      var i = parseFloat(iSel.value || "1");
      if (mVal) mVal.textContent = m.toFixed(2);

      var dTf = i * Kf * m; // magnitude
      var Tf = 0 - dTf;

      deltaEl.textContent = (-dTf).toFixed(2);
      tfEl.textContent = Tf.toFixed(2);

      var pct = clamp(dTf / (Kf * 3 * 3), 0, 1);
      bar.setAttribute("width", (160 * pct).toFixed(1));

      // map -15..0 °C to mercury height
      var yTop = 80, yBot = 220;
      var norm = clamp((Tf + 15) / 15, 0, 1); // -15 → 0, 0 → 1
      var hgH = 140 * norm;
      var y = yTop + (140 - hgH);
      mercury.setAttribute("y", y.toFixed(1));
      mercury.setAttribute("height", hgH.toFixed(1));
      label.innerHTML = "T<sub>f</sub> = " + Tf.toFixed(1) + " °C";
    }
    mSlider.addEventListener("input", update);
    iSel.addEventListener("change", update);
    update();
  })();

  // -----------------------------------
  // pH Nutrient Availability sim (0–14 range, starts balanced)
  // -----------------------------------
  (function(){
    var slider = document.getElementById("phSlider");
    if(!slider) return;

    // full 0–14 range; start balanced ~6.5
    slider.min = "0.0";
    slider.max = "14.0";
    slider.step = "0.1";
    if (!slider.dataset.initOnce) { slider.value = "6.5"; slider.dataset.initOnce = "1"; }

    var phVal = document.getElementById("phVal");
    var phTone = document.getElementById("phTone");

    var bars = {
      N: document.getElementById("barN"),
      P: document.getElementById("barP"),
      K: document.getElementById("barK"),
      Ca: document.getElementById("barCa"),
      Mg: document.getElementById("barMg"),
      Fe: document.getElementById("barFe"),
      Mn: document.getElementById("barMn")
    };

    function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
    function bell(x, mu, sigma){
      var t = (x - mu) / sigma;
      return Math.exp(-0.5 * t * t);
    }
    function availability(pH){
      return {
        N:  clamp(bell(pH, 6.3, 0.9), 0, 1),
        P:  clamp(bell(pH, 6.2, 0.7), 0, 1),
        K:  clamp(bell(pH, 6.2, 1.0), 0, 1),
        Ca: clamp(bell(pH, 6.5, 0.7), 0, 1),
        Mg: clamp(bell(pH, 6.4, 0.7), 0, 1),
        Fe: clamp(bell(pH, 5.8, 0.6), 0, 1),
        Mn: clamp(bell(pH, 5.9, 0.6), 0, 1)
      };
    }
    function tone(pH){
      if (pH < 5.5) return "strongly acidic";
      if (pH < 6.0) return "acidic";
      if (pH <= 7.0) return "balanced";
      if (pH <= 7.5) return "alkaline";
      return "strongly alkaline";
    }
    function update(){
      var pH = parseFloat(slider.value);
      if (phVal) phVal.textContent = pH.toFixed(1);
      if (phTone) phTone.textContent = tone(pH);
      var avail = availability(pH);
      Object.keys(bars).forEach(function(k){
        var el = bars[k]; if(!el) return;
        el.style.width = (avail[k]*100).toFixed(0) + "%";
      });
    }
    slider.addEventListener("input", update);
    update();
  })();

  // -----------------------------------
  // Reaction Coordinate (mini)
  // -----------------------------------
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
      return "M "+x0+","+y0+" C "+x1+","+y1+" "+x2+","+y2+" "+x3+","+y3;
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

      if (eaGroup){
        var xPeak=320, yReact=280, yTop=yPeak;
        eaLine.setAttribute("x1",xPeak); eaLine.setAttribute("x2",xPeak);
        eaLine.setAttribute("y1",yTop);  eaLine.setAttribute("y2",yReact);
        eaArrowUp.setAttribute("points", xPeak+","+(yTop-10)+" "+(xPeak-6)+","+(yTop+4)+" "+(xPeak+6)+","+(yTop+4));
        eaArrowDn.setAttribute("points", xPeak+","+(yReact+10)+" "+(xPeak-6)+","+(yReact-4)+" "+(xPeak+6)+","+(yReact-4));
        eaText.setAttribute("x",xPeak+8); eaText.setAttribute("y",(yTop+yReact)/2);
      }

      var durRef=2.2;
      var speedFactor = kRel(Ea_kJ, T_C);
      if (dots) dots.style.setProperty("--dotDur", (durRef / Math.max(0.2, speedFactor)).toFixed(2) + "s");

      if (terpWarn) terpWarn.classList.toggle("hidden", T_C < 130);
    }
    if (chkCat)  chkCat.addEventListener("change", sync);
    if (tempSlider) tempSlider.addEventListener("input", sync);
    if (btnReset) btnReset.addEventListener("click", function(){
      if (chkCat) chkCat.checked = false;
      if (tempSlider){ tempSlider.value = TrefC; }
      sync();
    });
    if (tempSlider) tempSlider.value = TrefC;
    if (chkCat) chkCat.checked = false;
    sync();
  })();

  // ---------------------
  // Theme / Handout tools
  // ---------------------
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

/* === Decarb Lab — THCA -> THC + CO2 (Canvas Simulation) === */
(function(){
  var canvas = document.getElementById("labCanvas");
  if(!canvas) return; // lab not on this deck

  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;

  // Chambers
  var pad = 20;
  var midX = Math.floor(W/2);
  var leftBox  = {x:pad, y:pad+30, w:midX-pad*1.25, h:H- pad*2 - 30};
  var rightBox = {x:midX+pad*0.25, y:pad+30, w:W - (midX + pad*1.25), h:H- pad*2 - 30};
  var gateX = midX; // line between boxes

  // UI
  var elTemp = document.getElementById("labTemp");
  var elTempVal = document.getElementById("labTempVal");
  var elCat = document.getElementById("labCat");
  var elEaVal = document.getElementById("labEaVal");
  var elSpeed = document.getElementById("labSpeed");
  var elSpeedVal = document.getElementById("labSpeedVal");
  var elStart = document.getElementById("labStart");
  var elPause = document.getElementById("labPause");
  var elReset = document.getElementById("labReset");
  var cTHCA = document.getElementById("labCountTHCA");
  var cTHC  = document.getElementById("labCountTHC");
  var cCO2  = document.getElementById("labCountCO2");
  var relRateEl = document.getElementById("labRelRate");

  // Kinetics constants (visualized)
  var R = 8.314;              // J/mol·K
  var Ea_base = 120e3;        // J/mol
  var catFactor = 0.65;       // lowers Ea
  var TrefC = 120;            // °C reference for k_ref
  var k_ref = 0.12;           // s^-1 at Tref (chosen for good viz pacing)
  var vizSpeed = 1.0;

  function getTempC(){ return Number(elTemp ? elTemp.value : 120); }
  function getTempK(){ return getTempC() + 273.15; }
  function getEa(){
    var Ea = Ea_base;
    if (elCat && elCat.checked) Ea *= catFactor;
    return Ea;
  }
  function k_current(){
    var T  = getTempK();
    var Tr = TrefC + 273.15;
    var Ea = getEa();
    // Arrhenius relative to reference -> scale by k_ref
    var kRel = Math.exp( -Ea/R * (1/T - 1/Tr) );
    return k_ref * kRel; // s^-1
  }

  // Particles
  var N0 = 24;
  var particles = [];
  var co2Bubbles = [];
  var running = false;
  var lastT = performance.now();
  var THCcount = 0, THCAcount = N0, CO2count = 0;

  function rnd(min, max){ return Math.random()*(max-min)+min; }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function spawnParticles(){
    particles = [];
    THCcount = 0; THCAcount = N0; CO2count = 0; co2Bubbles = [];
    for (var i=0;i<N0;i++){
      var r = rnd(7,10);
      particles.push({
        id:i,
        x: rnd(leftBox.x + r + 4, leftBox.x + leftBox.w - r - 4),
        y: rnd(leftBox.y + r + 4, leftBox.y + leftBox.h - r - 4),
        vx: rnd(-30,30),
        vy: rnd(-30,30),
        r: r,
        state: "THCA",    // "THCA" | "THC"
        converting: false // transitioning across gate
      });
    }
    updateCounters();
  }

  function updateCounters(){
    if (cTHCA) cTHCA.textContent = THCAcount.toString();
    if (cTHC)  cTHC.textContent  = THCcount.toString();
    if (cCO2)  cCO2.textContent  = CO2count.toString();
  }

  function co2Burst(x,y){
    var n = Math.floor(rnd(1,3));
    for (var i=0;i<n;i++){
      co2Bubbles.push({
        x: x + rnd(-6,6),
        y: y,
        r: rnd(2,4),
        vy: rnd(-35,-20),
        life: 1.2 // seconds
      });
    }
    CO2count += n;
    updateCounters();
  }

  function draw(){
    // background
    ctx.clearRect(0,0,W,H);

    // chamber outlines
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#222";
    ctx.fillStyle = "rgba(255,255,255,0.75)";

    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(leftBox.x, leftBox.y, leftBox.w, leftBox.h, 18); }
    else { ctx.rect(leftBox.x, leftBox.y, leftBox.w, leftBox.h); }
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(rightBox.x, rightBox.y, rightBox.w, rightBox.h, 18); }
    else { ctx.rect(rightBox.x, rightBox.y, rightBox.w, rightBox.h); }
    ctx.fill(); ctx.stroke();

    // gate line
    ctx.strokeStyle = "rgba(34,34,34,.5)";
    ctx.setLineDash([8,6]);
    ctx.beginPath(); ctx.moveTo(gateX, leftBox.y); ctx.lineTo(gateX, leftBox.y + leftBox.h); ctx.stroke();
    ctx.setLineDash([]);

    // particles
    particles.forEach(function(p){
      if (p.state === "THCA"){
        ctx.fillStyle = "#7b61ff"; // purple-ish
        ctx.strokeStyle = "#2a2a2a";
      } else { // THC
        ctx.fillStyle = "#2f7d32"; // green
        ctx.strokeStyle = "#2a2a2a";
      }
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    });

    // CO2 bubbles
    co2Bubbles.forEach(function(b){
      var alpha = Math.max(0, b.life/1.2);
      ctx.fillStyle = "rgba(180,200,255,"+alpha.toFixed(3)+")";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    });
  }

  function keepInBox(p, box){
    // Bounce off walls
    if (p.x - p.r < box.x){ p.x = box.x + p.r; p.vx = Math.abs(p.vx); }
    if (p.x + p.r > box.x + box.w){ p.x = box.x + box.w - p.r; p.vx = -Math.abs(p.vx); }
    if (p.y - p.r < box.y){ p.y = box.y + p.r; p.vy = Math.abs(p.vy); }
    if (p.y + p.r > box.y + box.h){ p.y = box.y + box.h - p.r; p.vy = -Math.abs(p.vy); }
  }

  function tick(dt){
    // Update kinetics readouts
    var T = getTempC();
    var Ea_kJ = getEa()/1000;
    if (elTempVal) elTempVal.textContent = T.toFixed(0);
    if (elEaVal) elEaVal.textContent = Ea_kJ.toFixed(0);
    var k = k_current(); // s^-1
    if (relRateEl){
      var baseline = k_ref; // uncatalyzed 120 °C
      relRateEl.textContent = (k / baseline).toFixed(2) + "×";
    }

    // move particles
    var viz = vizSpeed;
    particles.forEach(function(p){
      // Brownian jiggle + drift
      p.vx += rnd(-15,15) * dt * viz;
      p.vy += rnd(-15,15) * dt * viz;
      // Speed clamp
      var vmax = 90 * viz;
      p.vx = clamp(p.vx, -vmax, vmax);
      p.vy = clamp(p.vy, -vmax, vmax);

      // Integrate
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // If converting, guide across the gate to right box
      if (p.converting){
        // bias towards gate & into right chamber
        var targetX = rightBox.x + 20 + (p.id % 4) * 16;
        var targetY = rightBox.y + 30 + (p.id % 6) * 18;
        p.vx += (targetX - p.x) * 0.8 * dt;
        p.vy += (targetY - p.y) * 0.8 * dt;

        // When fully inside right box, finalize
        if (p.x > rightBox.x + p.r + 2){
          p.converting = false;
          p.state = "THC";
          THCcount += 1;
          updateCounters();
          keepInBox(p, rightBox);
          return;
        }
      }

      // Keep in corresponding chamber
      if (p.state === "THCA" && !p.converting){
        keepInBox(p, leftBox);
      } else {
        keepInBox(p, rightBox);
      }
    });

    // stochastic decarb for THCA in left box
    // probability per step: p = 1 - exp(-k*dt)
    var pStep = 1 - Math.exp(-k * dt);
    for (var idx=0; idx<particles.length; idx++){
      var p = particles[idx];
      if (p.state !== "THCA" || p.converting) continue;
      if (Math.random() < pStep){
        // Convert: launch CO2 bubble; start migrating to right
        p.converting = true;
        THCAcount -= 1;
        updateCounters();
        co2Burst( clamp(p.x, leftBox.x+10, leftBox.x+leftBox.w-10), clamp(p.y, leftBox.y+10, leftBox.y+leftBox.h-10) );
      }
    }

    // update CO2 bubbles
    for (var j=co2Bubbles.length-1; j>=0; j--){
      var b = co2Bubbles[j];
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.y < leftBox.y - 10) co2Bubbles.splice(j,1);
    }
  }

  function loop(t){
    if (!running){ draw(); return; }
    var now = t || performance.now();
    var dt = (now - lastT)/1000; // seconds
    lastT = now;
    dt = Math.min(dt, 0.05); // clamp to avoid jumps

    // Apply vizSpeed from UI
    vizSpeed = Number(elSpeed ? elSpeed.value : 1.0);
    if (elSpeedVal) elSpeedVal.textContent = vizSpeed.toFixed(1);

    tick(dt);
    draw();
    req = requestAnimationFrame(loop);
  }

  // Controls
  var req = null;
  function start(){
    if (running) return;
    running = true;
    lastT = performance.now();
    req = requestAnimationFrame(loop);
  }
  function pause(){
    running = false;
    if (req) cancelAnimationFrame(req);
    draw();
  }
  function reset(){
    pause();
    spawnParticles();
    draw();
  }

  if (elStart) elStart.addEventListener("click", start);
  if (elPause) elPause.addEventListener("click", pause);
  if (elReset) elReset.addEventListener("click", reset);
  if (elTemp)  elTemp.addEventListener("input", function(){ if(elTempVal) elTempVal.textContent = Number(elTemp.value).toFixed(0); });
  if (elCat)   elCat.addEventListener("change", function(){ if(elEaVal) elEaVal.textContent = (getEa()/1000).toFixed(0); });
  if (elSpeed) elSpeed.addEventListener("input", function(){ if(elSpeedVal) elSpeedVal.textContent = Number(elSpeed.value).toFixed(1); });

  // Init
  spawnParticles();
  draw(); // render once
})();
