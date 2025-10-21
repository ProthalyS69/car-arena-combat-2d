// Car Arena Combat 2D - Drive Ahead! Style (controls + HUD scoring update)
// Ajout: contrôles J1 = ZQSD ; J2 = flèches ; HUD score + étoiles + notifications

// =============================
// 1) Configuration et constantes
// =============================
const CONFIG = {
  winStars: 5,
  roundTime: 180,
  gravity: 0.6,
  friction: 0.98,
  groundFriction: 0.88,
  jumpImpulse: 14,
  restitution: 0.6,
  launchSlopeThreshold: 0.25,
  launchSpeedThreshold: 3.0,
  launchBoost: 0.45
};

// =============================
// 2) Modèles de voitures (même taille)
// =============================
const CARS = {
  basic: { speed: 4.4, size: 64, color: '#4FC3F7' },
  truck: { speed: 4.4, size: 64, color: '#F44336' }
};

// =============================
// 3) Setup Canvas et UI
// =============================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const ui = {
  p1Stars: document.getElementById('player1Stars'),
  p2Stars: document.getElementById('player2Stars'),
  timer: document.getElementById('timer'),
  status: document.getElementById('gameStatus'),
  startBtn: document.getElementById('startGame'),
  resetBtn: document.getElementById('resetGame'),
  p1Left: document.getElementById('p1Left'),
  p1Right: document.getElementById('p1Right'),
  p2Left: document.getElementById('p2Left'),
  p2Right: document.getElementById('p2Right')
};

let game = null;

// =============================
// 4) Terrain: sol sinusoïdal + plateformes
// =============================
function heightAt(x){
  const base = H - 80;
  const amp1 = 40 * Math.sin((x/W) * Math.PI * 2);
  const amp2 = 25 * Math.sin((x/W) * Math.PI * 6);
  return base - amp1 - amp2;
}

const PLATFORMS = [
  { x: W*0.18, y: H-240, w: 160, h: 18 },
  { x: W*0.55, y: H-220, w: 200, h: 18 },
  { x: W*0.78, y: H-260, w: 140, h: 18 }
];

function slopeAt(x){
  const dx = 1;
  const y1 = heightAt(x-dx);
  const y2 = heightAt(x+dx);
  return (y2 - y1) / (2*dx);
}

// =============================
// 5) Création joueurs
// =============================
function createPlayer(x, y, type, label){
  return { x, y, vx: 0, vy: 0, angle: 0, car: { ...CARS[type] }, stars: 0, score: 0, label, alive: true, onGround: false };
}

function initGame(){
  game = {
    timeLeft: CONFIG.roundTime,
    running: false,
    winner: null,
    lastTime: 0,
    players: [
      createPlayer(W*0.2, heightAt(W*0.2)-60, 'basic', 'J1'),
      createPlayer(W*0.8, heightAt(W*0.8)-60, 'truck', 'J2')
    ],
    lastPointText: '',
    lastPointTime: 0
  };
  updateUI();
}

// =============================
// 6) Entrées clavier/tactile (J1 = ZQSD, J2 = flèches)
// =============================
const inputs = new Set();
window.addEventListener('keydown', (e)=>{
  const k = e.key;
  // Joueur 1 - ZQSD
  if(k==='q'||k==='Q') inputs.add('p1Left');
  if(k==='d'||k==='D') inputs.add('p1Right');
  if(k==='z'||k==='Z') inputs.add('p1Jump');
  if(k==='s'||k==='S') inputs.add('p1Brake'); // optionnel

  // Joueur 2 - flèches
  if(k==='ArrowLeft') inputs.add('p2Left');
  if(k==='ArrowRight') inputs.add('p2Right');
  if(k==='ArrowUp') inputs.add('p2Jump');
  if(k==='ArrowDown') inputs.add('p2Brake'); // optionnel
});
window.addEventListener('keyup', (e)=>{
  const k = e.key;
  if(k==='q'||k==='Q') inputs.delete('p1Left');
  if(k==='d'||k==='D') inputs.delete('p1Right');
  if(k==='z'||k==='Z') inputs.delete('p1Jump');
  if(k==='s'||k==='S') inputs.delete('p1Brake');

  if(k==='ArrowLeft') inputs.delete('p2Left');
  if(k==='ArrowRight') inputs.delete('p2Right');
  if(k==='ArrowUp') inputs.delete('p2Jump');
  if(k==='ArrowDown') inputs.delete('p2Brake');
});

