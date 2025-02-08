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
const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    radius: 15,
    color: 'white',
    isShooting: false,
    lastShot: 0,
    fireRate: 100
};

let currentBoss = null;
let bullets = [];
let gameOver = false;
let gameStarted = false;
let pulseValue = 0;
let pulseDirection = 1;
let loop;

// Event listeners
canvas.addEventListener('mousemove', (e) => {
    if (!gameOver) {
        player.x = Math.max(player.radius, Math.min(e.clientX, canvas.width - player.radius));
        player.y = Math.max(100, Math.min(e.clientY, canvas.height - player.radius));
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

function shoot() {
    const currentTime = Date.now();
    if (player.isShooting && currentTime - player.lastShot >= player.fireRate) {
        bullets.push({
            x: player.x,
            y: player.y,
            radius: 5,
            speed: 30,
            damage: Math.floor(Math.random() * 20) + 100
        });
        player.lastShot = currentTime;
    }
}

function drawPlayer() {
    if (!gameOver) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.closePath();
    }
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.closePath();
    });
}

function checkCollisions() {
    if (!currentBoss) return;

    // Player bullets hitting boss
    bullets = bullets.filter(bullet => {
        if (bullet.x > currentBoss.x - currentBoss.width/2 &&
            bullet.x < currentBoss.x + currentBoss.width/2 &&
            bullet.y > currentBoss.y - currentBoss.height/2 &&
            bullet.y < currentBoss.y + currentBoss.height/2) {
            currentBoss.takeDamage(bullet.damage);
            return false;
        }
        return bullet.y > 0;
    });

    // Check boss collisions with player (both bullets and direct contact)
    if (currentBoss.checkCollisionWithPlayer(player)) {
        gameOver = true;
    }
}

function update() {
    if (!currentBoss?.active) return;
    if (!gameOver) {
        shoot();
        bullets.forEach(bullet => bullet.y -= bullet.speed);
        currentBoss.update();
        updateStars();
        checkCollisions();
    } else {
        currentBoss.update();
        updateStars();
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
    if (currentBoss) currentBoss.draw();
    drawBullets();
    drawPlayer();

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
    if (currentBoss) {
        currentBoss.health = currentBoss.maxHealth;
        currentBoss.y = -100;
        currentBoss.x = canvas.width / 2;
        currentBoss.active = false;
        currentBoss.bullets = [];
        currentBoss.currentPhase = 0;
        currentBoss.phaseTimer = 0;
        currentBoss.rotation = 0;
        currentBoss.rotationSpeed = 0;
        currentBoss.rushCount = 0;
        currentBoss.laserWarning = false;
        currentBoss.firingLaser = false;
    }
    bullets = [];
    player.x = canvas.width / 2;
    player.y = canvas.height - 50;
}

function restartGame() {
    resetGame();
    currentBoss.active = true;
    gameStarted = true;
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
        // Show victory message
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY!', canvas.width/2, canvas.height/2);
        ctx.font = '30px Arial';
        ctx.fillText('Well Done!', canvas.width/2, canvas.height/2 + 50);
        
        setTimeout(() => {
            bossSelect.style.display = 'grid';
            canvas.style.display = 'none';
            gameStarted = false;
            currentBoss.health = currentBoss.maxHealth;
            currentBoss.y = -100;
            currentBoss.active = false;
            bullets = [];
        }, 5000);
    }
}

function selectBoss(bossType) {
    bossSelect.style.display = 'none';
    canvas.style.display = 'block';
    gameStarted = true;
    
    // Create the appropriate boss based on type
    switch(bossType) {
        case 'redSquare':
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

// Initially hide the canvas
canvas.style.display = 'none';