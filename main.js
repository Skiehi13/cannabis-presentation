/* Stoney Science — Presentation Engine + Interactives (UPDATED)
   ----------------------------------------------------------------------
   - Deck navigation, fit-to-frame, theme, handout/print
   - Glossary launcher + focus scroll
   - Osmosis (EC) slider
   - Freezing Point Depression simulator (with labels/ticks)
   - pH Nutrient Availability simulator (0–14 range, starts balanced)
   - Reaction Coordinate (mini) — clearer & accurate relative rate
   - Decarb Lab (Arrhenius) — real-time animation with elapsed time,
     products fill & persist, presets, play/pause/reset
   - Reference sorter (alphabetize + de-duplicate)
*/

window.addEventListener("DOMContentLoaded", function () {
  var deck = document.getElementById("deck");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  // ---------------------
  // Start / Progress Bar
  // ---------------------
  var i = 0;
  slides.forEach(function (s) { s.classList.remove("current", "anim-left", "anim-right"); });
  slides[0].classList.add("current");

  var bar = document.getElementById("progressBar");
  var durations = slides.map(function (s) { return Number(s.getAttribute("data-duration") || 40); });
  var total = durations.reduce(function (a, b) { return a + b; }, 0);

  function setProgress() {
    var elapsed = durations.slice(0, i).reduce(function (a, b) { return a + b; }, 0);
    if (bar) bar.style.width = ((elapsed / total) * 100) + "%";
  }

  // ---------------------
  // Fit slides to stage
  // ---------------------
  function fitSlide(slide) {
    if (!slide || document.body.classList.contains("handout")) return resetSlide(slide);
    var inner = slide.querySelector(".inner");
    if (!inner) return;
    inner.style.transform = "none";
    inner.style.marginTop = "0";
    var pad = 16;
    var availW = deck.clientWidth - pad * 2;
    var availH = deck.clientHeight - pad * 2;
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
  function resetSlide(slide) {
    var inner = slide && slide.querySelector(".inner");
    if (inner) { inner.style.transform = "none"; inner.style.marginTop = "0"; }
  }
  function fitCurrent() { fitSlide(slides[i]); }

  function show(k) {
    var nextIdx = (k + slides.length) % slides.length;
    if (nextIdx === i) return;
    var forward = (nextIdx > i) || (i === slides.length - 1 && nextIdx === 0);
    slides.forEach(function (s) { s.classList.remove("current", "anim-left", "anim-right"); });
    i = nextIdx;
    var next = slides[i];
    next.classList.add("current", forward ? "anim-right" : "anim-left");
    setProgress();
    fitCurrent();
  }

  function next() { ensurePresenting(); if (!isHandout()) show(i + 1); }
  function prev() { ensurePresenting(); if (!isHandout()) show(i - 1); }

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === " ") { next(); }
    if (e.key === "ArrowLeft") { prev(); }
    if (e.key && e.key.toLowerCase() === "f") { toggleFS(); }
    if (e.key && e.key.toLowerCase() === "g") { toggleGlossary(true); }
    if (e.key && e.key.toLowerCase() === "h") { toggleHandout(); }
    if (e.key && e.key.toLowerCase() === "p") { doPrint(); }
    if (e.key && e.key.toLowerCase() === "d") { toggleTheme(); }
  });

  var started = false;
  function ensurePresenting() {
    if (started) return;
    started = true;
    document.body.classList.add("presenting");
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () { });
      }
    } catch (e) { }
    fitCurrent();
  }
  if (deck) deck.addEventListener("click", ensurePresenting);

  document.addEventListener("fullscreenchange", function () {
    if (document.fullscreenElement) { document.body.classList.add("presenting"); }
    else { document.body.classList.remove("presenting"); }
    fitCurrent();
  });

  function toggleFS() {
    var el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) { el.requestFullscreen(); }
    else if (document.exitFullscreen) { document.exitFullscreen(); }
  }

  // ---------------------
  // Glossary modal
  // ---------------------
  var glossary = document.getElementById("glossary");
  var closeGloss = glossary ? glossary.querySelector(".close") : null;
  function toggleGlossary(open) { if (glossary) glossary.hidden = !open; }
  if (closeGloss) closeGloss.addEventListener("click", function () { toggleGlossary(false); });
  if (glossary) glossary.addEventListener("click", function (e) { if (e.target === glossary) toggleGlossary(false); });

  // Inline def buttons open glossary & scroll to term
  var defBtns = document.querySelectorAll(".def");
  for (var d = 0; d < defBtns.length; d++) {
    defBtns[d].addEventListener("click", function () {
      toggleGlossary(true);
      var id = "g-" + this.getAttribute("data-term");
      setTimeout(function () {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    });
  }

  // ---------------------
  // Osmosis (EC) slider
  // ---------------------
  (function () {
    var r = document.getElementById("ecRange");
    if (!r) return;
    var ecVal = document.getElementById("ecVal");
    var tone = document.getElementById("tonicity");
    var up = document.getElementById("uptake");
    var arrowsIn = document.getElementById("arrowsIn");
    var arrowsOut = document.getElementById("arrowsOut");
    function update() {
      var v = parseFloat(r.value);
      if (ecVal) ecVal.textContent = v.toFixed(1);
      if (v < 1.1) { tone.textContent = "hypotonic"; up.textContent = "water in"; if(arrowsIn)arrowsIn.style.opacity = 1; if(arrowsOut)arrowsOut.style.opacity = .15; }
      else if (v > 1.9) { tone.textContent = "hypertonic"; up.textContent = "water out"; if(arrowsIn)arrowsIn.style.opacity = .15; if(arrowsOut)arrowsOut.style.opacity = 1; }
      else { tone.textContent = "isotonic"; up.textContent = "balanced"; if(arrowsIn)arrowsIn.style.opacity = .8; if(arrowsOut)arrowsOut.style.opacity = .25; }
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
  (function () {
    var slider = document.getElementById("phSlider");
    if (!slider) return;

    // Force full 0–14 range without changing HTML
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

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function bell(x, mu, sigma) {
      var t = (x - mu) / sigma;
      return Math.exp(-0.5 * t * t);
    }

    // Centered optima & spreads for hydro/soilless cannabis
    function availability(pH) {
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

    function tone(pH) {
      if (pH < 5.5) return "strongly acidic";
      if (pH < 6.0) return "acidic";
      if (pH <= 7.0) return "balanced";
      if (pH <= 7.5) return "alkaline";
      return "strongly alkaline";
    }

    function update() {
      var pH = parseFloat(slider.value);
      if (phVal) phVal.textContent = pH.toFixed(1);
      if (phTone) phTone.textContent = tone(pH);
      var avail = availability(pH);
      Object.keys(bars).forEach(function (k) {
        var el = bars[k];
        if (!el) return;
        el.style.width = (avail[k] * 100).toFixed(0) + "%";
      });
    }
    slider.addEventListener("input", update);
    update();
  })();

  // -----------------------------------
  // Reaction Coordinate (mini) — clearer & accurate
  // -----------------------------------
  (function () {
    var svg = document.getElementById("rcDiagram");
    if (!svg) return;
    var chkCat = document.getElementById("rcCatalyst");
    var tempSlider = document.getElementById("rcTemp");
    var tempVal = document.getElementById("rcTempVal");
    var btnReset = document.getElementById("rcReset");
    var eaVal = document.getElementById("rcEaVal");
    var relRate = document.getElementById("rcRelRate");
    var pathUncat = document.getElementById("curve-uncat");
    var pathCat = document.getElementById("curve-cat");
    var eaGroup = document.getElementById("eaGroup");
    var eaLine = document.getElementById("eaLine");
    var eaArrowUp = document.getElementById("eaArrowUp");
    var eaArrowDn = document.getElementById("eaArrowDown");
    var eaText = document.getElementById("eaText");
    var dots = document.getElementById("tempDots");
    var terpWarn = document.getElementById("terpCaution");

    var Ea_ref_kJ = 120, catalystFactor = 0.70, TrefC = 120, R = 8.314;

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function kRel(Ea_kJ, T_C) {
      var T = T_C + 273.15, Tref = TrefC + 273.15;
      var Ea = Ea_kJ * 1000;
      var exponent = -Ea / R * (1 / T - 1 / Tref);
      return Math.exp(exponent);
    }
    function yPeakFromEa(Ea_kJ) {
      var EaMin = 70, EaMax = 140, yMax = 160, yMin = 90;
      var t = clamp((Ea_kJ - EaMin) / (EaMax - EaMin), 0, 1);
      return yMax - t * (yMax - yMin);
    }
    function buildCurve(yPeak) {
      var x0 = 80, y0 = 280, x3 = 620, y3 = 240, x1 = 220, x2 = 460;
      var y1 = (y0 + yPeak) * 0.45, y2 = (y3 + yPeak) * 0.55 + 40;
      return "M " + x0 + "," + y0 + " C " + x1 + "," + y1 + " " + x2 + "," + y2 + " " + x3 + "," + y3;
    }
    function sync() {
      var T_C = tempSlider ? Number(tempSlider.value) : TrefC;
      var useCat = !!(chkCat && chkCat.checked);
      var Ea_kJ = useCat ? Ea_ref_kJ * catalystFactor : Ea_ref_kJ;

      if (tempVal) tempVal.textContent = T_C.toFixed(0) + " °C";
      if (eaVal) eaVal.textContent = Ea_kJ.toFixed(0);
      if (relRate) relRate.textContent = kRel(Ea_kJ, T_C).toFixed(2) + "×";

      var yPeak = yPeakFromEa(Ea_kJ);
      var d = buildCurve(yPeak);
      if (useCat) { pathCat.classList.remove("hidden"); pathUncat.classList.add("hidden"); pathCat.setAttribute("d", d); }
      else { pathCat.classList.add("hidden"); pathUncat.classList.remove("hidden"); pathUncat.setAttribute("d", d); }

      if (eaGroup) {
        var xPeak = 320, yReact = 280, yTop = yPeak;
        eaLine.setAttribute("x1", xPeak); eaLine.setAttribute("x2", xPeak);
        eaLine.setAttribute("y1", yTop); eaLine.setAttribute("y2", yReact);
        eaArrowUp.setAttribute("points", xPeak + "," + (yTop - 10) + " " + (xPeak - 6) + "," + (yTop + 4) + " " + (xPeak + 6) + "," + (yTop + 4));
        eaArrowDn.setAttribute("points", xPeak + "," + (yReact + 10) + " " + (xPeak - 6) + "," + (yReact - 4) + " " + (xPeak + 6) + "," + (yReact - 4));
        eaText.setAttribute("x", xPeak + 8); eaText.setAttribute("y", (yTop + yReact) / 2);
      }

      var durRef = 2.2;
      var speedFactor = kRel(Ea_kJ, T_C);
      if (dots) dots.style.setProperty("--dotDur", (durRef / Math.max(0.2, speedFactor)).toFixed(2) + "s");

      if (terpWarn) terpWarn.classList.toggle("hidden", T_C < 130);
    }

    if (chkCat) chkCat.addEventListener("change", sync);
    if (tempSlider) tempSlider.addEventListener("input", sync);
    if (btnReset) btnReset.addEventListener("click", function () {
      if (chkCat) chkCat.checked = false;
      if (tempSlider) tempSlider.value = TrefC;
      sync();
    });

    // init
    if (tempSlider) tempSlider.value = TrefC;
    if (chkCat) chkCat.checked = false;
    sync();
  })();

  // -----------------------------------
  // Decarb Lab (Arrhenius) — real-time elapsed animation
  // -----------------------------------
  (function () {
    var wrap = document.getElementById("decarb-lab");
    if (!wrap) return;

    // Controls
    var temp = document.getElementById("labTemp");
    var timeTarget = document.getElementById("labTime"); // target/minutes
    var cat = document.getElementById("labCatalyst");
    var matrix = document.getElementById("labMatrix");
    var tVal = document.getElementById("labTempVal");
    var timeVal = document.getElementById("labTimeVal");
    var btnPlay = document.getElementById("labPlay");
    var btnPause = document.getElementById("labPause");
    var btnReset = document.getElementById("labReset");
    var presets = document.querySelectorAll(".preset");

    // Readouts
    var kOut = document.getElementById("labK");
    var t12Out = document.getElementById("labT12");
    var convOut = document.getElementById("labConv");
    var terpOut = document.getElementById("labTerp");
    var warn = document.getElementById("labWarn");

    // Viz groups
    var barrier = document.getElementById("labBarrier");
    var reactG = document.getElementById("labParticles");
    var prodG  = document.getElementById("labProducts");
    var convBar = document.getElementById("labConvBar");

    // Parameters (demo-scaled)
    var R = 8.314;            // J/mol/K
    var Ea_base = 120e3;      // J/mol baseline
    var A_base = 0.02;        // 1/min — demo scale
    var catalystFactor = 0.7; // lowers Ea ~30%
    var matrices = { air: 1.00, oil: 1.15, ethanol: 1.30 };

    var TOTAL_PARTICLES = 28;
    var playing = false, req = null;
    var simElapsedMin = 0;      // simulated elapsed minutes
    var lastTs = null;          // last RAF timestamp

    function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
    function EaEffective(){ return Ea_base * (cat && cat.checked ? catalystFactor : 1.0); }
    function AEffective(){ return A_base * (matrices[matrix ? matrix.value : "air"] || 1.0); }
    function kArrhenius(T_C){ var T=T_C+273.15; return AEffective()*Math.exp(-EaEffective()/(R*T)); }
    function halfLife(k){ return k>0 ? Math.log(2)/k : Infinity; }
    function conversion(k, minutes){ return 1 - Math.exp(-k*minutes); }
    function terpLoss(T_C, minutes){
      var base = (T_C <= 120) ? 0.05 : (T_C <= 130) ? 0.12 : 0.25;
      var extra = Math.max(0, T_C - 130) * 0.01;
      var tFac = Math.min(0.35, minutes * 0.0025);
      return clamp(base + extra + tFac, 0, 0.95);
    }

    function yPeakFromEa(EaJ){
      var EaMin=70e3, EaMax=160e3, yMax=140, yMin=80;
      var t = clamp((EaJ - EaMin)/(EaMax - EaMin), 0, 1);
      return yMin + (yMax - yMin)*t;
    }
    function updateBarrier(){
      if(!barrier) return;
      var y = yPeakFromEa(EaEffective());
      var d = "M 250,300 C 360,"+y.toFixed(1)+" 460,"+(y+40).toFixed(1)+" 510,300";
      barrier.setAttribute("d", d);
    }

    function clearGroup(g){ while(g && g.firstChild){ g.removeChild(g.firstChild);} }
    function spawnReactants(n){
      clearGroup(reactG); clearGroup(prodG);
      for(var j=0;j<n;j++){
        var c = document.createElementNS("http://www.w3.org/2000/svg","circle");
        c.setAttribute("r",(Math.random()*4+3).toFixed(1));
        c.setAttribute("cx",(70+Math.random()*160).toFixed(1));
        c.setAttribute("cy",(280+Math.random()*16).toFixed(1));
        c.setAttribute("fill","#7b61ff");
        c.setAttribute("stroke","#222");
        c.setAttribute("stroke-width","2");
        reactG.appendChild(c);
      }
    }

    function animateReactantsFrame(k, T_C){
      var jumpProb = clamp(k*0.6, 0, 0.9);  // visible hops
      var jitter = clamp((T_C - 90)/70, 0.1, 1.2);

      var nodes = reactG ? reactG.querySelectorAll("circle") : [];
      nodes.forEach(function(n){
        var cx = parseFloat(n.getAttribute("cx"));
        var cy = parseFloat(n.getAttribute("cy"));
        // jitter
        cx += (Math.random()-0.5)*2*jitter;
        cy += (Math.random()-0.5)*1.2*jitter;
        cx = clamp(cx, 60, 260);
        cy = clamp(cy, 260, 300);
        n.setAttribute("cx", cx.toFixed(1));
        n.setAttribute("cy", cy.toFixed(1));

        // occasional visual hop toward product basin
        if (Math.random() < jumpProb*0.04){
          n.setAttribute("cx", (520 + Math.random()*160).toFixed(1));
          n.setAttribute("cy", (285 + Math.random()*10).toFixed(1));
        }
      });
    }

    function reconcileParticlesToConversion(conv){
      if(!reactG || !prodG) return;
      var wantProd = Math.round(TOTAL_PARTICLES * clamp(conv,0,1));
      var haveProd = prodG.querySelectorAll("circle").length;
      var haveReact= reactG.querySelectorAll("circle").length;

      // move from reactants → products
      while(haveProd < wantProd && haveReact > 0){
        var n = reactG.firstChild;
        if(!n) break;
        reactG.removeChild(n);
        n.setAttribute("cx",(520 + Math.random()*160).toFixed(1));
        n.setAttribute("cy",(285 + Math.random()*10).toFixed(1));
        n.setAttribute("fill","#2f7d32");
        prodG.appendChild(n);
        haveProd++; haveReact--;
      }
      // move back if conversion decreased
      while(haveProd > wantProd){
        var p = prodG.firstChild;
        if(!p) break;
        prodG.removeChild(p);
        p.setAttribute("cx",(70 + Math.random()*160).toFixed(1));
        p.setAttribute("cy",(280 + Math.random()*16).toFixed(1));
        p.setAttribute("fill","#7b61ff");
        reactG.appendChild(p);
        haveProd--; haveReact++;
      }
    }

    function updateUI(){
      var T_C = parseFloat(temp.value);
      var k = kArrhenius(T_C);

      // target time is upper bound for progress bar; conversion uses simElapsedMin
      var target = parseFloat(timeTarget.value);
      var conv = conversion(k, simElapsedMin);
      var t12  = halfLife(k);
      var terp = terpLoss(T_C, simElapsedMin);

      if (tVal) tVal.textContent = T_C.toFixed(0) + " °C";
      if (timeVal) timeVal.textContent = Math.min(simElapsedMin, target).toFixed(0) + " / " + target.toFixed(0) + " min";
      if (kOut) kOut.textContent = k.toExponential(3);
      if (t12Out) t12Out.textContent = isFinite(t12) ? t12.toFixed(1) + " min" : "—";
      if (convOut) convOut.textContent = Math.round(conv*100) + "%";
      if (terpOut) terpOut.textContent = Math.round(terp*100) + "%";
      if (warn) warn.classList.toggle("hidden", T_C < 130);

      if (convBar){
        var pct = clamp(simElapsedMin / target, 0, 1) * clamp(conv,0,1);
        var width = 660 * clamp(conv, 0, 1);
        convBar.setAttribute("width", width.toFixed(1));
      }

      updateBarrier();
      reconcileParticlesToConversion(conv);
    }

    function tick(ts){
      if (!playing){ lastTs = null; return; }
      if (lastTs == null) lastTs = ts;
      var dtMs = ts - lastTs;
      lastTs = ts;
      // Advance simulated minutes (speed ~ 1 sec realtime = 1 min simulated)
      simElapsedMin += dtMs / 1000;

      // stop auto-advancing when reaching target time
      var target = parseFloat(timeTarget.value);
      if (simElapsedMin >= target){
        simElapsedMin = target;
        playing = false;
      }

      var T_C = parseFloat(temp.value);
      var k = kArrhenius(T_C);
      animateReactantsFrame(k, T_C);
      updateUI();
      if (playing) req = requestAnimationFrame(tick);
    }

    function play(){
      if(!playing){
        playing = true;
        req = requestAnimationFrame(tick);
      }
    }
    function pause(){
      playing = false;
    }
    function reset(){
      pause();
      simElapsedMin = 0;
      temp.value = 120;
      timeTarget.value = 40;
      if (cat) cat.checked = false;
      if (matrix) matrix.value = "oil";
      spawnReactants(TOTAL_PARTICLES);
      updateUI();
    }

    // Presets
    presets.forEach(function(btn){
      btn.addEventListener("click", function(){
        var p = btn.getAttribute("data-preset");
        if (p==="slow"){ temp.value=110; timeTarget.value=90; if(cat) cat.checked=false; matrix.value="oil"; simElapsedMin=0; }
        else if (p==="balanced"){ temp.value=120; timeTarget.value=45; if(cat) cat.checked=false; matrix.value="oil"; simElapsedMin=0; }
        else if (p==="toasty"){ temp.value=135; timeTarget.value=20; if(cat) cat.checked=true; matrix.value="ethanol"; simElapsedMin=0; }
        updateUI();
      });
    });

    // Bind
    temp.addEventListener("input", updateUI);
    timeTarget.addEventListener("input", function(){
      // keep elapsed <= target
      var target = parseFloat(timeTarget.value);
      if (simElapsedMin > target) simElapsedMin = target;
      updateUI();
    });
    if (cat) cat.addEventListener("change", updateUI);
    if (matrix) matrix.addEventListener("change", updateUI);
    btnPlay.addEventListener("click", play);
    btnPause.addEventListener("click", pause);
    btnReset.addEventListener("click", reset);

    // Init
    spawnReactants(TOTAL_PARTICLES);
    reset();
  })();

  // ---------------------------------------------------
  // Auto-sort & de-duplicate References (APA-ish)
  // ---------------------------------------------------
  (function () {
    var refSlides = Array.prototype.slice.call(document.querySelectorAll(".slide .refs .ref-list"));
    if (!refSlides.length) return;

    var entries = [];
    refSlides.forEach(function (list) {
      Array.prototype.slice.call(list.querySelectorAll("p")).forEach(function (p) {
        var html = p.innerHTML.trim();
        var text = p.textContent.trim().replace(/\s+/g, " ").replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
        if (!text) return;
        entries.push({ html: html, key: text.toLowerCase() });
      });
    });

    var seen = new Set();
    var deduped = [];
    entries.forEach(function (e) { if (!seen.has(e.key)) { seen.add(e.key); deduped.push(e); } });

    deduped.sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });

    var half = Math.ceil(deduped.length / 2);
    var chunks = [deduped.slice(0, half), deduped.slice(half)];

    refSlides.forEach(function (list, idx) {
      var chunk = chunks[idx] || [];
      var html = chunk.map(function (e) { return "<p>" + e.html + "</p>"; }).join("");
      list.innerHTML = html || "<p><em>No references listed.</em></p>";
    });
  })();

  // ---------------------
  // Theme / Handout tools
  // ---------------------
  function isHandout() { return document.body.classList.contains("handout"); }
  function toggleHandout() {
    var on = document.body.classList.toggle("handout");
    if (on) { slides.forEach(resetSlide); }
    else { fitCurrent(); }
  }
  function doPrint() {
    var wasHandout = isHandout();
    if (!wasHandout) document.body.classList.add("handout");
    setTimeout(function () { window.print(); if (!wasHandout) document.body.classList.remove("handout"); }, 50);
  }
  var saved = null;
  try { saved = localStorage.getItem("stoneyTheme"); } catch (e) { }
  if (saved === "dark" || (saved === null && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.body.classList.add("dark");
  }
  function toggleTheme() {
    var dark = document.body.classList.toggle("dark");
    try { localStorage.setItem("stoneyTheme", dark ? "dark" : "light"); } catch (e) { }
    fitCurrent();
  }

  window.addEventListener("resize", fitCurrent);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCurrent);
  document.querySelectorAll(".slide img").forEach(function (imgEl) {
    imgEl.addEventListener("load", function () { if (imgEl.closest(".slide") === slides[i]) fitCurrent(); });
  });

  setProgress();
  fitCurrent();
  if (deck) deck.focus();
});
