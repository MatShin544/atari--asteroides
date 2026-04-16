const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let cw, ch;
function resize() {
    cw = canvas.width = window.innerWidth;
    ch = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);

const STATE_START = 0;
const STATE_PLAY = 1;
const STATE_OVER = 2;
let gameState = STATE_START;
let score = 0;
let level = 1;
let lives = 3;
let lastLevelUpTime = 0;

let controlType = "keyboard";
let diffMode = "medium";
let timeLevelStep = 5000;
let diffSpeed = 1.0;

let ship = null;
let asteroids = [];
let bullets = [];
let powerups = [];

const keys = {
    ArrowUp: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    MouseRight: false
};

let mouseX = 0, mouseY = 0;

function initShip() {
    return {
        x: cw / 2,
        y: ch / 2,
        a: -Math.PI / 2,
        r: 15,
        vx: 0,
        vy: 0,
        thrusting: false,
        canShoot: true,
        invulnerable: 120,
        shield: 0,
        multishot: 0
    };
}

function createAsteroid(x, y, r, aLvl) {
    let speedMult = (level * 0.5 + aLvl) * diffSpeed; 
    let a = {
        x, y,
        vx: (Math.random() - 0.5) * 4 * speedMult,
        vy: (Math.random() - 0.5) * 4 * speedMult,
        r: r,
        lvl: aLvl,
        vert: Math.floor(Math.random() * 5 + 7),
        offs: []
    };
    for(let i = 0; i < a.vert; i++) {
        a.offs.push(Math.random() * 0.4 + 0.8);
    }
    return a;
}

function spawnAsteroids(num) {
    for(let i = 0; i < num; i++) {
        let x, y;
        do {
            x = Math.random() * cw;
            y = Math.random() * ch;
        } while (ship && dist(x, y, ship.x, ship.y) < ship.r + 100);
        asteroids.push(createAsteroid(x, y, 60, 1));
    }
}

function createPowerup(x, y) {
    let types = ['life', 'shield', 'multishot'];
    let type = types[Math.floor(Math.random() * types.length)];
    return {
        x, y, 
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        r: 15,
        type: type,
        life: 600
    };
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function wrap(obj) {
    let pad = obj.r || 0;
    if (obj.x < -pad) obj.x = cw + pad;
    else if (obj.x > cw + pad) obj.x = -pad;
    if (obj.y < -pad) obj.y = ch + pad;
    else if (obj.y > ch + pad) obj.y = -pad;
}

// ---- INTERFACE DE MENU ----
function showMenu() {
    gameState = STATE_START;
    document.getElementById("menu").classList.remove("hidden");
    asteroids = [];
    spawnAsteroids(4);
}

document.getElementById("startBtn").addEventListener("click", () => {
    controlType = document.querySelector('input[name="controls"]:checked').value;
    diffMode = document.querySelector('input[name="difficulty"]:checked').value;
    document.getElementById("menu").classList.add("hidden");
    startGame();
});

function startGame() {
    gameState = STATE_PLAY;
    score = 0;
    level = 1;
    
    let startAst = 5;
    if (diffMode === "easy") {
        lives = 5;
        timeLevelStep = 10000;
        diffSpeed = 0.5;
        startAst = 3;
    } else if (diffMode === "medium") {
        lives = 3;
        timeLevelStep = 5000;
        diffSpeed = 1.0;
        startAst = 5;
    } else if (diffMode === "hard") {
        lives = 1;
        timeLevelStep = 3000;
        diffSpeed = 1.5;
        startAst = 7;
    }
    
    ship = initShip();
    bullets = [];
    asteroids = [];
    powerups = [];
    lastLevelUpTime = Date.now();
    spawnAsteroids(startAst);
}

// ---- TIROS E CONTROLES ----
function shoot() {
    if (!ship || !ship.canShoot) return;
    
    bullets.push({
        x: ship.x + ship.r * Math.cos(ship.a),
        y: ship.y + ship.r * Math.sin(ship.a),
        vx: ship.vx + Math.cos(ship.a) * 10,
        vy: ship.vy + Math.sin(ship.a) * 10,
        life: 50
    });
    
    if (ship.multishot > 0) {
        for (let angleOff of [-0.2, 0.2]) {
            bullets.push({
                x: ship.x + ship.r * Math.cos(ship.a + angleOff),
                y: ship.y + ship.r * Math.sin(ship.a + angleOff),
                vx: ship.vx + Math.cos(ship.a + angleOff) * 10,
                vy: ship.vy + Math.sin(ship.a + angleOff) * 10,
                life: 50
            });
        }
    }
    
    ship.canShoot = false;
    setTimeout(() => { ship.canShoot = true; }, 200);
}

canvas.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

canvas.addEventListener("mousedown", (e) => {
    if (gameState === STATE_PLAY) {
        if (e.button === 0 && controlType === "mouse") shoot(); // Esq = Aciona Tiro
        else if (e.button === 2 && controlType === "mouse") keys.MouseRight = true; // Dir = Acelerar
    }
});

canvas.addEventListener("mouseup", (e) => {
    if (e.button === 2) keys.MouseRight = false;
});

// Impede que menu de contexto nativo abra pelo click direito
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp") keys.ArrowUp = true;
    if (e.code === "ArrowLeft") keys.ArrowLeft = true;
    if (e.code === "ArrowRight") keys.ArrowRight = true;
    if (e.code === "KeyW") keys.KeyW = true;
    
    if (e.code === "Space") {
        if (gameState === STATE_OVER) {
            showMenu();
        } else if (gameState === STATE_PLAY && controlType === "keyboard") {
            shoot();
        }
    }
});

