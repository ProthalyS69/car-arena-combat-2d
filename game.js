// ... Le haut du fichier reste identique (CONFIG, CARS, setup, etc.)
// Ajouts: fullscreen sizing + animations de victoire

// Resize canvas to fullscreen and keep logical size (virtual resolution)
function resizeCanvas(){
  const container = document.getElementById('gameContainer');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  // Expose W/H logical (CSS pixels)
  window.W = container.clientWidth;
  window.H = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);

// Victory overlay helpers
const overlay = document.getElementById('victoryOverlay');
const overlayText = document.getElementById('victoryText');
function showVictory(label){
  overlayText.textContent = `${label} GAGNE !`;
  overlay.style.display = 'flex';
}
function hideVictory(){ overlay.style.display = 'none'; }

// Patch addPoint to trigger overlay
const _addPoint = addPoint;
addPoint = function(winnerIndex, reason){
  _addPoint(winnerIndex, reason);
  if(game.winner){ showVictory(game.winner); ui.resetBtn.style.display = 'block'; }
}

// Init resize
resizeCanvas();
