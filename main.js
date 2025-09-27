/* Stoney Science — Presentation Engine + Interactives (CLEAN, NO DECARB LAB)
   ----------------------------------------------------------------------
   - Deck navigation, fit-to-frame, theme, handout/print
   - Glossary launcher + focus scroll
   - Osmosis (EC) slider
   - Freezing Point Depression (FPD) simulator (with labels/ticks)
   - pH Nutrient Availability simulator (0–14 range, starts balanced)
   - Reaction Coordinate (mini) — clearer & accurate relative rate
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
      if(v < 1.1){ tone.textContent="hypotonic"; up.textContent="water in"; if(arrowsIn)arrowsIn.style.opacity=1; if(arrowsOut)arrowsOut.style.opacity=.15; }
      else if(v > 1.9){ tone.textContent="hypertonic"; up.textContent="water out"; if(arrowsIn)arrowsIn.style.opacity=.15; if(arrowsOut)arrowsOut.style.opacity=1; }
      else { tone.textContent="isotonic"; up.textContent="balanced"; if(arrowsIn)arrowsIn.style.opacity=.8; if(arrowsOut)arrowsOut.style.opacity=.25; }
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

  // ---------------------------------------------------
  // Auto-sort & de-duplicate References
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
