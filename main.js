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
    ctx.roundRect(leftBox.x, leftBox.y, leftBox.w, leftBox.h, 18);
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(rightBox.x, rightBox.y, rightBox.w, rightBox.h, 18);
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
      // relative to k at reference
      var Tr = TrefC + 273.15;
      var kRefExact = k_ref; // by definition at Tref & no catalyst
      // If catalyst toggled at Tref, adjust so “rel rate” is still relative to uncatalyzed Tref
      var EaRef = Ea_base;
      var Tnow = getTempK();
      var kRelToUncatRef = (k) / (kRefExact * Math.exp( -(getEa()-EaRef)/R * (1/Tnow - 1/Tr) ));
      // Simpler & stable: show k/k_ref at Tref (uncatalyzed baseline)
      var baseline = k_ref;
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