// =============================
// 7) UI
// =============================
function updateUI(){
  const m = Math.floor(game.timeLeft/60);
  const s = Math.floor(game.timeLeft%60).toString().padStart(2,'0');
  ui.timer.textContent = `${m}:${s}`;
  updateStars(ui.p1Stars, game.players[0].stars);
  updateStars(ui.p2Stars, game.players[1].stars);
  if (game.winner) ui.status.textContent = `${game.winner} remporte la partie !`;
}

function updateStars(container, count){
  const stars = container.children;
  for(let i=0;i<stars.length;i++) stars[i].classList.toggle('active', i < count);
}

// =============================
// 8) Physique joueurs
// =============================
function launchFromRampIfNeeded(player){
  const s = slopeAt(player.x);
  const speed = Math.hypot(player.vx, player.vy);
  if(Math.abs(s) > CONFIG.launchSlopeThreshold && speed > CONFIG.launchSpeedThreshold){
    const nx = -s, ny = 1; const inv = 1/Math.hypot(nx,ny);
    const nux = nx*inv, nuy = ny*inv; const boost = CONFIG.launchBoost * speed;
    player.vx += nux * boost; player.vy += -Math.abs(nuy * boost);
  }
}

function updatePlayer(player, leftKey, rightKey, jumpKey, brakeKey){
  let dir = 0;
  if(inputs.has(leftKey)) dir -= 1;
  if(inputs.has(rightKey)) dir += 1;
  player.vx += dir * player.car.speed * 0.35;
  if(inputs.has(brakeKey)) player.vx *= 0.9;
  player.vx = Math.max(-player.car.speed, Math.min(player.car.speed, player.vx));

  player.vy += CONFIG.gravity;
  player.x += player.vx; player.y += player.vy;

  const groundY = heightAt(player.x);
  player.onGround = false;
  if(player.y >= groundY - player.car.size/2){
    player.y = groundY - player.car.size/2;
    if(player.vy>0) player.vy *= -0.2; player.onGround = true; player.vx *= CONFIG.groundFriction; launchFromRampIfNeeded(player);
  } else { player.vx *= CONFIG.friction; }

  for(const pf of PLATFORMS){
    const top = pf.y, left = pf.x, right = pf.x+pf.w; const r = player.car.size/2;
    if(player.x>left && player.x<right){
      if(player.vy>0 && player.y + r >= top && player.y - r < top){ player.y = top - r; player.vy = 0; player.onGround = true; }
    }
  }

  if(player.onGround && inputs.has(jumpKey)){ player.vy = -CONFIG.jumpImpulse; player.onGround = false; inputs.delete(jumpKey); }

  if(player.x<0){ player.x=0; player.vx=0; } if(player.x>W){ player.x=W; player.vx=0; }
  player.angle = Math.atan2(player.vy, player.vx)*0.15;
}

function separatePlayers(p1, p2){
  const r1 = p1.car.size/2, r2 = p2.car.size/2; const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const dist = Math.hypot(dx,dy) || 0.0001; const minDist = r1 + r2 - 6;
  if(dist < minDist){ const nx = dx/dist, ny = dy/dist; const overlap = (minDist - dist) * 0.5;
    p1.x -= nx*overlap; p1.y -= ny*overlap; p2.x += nx*overlap; p2.y += ny*overlap;
    const rvx = p2.vx - p1.vx, rvy = p2.vy - p1.vy; const sepVel = rvx*nx + rvy*ny;
    if(sepVel < 0){ const j = -(1+CONFIG.restitution)*sepVel*0.5; p1.vx -= j*nx; p1.vy -= j*ny; p2.vx += j*nx; p2.vy += j*ny; }
  }
}

