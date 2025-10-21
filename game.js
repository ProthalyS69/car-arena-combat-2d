// Car Arena Combat 2D - Drive Ahead! Style
// Système: 5 étoiles pour gagner | Contrôles tactiles | Timer | Arènes variées

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// Éléments UI
const ui = {
  p1Stars: document.getElementById('player1Stars'),
  p2Stars: document.getElementById('player2Stars'),
  timer: document.getElementById('timer'),
  status: document.getElementById('gameStatus'),
  startBtn: document.getElementById('startGame'),
  resetBtn: document.getElementById('resetGame'),
  // Contrôles tactiles
  p1Left: document.getElementById('p1Left'),
  p1Right: document.getElementById('p1Right'),
  p1Pause: document.getElementById('p1Pause'),
  p2Left: document.getElementById('p2Left'),
  p2Right: document.getElementById('p2Right'),
  p2Pause: document.getElementById('p2Pause')
};

let game = null;

// Configuration du jeu
const CONFIG = {
  winStars: 5, // 5 étoiles pour gagner
  roundTime: 180, // 3 minutes par round
  gravity: 0.4,
  friction: 0.98,
  groundFriction: 0.85
};

// Arènes style Drive Ahead!
const ARENAS = {
  stadium: {
    name: 'Stade',
    ground: H - 80,
    platforms: [
      { x: W*0.2, y: H-160, w: W*0.2, h: 20 },
      { x: W*0.6, y: H-160, w: W*0.2, h: 20 }
    ],
    obstacles: [],
    bg: '#8B4513'
  },
  desert: {
    name: 'Désert',
    ground: H - 60,
    platforms: [
      { x: W*0.15, y: H-140, w: W*0.25, h: 15 },
      { x: W*0.6, y: H-120, w: W*0.25, h: 15 }
    ],
    obstacles: [
      { x: W*0.5, y: H-100, r: 30 } // Cactus
    ],
    bg: '#DEB887'
  },
  city: {
    name: 'Ville',
    ground: H - 100,
    platforms: [
      { x: W*0.1, y: H-180, w: W*0.15, h: 25 },
      { x: W*0.4, y: H-200, w: W*0.2, h: 25 },
      { x: W*0.75, y: H-160, w: W*0.15, h: 25 }
    ],
    obstacles: [],
    bg: '#696969'
  }
};

// Voitures
const CARS = {
  basic: { speed: 4, jump: 12, size: 60, color: '#4FC3F7', name: 'Basic' },
  truck: { speed: 3, jump: 10, size: 80, color: '#F44336', name: 'Truck' },
  buggy: { speed: 5, jump: 14, size: 50, color: '#4CAF50', name: 'Buggy' }
};

function createPlayer(x, y, carType, side, controls) {
  const car = { ...CARS[carType] };
  return {
    x, y,
    vx: 0, vy: 0,
    angle: 0,
    car,
    side, // 'left' ou 'right'
    controls,
    stars: 0,
    alive: true,
    onGround: false
  };
}

function initGame() {
  const arena = ARENAS.stadium; // Arène par défaut
  
  game = {
    arena,
    players: [
      createPlayer(W*0.2, arena.ground - 100, 'basic', 'left', {
        left: ['p1Left'],
        right: ['p1Right']
      }),
      createPlayer(W*0.8, arena.ground - 100, 'truck', 'right', {
        left: ['p2Left'],
        right: ['p2Right']
      })
    ],
    timeLeft: CONFIG.roundTime,
    running: false,
    paused: false,
    winner: null,
    currentRound: 1,
    lastTime: 0
  };
  
  updateUI();
}

// Système de contrôles tactiles et clavier
const inputs = new Set();

// Gestion clavier
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputs.add('p1Left');
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputs.add('p1Right');
  if (e.key === 'q' || e.key === 'Q') inputs.add('p2Left');
  if (e.key === 's' || e.key === 'S') inputs.add('p2Right');
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') inputs.delete('p1Left');
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') inputs.delete('p1Right');
  if (e.key === 'q' || e.key === 'Q') inputs.delete('p2Left');
  if (e.key === 's' || e.key === 'S') inputs.delete('p2Right');
});

