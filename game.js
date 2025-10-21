// Car Arena Combat 2D - Prototype simple
// Rendu: Canvas 2D | Physique minimale | Contrôles: avancer/reculer

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const ui = {
  car: document.getElementById('carSelect'),
  arena: document.getElementById('arenaSelect'),
  start: document.getElementById('startBtn'),
  status: document.getElementById('status')
};

let state = null; // { players: [...], arena: {...}, running: bool }

// Utilitaires
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => Math.random() * (b - a) + a;

// Définition des arènes
const ARENAS = {
  classic: { friction: 0.96, bounds: { x: 40, y: 40, w: W-80, h: H-80 }, color: '#1a1f2b' },
  desert:  { friction: 0.93, bounds: { x: 40, y: 60, w: W-80, h: H-120 }, color: '#3a2a15' },
  city:    { friction: 0.97, bounds: { x: 70, y: 70, w: W-140, h: H-140 }, color: '#202328' }
};

// Définition des voitures
const CARS = {
  basic:     { acc: 0.25, max: 6.0, mass: 1.0, color: '#5bc0de' },
  speedster: { acc: 0.35, max: 7.5, mass: 0.9, color: '#f39c12' },
  tank:      { acc: 0.18, max: 5.0, mass: 1.4, color: '#9b59b6' }
};

function createPlayer(x, y, facing, carKey, controls, name){
  const car = { ...CARS[carKey] };
  return {
    name,
    car,
    x, y,
    vx: 0, vy: 0,
    angle: facing, // radians
    angV: 0,
    width: 80, height: 40, // corps
    headSize: 16,         // "tête" vulnérable à l'avant
    controls,
    alive: true,
    score: 0
  };
}

function resetGame(){
  const arenaKey = ui.arena.value;
  const car1 = ui.car.value;
  const car2 = ['basic','speedster','tank'][Math.floor(rand(0,3))];
  const arena = { ...ARENAS[arenaKey] };
  state = {
    running: false,
    arena,
    players: [
      createPlayer(arena.bounds.x + 140, H/2, 0, car1, { fwd:['ArrowRight','d','D'], back:['ArrowLeft','q','Q'] }, 'J1'),
      createPlayer(arena.bounds.x + arena.bounds.w - 140, H/2, Math.PI, car2, { fwd:['a','A'], back:['r','R'] }, 'J2')
    ],
    lastTime: 0,
    winner: null
  };
}

function drawArena(a){
  // Fond
  ctx.fillStyle = a.color;
  ctx.fillRect(0,0,W,H);
  // Zone jouable
  ctx.strokeStyle = '#ffffff22';
  ctx.lineWidth = 4;
  ctx.strokeRect(a.bounds.x, a.bounds.y, a.bounds.w, a.bounds.h);
}

function drawCar(p){
  // Corps
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = p.car.color;
  ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height);
  // Tête vulnérable (avant)
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(p.width/2 + p.headSize/2, 0, p.headSize/2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function getHeadCircle(p){
  // Position mondiale de la tête (avant de la voiture)
  const hx = p.x + Math.cos(p.angle) * (p.width/2 + p.headSize/2);
  const hy = p.y + Math.sin(p.angle) * (p.width/2 + p.headSize/2);
  return { x: hx, y: hy, r: p.headSize/2 };
}

function rectCircleCollision(px, py, w, h, angle, cx, cy, cr){
  // Transformer le cercle dans l'espace local du rectangle
  const s = Math.sin(-angle), c = Math.cos(-angle);
  const dx = cx - px, dy = cy - py;
  const lx = c*dx - s*dy;
  const ly = s*dx + c*dy;
  const clx = clamp(lx, -w/2, w/2);
  const cly = clamp(ly, -h/2, h/2);
  const ddx = lx - clx, ddy = ly - cly;
  return (ddx*ddx + ddy*ddy) <= cr*cr;
}

function collidePlayers(a, b){
  // Si la tête de A touche le corps de B => A perd
  const ha = getHeadCircle(a);
  const hitA = rectCircleCollision(b.x, b.y, b.width, b.height, b.angle, ha.x, ha.y, ha.r);
  if(hitA) return { loser: a, winner: b };
  // Si la tête de B touche le corps de A => B perd
  const hb = getHeadCircle(b);
  const hitB = rectCircleCollision(a.x, a.y, a.width, a.height, a.angle, hb.x, hb.y, hb.r);
  if(hitB) return { loser: b, winner: a };
  return null;
}

const keys = new Set();
window.addEventListener('keydown', e => keys.add(e.key));
window.addEventListener('keyup', e => keys.delete(e.key));

function update(dt){
  const a = state.arena;
  for(const p of state.players){
    if(!p.alive) continue;
    // Entrées
    let thrust = 0;
    if(p.controls.fwd.some(k=>keys.has(k))) thrust += p.car.acc;
    if(p.controls.back.some(k=>keys.has(k))) thrust -= p.car.acc;
    // Vitesse le long de l'angle
    p.vx += Math.cos(p.angle) * thrust;
    p.vy += Math.sin(p.angle) * thrust;
    // Limites vitesse
    const speed = Math.hypot(p.vx, p.vy);
    const max = p.car.max;
    if(speed > max){
      p.vx = p.vx / speed * max;
      p.vy = p.vy / speed * max;
    }
    // Friction d'arène
    p.vx *= a.friction;
    p.vy *= a.friction;

    // Mise à jour position
    p.x += p.vx;
    p.y += p.vy;

    // Rotation automatique vers direction de déplacement pour un feeling simple
    if(speed > 0.05){
      const targetAngle = Math.atan2(p.vy, p.vx);
      const delta = ((targetAngle - p.angle + Math.PI*3) % (Math.PI*2)) - Math.PI;
      p.angle += clamp(delta, -0.08, 0.08);
    }

    // Confinement dans l'arène (rebond simple)
    const b = a.bounds;
    if(p.x - p.width/2 < b.x){ p.x = b.x + p.width/2; p.vx = Math.abs(p.vx)*0.6; }
    if(p.x + p.width/2 > b.x + b.w){ p.x = b.x + b.w - p.width/2; p.vx = -Math.abs(p.vx)*0.6; }
    if(p.y - p.height/2 < b.y){ p.y = b.y + p.height/2; p.vy = Math.abs(p.vy)*0.6; }
    if(p.y + p.height/2 > b.y + b.h){ p.y = b.y + b.h - p.height/2; p.vy = -Math.abs(p.vy)*0.6; }
  }

  // Collisions gagnant/perdant
  const [p1, p2] = state.players;
  const result = collidePlayers(p1, p2);
  if(result){
    result.loser.alive = false;
    state.winner = result.winner.name;
    state.running = false;
    ui.status.textContent = `Victoire: ${state.winner}!`;
  }
}

function render(){
  drawArena(state.arena);
  for(const p of state.players) drawCar(p);
}

function loop(t){
  if(!state) return;
  const dt = Math.min(32, t - state.lastTime);
  state.lastTime = t;
  if(state.running){
    update(dt/16.6667);
  }
  render();
  requestAnimationFrame(loop);
}

ui.start.addEventListener('click', () => {
  resetGame();
  state.running = true;
  ui.status.textContent = 'Combat en cours...';
});

// Init
resetGame();
requestAnimationFrame(loop);
