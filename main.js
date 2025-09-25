window.addEventListener("DOMContentLoaded", function () {
  var deck   = document.getElementById("deck");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  // Start clean
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

  // -------- Reaction Coordinates (THCA) interactivity --------
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

    var Ea_ref_kJ = 120;
    var catalystFactor = 0.70;
    var TrefC = 120, R = 8.314;

    function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
    function kRel(Ea_kJ, T_C){
      var T = T_C + 273.15, Tref = TrefC + 273.15;
      var Ea = Ea_kJ * 1000;
      var exponent = -Ea/R * (1/T - 1/Tref);
      return Math.exp(exponent);
    }
    function yPeakFromEa(Ea_kJ){
      var EaMin = 70, EaMax = 140;
      var yMax = 160, yMin = 90;
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
        var xPeak=320, yReact=280, yTop=yPeak+0;
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

  // Theme + utilities
  function isHandout(){ return document.body.classList.contains("handout"); }
  function toggleHandout(){ var on = document.body.classList.toggle("handout"); if(on){ slides.forEach(resetSlide); } else { fitCurrent(); } }
  function doPrint(){ var was = isHandout(); if(!was) document.body.classList.add("handout"); setTimeout(function(){ window.print(); if(!was) document.body.classList.remove("handout"); }, 50); }
  var saved = null; try { saved = localStorage.getItem("stoneyTheme"); } catch(e){}
  if(saved === "dark" || (saved===null && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)){ document.body.classList.add("dark"); }
  function toggleTheme(){ var dark = document.body.classList.toggle("dark"); try { localStorage.setItem("stoneyTheme", dark ? "dark" : "light"); } catch(e){} fitCurrent(); }

  window.addEventListener("resize", fitCurrent);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCurrent);
  document.querySelectorAll(".slide img").forEach(function(imgEl){
    imgEl.addEventListener("load", function(){ if(imgEl.closest(".slide") === slides[i]) fitCurrent(); });
  });

  setProgress(); fitCurrent(); if (deck) deck.focus();

  // ---------- Simple schematic 3D viewers (Ball-and-Stick / Spacefill) ----------
  function vec(x,y,z){ return new THREE.Vector3(x,y,z); }

  function addAtom(scene, pos, element, style){
    var colors = { C:0x555555, O:0xdd3333, H:0xffffff };
    var base = { C:0.22, O:0.20, H:0.12 };
    var scale = (style==='spacefill') ? 1.9 : 1.0;  // bigger for spacefill
    var radius = (base[element]||0.2) * scale;

    var geom = new THREE.SphereGeometry(radius, 24, 24);
    var mat  = new THREE.MeshStandardMaterial({color:colors[element]||0x888888, metalness:0.1, roughness:0.5});
    var mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
  }

  function addBond(scene, a, b, visible){
    if (!visible) return;
    var dir = new THREE.Vector3().subVectors(b,a);
    var len = dir.length();
    var geom = new THREE.CylinderGeometry(0.06,0.06,len,16);
    var mat  = new THREE.MeshStandardMaterial({color:0x777777});
    var mesh = new THREE.Mesh(geom, mat);
    var mid = new THREE.Vector3().addVectors(a,b).multiplyScalar(0.5);
    mesh.position.copy(mid);
    var axis = new THREE.Vector3(0,1,0).cross(dir.clone().normalize());
    var ang  = Math.acos(new THREE.Vector3(0,1,0).dot(dir.clone().normalize()));
    mesh.quaternion.setFromAxisAngle(axis.normalize(), ang);
    scene.add(mesh);
  }

  function thcData(){
    var atoms = [
      {el:'C', p:vec(-1.2, 0.7, 0)}, {el:'C', p:vec( 0.0, 1.1, 0)}, {el:'C', p:vec( 1.1, 0.3, 0)},
      {el:'C', p:vec( 0.9,-0.9, 0)}, {el:'C', p:vec(-0.3,-1.3, 0)}, {el:'C', p:vec(-1.4,-0.5, 0)},
      {el:'O', p:vec(-0.6, 1.8, 0.1)}, {el:'O', p:vec(-0.9,-2.1, 0)},
      {el:'C', p:vec(-1.8,-0.1, 0.9)}, {el:'C', p:vec(-2.6, 0.6, 0.2)}, {el:'C', p:vec(-2.4,-0.8,-0.5)},
      {el:'C', p:vec( 2.2, 0.7, 0)}, {el:'C', p:vec( 3.4, 0.1, 0.1)}, {el:'C', p:vec( 4.6, 0.7, 0)},
      {el:'C', p:vec( 5.8, 0.1,-0.1)}, {el:'C', p:vec( 7.0, 0.7, 0)}
    ];
    var bonds = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,6],[4,7],[5,8],[8,9],[8,10],[2,11],[11,12],[12,13],[13,14],[14,15]];
    return {atoms,bonds};
  }
  function cbdData(){
    var atoms = [
      {el:'C', p:vec(-1.2, 0.7, 0)}, {el:'C', p:vec( 0.0, 1.1, 0)}, {el:'C', p:vec( 1.1, 0.3, 0)},
      {el:'C', p:vec( 0.9,-0.9, 0)}, {el:'C', p:vec(-0.3,-1.3, 0)}, {el:'C', p:vec(-1.4,-0.5, 0)},
      {el:'O', p:vec(-0.6, 1.8, 0.1)}, {el:'O', p:vec(-1.8,-1.9, 0.1)},
      {el:'C', p:vec( 1.8,-1.6, 0.6)}, {el:'C', p:vec( 2.6,-0.6, 0.2)},
      {el:'C', p:vec( 2.2, 0.7, 0)}, {el:'C', p:vec( 3.4, 0.1, 0.1)}, {el:'C', p:vec( 4.6, 0.7, 0)},
      {el:'C', p:vec( 5.8, 0.1,-0.1)}, {el:'C', p:vec( 7.0, 0.7, 0)}
    ];
    var bonds = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,6],[5,7],[3,8],[8,9],[2,10],[10,11],[11,12],[12,13],[13,14]];
    return {atoms,bonds};
  }

  function buildViewer(containerId, dataFn, style){
    var el = document.getElementById(containerId);
    if(!el || !window.THREE) return;

    var scene = new THREE.Scene();
    var cam   = new THREE.PerspectiveCamera(50, el.clientWidth/el.clientHeight, 0.1, 100);
    var renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.innerHTML = "";
    el.appendChild(renderer.domElement);

    cam.position.set(0, 0, 6);

    var hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    scene.add(hemi);
    var dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5,5,5);
    scene.add(dir);

    var controls = new THREE.OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;

    var group = new THREE.Group(); scene.add(group);

    function populate(){
      // clear
      while(group.children.length) group.remove(group.children[0]);
      var data = dataFn();

      var showBonds = (style === 'ballstick'); // hide bonds for spacefill
      data.atoms.forEach(function(a){ addAtom(group, a.p, a.el, style); });
      data.bonds.forEach(function(idx){ addBond(group, data.atoms[idx[0]].p, data.atoms[idx[1]].p, showBonds); });
    }
    populate();

    function reset(){
      controls.reset();
      cam.position.set(0,0,6);
    }

    function setStyle(next){
      style = next;
      populate();
    }

    function onResize(){
      var w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w,h);
      cam.aspect = w/h; cam.updateProjectionMatrix();
    }
    window.addEventListener("resize", onResize);

    function animate(){
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, cam);
    }
    animate();

    return {reset, setStyle};
  }

  // THC viewer + radio style toggle
  var thcViewer = buildViewer("viewer-thc", thcData, 'ballstick');
  document.querySelectorAll("input[name='thcStyle']").forEach(function(r){
    r.addEventListener("change", function(){ if (this.checked) thcViewer.setStyle(this.value); });
  });
  var btnTHCReset = document.querySelector(".btn[data-reset='viewer-thc']");
  if(btnTHCReset) btnTHCReset.addEventListener("click", function(){ thcViewer.reset(); });

  // CBD viewer + radio style toggle
  var cbdViewer = buildViewer("viewer-cbd", cbdData, 'ballstick');
  document.querySelectorAll("input[name='cbdStyle']").forEach(function(r){
    r.addEventListener("change", function(){ if (this.checked) cbdViewer.setStyle(this.value); });
  });
  var btnCBDReset = document.querySelector(".btn[data-reset='viewer-cbd']");
  if(btnCBDReset) btnCBDReset.addEventListener("click", function(){ cbdViewer.reset(); });
});
