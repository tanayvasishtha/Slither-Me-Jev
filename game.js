// Slither Me Jev
const GRID = 24;
const cv = document.getElementById("arena"), ctx = cv.getContext("2d");
const cardsEl = document.getElementById("cards");
const jevPill = document.getElementById("jevPill");
const DIRS = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
const OPP = { up:"down", down:"up", left:"right", right:"left" };
const ARROW = { up:"▲", down:"▼", left:"◀", right:"▶" };
const COLORS = ["#3bb0ff","#ffd23b","#ff3b5c","#b56bff","#2ef2c4","#ff8a3b","#7dff3b","#ff5ce1"];
const NAMES = ["Coward","Greedy","Psycho","Hunter","Ghost","Chaos","Sniper","Viper"];

let snakes = [], food = [], tick = 0, gameOver = false, lastTickTime = 0;
const TICK_MS = 300;

function sizeCanvas(){
  const wrap = document.getElementById("arenaWrap");
  const size = Math.min(wrap.clientWidth, wrap.clientHeight);
  const dpr = window.devicePixelRatio || 1;
  cv.style.width = size+"px"; cv.style.height = size+"px";
  cv.width = size*dpr; cv.height = size*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  window.CELL = size / GRID;
}
window.addEventListener("resize", sizeCanvas);

function rndCell(){ return [Math.floor(Math.random()*GRID), Math.floor(Math.random()*GRID)]; }

function dirTowardCenter(x,y){
  const cx=GRID/2, cy=GRID/2;
  const dx=cx-x, dy=cy-y;
  return Math.abs(dx) > Math.abs(dy) ? (dx>0?"right":"left") : (dy>0?"down":"up");
}

function newSnake(i, isHuman){
  const angle = (i / 8) * Math.PI * 2;
  const r = GRID * 0.35;
  const cx = GRID/2, cy = GRID/2;
  const hx = Math.round(cx + Math.cos(angle)*r);
  const hy = Math.round(cy + Math.sin(angle)*r);
  const dir = dirTowardCenter(hx,hy);
  const [dx,dy] = DIRS[dir];
  const body = [];
  for(let k=0;k<5;k++) body.push([hx-dx*k, hy-dy*k]);
  return {
    id:i, isHuman, name: isHuman ? "YOU" : NAMES[i],
    color: isHuman ? "#ffffff" : COLORS[i],
    body, prevBody: body.map(c=>c.slice()),
    dir, alive:true, odds:{}, kills:0, deathCause:null, avgConf:[], eating:false
  };
}

function initGame(){
  snakes = [newSnake(0, true)];
  for(let i=1;i<8;i++) snakes.push(newSnake(i,false));
  food = Array.from({length:12}, ()=>({pos:rndCell(), t:Math.random()*10, pop:0}));
  gameOver = false; tick = 0;
  lastTickTime = performance.now();
}

function legalMoves(s){
  const [hx,hy] = s.body[0];
  const moves = {};
  for(const d in DIRS){
    if(d === OPP[s.dir] && s.body.length>1) continue;
    const [dx,dy] = DIRS[d];
    const nx=hx+dx, ny=hy+dy;
    let fact = "safe";
    if(nx<0||ny<0||nx>=GRID||ny>=GRID) fact = "wall, death";
    else if(snakes.some(o=>o.alive && o.body.some(([bx,by])=>bx===nx&&by===ny))) fact = "body collision, death";
    else if(food.some(f=>f.pos[0]===nx&&f.pos[1]===ny)) fact = "food here";
    moves[d] = fact;
  }
  return moves;
}

function fallbackMove(s, moves){
  const safe = Object.entries(moves).filter(([,f])=>!f.includes("death"));
  const pick = safe.length ? safe[Math.floor(Math.random()*safe.length)][0] : Object.keys(moves)[0];
  s.odds = {}; const n = Object.keys(moves).length;
  for(const d in moves) s.odds[d] = d===pick ? 0.7 : 0.3/(n-1);
  return pick;
}

