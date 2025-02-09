class RedSquareBoss extends Boss {
    constructor(canvas) {
        super(canvas);
        this.width = 100;
        this.height = 100;
        this.color = 'red';
        this.currentPhase = 0;
        this.phaseTimer = 0;
        this.rushTarget = {x: 0, y: 0};
        this.rushSpeed = 0.1;
        this.rotation = 0;
        this.laserWarning = false;
        this.firingLaser = false;
        this.rotationSpeed = 0;
        this.rushCount = 0;
        this.playerTargetPos = {x: 0, y: 0};
    }

    rush(targetX, targetY, speed = 0.1) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0.1) {
            this.x += dx * speed;
            this.y += dy * speed;
        } else {
            this.x = targetX;
            this.y = targetY;
        }
    }

    shoot() {
        switch(this.currentPhase) {
            case 0: // Basic shooting
                if (Math.random() < 0.02) {
                    this.bullets.push({
                        x: this.x,
                        y: this.y + this.height/2,
                        dx: 0,
                        dy: 6,
                        radius: 8,
                    });
                }
                break;
                
            case 2: // Bullet hell
                if (this.phaseTimer % 10 === 0) {
                    for (let i = 0; i < 8; i++) {
                        const angle = this.rotation + (i * Math.PI / 4);
                        this.bullets.push({
                            x: this.x,
                            y: this.y,
                            radius: 6,
                            dx: Math.cos(angle) * 6,
                            dy: Math.sin(angle) * 6
                        });
                    }
                }
                this.rotation += 0.1;
                break;
        }
    }

    update() {
        if (!this.active) return;

        this.phaseTimer++;
        
        this.shoot();
        this.updateBullets();

        switch(this.currentPhase) {
            case 0: // Basic shooting - 5 seconds
                this.move();
                if (this.phaseTimer > 300) {
                    this.currentPhase = 1;
                    this.phaseTimer = 0;
                }
                break;

            case 1: // Rush to center
                this.rush(this.canvas.width/2, this.y);
                const distToCenter = Math.abs(this.x - this.canvas.width/2);
                if (distToCenter == 0) {
                    this.x = this.canvas.width/2;
                    this.currentPhase = 2;
                    this.phaseTimer = 0;
                    this.rotation = -Math.PI/2 - Math.PI/4; // Start at -135 degrees
                }
                break;

            case 2: // Bullet hell rotation - 5 seconds
                if (this.phaseTimer > 300) {
                    this.currentPhase = 3;
                    this.phaseTimer = 0;
                    this.rushCount = 0;
                    this.rotation = 0;
                }
                break;

            case 3:
                if(this.phaseTimer > 100) {
                    this.currentPhase = 4;
                    this.phaseTimer = 0;
                }
                break;

            case 4: // Player targeting phase
                if (this.phaseTimer === 15) { //delay before rush
                    this.playerTargetPos = {x: player.x, y: player.y};
                }
                if (this.phaseTimer > 15) {
                    this.rush(this.playerTargetPos.x, this.playerTargetPos.y, 0.2);
                    const distToTarget = Math.sqrt(
                        Math.pow(this.x - this.playerTargetPos.x, 2) + 
                        Math.pow(this.y - this.playerTargetPos.y, 2)
                    );
                    if (distToTarget == 0) {
                        this.rushCount++;
                        this.phaseTimer = 0;
                        if (this.rushCount >= 3) {
                            this.currentPhase = 5;
                        }
                    }
                }
                break;

            case 5: // Rush to center for laser
                this.rush(this.canvas.width/2, this.canvas.height/2);
                const distToCenterForLaser = Math.sqrt((this.x - this.canvas.width/2)**2 + (this.x - this.canvas.width/2)**2);
                if (distToCenterForLaser == 0) {
                    this.x = this.canvas.width/2;
                    this.currentPhase = 6;
                    this.phaseTimer = 0;
                    this.laserWarning = true;
                }
                break;

            case 6: // Laser attack - 8 seconds
                if (this.phaseTimer === 60) { // After 1 second warning
                    this.laserWarning = false;
                    this.firingLaser = true;
                }
                if (this.firingLaser) {
                    this.rotationSpeed += 0.0005;
                    this.rotation += this.rotationSpeed;
                    // Calculate laser start and end points
                    const laserStartX = this.x;
                    const laserStartY = this.y;
                    const laserEndX = this.x + Math.cos(this.rotation + Math.PI/2) * 1000;
                    const laserEndY = this.y + Math.sin(this.rotation + Math.PI/2) * 1000;

                    // Calculate player distance to laser line
                    const x0 = player.x;
                    const y0 = player.y;
                    const x1 = laserStartX;
                    const y1 = laserStartY;
                    const x2 = laserEndX;
                    const y2 = laserEndY;

                    // Calculate if player is between start and end points
                    const dot = ((x0 - x1) * (x2 - x1) + (y0 - y1) * (y2 - y1)) / 
                              ((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
                    
                    if (dot >= 0 && dot <= 1) {
                        // Calculate perpendicular distance
                        const distance = Math.abs((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1)) /
                                      Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
                        
                        if (distance < 20) {
                            deathParticles = player.die();
                            gameOver = true;
                        }
                    }
                }

                if (this.phaseTimer > 480) { // 8 seconds
                    this.currentPhase = 7;
                    this.phaseTimer = 0;
                    this.firingLaser = false;
                    this.rotationSpeed = 0;
                }
                break;

            case 7: // Return to top
                this.rush(this.canvas.width/2, 100);
                const distToTop = Math.abs(this.y - 100);
                if (distToTop == 0) {
                    this.y = 100;
                    this.currentPhase = 0;
                    this.phaseTimer = 0;
                    this.rotation = 0;
                }
                break;
        }
    }

    move() {
        this.x += this.speed * this.direction;
        if (this.x + this.width/2 > this.canvas.width || this.x - this.width/2 < 0) {
            this.direction *= -1;
        }
    }

    updateBullets() {
        this.bullets.forEach(bullet => {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
        });
    }

    drawBoss() {
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.rotation);
        
        // Draw the boss
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Draw laser warning or laser
        if (this.laserWarning) {
            this.ctx.strokeStyle = 'yellow';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(0, 5000);
            this.ctx.stroke();
        }
        
        if (this.firingLaser) {
            this.ctx.fillStyle = 'red';
            this.ctx.fillRect(-10, 0, 20, 5000);
        }
        
        this.ctx.restore();
    }
}
