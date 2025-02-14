const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const bossSelect = document.getElementById('bossSelect');
const countdownEl = document.getElementById('countdown');
const warningEl = document.getElementById('warning');

// Set canvas to full window size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Create starfield
const stars = [];
const starSpeed = 2;
for(let i = 0; i < 200; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 1 + starSpeed
    });
}

// Game objects
const player = new Player(canvas);
let currentBoss = null;
let gameOver = false;
let gameStarted = false;
let pulseValue = 0;
let pulseDirection = 1;
let loop;
let deathParticles = [];
let fightStartTime = 0;
let bestTimes = {};
let defeatedBosses = {};

// Load saved data from cookies
function loadSavedData() {
    const timeCookie = document.cookie.split('; ').find(row => row.startsWith('bestTimes='));
    const defeatCookie = document.cookie.split('; ').find(row => row.startsWith('defeatedBosses='));
    
    if (timeCookie) {
        bestTimes = JSON.parse(decodeURIComponent(timeCookie.split('=')[1]));
    }
    if (defeatCookie) {
        defeatedBosses = JSON.parse(decodeURIComponent(defeatCookie.split('=')[1]));
        
        // Update boss tiles appearance
        for (const boss in defeatedBosses) {
            if (defeatedBosses[boss]) {
                const tile = document.querySelector(`.boss-tile[onclick="selectBoss('${boss}')"]`);
                console.log(`.boss-tile[onclick="selectBoss('${boss}')"]`)

                if (tile) {
                    tile.style.backgroundColor = '#4a9c4a'; // Green background for defeated bosses
                    const timeText = document.createElement('p');
                    timeText.textContent = `Best: ${formatTime(bestTimes[boss] || 0)}`;
                    tile.appendChild(timeText);
                }
            }
        }
    }
}

function saveCookie(name, value) {
    const encoded = encodeURIComponent(JSON.stringify(value));
    document.cookie = `${name}=${encoded};max-age=31536000;path=/`;
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(2);
    return `${minutes}:${seconds.padStart(5, '0')}`;
}

// Event listeners
canvas.addEventListener('mousemove', (e) => {
    if (!gameOver) {
        player.move(e.clientX, e.clientY, canvas);
    }
});

canvas.addEventListener('mousedown', () => {
    if (!gameOver) player.isShooting = true;
});

canvas.addEventListener('mouseup', () => {
    player.isShooting = false;
});

canvas.addEventListener('mouseleave', () => {
    player.isShooting = false;
});

document.addEventListener('keydown', (e) => {
    if (gameOver && e.key.toLowerCase() === 'r') {
        restartGame();
    }
    if (e.key === 'Escape') {
        returnToMenu();
    }
});

// Game functions
function updateStars() {
    if (!currentBoss?.active) return;
    
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function drawStars() {
    stars.forEach(star => {
        ctx.fillStyle = 'white';
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
}

function drawTimer() {
    if (!gameStarted || gameOver || !currentBoss?.active) return;
    
    const currentTime = Date.now() - fightStartTime;
    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(currentTime), canvas.width - 20, 30);
}

function checkCollisions() {
    if (!currentBoss) return;

    // Player bullets hitting boss
    player.bullets = player.bullets.filter(bullet => {
        if (bullet.x > currentBoss.x - currentBoss.width/2 &&
            bullet.x < currentBoss.x + currentBoss.width/2 &&
            bullet.y > currentBoss.y - currentBoss.height/2 &&
            bullet.y < currentBoss.y + currentBoss.height/2) {
            currentBoss.takeDamage(bullet.damage);
            return false;
        }
        return bullet.y > 0;
    });

    // Check boss collisions with player
    if (currentBoss.checkCollisionWithPlayer(player)) {
        if (player.alive) {
            deathParticles = player.die();
            gameOver = true;
        }
    }
}

function updateDeathParticles() {
    deathParticles = deathParticles.filter(p => p.alpha > 0);
    deathParticles.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.speed *= 0.98;
        p.alpha -= p.decay;
    });
}

function drawDeathParticles() {
    deathParticles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fill();
        ctx.closePath();
    });
}

function update() {
    if (!currentBoss?.active) return;
    if (!gameOver) {
        player.shoot();
        player.updateBullets();
        currentBoss.update();
        updateStars();
        checkCollisions();
    } else {
        currentBoss.update();
        updateStars();
        updateDeathParticles();
    }
    
    pulseValue += 0.05 * pulseDirection;
    if (pulseValue >= 1) {
        pulseDirection = -1;
    } else if (pulseValue <= 0) {
        pulseDirection = 1;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars();
    if (currentBoss) currentBoss.draw(ctx);
    player.draw(ctx);
    drawDeathParticles();
    drawTimer();

    if (gameOver) {
        const alpha = 0.5 + pulseValue * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2);
        
        ctx.font = '30px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('Press R to Restart', canvas.width/2, canvas.height/2 + 50);
        ctx.fillText('Press ESC for Menu', canvas.width/2, canvas.height/2 + 90);
    }
}

function returnToMenu() {
    cancelAnimationFrame(loop);
    bossSelect.style.display = 'grid';
    canvas.style.display = 'none';
    resetGame();
}

function resetGame() {
    gameOver = false;
    gameStarted = false;
    deathParticles = [];
    fightStartTime = 0;
    player.reset(canvas);
    
    if (currentBoss) {
        currentBoss.health = currentBoss.maxHealth;
        currentBoss.y = -100;
        currentBoss.x = canvas.width / 2;
        currentBoss.active = false;
        currentBoss.bullets = [];
        currentBoss.currentPhase = currentBoss.startingPhase;
        currentBoss.phaseTimer = 0;
        currentBoss.rotation = 0;
        currentBoss.rotationSpeed = 0;
        currentBoss.rushCount = 0;
        currentBoss.laserWarning = false;
        currentBoss.firingLaser = false;
    }
}

