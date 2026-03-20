class Boss {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = canvas.width / 2;
        this.y = -100;
        this.maxHealth = 25000;
        this.health = 25000;
        this.direction = 1;
        this.speed = 3;
        this.healthBarWidth = 400;
        this.healthBarHeight = 30;
        this.healthBarY = 20;
        this.healthShake = 0;
        this.active = false;
        this.bullets = [];
    }

    update(deltaFrames = 1) {
        if (!this.active) return;

        this.updateHealthShake(deltaFrames);
        this.move(deltaFrames);
        this.shoot(deltaFrames);
        this.updateBullets(deltaFrames);
    }

    move(deltaFrames = 1) {
        this.x += this.speed * this.direction * deltaFrames;
        if (this.x + this.width/2 > this.canvas.width || this.x - this.width/2 < 0) {
            this.direction *= -1;
        }
    }

    shoot() {
        // Override in child class
    }

    updateBullets(deltaFrames = 1) {
        this.bullets.forEach(bullet => bullet.y += bullet.speed * deltaFrames);
    }

    updateHealthShake(deltaFrames = 1) {
        this.healthShake = Math.max(0, this.healthShake * Math.pow(0.9, deltaFrames));
    }

    getDeltaFactor(factor, deltaFrames = 1) {
        if (factor <= 0) return 0;
        if (factor >= 1) return 1;
        return 1 - Math.pow(1 - factor, deltaFrames);
    }

    getDeltaChance(chancePerFrame, deltaFrames = 1) {
        if (chancePerFrame <= 0) return 0;
        if (chancePerFrame >= 1) return 1;
        return 1 - Math.pow(1 - chancePerFrame, deltaFrames);
    }

    countIntervalTriggers(previousTimer, currentTimer, interval) {
        if (interval <= 0) return 0;
        return Math.max(0, Math.floor(currentTimer / interval) - Math.floor(previousTimer / interval));
    }

    drawHealthBar() {
        const barX = (this.canvas.width - this.healthBarWidth) / 2;
        const healthPercentage = this.health / this.maxHealth;
        
        const shakeX = Math.random() * this.healthShake * (Math.random() > 0.5 ? 1 : -1);
        const shakeY = Math.random() * this.healthShake * (Math.random() > 0.5 ? 1 : -1);
        
        // Draw outer border
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(
            barX - 5 + shakeX, 
            this.healthBarY - 5 + shakeY, 
            this.healthBarWidth + 10, 
            this.healthBarHeight + 10
        );

        // Draw background
        this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        this.ctx.fillRect(
            barX + shakeX, 
            this.healthBarY + shakeY, 
            this.healthBarWidth, 
            this.healthBarHeight
        );

        // Draw health bar with gradient
        const gradient = this.ctx.createLinearGradient(
            barX, 
            this.healthBarY, 
            barX + this.healthBarWidth * healthPercentage, 
            this.healthBarY
        );
        gradient.addColorStop(0, `rgb(${255 * (1 - healthPercentage)}, ${255 * healthPercentage}, 0)`);
        gradient.addColorStop(1, `rgb(${255 * (1 - healthPercentage)}, ${255 * healthPercentage}, 100)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            barX + shakeX, 
            this.healthBarY + shakeY, 
            this.healthBarWidth * healthPercentage, 
            this.healthBarHeight
        );
    }

    draw() {
        if (!this.active) return;
        this.drawBoss();
        this.drawBullets();
        this.drawHealthBar();
    }

    drawBoss() {
        // Override in child class
    }

    drawBullets() {
        this.bullets.forEach(bullet => {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'red';
            this.ctx.fill();
            this.ctx.closePath();
        });
    }

    takeDamage(damage) {
        this.health -= damage;
        this.healthShake = 5;
    }

    checkCollisionWithPlayer(player) {
        let collision = false;
        
        // Check bullet collisions
        this.bullets = this.bullets.filter(bullet => {
            const dx = bullet.x - player.x;
            const dy = bullet.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.radius + bullet.radius) {
                collision = true;
                return false; // Remove the bullet
            }
            return bullet.y < this.canvas.height;
        });

        // Check direct collision with boss
        const playerToBossDX = player.x - this.x;
        const playerToBossDY = player.y - this.y;
        const directCollision = Math.abs(playerToBossDX) < this.width/2 + player.radius &&
                              Math.abs(playerToBossDY) < this.height/2 + player.radius;

        return collision || directCollision;
    }
}