function headHit(attacker, defender){
  const hr = attacker.car.size*0.18; const hx = attacker.x; const hy = attacker.y - attacker.car.size*0.35;
  const dx = hx - defender.x, dy = hy - defender.y; const rr = (hr + defender.car.size*0.45);
  return dx*dx + dy*dy < rr*rr;
}

function addPoint(winnerIndex, reason){
  const p = game.players[winnerIndex];
  p.stars++; p.score += 100; // scoring simple
  game.lastPointText = `${p.label} +100 (${reason})`; game.lastPointTime = performance.now();
  if(p.stars>=CONFIG.winStars){ game.winner = `${p.label}`; game.running = false; }
}

function resolveHeadKills(){
  const [p1,p2] = game.players; let winnerIndex = null; let reason = '';
  if(headHit(p1,p2)){ winnerIndex = 0; reason = 'Head Hit'; }
  if(headHit(p2,p1)){ winnerIndex = 1; reason = 'Head Hit'; }
  if(winnerIndex!==null){
    addPoint(winnerIndex, reason);
    // Reset positions
    p1.x=W*0.2; p1.y=heightAt(W*0.2)-60; p1.vx=0; p1.vy=0;
    p2.x=W*0.8; p2.y=heightAt(W*0.8)-60; p2.vx=0; p2.vy=0;
  }
}

// =============================
// 9) Boucle de jeu
// =============================
function update(dt){
  if(!game||!game.running) return;
  game.timeLeft -= dt;
  updatePlayer(game.players[0],'p1Left','p1Right','p1Jump','p1Brake');
  updatePlayer(game.players[1],'p2Left','p2Right','p2Jump','p2Brake');
  separatePlayers(game.players[0], game.players[1]);
  resolveHeadKills();
}

function render(){
  ctx.clearRect(0,0,W,H);
  const grad = ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,'#263238'); grad.addColorStop(1,'#1b5e20'); ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 6; ctx.beginPath(); for(let x=0;x<=W;x+=10){ const y = heightAt(x); if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.stroke(); ctx.fillStyle = '#79554844'; ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8D6E63'; for(const pf of PLATFORMS) ctx.fillRect(pf.x,pf.y,pf.w,pf.h);

  // HUD simple : scores et étoiles
  ctx.fillStyle = 'white'; ctx.font = '16px Arial';
  ctx.fillText(`J1 ⭐:${game.players[0].stars}  Score:${game.players[0].score}`, 20, 30);
  ctx.fillText(`J2 ⭐:${game.players[1].stars}  Score:${game.players[1].score}`, W-260, 30);
  if(game.lastPointText && performance.now() - game.lastPointTime < 1200){
    ctx.fillStyle = '#ffd54f'; ctx.font = '20px Arial Black'; ctx.fillText(game.lastPointText, W/2 - 100, 60);
  }

  for(const p of game.players){
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle);
    ctx.fillStyle = p.car.color; ctx.fillRect(-p.car.size/2,-p.car.size/3,p.car.size,p.car.size/1.5);
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-p.car.size/3, p.car.size/4, p.car.size/8, 0, Math.PI*2); ctx.arc( p.car.size/3, p.car.size/4, p.car.size/8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(0,-p.car.size*0.35, p.car.size*0.18, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }
}

function gameLoop(ts){ if(game.lastTime===0) game.lastTime = ts; const dt = Math.min(0.05, (ts - game.lastTime)/1000); game.lastTime = ts; update(dt); render(); updateUI(); requestAnimationFrame(gameLoop); }

// =============================
// 10) Démarrage / reset
// =============================
ui.startBtn.addEventListener('click', ()=>{ game.running = true; ui.startBtn.style.display='none'; });
ui.resetBtn?.addEventListener('click', ()=>{ initGame(); ui.startBtn.style.display='block'; });

initGame();
requestAnimationFrame(gameLoop);
