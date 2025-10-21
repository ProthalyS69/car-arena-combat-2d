// Car Arena Combat 2D - SlowMo on hit + multi-layer platforms
// This patch adds a slow-motion effect when a hit is detected and diversifies platform heights.

// ==== Slow Motion Controller ====
let timeScale = 1.0;           // 1 = normal speed
let slowMoUntil = 0;           // timestamp when slow-mo ends
const SLOW_MO_FACTOR = 0.25;   // 25% speed
const SLOW_MO_DURATION = 500;  // ms of slow motion

function setSlowMo(ms){
  timeScale = SLOW_MO_FACTOR;
  slowMoUntil = performance.now() + ms;
}

// Wrap original loop to apply timeScale
const _loop = loop;
function loop(ts){
  if(game && game.lastTime===0) game.lastTime = ts;
  const rawDt = Math.min(0.05, (ts - game.lastTime)/1000);
  const now = performance.now();
  if(now >= slowMoUntil){ timeScale = 1.0; }
  const dt = rawDt * timeScale; // scaled delta
  game.lastTime = ts;
  update(dt);
  render();
  updateUI();
  requestAnimationFrame(loop);
}

// Trigger slow-mo on scoring then reset after short delay
function resetRound(){
  setSlowMo(SLOW_MO_DURATION);
  const [p1,p2]=game.players;
  setTimeout(()=>{
    p1.x=W*0.2; p1.y=heightAt(W*0.2)-60; p1.vx=p1.vy=0;
    p2.x=W*0.8; p2.y=heightAt(W*0.8)-60; p2.vx=p2.vy=0;
  }, SLOW_MO_DURATION);
}

// ==== Multi-layer platforms (more varied vertical layout) ====
function currentPlatforms(){
  return [
    { x: W*0.10, y: H-200, w: 140, h: 18 },
    { x: W*0.28, y: H-260, w: 160, h: 18 },
    { x: W*0.45, y: H-180, w: 160, h: 18 },
    { x: W*0.62, y: H-300, w: 180, h: 18 },
    { x: W*0.80, y: H-220, w: 140, h: 18 },
    // upper small pads
    { x: W*0.22, y: H-340, w: 100, h: 16 },
    { x: W*0.72, y: H-360, w: 100, h: 16 }
  ];
}