window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp") keys.ArrowUp = false;
    if (e.code === "ArrowLeft") keys.ArrowLeft = false;
    if (e.code === "ArrowRight") keys.ArrowRight = false;
    if (e.code === "KeyW") keys.KeyW = false;
});

function die() {
    lives--;
    if (lives <= 0) {
        gameState = STATE_OVER;
    } else {
        ship = initShip(); 
    }
}

// ---- CICLO PRINCIPAL DO JOGO ----
function update() {
    if (gameState === STATE_PLAY) {
        // Controle de passagem de nível (frequência varia segundo a dificuldade)
        if (Date.now() - lastLevelUpTime > timeLevelStep) {
            level++;
            lastLevelUpTime = Date.now();
            spawnAsteroids(1);
        }

        if (ship.invulnerable > 0) ship.invulnerable--;
        if (ship.shield > 0) ship.shield--;
        if (ship.multishot > 0) ship.multishot--;

        // LOGICA DE CONTROLE NAVE
        if (controlType === "mouse") {
            ship.a = Math.atan2(mouseY - ship.y, mouseX - ship.x); // Mira pra onde ta o cursor
            if (keys.MouseRight || keys.KeyW || keys.ArrowUp) {
                ship.vx += Math.cos(ship.a) * 0.15;
                ship.vy += Math.sin(ship.a) * 0.15;
                ship.thrusting = true;
            } else {
                ship.thrusting = false;
            }
        } else {
            // Teclado
            if (keys.ArrowLeft) ship.a -= 0.1;
            if (keys.ArrowRight) ship.a += 0.1;

            if (keys.ArrowUp || keys.KeyW) {
                ship.vx += Math.cos(ship.a) * 0.15;
                ship.vy += Math.sin(ship.a) * 0.15;
                ship.thrusting = true;
            } else {
                ship.thrusting = false;
            }
        }
        
        ship.vx *= 0.99;
        ship.vy *= 0.99;
        ship.x += ship.vx;
        ship.y += ship.vy;
        wrap(ship);

        // Projéteis
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            wrap(b);
            b.life--;
            if (b.life < 0) bullets.splice(i, 1);
        }
        
        // Powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
            let p = powerups[i];
            p.x += p.vx;
            p.y += p.vy;
            wrap(p);
            p.life--;
            
            if (p.life < 0) {
                powerups.splice(i, 1);
                continue;
            }
            
            if (dist(p.x, p.y, ship.x, ship.y) < p.r + ship.r) {
                if (p.type === 'life') lives++; 
                else if (p.type === 'shield') ship.shield = 600; 
                else if (p.type === 'multishot') ship.multishot = 600;
                
                score += 50; 
                powerups.splice(i, 1);
            }
        }

        // Colisões Nave x Asteroide
        for (let i = asteroids.length - 1; i >= 0; i--) {
            let a = asteroids[i];
            a.x += a.vx;
            a.y += a.vy;
            wrap(a);

            if (ship.invulnerable <= 0 && dist(a.x, a.y, ship.x, ship.y) < a.r * 0.8 + ship.r * 0.8) {
                if (ship.shield > 0) {
                    ship.shield = 0; 
                    asteroids.splice(i, 1);
                    ship.invulnerable = 60; 
                } else {
                    die();
                    break;
                }
            }
        }

        // Colisões Projéteis x Asteroides
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
            let b = bullets[bi];
            let hit = false;
            for (let ai = asteroids.length - 1; ai >= 0; ai--) {
                let a = asteroids[ai];
                if (dist(b.x, b.y, a.x, a.y) < a.r) {
                    score += a.lvl * 100;
                    
                    if (Math.random() < 0.1) {
                        powerups.push(createPowerup(a.x, a.y));
                    }

                    if (a.lvl < 3) {
                        asteroids.push(createAsteroid(a.x, a.y, a.r * 0.5, a.lvl + 1));
                        asteroids.push(createAsteroid(a.x, a.y, a.r * 0.5, a.lvl + 1));
                    }
                    asteroids.splice(ai, 1);
                    bullets.splice(bi, 1);
                    hit = true;
                    
                    if (asteroids.length === 0) { // Cleared level bonus
                        level++;
                        lastLevelUpTime = Date.now();
                        spawnAsteroids(3 + level);
                    }
                    break;
                }
            }
        }
    } else if (gameState === STATE_START) {
        for (let a of asteroids) {
            a.x += a.vx;
            a.y += a.vy;
            wrap(a);
        }
    }
}

