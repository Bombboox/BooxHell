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
        this.trailPositions = [];
        this.maxTrailLength = 0;
        this.trailOpacityStart = 0.5;
        this.trailOpacityDecay = 0.05;
        this.trailUpdateInterval = 2;
        this.trailFrameCount = 0;
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

    createTrailSnapshot() {
        return {
            x: this.x,
            y: this.y,
            rotation: this.rotation ?? 0
        };
    }

    updateRushTrail(deltaFrames = 1) {
        if (!this.maxTrailLength || !this.trailUpdateInterval) return;

        this.trailFrameCount += deltaFrames;
        while (this.trailFrameCount >= this.trailUpdateInterval) {
            this.trailPositions.unshift(this.createTrailSnapshot());
            if (this.trailPositions.length > this.maxTrailLength) {
                this.trailPositions.pop();
            }
            this.trailFrameCount -= this.trailUpdateInterval;
        }
    }

    clearRushTrail() {
        this.trailPositions = [];
        this.trailFrameCount = 0;
    }

    rush(targetX, targetY, speed = this.rushSpeed ?? 0.1, deltaFrames = 1) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.updateRushTrail(deltaFrames);

        if (distance > 0.1) {
            const moveFactor = this.useLinearRush
                ? speed * deltaFrames
                : this.getDeltaFactor(speed, deltaFrames);
            this.x += dx * moveFactor;
            this.y += dy * moveFactor;
            return false;
        }

        this.x = targetX;
        this.y = targetY;
        this.clearRushTrail();
        return true;
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

    drawBackground() {
        return false;
    }

    drawBoss() {
        // Override in child class
    }

    onStart() {
        // Override in child class
    }

    onStop() {
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