// Gestion tactile
function setupTouchControls() {
  ui.p1Left.addEventListener('touchstart', (e) => { e.preventDefault(); inputs.add('p1Left'); });
  ui.p1Left.addEventListener('touchend', () => inputs.delete('p1Left'));
  ui.p1Left.addEventListener('mousedown', () => inputs.add('p1Left'));
  ui.p1Left.addEventListener('mouseup', () => inputs.delete('p1Left'));
  
  ui.p1Right.addEventListener('touchstart', (e) => { e.preventDefault(); inputs.add('p1Right'); });
  ui.p1Right.addEventListener('touchend', () => inputs.delete('p1Right'));
  ui.p1Right.addEventListener('mousedown', () => inputs.add('p1Right'));
  ui.p1Right.addEventListener('mouseup', () => inputs.delete('p1Right'));
  
  ui.p2Left.addEventListener('touchstart', (e) => { e.preventDefault(); inputs.add('p2Left'); });
  ui.p2Left.addEventListener('touchend', () => inputs.delete('p2Left'));
  ui.p2Left.addEventListener('mousedown', () => inputs.add('p2Left'));
  ui.p2Left.addEventListener('mouseup', () => inputs.delete('p2Left'));
  
  ui.p2Right.addEventListener('touchstart', (e) => { e.preventDefault(); inputs.add('p2Right'); });
  ui.p2Right.addEventListener('touchend', () => inputs.delete('p2Right'));
  ui.p2Right.addEventListener('mousedown', () => inputs.add('p2Right'));
  ui.p2Right.addEventListener('mouseup', () => inputs.delete('p2Right'));
}

function updateUI() {
  if (!game) return;
  
  // Timer
  const minutes = Math.floor(game.timeLeft / 60);
  const seconds = Math.floor(game.timeLeft % 60);
  ui.timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Étoiles
  updateStars(ui.p1Stars, game.players[0].stars);
  updateStars(ui.p2Stars, game.players[1].stars);
  
  // Status
  if (game.winner) {
    ui.status.textContent = `${game.winner} remporte la partie !`;
    ui.resetBtn.style.display = 'block';
    ui.startBtn.style.display = 'none';
  } else if (game.running) {
    ui.status.textContent = `Round ${game.currentRound} - Combattez !`;
  } else {
    ui.status.textContent = 'Appuyez sur Démarrer';
  }
}

function updateStars(container, count) {
  const stars = container.children;
  for (let i = 0; i < stars.length; i++) {
    stars[i].classList.toggle('active', i < count);
  }
}

function checkCollision(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const minDist = (p1.car.size + p2.car.size) / 2;
  
  if (dist < minDist) {
    // Collision détectée - déterminer le gagnant
    // Le joueur avec plus de vitesse verticale (chute) gagne
    const p1Impact = Math.abs(p1.vy);
    const p2Impact = Math.abs(p2.vy);
    
    let winner = null;
    if (p1Impact > p2Impact + 2) {
      winner = 0; // P1 gagne
    } else if (p2Impact > p1Impact + 2) {
      winner = 1; // P2 gagne
    }
    
    return winner;
  }
  return null;
}