async function askJev(aiSnakes, movesById){
  try{
    const payload = { snakes: aiSnakes.map(s=>({ id:s.id, personality:s.name, moves:movesById[s.id] })) };
    const started = performance.now();
    const r = await fetch("/moves", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    const ms = Math.round(performance.now()-started);
    if(!r.ok) throw new Error("bad status");
    const json = await r.json();
    jevPill.classList.remove("fallback");
    jevPill.textContent = `Jev · 1 call · ${aiSnakes.length} decisions · ${ms}ms`;
    return json;
  }catch(e){
    jevPill.classList.add("fallback");
    jevPill.textContent = "fallback";
    return null;
  }
}

let busy = false;
async function step(){
  if(gameOver || busy) return;
  busy = true;
  for(const s of snakes) s.prevBody = s.body.map(c=>c.slice());

  const movesById = {};
  for(const s of snakes) if(s.alive) movesById[s.id] = legalMoves(s);

  const aiSnakes = snakes.filter(s=>s.alive && !s.isHuman);
  const jevOut = aiSnakes.length ? await askJev(aiSnakes, movesById) : null;

  // decide directions first
  for(const s of snakes){
    if(!s.alive) continue;
    const moves = movesById[s.id];
    let dir;
    if(s.isHuman){ dir = s.dir; }
    else if(jevOut && jevOut[s.id] && moves[jevOut[s.id].choice]){
      dir = jevOut[s.id].choice;
      s.odds = jevOut[s.id].probabilities || {};
    } else {
      dir = fallbackMove(s, moves);
    }
    s.dir = dir;
  }
  // apply moves
  for(const s of snakes){
    if(!s.alive) continue;
    const [dx,dy] = DIRS[s.dir];
    const [hx,hy] = s.body[0];
    const nh = [hx+dx, hy+dy];
    if(nh[0]<0||nh[1]<0||nh[0]>=GRID||nh[1]>=GRID){ s.alive=false; s.deathCause="wall"; continue; }
    const hitBody = snakes.find(o=>o.alive && o.body.some(([bx,by])=>bx===nh[0]&&by===nh[1]));
    if(hitBody){ s.alive=false; s.deathCause = hitBody===s ? "self" : hitBody.name; continue; }
    s.body.unshift(nh);
    const fi = food.findIndex(f=>f.pos[0]===nh[0]&&f.pos[1]===nh[1]);
    if(fi>=0){ food[fi].pos = rndCell(); food[fi].pop = 1; s.eating = true; } else { s.body.pop(); s.eating = false; }
  }
  const alive = snakes.filter(s=>s.alive);
  if(alive.length<=1) gameOver = true;
  tick++;
  lastTickTime = performance.now();
  busy = false;
}

function drawSnake(s, t){
  const CELL = window.CELL;
  const n = s.body.length;
  for(let i=n-1;i>=0;i--){
    const cur = s.body[i];
    const prev = s.prevBody[i] || cur;
    const x = (prev[0] + (cur[0]-prev[0])*t) * CELL;
    const y = (prev[1] + (cur[1]-prev[1])*t) * CELL;
    const frac = i/(n-1||1);
    const w = CELL * (0.9 - frac*0.35);
    ctx.save();
    ctx.shadowBlur = 10; ctx.shadowColor = s.color;
    ctx.fillStyle = s.color;
    ctx.globalAlpha = 1 - frac*0.4;
    ctx.beginPath();
    ctx.roundRect(x + (CELL-w)/2, y + (CELL-w)/2, w, w, w/3);
    ctx.fill();
    ctx.restore();
  }
  // eyes on head
  const head = s.body[0], prevHead = s.prevBody[0] || head;
  const hx = (prevHead[0] + (head[0]-prevHead[0])*t) * CELL;
  const hy = (prevHead[1] + (head[1]-prevHead[1])*t) * CELL;
  const [dx,dy] = DIRS[s.dir];
  const ex = dx*CELL*0.2, ey = dy*CELL*0.2;
  const perpX = -dy*CELL*0.18, perpY = dx*CELL*0.18;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(hx+CELL/2+ex+perpX, hy+CELL/2+ey+perpY, CELL*0.11, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(hx+CELL/2+ex-perpX, hy+CELL/2+ey-perpY, CELL*0.11, 0, 7); ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.arc(hx+CELL/2+ex+perpX, hy+CELL/2+ey+perpY, CELL*0.05, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(hx+CELL/2+ex-perpX, hy+CELL/2+ey-perpY, CELL*0.05, 0, 7); ctx.fill();
}

function render(now){
  const CELL = window.CELL;
  const w = cv.clientWidth, h = cv.clientHeight;
  ctx.clearRect(0,0,w,h);
  const t = Math.min(1, (now - lastTickTime) / TICK_MS);

  for(const f of food){
    if(f.pop>0){ f.pop = Math.max(0, f.pop-0.08); }
    const pulse = 1 + Math.sin(now/300 + f.t)*0.15 + f.pop*0.8;
    const r = CELL*0.15*pulse;
    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = "#ffd6f0";
    ctx.fillStyle = "#ffd6f0";
    ctx.globalAlpha = Math.max(0, 1 - f.pop*0.6);
    ctx.beginPath();
    ctx.arc(f.pos[0]*CELL+CELL/2, f.pos[1]*CELL+CELL/2, r, 0, 7);
    ctx.fill();
    ctx.restore();
  }
  for(const s of snakes){
    if(!s.alive) continue;
    drawSnake(s, t);
  }
  if(gameOver){
    ctx.fillStyle="#fff"; ctx.font="24px sans-serif"; ctx.textAlign="center";
    const winner = snakes.find(s=>s.alive);
    ctx.fillText(winner ? (winner.name+" WINS") : "DRAW", w/2, h/2);
  }
  requestAnimationFrame(render);
}

function drawCards(){
  cardsEl.innerHTML = snakes.map(s=>{
    return `<div class="card ${s.alive?"":"dead"}">
      <div class="row1">
        <div class="dot" style="background:${s.color}"></div>
        <div class="name" style="color:${s.color}">${s.name}</div>
        <div class="tag">${s.alive ? (s.isHuman?"arrow keys":"thinking...") : ("☠ " + (s.deathCause||""))}</div>
        <div class="len">${s.body.length}</div>
      </div>
    </div>`;
  }).join("");
}
setInterval(drawCards, 300);

window.addEventListener("keydown", e=>{
  const human = snakes[0];
  if(!human || !human.alive) return;
  const map = {ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
  const d = map[e.key];
  if(d && d !== OPP[human.dir]) human.dir = d;
});

sizeCanvas();
initGame();
drawCards();
requestAnimationFrame(render);
setInterval(step, TICK_MS);
