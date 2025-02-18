class RedSquareBoss extends Boss {
    constructor(canvas) {
        super(canvas);
        this.width = 100;
        this.height = 100;
        this.color = 'red';
        this.startingPhase = 0;
        this.currentPhase = this.startingPhase;
        this.phaseTimer = 0;
        this.rushTarget = {x: 0, y: 0};
        this.rushSpeed = 0.1;
        this.rotation = 0;
        this.laserWarning = false;
        this.firingLaser = false;
        this.rotationSpeed = 0;
        this.rushCount = 0;
        this.playerTargetPos = {x: 100, y: 100};
        // Trail effect properties
        this.trailPositions = [];
        this.maxTrailLength = 10;
        this.trailOpacityStart = 0.5;
        this.trailOpacityDecay = 0.05;
        this.trailUpdateInterval = 2;
        this.frameCount = 0;
        this.triangleRushCount = 0;
    }

    rush(targetX, targetY, speed = 0.1) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.frameCount++;
        if (this.frameCount >= this.trailUpdateInterval) {
            this.trailPositions.unshift({
                x: this.x,
                y: this.y,
                rotation: this.rotation
            });
            if (this.trailPositions.length > this.maxTrailLength) {
                this.trailPositions.pop();
            }
            this.frameCount = 0;
        }
        
        if (distance > 0.1) {
            this.x += dx * speed;
            this.y += dy * speed;
        } else {
            this.x = targetX;
            this.y = targetY;
            this.trailPositions = [];
        }
    }

    shoot() {
        switch(this.currentPhase) {
            case 0:
                if (Math.random() < 0.02) {
                    this.bullets.push({
                        x: this.x,
                        y: this.y + this.height/2,
                        dx: 0,
                        dy: 6,
                        radius: 8,
                        type: 'bullet'
                    });
                }
                break;
                
            case 2:
                if (this.phaseTimer % 3 === 0) {
                    for (let i = 0; i < 8; i++) {
                        const angle = this.rotation + (i * Math.PI / 4);
                        this.bullets.push({
                            x: this.x,
                            y: this.y,
                            radius: 6,
                            dx: Math.cos(angle) * 6,
                            dy: Math.sin(angle) * 6,
                            type: 'bullet'
                        });
                    }
                }
                this.rotation += 0.1;
                break;
        }

        // Update triangles in bullets array
        this.bullets.forEach(proj => {
            if (proj.type === 'triangle') {
                proj.y += 3;
                proj.rotation += 0.1;
                
                let bulletFrequency = 160;
                if (proj.timer % bulletFrequency === 0) {
                    let bulletCount = 24;
                    for (let i = 0; i < bulletCount; i++) {
                        const angle = (i * Math.PI * 2) / bulletCount;
                        this.bullets.push({
                            x: proj.x,
                            y: proj.y,
                            radius: 6,
                            dx: Math.cos(angle) * 5,
                            dy: Math.sin(angle) * 5,
                            type: 'bullet'
                        });
                    }
                }
                proj.timer++;

                // Check player collision with triangles
                const dx = player.x - proj.x;
                const dy = player.y - proj.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 25) { // Approximate triangle hitbox
                    deathParticles = player.die();
                    gameOver = true;
                }
            }
        });

        if (this.firingLaser) {
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
    }

    update() {
        if (!this.active) return;

        this.phaseTimer++;
        
        this.shoot();
        this.updateBullets();

        // Clean up off-screen projectiles
        this.bullets = this.bullets.filter(proj => {
            if (proj.type === 'triangle') {
                return proj.y - 20 < this.canvas.height;
            }
            return proj.x + proj.radius > 0 && 
                   proj.x - proj.radius < this.canvas.width &&
                   proj.y + proj.radius > 0 && 
                   proj.y - proj.radius < this.canvas.height;
        });

        switch(this.currentPhase) {
            case 0:
                this.move();
                this.trailPositions = [];
                if (this.phaseTimer > 300) {
                    this.currentPhase = 1;
                    this.phaseTimer = 0;
                }
                break;

            case 1:
                this.rush(this.canvas.width/2, this.y);
                const distToCenter = Math.abs(this.x - this.canvas.width/2);
                if (distToCenter == 0) {
                    this.x = this.canvas.width/2;
                    this.currentPhase = 2;
                    this.phaseTimer = 0;
                    this.rotation = -Math.PI/2 - Math.PI/4;
                    this.trailPositions = [];
                }
                break;

            case 2:
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

            case 4:
                if (this.phaseTimer === 15) {
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
                        this.trailPositions = [];
                        if (this.rushCount >= 3) {
                            this.currentPhase = 5;
                            this.triangleRushCount = 0;
                            this.phaseTimer = -1;
                        }
                    }
                }
                break;

            case 5:
                if (this.phaseTimer === 0) {
                    this.playerTargetPos = {x: Math.random() * (this.canvas.width - 100) + 50, y: 100};
                }
                this.rush(this.playerTargetPos.x, this.playerTargetPos.y, 0.2);
                const distToRushPos = Math.sqrt(
                    Math.pow(this.x - this.playerTargetPos.x, 2) + 
                    Math.pow(this.y - this.playerTargetPos.y, 2)
                );
                if (distToRushPos == 0) {
                    if (this.phaseTimer > 0) { // Only shoot after completing rush
                        this.bullets.push({
                            x: this.x,
                            y: this.y,
                            rotation: 0,
                            timer: 0,
                            type: 'triangle'
                        });
                        this.triangleRushCount++;
                        if (this.triangleRushCount >= 7) {
                            this.currentPhase = 6;
                            this.phaseTimer = 0;
                        }
                    }
                    this.phaseTimer = -1;
                }
                break;

            case 6:
                // Wait for triangles to clear the screen
                if (this.bullets.some(b => b.type === 'triangle')) {
                    return;
                }
                
                // Add delay before laser attack
                if (this.phaseTimer < 120) {
                    return;
                }

                this.rush(this.canvas.width/2, this.canvas.height/2);
                const distToCenterForLaser = Math.sqrt((this.x - this.canvas.width/2)**2 + (this.x - this.canvas.width/2)**2);
                if (distToCenterForLaser == 0) {
                    this.x = this.canvas.width/2;
                    this.currentPhase = 7;
                    this.phaseTimer = 0;
                    this.laserWarning = true;
                    this.trailPositions = [];
                }
                break;

            case 7:
                if (this.phaseTimer === 60) {
                    this.laserWarning = false;
                    this.firingLaser = true;
                }
                if (this.firingLaser) {
                    this.rotationSpeed += 0.0005;
                    this.rotation += this.rotationSpeed;
                }

                if (this.phaseTimer > 480) {
                    this.currentPhase = 8;
                    this.phaseTimer = 0;
                    this.firingLaser = false;
                    this.rotationSpeed = 0;
                }
                break;

            case 8:
                this.rush(this.canvas.width/2, 100);
                const distToTop = Math.abs(this.y - 100);
                if (distToTop == 0) {
                    this.y = 100;
                    this.currentPhase = 0;
                    this.phaseTimer = 0;
                    this.rotation = 0;
                    this.trailPositions = [];
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
            if (bullet.type === 'bullet') {
                bullet.x += bullet.dx;
                bullet.y += bullet.dy;
            }
        });
    }

    drawBoss() {
        // Draw trail first
        this.trailPositions.forEach((pos, index) => {
            const opacity = this.trailOpacityStart - (index * this.trailOpacityDecay);
            if (opacity > 0) {
                this.ctx.save();
                this.ctx.translate(pos.x, pos.y);
                this.ctx.rotate(pos.rotation);
                this.ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
                this.ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                this.ctx.restore();
            }
        });

        // Draw triangles from bullets array
        this.bullets.forEach(proj => {
            if (proj.type === 'triangle') {
                this.ctx.save();
                this.ctx.translate(proj.x, proj.y);
                this.ctx.rotate(proj.rotation);
                this.ctx.beginPath();
                this.ctx.moveTo(0, -20);        // Top point
                this.ctx.lineTo(-17.32, 10);    // Bottom left point
                this.ctx.lineTo(17.32, 10);     // Bottom right point
                this.ctx.closePath();
                this.ctx.fillStyle = 'orange';
                this.ctx.fill();
                this.ctx.restore();
            }
        });

        // Draw main boss
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.rotation);
        
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
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
