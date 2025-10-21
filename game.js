// Car Arena Combat 2D - Consolidated working build (fix scoring direction, replay, more platforms, slower cars)

// ===== 1) CONFIG =====
const CONFIG = { winStars:5, roundTime:180, gravity:0.6, friction:0.98, groundFriction:0.9, jumpImpulse:13, restitution:0.55, launchSlopeThreshold:0.25, launchSpeedThreshold:2.2, launchBoost:0.42 };

// ===== 2) CARS (same size, slower) =====
const CARS = { basic:{ speed:3.2, size:64, color:'#4FC3F7' }, truck:{ speed:3.2, size:64, color:'#F44336' } };

// ===== 3) Canvas/UI =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = { p1Stars:document.getElementById('player1Stars'), p2Stars:document.getElementById('player2Stars'), timer:document.getElementById('timer'), status:document.getElementById('gameStatus'), startBtn:document.getElementById('startGame'), resetBtn:document.getElementById('resetGame') };
const overlay = document.getElementById('victoryOverlay');
const overlayText = document.getElementById('victoryText');

// Fullscreen sizing with DPR
function resizeCanvas(){ const dpr = window.devicePixelRatio||1; const rect = document.getElementById('gameContainer'); canvas.width = rect.clientWidth*dpr; canvas.height = rect.clientHeight*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); W = rect.clientWidth; H = rect.clientHeight; // recalc platforms for new size
  game && (game.platforms = currentPlatforms()); }
let W = 1024, H = 576; window.addEventListener('resize', resizeCanvas);

function showVictory(label){ overlayText.textContent = `${label} GAGNE !`; overlay.style.display='flex'; }
function hideVictory(){ overlay.style.display='none'; }

let game = null;

// ===== 4) Terrain =====
function heightAt(x){ const base = H-80; const amp1 = 40*Math.sin((x/W)*Math.PI*2); const amp2 = 25*Math.sin((x/W)*Math.PI*6); return base - amp1 - amp2; }
// More platforms and dynamic based on screen size
const PLATFORMS = [
  ()=>({ x: W*0.12, y: H-220, w: 140, h: 18 }),
  ()=>({ x: W*0.30, y: H-260, w: 160, h: 18 }),
  ()=>({ x: W*0.50, y: H-230, w: 180, h: 18 }),
  ()=>({ x: W*0.70, y: H-270, w: 160, h: 18 }),
  ()=>({ x: W*0.85, y: H-210, w: 130, h: 18 })
];
function currentPlatforms(){ return PLATFORMS.map(f=>f()); }
function slopeAt(x){ const dx=1; return (heightAt(x+dx)-heightAt(x-dx))/(2*dx); }

// ===== 5) Players =====
function createPlayer(x,y,type,label){ return { x,y,vx:0,vy:0,angle:0,car:{...CARS[type]},stars:0,score:0,label,alive:true,onGround:false }; }
function initGame(){ hideVictory(); game={ timeLeft:CONFIG.roundTime, running:false, winner:null, lastTime:0, players:[ createPlayer(W*0.2,heightAt(W*0.2)-60,'basic','J1'), createPlayer(W*0.8,heightAt(W*0.8)-60,'truck','J2') ], lastPointText:'', lastPointTime:0, platforms: currentPlatforms() }; updateUI(); ui.startBtn.style.display='block'; ui.resetBtn.style.display='none'; }

