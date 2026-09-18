// Slither Me Jev - core game (no AI brain yet, random moves for AI snakes)
const GRID = 30, CELL = 20;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const hud = document.getElementById("hud");
const DIRS = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
const OPP = { up:"down", down:"up", left:"right", right:"left" };
const COLORS = ["#e74c3c","#3498db","#f1c40f","#9b59b6","#1abc9c","#e67e22","#2ecc71","#ff69b4"];
const NAMES = ["Greedy","Coward","Psycho","Hunter","Ghost","Chaos","Sniper","Rogue"];

let snakes = [], food = [], tick = 0, gameOver = false;

function rndCell(){ return [Math.floor(Math.random()*GRID), Math.floor(Math.random()*GRID)]; }

function newSnake(id, isHuman){
  return {
    id, isHuman, name: isHuman ? "YOU" : NAMES[id],
    color: isHuman ? "#ffffff" : COLORS[id],
    body: [rndCell()], dir: "right", alive: true, odds: {}
  };
}

function initGame(){
  snakes = [newSnake(0, true)];
  for(let i=1;i<8;i++) snakes.push(newSnake(i,false));
  food = Array.from({length:15}, rndCell);
  gameOver = false; tick = 0;
}

function legalMoves(s){
  const [hx,hy] = s.body[0];
  const moves = {};
  for(const d in DIRS){
    if(d === OPP[s.dir] && s.body.length>1) continue; // no reverse
    const [dx,dy] = DIRS[d];
    const nx=hx+dx, ny=hy+dy;
    let fact = "safe";
    if(nx<0||ny<0||nx>=GRID||ny>=GRID) fact = "wall, death";
    else if(snakes.some(o=>o.alive && o.body.some(([bx,by])=>bx===nx&&by===ny))) fact = "body collision, death";
    else if(food.some(([fx,fy])=>fx===nx&&fy===ny)) fact = "food here";
    moves[d] = fact;
  }
  return moves;
}

// fallback brain if Jev call fails/slow: picks randomly among safe moves
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
    const r = await fetch("/moves", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    if(!r.ok) throw new Error("bad status");
    return await r.json();
  }catch(e){ return null; }
}

let busy = false;
async function step(){
  if(gameOver || busy) return;
  busy = true;
  const movesById = {};
  for(const s of snakes) if(s.alive) movesById[s.id] = legalMoves(s);

  const aiSnakes = snakes.filter(s=>s.alive && !s.isHuman);
  const jevOut = aiSnakes.length ? await askJev(aiSnakes, movesById) : null;

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
    const [dx,dy] = DIRS[dir];
    const [hx,hy] = s.body[0];
    const nh = [hx+dx, hy+dy];
    if(nh[0]<0||nh[1]<0||nh[0]>=GRID||nh[1]>=GRID){ s.alive=false; continue; }
    if(snakes.some(o=>o.alive && o.body.some(([bx,by])=>bx===nh[0]&&by===nh[1]))){ s.alive=false; continue; }
    s.body.unshift(nh);
    const fi = food.findIndex(([fx,fy])=>fx===nh[0]&&fy===nh[1]);
    if(fi>=0){ food.splice(fi,1); food.push(rndCell()); } else { s.body.pop(); }
  }
  const alive = snakes.filter(s=>s.alive);
  if(alive.length<=1) gameOver = true;
  tick++;
  draw();
  busy = false;
}

function draw(){
  ctx.clearRect(0,0,cv.width,cv.height);
  ctx.fillStyle="#222";
  for(const [fx,fy] of food) ctx.fillRect(fx*CELL+6, fy*CELL+6, 8,8);
  for(const s of snakes){
    if(!s.alive) continue;
    ctx.fillStyle = s.color;
    for(const [bx,by] of s.body) ctx.fillRect(bx*CELL+1, by*CELL+1, CELL-2, CELL-2);
  }
  if(gameOver){
    ctx.fillStyle="#fff"; ctx.font="24px monospace"; ctx.textAlign="center";
    const winner = snakes.find(s=>s.alive);
    ctx.fillText(winner ? (winner.name+" WINS") : "DRAW", cv.width/2, cv.height/2);
  }
  drawHud();
}

function drawHud(){
  hud.innerHTML = snakes.map(s=>{
    if(s.isHuman) return "";
    const bars = Object.entries(s.odds).map(([d,p])=>
      `<div>${d} <div class="bar"><div class="fill" style="width:${Math.round(p*100)}%;background:${s.color}"></div></div></div>`
    ).join("");
    return `<div style="opacity:${s.alive?1:0.3}"><b style="color:${s.color}">${s.name}</b> ${bars}</div>`;
  }).join("");
}

window.addEventListener("keydown", e=>{
  const human = snakes[0];
  if(!human || !human.alive) return;
  const map = {ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
  const d = map[e.key];
  if(d && d !== OPP[human.dir]) human.dir = d;
});

initGame();
draw();
setInterval(step, 300);