// ---- DESENHO DA TELA ----
function draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, cw, ch);

    if (gameState === STATE_START) {
        drawAsteroids();
        return;
    }

    if (gameState === STATE_OVER) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        
        ctx.font = "60px monospace";
        ctx.fillText("GAME OVER", cw / 2, ch / 2 - 40);
        
        ctx.font = "30px monospace";
        ctx.fillText("PRESS SPACE FOR MENU", cw / 2, ch / 2 + 40);
        ctx.fillText("SCORE: " + score, cw / 2, ch / 2 + 100);
        ctx.fillText("LEVEL MAX: " + level, cw / 2, ch / 2 + 150);
        
        drawAsteroids();
        return;
    }

    if (gameState === STATE_PLAY) {
        if (ship.invulnerable % 10 < 5) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(
                ship.x + ship.r * Math.cos(ship.a),
                ship.y + ship.r * Math.sin(ship.a)
            );
            ctx.lineTo(
                ship.x - ship.r * (Math.cos(ship.a) + Math.sin(ship.a) * 0.6),
                ship.y - ship.r * (Math.sin(ship.a) - Math.cos(ship.a) * 0.6)
            );
            ctx.lineTo(
                ship.x - ship.r * (Math.cos(ship.a) - Math.sin(ship.a) * 0.6),
                ship.y - ship.r * (Math.sin(ship.a) + Math.cos(ship.a) * 0.6)
            );
            ctx.closePath();
            ctx.stroke();

            if (ship.thrusting) {
                ctx.beginPath();
                ctx.moveTo(
                    ship.x - ship.r * Math.cos(ship.a),
                    ship.y - ship.r * Math.sin(ship.a)
                );
                ctx.lineTo(
                    ship.x - ship.r * 1.8 * Math.cos(ship.a) + (Math.random() - 0.5) * 10,
                    ship.y - ship.r * 1.8 * Math.sin(ship.a) + (Math.random() - 0.5) * 10
                );
                ctx.stroke();
            }

            if (ship.shield > 0) {
                ctx.strokeStyle = "cyan";
                ctx.beginPath();
                ctx.arc(ship.x, ship.y, ship.r + 8, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.font = "20px monospace";
        ctx.fillText("SCORE: " + score, 20, 40);
        ctx.fillText("LEVEL: " + level, 20, 70);
        ctx.fillText("LIVES: " + lives, 20, 100);

        ctx.font = "18px monospace";
        if (ship.multishot > 0) {
            ctx.fillStyle = "yellow";
            ctx.fillText("MULTISHOT ACTIVE!", 20, ch - 30);
        }
        if (ship.shield > 0) {
            ctx.fillStyle = "cyan";
            ctx.fillText("SHIELD ACTIVE!", 20, ch - 60);
        }
    }

    drawAsteroids();

    for (let p of powerups) {
        if (p.life % 20 < 10) continue;
        
        ctx.fillStyle = p.type === 'life' ? 'lawngreen' : (p.type === 'shield' ? 'cyan' : 'yellow');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "black";
        ctx.font = "16px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let letter = p.type === 'life' ? 'L' : (p.type === 'shield' ? 'S' : 'M'); 
        ctx.fillText(letter, p.x, p.y);
    }

    ctx.fillStyle = "white";
    for (let i = 0; i < bullets.length; i++) {
        let b = bullets[i];
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawAsteroids() {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    for (let i = 0; i < asteroids.length; i++) {
        let a = asteroids[i];
        ctx.beginPath();
        for (let j = 0; j < a.vert; j++) {
            let angle = (j / a.vert) * Math.PI * 2;
            let radius = a.r * a.offs[j];
            let px = a.x + Math.cos(angle) * radius;
            let py = a.y + Math.sin(angle) * radius;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Inicialização
resize();
showMenu();
requestAnimationFrame(loop);