function update(dt) {
  if (!game || !game.running) return;
  
  // Timer
  game.timeLeft -= dt;
  if (game.timeLeft <= 0) {
    // Temps écoulé - nouveau round
    nextRound();
    return;
  }
  
  // Physics pour chaque joueur
  game.players.forEach((player, i) => {
    if (!player.alive) return;
    
    // Contrôles
    let moveX = 0;
    if (inputs.has(player.controls.left[0])) moveX -= 1;
    if (inputs.has(player.controls.right[0])) moveX += 1;
    
    // Mouvement horizontal
    player.vx += moveX * player.car.speed * 0.3;
    player.vx = Math.max(-player.car.speed, Math.min(player.car.speed, player.vx));
    
    // Gravité
    player.vy += CONFIG.gravity;
    
    // Friction
    if (player.onGround) {
      player.vx *= CONFIG.groundFriction;
    } else {
      player.vx *= CONFIG.friction;
    }
    
    // Position
    player.x += player.vx;
    player.y += player.vy;
    
    // Collision avec le sol
    player.onGround = false;
    if (player.y >= game.arena.ground - player.car.size/2) {
      player.y = game.arena.ground - player.car.size/2;
      player.vy = 0;
      player.onGround = true;
    }
    
    // Collision avec les plateformes
    game.arena.platforms.forEach(platform => {
      if (player.x > platform.x && player.x < platform.x + platform.w &&
          player.y > platform.y - player.car.size/2 && 
          player.y < platform.y + platform.h + player.car.size/2 &&
          player.vy > 0) {
        player.y = platform.y - player.car.size/2;
        player.vy = 0;
        player.onGround = true;
      }
    });
    
    // Limites écran
    if (player.x < 0) player.x = 0;
    if (player.x > W) player.x = W;
    
    // Rotation basée sur la vitesse
    player.angle = Math.atan2(player.vy, player.vx) * 0.1;
  });
  
  // Collision entre joueurs
  const winner = checkCollision(game.players[0], game.players[1]);
  if (winner !== null) {
    // Un joueur gagne le round
    game.players[winner].stars++;
    
    // Animation étoile
    const starContainer = winner === 0 ? ui.p1Stars : ui.p2Stars;
    const star = starContainer.children[game.players[winner].stars - 1];
    if (star) star.classList.add('winning');
    
    // Vérifier victoire complète
    if (game.players[winner].stars >= CONFIG.winStars) {
      game.winner = `Joueur ${winner + 1}`;
      game.running = false;
    } else {
      // Nouveau round
      setTimeout(() => nextRound(), 1000);
    }
  }
}

function nextRound() {
  if (game.winner) return;
  
  game.currentRound++;
  game.timeLeft = CONFIG.roundTime;
  
  // Reset positions
  const arena = game.arena;
  game.players[0].x = W*0.2;
  game.players[0].y = arena.ground - 100;
  game.players[0].vx = 0;
  game.players[0].vy = 0;
  game.players[0].alive = true;
  
  game.players[1].x = W*0.8;
  game.players[1].y = arena.ground - 100;
  game.players[1].vx = 0;
  game.players[1].vy = 0;
  game.players[1].alive = true;
}

function render() {
  if (!game) return;
  
  // Fond
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(0.6, game.arena.bg);
  gradient.addColorStop(1, '#2F4F2F');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  
  // Sol
  ctx.fillStyle = '#654321';
  ctx.fillRect(0, game.arena.ground, W, H - game.arena.ground);
  
  // Plateformes
  ctx.fillStyle = '#8B4513';
  game.arena.platforms.forEach(platform => {
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
  });
  
  // Obstacles
  ctx.fillStyle = '#228B22';
  game.arena.obstacles.forEach(obs => {
    ctx.beginPath();
    ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
    ctx.fill();
  });
  
  // Joueurs
  game.players.forEach((player, i) => {
    if (!player.alive) return;
    
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    // Corps de la voiture
    ctx.fillStyle = player.car.color;
    ctx.fillRect(-player.car.size/2, -player.car.size/3, player.car.size, player.car.size/1.5);
    
    // Roues
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-player.car.size/3, player.car.size/4, player.car.size/8, 0, Math.PI * 2);
    ctx.arc(player.car.size/3, player.car.size/4, player.car.size/8, 0, Math.PI * 2);
    ctx.fill();
    
    // Tête vulnérable (petite zone rouge)
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(0, -player.car.size/4, player.car.size/6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  });
}

function gameLoop(timestamp) {
  if (game.lastTime === 0) game.lastTime = timestamp;
  const dt = Math.min(0.05, (timestamp - game.lastTime) / 1000);
  game.lastTime = timestamp;
  
  update(dt);
  render();
  updateUI();
  
  requestAnimationFrame(gameLoop);
}

// Événements
ui.startBtn.addEventListener('click', () => {
  game.running = true;
  ui.startBtn.style.display = 'none';
  ui.status.textContent = 'Combat en cours...';
});

ui.resetBtn.addEventListener('click', () => {
  initGame();
  ui.resetBtn.style.display = 'none';
  ui.startBtn.style.display = 'block';
});

// Initialisation
setupTouchControls();
initGame();
requestAnimationFrame(gameLoop);