function restartGame() {
    resetGame();
    currentBoss.active = true;
    gameStarted = true;
    fightStartTime = Date.now();
    const bossEntrance = setInterval(() => {
        if(currentBoss.y < 100) {
            currentBoss.y += 5;
        } else {
            clearInterval(bossEntrance);
        }
    }, 16);
}

function createExplosionParticles() {
    let particles = [];
    // Create initial explosion particles
    for (let i = 0; i < 300; i++) {
        particles.push({
            x: currentBoss.x,
            y: currentBoss.y,
            radius: Math.random() * 8 + 3,
            speed: Math.random() * 12 + 6,
            angle: Math.random() * Math.PI * 2,
            color: `hsl(${Math.random() * 60 + 10}, 100%, 50%)`,
            alpha: 1,
            decay: Math.random() * 0.01 + 0.005
        });
    }

    // Add secondary explosion particles
    setTimeout(() => {
        for (let i = 0; i < 200; i++) {
            particles.push({
                x: currentBoss.x,
                y: currentBoss.y,
                radius: Math.random() * 6 + 2,
                speed: Math.random() * 10 + 4,
                angle: Math.random() * Math.PI * 2,
                color: `hsl(${Math.random() * 30 + 30}, 100%, 70%)`,
                alpha: 1,
                decay: Math.random() * 0.008 + 0.004
            });
        }
    }, 200);

    return particles;
}

function animateExplosion(particles) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars();
    
    let stillActive = false;
    particles.forEach(p => {
        if (p.alpha > 0) {
            stillActive = true;
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.speed *= 0.99;
            p.alpha -= p.decay;
            
            // Draw particle with glow effect
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = p.color.replace(')', `,${p.alpha * 0.3})`);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color.replace(')', `,${p.alpha})`);
            ctx.fill();
        }
    });

    if (stillActive) {
        requestAnimationFrame(() => animateExplosion(particles));
    } else {
        const finalTime = Date.now() - fightStartTime;
        const currentBossType = currentBoss.constructor.name.toLowerCase();
        
        // Update best time if it's better or first completion
        if (!bestTimes[currentBossType] || finalTime < bestTimes[currentBossType]) {
            bestTimes[currentBossType] = finalTime;
            saveCookie('bestTimes', bestTimes);
        }
        
        // Mark boss as defeated
        defeatedBosses[currentBossType] = true;
        saveCookie('defeatedBosses', defeatedBosses);
        
        // Show victory message
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', canvas.width/2, canvas.height/2);
        ctx.font = '30px Arial';
        ctx.fillText(`Time: ${formatTime(finalTime)}`, canvas.width/2, canvas.height/2 + 50);
        ctx.fillText(`Best: ${formatTime(bestTimes[currentBossType])}`, canvas.width/2, canvas.height/2 + 90);
        
        setTimeout(() => {
            bossSelect.style.display = 'grid';
            canvas.style.display = 'none';
            gameStarted = false;
            currentBoss.health = currentBoss.maxHealth;
            currentBoss.y = -100;
            currentBoss.active = false;
            bullets = [];
            
            // Update boss tile appearance
            const tile = document.querySelector(`.boss-tile[onclick*="${currentBossType}"]`);
            if (tile) {
                tile.style.backgroundColor = '#4a9c4a';
                const timeText = tile.querySelector('p:last-child') || document.createElement('p');
                timeText.textContent = `Best: ${formatTime(bestTimes[currentBossType])}`;
                tile.appendChild(timeText);
            }
        }, 5000);
    }
}

function selectBoss(bossType) {
    bossSelect.style.display = 'none';
    canvas.style.display = 'block';
    gameStarted = true;
    
    // Create the appropriate boss based on type
    switch(bossType) {
        case 'redsquareboss':
            currentBoss = new RedSquareBoss(canvas);
            break;
        // Add more boss types here
    }
    
    // Start countdown
    let count = 3;
    countdownEl.style.display = 'block';
    countdownEl.textContent = "Ready?";
    
    let countdownInterval;
    
    const skipHandler = (e) => {
        if (e.code === 'Space') {
            clearInterval(countdownInterval);
            countdownEl.style.display = 'none';
            document.removeEventListener('keydown', skipHandler);
            spawnBoss();
        }
    };
    
    document.addEventListener('keydown', skipHandler);
    
    function spawnBoss() {
        warningEl.style.display = 'block';
        setTimeout(() => {
            warningEl.style.display = 'none';
            currentBoss.active = true;
            fightStartTime = Date.now();
            const bossEntrance = setInterval(() => {
                if(currentBoss.y < 100) {
                    currentBoss.y += 5;
                } else {
                    clearInterval(bossEntrance);
                }
            }, 16);
        }, 1000);
    }
    
    countdownInterval = setInterval(() => {
        if(count > 0) {
            countdownEl.textContent = count;
            count--;
        } else {
            clearInterval(countdownInterval);
            countdownEl.style.display = 'none';
            document.removeEventListener('keydown', skipHandler);
            spawnBoss();
        }
    }, 1000);

    gameLoop();
}

function gameLoop() {
    if (!gameOver && currentBoss?.health > 0) {
        update();
        draw();
        loop = requestAnimationFrame(gameLoop);
    } else if (gameOver) {
        update();
        draw();
        loop = requestAnimationFrame(gameLoop);
    } else if (currentBoss?.health <= 0) {
        const particles = createExplosionParticles();
        animateExplosion(particles);
    }
}

// Initially hide the canvas and load saved data
canvas.style.display = 'none';
loadSavedData();