// ===== 6) Inputs (J1 ZQSD, J2 Arrows) =====
const inputs = new Set();
window.addEventListener('keydown',e=>{ const k=e.key; if(k==='q'||k==='Q')inputs.add('p1Left'); if(k==='d'||k==='D')inputs.add('p1Right'); if(k==='z'||k==='Z')inputs.add('p1Jump'); if(k==='s'||k==='S')inputs.add('p1Brake'); if(k==='ArrowLeft')inputs.add('p2Left'); if(k==='ArrowRight')inputs.add('p2Right'); if(k==='ArrowUp')inputs.add('p2Jump'); if(k==='ArrowDown')inputs.add('p2Brake'); });
window.addEventListener('keyup',e=>{ const k=e.key; if(k==='q'||k==='Q')inputs.delete('p1Left'); if(k==='d'||k==='D')inputs.delete('p1Right'); if(k==='z'||k==='Z')inputs.delete('p1Jump'); if(k==='s'||k==='S')inputs.delete('p1Brake'); if(k==='ArrowLeft')inputs.delete('p2Left'); if(k==='ArrowRight')inputs.delete('p2Right'); if(k==='ArrowUp')inputs.delete('p2Jump'); if(k==='ArrowDown')inputs.delete('p2Brake'); });

// ===== 7) UI =====
function updateStars(container,count){ const stars=container.children; for(let i=0;i<stars.length;i++) stars[i].classList.toggle('active', i<count); }
function updateUI(){ const m=Math.floor(game.timeLeft/60), s=Math.floor(game.timeLeft%60).toString().padStart(2,'0'); ui.timer.textContent=`${m}:${s}`; updateStars(ui.p1Stars,game.players[0].stars); updateStars(ui.p2Stars,game.players[1].stars); if(game.winner) ui.status.textContent=`${game.winner} remporte la partie !`; }

// ===== 8) Physics =====
function launchFromRampIfNeeded(p){ const s=slopeAt(p.x), speed=Math.hypot(p.vx,p.vy); if(Math.abs(s)>CONFIG.launchSlopeThreshold && speed>CONFIG.launchSpeedThreshold){ const nx=-s, ny=1, inv=1/Math.hypot(nx,ny); const nux=nx*inv, nuy=ny*inv, boost=CONFIG.launchBoost*speed; p.vx+=nux*boost; p.vy+=-Math.abs(nuy*boost); } }
function updatePlayer(p,leftKey,rightKey,jumpKey,brakeKey){ let dir=0; if(inputs.has(leftKey))dir-=1; if(inputs.has(rightKey))dir+=1; p.vx+=dir*p.car.speed*0.30; if(inputs.has(brakeKey))p.vx*=0.9; p.vx=Math.max(-p.car.speed, Math.min(p.car.speed, p.vx)); p.vy+=CONFIG.gravity; p.x+=p.vx; p.y+=p.vy; const gy=heightAt(p.x); p.onGround=false; if(p.y>=gy-p.car.size/2){ p.y=gy-p.car.size/2; if(p.vy>0)p.vy*=-0.2; p.onGround=true; p.vx*=CONFIG.groundFriction; launchFromRampIfNeeded(p); } else { p.vx*=CONFIG.friction; } for(const pf of game.platforms){ const top=pf.y, left=pf.x, right=pf.x+pf.w, r=p.car.size/2; if(p.x>left && p.x<right){ if(p.vy>0 && p.y+r>=top && p.y-r<top){ p.y=top-r; p.vy=0; p.onGround=true; } } } if(p.onGround && inputs.has(jumpKey)){ p.vy=-CONFIG.jumpImpulse; p.onGround=false; inputs.delete(jumpKey);} if(p.x<0){p.x=0;p.vx=0;} if(p.x>W){p.x=W;p.vx=0;} p.angle=Math.atan2(p.vy,p.vx)*0.15; }
function separatePlayers(a,b){ const r1=a.car.size/2, r2=b.car.size/2, dx=b.x-a.x, dy=b.y-a.y, dist=Math.hypot(dx,dy)||0.0001, min=r1+r2-6; if(dist<min){ const nx=dx/dist, ny=dy/dist, overlap=(min-dist)*0.5; a.x-=nx*overlap; a.y-=ny*overlap; b.x+=nx*overlap; b.y+=ny*overlap; const rvx=b.vx-a.vx, rvy=b.vy-a.vy, sep=rvx*nx+rvy*ny; if(sep<0){ const j=-(1+CONFIG.restitution)*sep*0.5; a.vx-=j*nx; a.vy-=j*ny; b.vx+=j*nx; b.vy+=j*ny; } } }
function headHit(att, def){ const hr=att.car.size*0.18, hx=att.x, hy=att.y-att.car.size*0.35, dx=hx-def.x, dy=hy-def.y, rr=(hr+def.car.size*0.45); return dx*dx+dy*dy < rr*rr; }
function addPoint(winnerIndex, reason){ const p=game.players[winnerIndex]; p.stars++; p.score+=100; game.lastPointText=`${p.label} +100 (${reason})`; game.lastPointTime=performance.now(); if(p.stars>=CONFIG.winStars){ game.winner=`${p.label}`; game.running=false; showVictory(game.winner); ui.resetBtn.style.display='block'; } }
function resolveHeadKills(){ const [p1,p2]=game.players; // FIX: award attacker, not victim
  if(headHit(p1,p2)){ addPoint(0,'Head Hit'); resetRound(); return; }
  if(headHit(p2,p1)){ addPoint(1,'Head Hit'); resetRound(); return; }
}

