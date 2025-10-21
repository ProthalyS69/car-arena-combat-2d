// Patch 2: lancer depuis les bosses (ramps) proportionnel à la pente + tailles égales
// - Calcule la normale de la courbe et applique un "takeoff" si la vitesse et la pente dépassent un seuil
// - Les deux voitures ont maintenant la même taille

// Réglages
CONFIG.launchSlopeThreshold = 0.25; // pente minimale pour décoller
CONFIG.launchSpeedThreshold = 3.0;   // vitesse minimale pour décoller
CONFIG.launchBoost = 0.45;           // multiplicateur d'impulsion de décollage

// Uniformiser la taille des voitures
CARS.basic.size = 64;
CARS.truck.size = 64;

// Dérivée de la hauteur pour la pente (dy/dx)
function slopeAt(x){
  const dx = 1;
  const y1 = heightAt(x-dx);
  const y2 = heightAt(x+dx);
  return (y2 - y1) / (2*dx);
}

function launchFromRampIfNeeded(player){
  const s = slopeAt(player.x); // pente locale
  const speed = Math.hypot(player.vx, player.vy);
  if(Math.abs(s) > CONFIG.launchSlopeThreshold && speed > CONFIG.launchSpeedThreshold){
    // Normal du sol
    const nx = -s; // tangent (1, s) -> normal (-s, 1)
    const ny = 1;
    const invLen = 1 / Math.hypot(nx, ny);
    const nux = nx * invLen;
    const nuy = ny * invLen;
    // Impulsion proportionnelle à la vitesse
    const boost = CONFIG.launchBoost * speed;
    player.vx += nux * boost;
    player.vy += -Math.abs(nuy * boost); // lancer vers le haut
  }
}

// Injecter dans updatePlayer après avoir collé au sol
const _origUpdatePlayer = updatePlayer;
updatePlayer = function(player, leftKey, rightKey, jumpKey){
  _origUpdatePlayer(player, leftKey, rightKey, jumpKey);
  if(player.onGround){
    launchFromRampIfNeeded(player);
  }
}
