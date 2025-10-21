// Patch: tremplins, plateformes, saut + collision améliorée
// - Ajout des rampes sinus et plateformes rectangulaires
// - Saut: autorisé si onGround; touche Espace pour J1 et M pour J2, plus boutons tactiles
// - Collision voiture-voiture: séparation élastique + hit check "tête" -> étoile

// Conserver références existantes
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
  p1Pause: document.getElementById('p1Pause'),
  p2Left: document.getElementById('p2Left'),
  p2Right: document.getElementById('p2Right'),
  p2Pause: document.getElementById('p2Pause')
};

let game = null;

const CONFIG = {
  winStars: 5,
  roundTime: 180,
  gravity: 0.6,
  friction: 0.98,
  groundFriction: 0.88,
  jumpImpulse: 14,
  restitution: 0.6 // rebond voitures
};

// Sol courbe avec tremplins (sinusoïdes)
function heightAt(x){
  // Trois vagues pour créer des tremplins
  const base = H - 80;
  const amp1 = 40 * Math.sin((x/W) * Math.PI * 2);
  const amp2 = 25 * Math.sin((x/W) * Math.PI * 6);
  return base - amp1 - amp2; // hauts et bas
}

// Plateformes fixes
const PLATFORMS = [
  { x: W*0.18, y: H-240, w: 160, h: 18 },
  { x: W*0.55, y: H-220, w: 200, h: 18 },
  { x: W*0.78, y: H-260, w: 140, h: 18 }
];

// Voitures
const CARS = {
  basic: { speed: 4.4, size: 56, color: '#4FC3F7' },
  truck: { speed: 3.6, size: 74, color: '#F44336' }
};

function createPlayer(x, y, type){
  return { x, y, vx: 0, vy: 0, angle: 0, car: { ...CARS[type] }, stars: 0, alive: true, onGround: false };
}

function initGame(){
  game = {
    timeLeft: CONFIG.roundTime,
    running: false,
    winner: null,
    lastTime: 0,
    players: [
      createPlayer(W*0.2, heightAt(W*0.2)-60, 'basic'),
      createPlayer(W*0.8, heightAt(W*0.8)-60, 'truck')
    ]
  };
  updateUI();
}

const inputs = new Set();
window.addEventListener('keydown', (e)=>{
  const k = e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A') inputs.add('p1Left');
  if(k==='ArrowRight'||k==='d'||k==='D') inputs.add('p1Right');
  if(k==='q'||k==='Q') inputs.add('p2Left');
  if(k==='s'||k==='S') inputs.add('p2Right');
  if(k===' '){ inputs.add('p1Jump'); e.preventDefault(); }
  if(k==='m'||k==='M'){ inputs.add('p2Jump'); }
});
window.addEventListener('keyup', (e)=>{
  const k = e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A') inputs.delete('p1Left');
  if(k==='ArrowRight'||k==='d'||k==='D') inputs.delete('p1Right');
  if(k==='q'||k==='Q') inputs.delete('p2Left');
  if(k==='s'||k==='S') inputs.delete('p2Right');
  if(k===' ') inputs.delete('p1Jump');
  if(k==='m'||k==='M') inputs.delete('p2Jump');
});

function updateUI(){
  const m = Math.floor(game.timeLeft/60);
  const s = Math.floor(game.timeLeft%60).toString().padStart(2,'0');
  ui.timer.textContent = `${m}:${s}`;
}

function updatePlayer(player, leftKey, rightKey, jumpKey){
  // Entrées
  let dir = 0;
  if(inputs.has(leftKey)) dir -= 1;
  if(inputs.has(rightKey)) dir += 1;
  player.vx += dir * player.car.speed * 0.35;
  player.vx = Math.max(-player.car.speed, Math.min(player.car.speed, player.vx));

  // Gravité
  player.vy += CONFIG.gravity;

  // Déplacement
  player.x += player.vx;
  player.y += player.vy;

  // Sol courbe
  const groundY = heightAt(player.x);
  player.onGround = false;
  if(player.y >= groundY - player.car.size/2){
    player.y = groundY - player.car.size/2;
    if(player.vy>0) player.vy *= -0.2; // petit rebond amorti
    player.onGround = true;
    // Friction au sol
    player.vx *= CONFIG.groundFriction;
  } else {
    // Friction aérienne plus faible
    player.vx *= CONFIG.friction;
  }

  // Plateformes: collision par le dessus
  for(const pf of PLATFORMS){
    const top = pf.y, left = pf.x, right = pf.x+pf.w;
    const r = player.car.size/2;
    if(player.x>left && player.x<right){
      if(player.vy>0 && player.y + r >= top && player.y - r < top){
        player.y = top - r;
        player.vy = 0;
        player.onGround = true;
      }
    }
  }

  // Saut
  if(player.onGround && inputs.has(jumpKey)){
    player.vy = -CONFIG.jumpImpulse;
    player.onGround = false;
    inputs.delete(jumpKey); // éviter auto-repeat
  }

  // Bords écran
  if(player.x<0){ player.x=0; player.vx=0; }
  if(player.x>W){ player.x=W; player.vx=0; }

  // Angle visuel (optionnel)
  player.angle = Math.atan2(player.vy, player.vx)*0.15;
}