function resetRound(){ const [p1,p2]=game.players; p1.x=W*0.2; p1.y=heightAt(W*0.2)-60; p1.vx=p1.vy=0; p2.x=W*0.8; p2.y=heightAt(W*0.8)-60; p2.vx=p2.vy=0; }

// ===== 9) Loop =====
function update(dt){ if(!game||!game.running) return; game.timeLeft-=dt; updatePlayer(game.players[0],'p1Left','p1Right','p1Jump','p1Brake'); updatePlayer(game.players[1],'p2Left','p2Right','p2Jump','p2Brake'); separatePlayers(game.players[0],game.players[1]); resolveHeadKills(); }
function render(){ ctx.clearRect(0,0,W,H); const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,'#101318'); grad.addColorStop(1,'#0c1510'); ctx.fillStyle=grad; ctx.fillRect(0,0,W,H); ctx.strokeStyle='#6d4c41'; ctx.lineWidth=6; ctx.beginPath(); for(let x=0;x<=W;x+=10){ const y=heightAt(x); if(x===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);} ctx.stroke(); ctx.fillStyle='#79554844'; ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill(); ctx.fillStyle='#8D6E63'; for(const pf of game.platforms) ctx.fillRect(pf.x,pf.y,pf.w,pf.h); ctx.fillStyle='white'; ctx.font='16px Arial'; ctx.fillText(`J1 ⭐:${game.players[0].stars} Score:${game.players[0].score}`,20,30); ctx.fillText(`J2 ⭐:${game.players[1].stars} Score:${game.players[1].score}`, W-260,30); if(game.lastPointText && performance.now()-game.lastPointTime<1200){ ctx.fillStyle='#ffd54f'; ctx.font='20px Arial Black'; ctx.fillText(game.lastPointText, W/2-100,60);} for(const p of game.players){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle); ctx.fillStyle=p.car.color; ctx.fillRect(-p.car.size/2,-p.car.size/3,p.car.size,p.car.size/1.5); ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(-p.car.size/3,p.car.size/4,p.car.size/8,0,Math.PI*2); ctx.arc(p.car.size/3,p.car.size/4,p.car.size/8,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#ff5252'; ctx.beginPath(); ctx.arc(0,-p.car.size*0.35,p.car.size*0.18,0,Math.PI*2); ctx.fill(); ctx.restore(); } }
function loop(ts){ if(game.lastTime===0) game.lastTime=ts; const dt=Math.min(0.05,(ts-game.lastTime)/1000); game.lastTime=ts; update(dt); render(); updateUI(); requestAnimationFrame(loop);} 

// ===== 10) Start / Replay =====
ui.startBtn.addEventListener('click',()=>{ game.running=true; ui.startBtn.style.display='none'; });
ui.resetBtn?.addEventListener('click',()=>{ initGame(); });

resizeCanvas(); initGame(); requestAnimationFrame(loop);
