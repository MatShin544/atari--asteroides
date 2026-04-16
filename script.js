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

let ship = null;
let asteroids = [];
let bullets = [];

const keys = {
    ArrowUp: false,
    ArrowLeft: false,
    ArrowRight: false
};

function initShip() {
    return {
        x: cw / 2,
        y: ch / 2,
        a: -Math.PI / 2, // Aponta para cima
        r: 15, // Raio da nave
        vx: 0,
        vy: 0,
        thrusting: false,
        canShoot: true
    };
}

function createAsteroid(x, y, r, aLvl) {
    let a = {
        x, y,
        vx: (Math.random() - 0.5) * 4 * (level + aLvl) / 2,
        vy: (Math.random() - 0.5) * 4 * (level + aLvl) / 2,
        r: r,
        lvl: aLvl,
        vert: Math.floor(Math.random() * 5 + 7), // 7 a 11 vértices
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
        asteroids.push(createAsteroid(x, y, 60, 1)); // Nível 1 são os maiores
    }
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

function startGame() {
    gameState = STATE_PLAY;
    score = 0;
    level = 1;
    ship = initShip();
    bullets = [];
    asteroids = [];
    spawnAsteroids(3 + level);
}

window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowUp") keys.ArrowUp = true;
    if (e.code === "ArrowLeft") keys.ArrowLeft = true;
    if (e.code === "ArrowRight") keys.ArrowRight = true;
    
    // Inicia, reinicia ou atira
    if (e.code === "Space") {
        if (gameState === STATE_START || gameState === STATE_OVER) {
            startGame();
        } else if (gameState === STATE_PLAY) {
            if (ship.canShoot) {
                bullets.push({
                    x: ship.x + ship.r * Math.cos(ship.a),
                    y: ship.y + ship.r * Math.sin(ship.a),
                    vx: ship.vx + Math.cos(ship.a) * 8,
                    vy: ship.vy + Math.sin(ship.a) * 8,
                    life: 50 // Duração do projétil
                });
                ship.canShoot = false;
                setTimeout(() => { ship.canShoot = true; }, 250); // Cadência de tiro
            }
        }
    }
});

window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowUp") keys.ArrowUp = false;
    if (e.code === "ArrowLeft") keys.ArrowLeft = false;
    if (e.code === "ArrowRight") keys.ArrowRight = false;
});

function update() {
    if (gameState === STATE_PLAY) {
        // Rotação da nave
        if (keys.ArrowLeft) ship.a -= 0.1;
        if (keys.ArrowRight) ship.a += 0.1;

        // Aceleração
        if (keys.ArrowUp) {
            ship.vx += Math.cos(ship.a) * 0.15;
            ship.vy += Math.sin(ship.a) * 0.15;
            ship.thrusting = true;
        } else {
            ship.thrusting = false;
        }
        
        // Fricção para evitar velocidade infinita
        ship.vx *= 0.99;
        ship.vy *= 0.99;
        
        ship.x += ship.vx;
        ship.y += ship.vy;
        wrap(ship);

        // Atualizar projéteis
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            wrap(b);
            b.life--;
            if (b.life < 0) {
                bullets.splice(i, 1);
            }
        }
        
        // Atualizar asteroides e verificar colisão com a nave
        for (let i = asteroids.length - 1; i >= 0; i--) {
            let a = asteroids[i];
            a.x += a.vx;
            a.y += a.vy;
            wrap(a);

            if (dist(a.x, a.y, ship.x, ship.y) < a.r * 0.8 + ship.r * 0.8) {
                gameState = STATE_OVER;
            }
        }

        // Colisão: Projéteis x Asteroides
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
            let b = bullets[bi];
            let hit = false;
            for (let ai = asteroids.length - 1; ai >= 0; ai--) {
                let a = asteroids[ai];
                if (dist(b.x, b.y, a.x, a.y) < a.r) {
                    score += a.lvl * 100;
                    // Se o asteroide não for o menor (nível 3), ele se divide em 2
                    if (a.lvl < 3) {
                        asteroids.push(createAsteroid(a.x, a.y, a.r * 0.5, a.lvl + 1));
                        asteroids.push(createAsteroid(a.x, a.y, a.r * 0.5, a.lvl + 1));
                    }
                    asteroids.splice(ai, 1);
                    bullets.splice(bi, 1);
                    hit = true;
                    
                    // Se não houver mais asteroides, avançar de nível
                    if (asteroids.length === 0) {
                        level++;
                        spawnAsteroids(3 + level);
                    }
                    break; // Evita que um projétil destrua dois asteroides na mesma frame
                }
            }
        }
    } else if (gameState === STATE_START) {
        // Efeito de fundo na tela iniciar
        for (let a of asteroids) {
            a.x += a.vx;
            a.y += a.vy;
            wrap(a);
        }
    }
}

function draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, cw, ch);

    if (gameState === STATE_START) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "60px monospace";
        ctx.fillText("ASTEROIDS", cw / 2, ch / 2 - 40);
        
        ctx.font = "30px monospace";
        // Efeito piscante para o texto
        let a = (Math.sin(Date.now() / 300) + 1) / 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.fillText("PRESS SPACE TO PLAY", cw / 2, ch / 2 + 40);
        
        ctx.fillStyle = "white";
        drawAsteroids();
        return;
    }

    if (gameState === STATE_OVER) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        
        ctx.font = "60px monospace";
        ctx.fillText("GAME OVER", cw / 2, ch / 2 - 40);
        
        ctx.font = "30px monospace";
        ctx.fillText("PRESS SPACE TO RESTART", cw / 2, ch / 2 + 40);
        ctx.fillText("SCORE: " + score, cw / 2, ch / 2 + 100);
        
        drawAsteroids();
        return;
    }

    if (gameState === STATE_PLAY) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        
        // Desenhar a nave
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

        // Desenhar a chama se estiver acelerando
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

        // Pontuação
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.font = "24px monospace";
        ctx.fillText("SCORE: " + score, 20, 40);
    }

    drawAsteroids();

    // Desenhar projéteis
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
level = 1;
spawnAsteroids(4); // Cria alguns asteroides de fundo para a tela inicial
requestAnimationFrame(loop);