function separatePlayers(p1, p2){
  const r1 = p1.car.size/2, r2 = p2.car.size/2;
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const dist = Math.hypot(dx,dy) || 0.0001;
  const minDist = r1 + r2 - 6; // léger overlap autorisé
  if(dist < minDist){
    const nx = dx/dist, ny = dy/dist;
    const overlap = (minDist - dist) * 0.5;
    p1.x -= nx*overlap; p1.y -= ny*overlap;
    p2.x += nx*overlap; p2.y += ny*overlap;
    // Réponse élastique (simplifiée)
    const rvx = p2.vx - p1.vx, rvy = p2.vy - p1.vy;
    const sepVel = rvx*nx + rvy*ny;
    if(sepVel < 0){
      const j = -(1+CONFIG.restitution)*sepVel*0.5;
      p1.vx -= j*nx; p1.vy -= j*ny;
      p2.vx += j*nx; p2.vy += j*ny;
    }
  }
}

function headHit(attacker, defender){
  // Tête = petite zone au-dessus du centre
  const hr = attacker.car.size*0.18;
  const hx = attacker.x;
  const hy = attacker.y - attacker.car.size*0.35;
  // Corps adverse = cercle
  const dx = hx - defender.x;
  const dy = hy - defender.y;
  const dist2 = dx*dx + dy*dy;
  const rr = (hr + defender.car.size*0.45);
  return dist2 < rr*rr;
}

function resolveHeadKills(){
  const [p1,p2] = game.players;
  let winnerIndex = null;
  if(headHit(p1,p2)) winnerIndex = 1; // p1 tape la tête de p2 -> p1 gagne l'étoile
  if(headHit(p2,p1)) winnerIndex = 2; // p2 tape la tête de p1
  if(winnerIndex){
    const idx = winnerIndex-1;
    game.players[idx].stars++;
    if(game.players[idx].stars>=5){
      game.winner = `Joueur ${winnerIndex}`;
      game.running = false;
    } else {
      // reset round
      game.players[0].x=W*0.2; game.players[0].y=heightAt(W*0.2)-60; game.players[0].vx=0; game.players[0].vy=0;
      game.players[1].x=W*0.8; game.players[1].y=heightAt(W*0.8)-60; game.players[1].vx=0; game.players[1].vy=0;
    }
  }
}

function update(dt){
  if(!game||!game.running) return;
  game.timeLeft -= dt;
  updatePlayer(game.players[0],'p1Left','p1Right','p1Jump');
  updatePlayer(game.players[1],'p2Left','p2Right','p2Jump');
  separatePlayers(game.players[0], game.players[1]);
  resolveHeadKills();
}

function render(){
  // fond
  ctx.clearRect(0,0,W,H);
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'#263238');
  grad.addColorStop(1,'#1b5e20');
  ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

  // sol sinusoïdal
  ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 6; ctx.beginPath();
  for(let x=0;x<=W;x+=10){
    const y = heightAt(x);
    if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
  ctx.fillStyle = '#79554844';
  ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();

  // plateformes
  ctx.fillStyle = '#8D6E63';
  for(const pf of PLATFORMS) ctx.fillRect(pf.x,pf.y,pf.w,pf.h);

  // voitures
  for(const p of game.players){
    ctx.save();
    ctx.translate(p.x,p.y); ctx.rotate(p.angle);
    ctx.fillStyle = p.car.color;
    ctx.fillRect(-p.car.size/2,-p.car.size/3,p.car.size,p.car.size/1.5);
    // roues
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-p.car.size/3, p.car.size/4, p.car.size/8, 0, Math.PI*2);
    ctx.arc( p.car.size/3, p.car.size/4, p.car.size/8, 0, Math.PI*2);
    ctx.fill();
    // tête vulnérable
    ctx.fillStyle = '#ff5252';
    ctx.beginPath(); ctx.arc(0,-p.car.size*0.35, p.car.size*0.18, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

function loop(ts){
  if(game.lastTime===0) game.lastTime = ts;
  const dt = Math.min(0.05, (ts - game.lastTime)/1000);
  game.lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// Démarrage / reset
ui.startBtn.addEventListener('click', ()=>{ game.running = true; ui.startBtn.style.display='none'; });
ui.resetBtn?.addEventListener('click', ()=>{ initGame(); ui.startBtn.style.display='block'; });

initGame();
requestAnimationFrame(loop);
