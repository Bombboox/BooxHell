class WaffleBoss extends Boss {
    constructor(canvas) {
        super(canvas);
        this.radius = 60;
        this.width = this.radius * 2;
        this.height = this.radius * 2;
        this.isCircular = true;
        this.maxHealth = 30000;
        this.health = 30000;
        this.speed = 2.5;
        this.direction = 1;
        this.phase = 0;
        this.phaseTimer = 0;
        this.rotation = 0;
        this.rushSpeed = 0.08;

        this.drones = [];
        this.droneSpeed = 4;
        this.droneSpawnInterval = 50;
        this.sideDroneSpawnInterval = 60;
        this.leftDroneSpawnInterval = 45;
        this.phase0DroneInterval = 30;

        this.laserState = 'aim';
        this.laserTimer = 0;
        this.laserWarning = false;
        this.firingLaser = false;
        this.laserRotation = 0;
        this.lockedRotation = 0;
        this.lasers = [];
        this.laserSetInterval = 20;

        this.glowTime = 0;
        this.auraBursts = [];

        this.comets = [];
        this.cometSpawnInterval = 4;
        this.cometSpeed = 0.12;
        this.cometTrailLength = 20;

        this.explosions = [];
        this.explosionSpawnInterval = 35;
        this.bottomBulletInterval = 12;

        this.lastLaserSoundTime = 0;
        this.lastCometSoundTime = 0;
        this.nextYell = 1;

        this.sprite = new Image();
        this.sprite.src = 'sprites/waffle.png';
        this.droneSprite = new Image();
        this.droneSprite.src = 'sprites/waffle_drone.png';
    }

    emitAura() {
        this.auraBursts.push({
            radius: this.radius + 8,
            alpha: 0.6,
            lineWidth: 6
        });
    }

    updateAura() {
        this.auraBursts = this.auraBursts.filter(burst => burst.alpha > 0);
        this.auraBursts.forEach(burst => {
            burst.radius += 2.5;
            burst.alpha -= 0.02;
        });
    }

    move() {
        this.x += this.speed * this.direction;
        if (this.x + this.radius > this.canvas.width || this.x - this.radius < 0) {
            this.direction *= -1;
        }
    }

    rush(targetX, targetY, speed = this.rushSpeed) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.5) {
            this.x += dx * speed;
            this.y += dy * speed;
        } else {
            this.x = targetX;
            this.y = targetY;
        }
    }

    normalizeAngle(angle) {
        let normalized = angle;
        while (normalized > Math.PI) normalized -= Math.PI * 2;
        while (normalized < -Math.PI) normalized += Math.PI * 2;
        return normalized;
    }

    playYell() {
        if (typeof sound === 'undefined') return;
        const key = this.nextYell === 1 ? 'waffle_yell_1' : 'waffle_yell_2';
        sound.play(key, { allowOverlap: true, volume: 0.5 });
        this.nextYell = this.nextYell === 1 ? 2 : 1;
    }

    playLaserSound() {
        if (typeof sound === 'undefined') return;
        const now = performance.now();
        if (now - this.lastLaserSoundTime < 180) return;
        this.lastLaserSoundTime = now;
        sound.play('waffle_laser', { allowOverlap: true, volume: 0.1 });
    }

    playExplosionSound() {
        if (typeof sound === 'undefined') return;
        sound.play('waffle_explosion', { allowOverlap: true, cooldownMs: 120, volume: 0.2 });
    }

    playCometSound() {
        if (typeof sound === 'undefined') return;
        const now = performance.now();
        if (now - this.lastCometSoundTime < 120) return;
        this.lastCometSoundTime = now;
        sound.play('waffle_comet', { allowOverlap: true, volume: 0.2 });
    }

    spawnDroneTowardPlayer(fireInterval = 45) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const speed = this.droneSpeed;
        this.drones.push({
            x: this.x,
            y: this.y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            radius: 18,
            rotation: angle,
            fireTimer: 0,
            fireInterval
        });
    }

    spawnDroneFromRight() {
        const y = Math.random() * (this.canvas.height - 200) + 100;
        const angle = Math.atan2(player.y - y, player.x - (this.canvas.width + 60));
        this.drones.push({
            x: this.canvas.width + 60,
            y,
            dx: -this.droneSpeed,
            dy: 0,
            radius: 18,
            rotation: angle,
            fireTimer: 0,
            fireInterval: 50
        });
    }

    spawnDroneFromLeft() {
        const y = Math.random() * (this.canvas.height - 200) + 100;
        const angle = Math.atan2(player.y - y, player.x + 60);
        this.drones.push({
            x: -60,
            y,
            dx: this.droneSpeed,
            dy: 0,
            radius: 18,
            rotation: angle,
            fireTimer: 0,
            fireInterval: 45
        });
    }

    updateDrones() {
        this.drones.forEach(drone => {
            drone.x += drone.dx;
            drone.y += drone.dy;

            const faceAngle = Math.atan2(player.y - drone.y, player.x - drone.x);
            drone.rotation = faceAngle;

            drone.fireTimer++;
            if (drone.fireTimer % drone.fireInterval === 0) {
                const bulletSpeed = 7;
                this.bullets.push({
                    x: drone.x,
                    y: drone.y,
                    dx: Math.cos(faceAngle) * bulletSpeed,
                    dy: Math.sin(faceAngle) * bulletSpeed,
                    radius: 6,
                    type: 'droneBullet'
                });
            }
        });

        this.drones = this.drones.filter(drone =>
            drone.x + drone.radius > -100 &&
            drone.x - drone.radius < this.canvas.width + 100 &&
            drone.y + drone.radius > -100 &&
            drone.y - drone.radius < this.canvas.height + 100
        );
    }

    spawnComet() {
        const target = { x: player.x, y: player.y };
        const controlOffset1 = {
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 200
        };
        const controlOffset2 = {
            x: (Math.random() - 0.5) * 300,
            y: (Math.random() - 0.5) * 200
        };

        this.comets.push({
            p0: { x: this.x, y: this.y },
            p1: { x: this.x + controlOffset1.x, y: this.y + controlOffset1.y },
            p2: { x: target.x + controlOffset2.x, y: target.y + controlOffset2.y },
            p3: { x: target.x, y: target.y },
            t: 0,
            speed: this.cometSpeed + Math.random() * 0.03,
            radius: 10,
            trail: [],
            x: this.x,
            y: this.y
        });
    }

    updateComets() {
        this.comets.forEach(comet => {
            comet.t += comet.speed;
            if (comet.t > 1) {
                comet.t = 1;
            }

            const t = comet.t;
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;

            const x = (uuu * comet.p0.x) +
                (3 * uu * t * comet.p1.x) +
                (3 * u * tt * comet.p2.x) +
                (ttt * comet.p3.x);
            const y = (uuu * comet.p0.y) +
                (3 * uu * t * comet.p1.y) +
                (3 * u * tt * comet.p2.y) +
                (ttt * comet.p3.y);

            comet.x = x;
            comet.y = y;

            comet.trail.unshift({ x, y });
            if (comet.trail.length > this.cometTrailLength) {
                comet.trail.pop();
            }
        });

        this.comets = this.comets.filter(comet => comet.t < 1);
    }

    spawnExplosion() {
        this.explosions.push({
            x: Math.random() * (this.canvas.width - 200) + 100,
            y: Math.random() * (this.canvas.height - 200) + 100,
            timer: 0,
            warningDuration: 40,
            boomDuration: 30,
            state: 'warn',
            radius: 40,
            blastRadius: 60
        });
    }

    updateExplosions() {
        this.explosions.forEach(explosion => {
            explosion.timer++;
            if (explosion.state === 'warn' && explosion.timer >= explosion.warningDuration) {
                explosion.state = 'boom';
                explosion.timer = 0;
                this.playExplosionSound();

                const bulletCount = 18;
                for (let i = 0; i < bulletCount; i++) {
                    const angle = (i * Math.PI * 2) / bulletCount;
                    this.bullets.push({
                        x: explosion.x,
                        y: explosion.y,
                        dx: Math.cos(angle) * 6,
                        dy: Math.sin(angle) * 6,
                        radius: 5,
                        type: 'explosionBullet'
                    });
                }
            } else if (explosion.state === 'boom') {
                explosion.blastRadius += 6;
                if (explosion.timer >= explosion.boomDuration) {
                    explosion.state = 'done';
                }
            }
        });

        this.explosions = this.explosions.filter(explosion => explosion.state !== 'done');
    }

    updateBullets() {
        this.bullets.forEach(bullet => {
            bullet.x += bullet.dx;
            bullet.y += bullet.dy;
        });

        this.bullets = this.bullets.filter(bullet =>
            bullet.x + bullet.radius > -100 &&
            bullet.x - bullet.radius < this.canvas.width + 100 &&
            bullet.y + bullet.radius > -100 &&
            bullet.y - bullet.radius < this.canvas.height + 100
        );
    }

    updateLaserCycle() {
        const warningDuration = 25;
        const fireDuration = 80;

        this.laserTimer++;

        const targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
        const delta = this.normalizeAngle(targetAngle - this.rotation);
        const turnSpeed = 0.25;
        this.rotation += Math.max(-turnSpeed, Math.min(turnSpeed, delta));
        this.laserRotation = this.rotation;

        if (this.laserTimer % this.laserSetInterval === 0) {
            this.lasers.push({
                angle: this.laserRotation,
                timer: 0,
                warningDuration,
                fireDuration,
                state: 'warn'
            });
            this.emitAura();
            this.playLaserSound();
        }

        this.lasers.forEach(laser => {
            laser.timer++;
            if (laser.state === 'warn' && laser.timer >= laser.warningDuration) {
                laser.state = 'fire';
                laser.timer = 0;
            } else if (laser.state === 'fire' && laser.timer >= laser.fireDuration) {
                laser.state = 'done';
            }
        });

        this.lasers = this.lasers.filter(laser => laser.state !== 'done');
    }

    update() {
        if (!this.active) return;

        this.phaseTimer++;
        this.glowTime += 0.05;
        this.updateAura();
        this.updateDrones();
        this.updateComets();
        this.updateExplosions();
        this.updateBullets();

        switch (this.phase) {
            case 0:
                this.rotation = Math.PI / 2;
                this.x += this.speed * 1.8 * this.direction;
                this.y = 100 + Math.sin(this.phaseTimer * 0.08) * 25;
                if (this.x + this.radius > this.canvas.width || this.x - this.radius < 0) {
                    this.direction *= -1;
                }
                if (this.phaseTimer % this.phase0DroneInterval === 0) {
                    this.spawnDroneTowardPlayer(30);
                }
                if (this.phaseTimer > 320) {
                    this.phase = 1;
                    this.phaseTimer = 0;
                    this.emitAura();
                    this.playYell();
                }
                break;
            case 1:
                this.rush(this.canvas.width / 2, this.canvas.height / 2);
                if (this.x === this.canvas.width / 2 && this.y === this.canvas.height / 2) {
                    this.phase = 2;
                    this.phaseTimer = 0;
                    this.laserState = 'aim';
                    this.laserTimer = 0;
                    this.laserWarning = false;
                    this.firingLaser = false;
                    this.lasers = [];
                    this.emitAura();
                }
                break;
            case 2:
                this.updateLaserCycle();
                if (this.phaseTimer % this.sideDroneSpawnInterval === 0) {
                    this.spawnDroneFromRight();
                }
                if (this.phaseTimer > 520) {
                    this.phase = 3;
                    this.phaseTimer = 0;
                    this.laserWarning = false;
                    this.firingLaser = false;
                    this.lasers = [];
                    this.emitAura();
                }
                break;
            case 3:
                this.rotation = Math.atan2(player.y - this.y, player.x - this.x);
                this.rush(player.x, player.y, 0.02);
                if (this.phaseTimer % this.cometSpawnInterval === 0) {
                    this.spawnComet();
                    this.spawnComet();
                    this.playCometSound();
                }
                if (this.phaseTimer % this.leftDroneSpawnInterval === 0) {
                    this.spawnDroneFromLeft();
                }
                if (this.phaseTimer > 320) {
                    this.phase = 4;
                    this.phaseTimer = 0;
                    this.emitAura();
                    this.playYell();
                }
                break;
            case 4:
                if (this.phaseTimer % this.explosionSpawnInterval === 0) {
                    this.spawnExplosion();
                }
                if (this.phaseTimer % this.bottomBulletInterval === 0) {
                    this.bullets.push({
                        x: Math.random() * this.canvas.width,
                        y: this.canvas.height + 10,
                        dx: 0,
                        dy: -7,
                        radius: 6,
                        type: 'bottomBullet'
                    });
                }
                if (this.phaseTimer > 360) {
                    this.phase = 5;
                    this.phaseTimer = 0;
                    this.emitAura();
                }
                break;
            case 5:
                this.rush(this.canvas.width / 2, 100, 0.08);
                if (this.x === this.canvas.width / 2 && this.y === 100) {
                    this.phase = 0;
                    this.phaseTimer = 0;
                    this.rotation = 0;
                    this.emitAura();
                }
                break;
        }
    }

    drawBoss() {
        const ctx = this.ctx;
        const pulse = (Math.sin(this.glowTime) + 1) / 2;
        const shakeX = this.phase === 0 ? (Math.random() - 0.5) * 20 : 0;
        const shakeY = this.phase === 0 ? (Math.random() - 0.5) * 20 : 0;
        const drawX = this.x + shakeX;
        const drawY = this.y + shakeY;

        this.auraBursts.forEach(burst => {
            ctx.beginPath();
            ctx.arc(drawX, drawY, burst.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 210, 140, ${burst.alpha})`;
            ctx.lineWidth = burst.lineWidth;
            ctx.stroke();
        });

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius + 15 + pulse * 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 120, ${0.2 + pulse * 0.2})`;
        ctx.fill();
        ctx.restore();

        this.drones.forEach(drone => {
            ctx.save();
            ctx.translate(drone.x, drone.y);
            ctx.rotate(drone.rotation);
            ctx.beginPath();
            ctx.arc(0, 0, drone.radius, 0, Math.PI * 2);
            ctx.clip();
            if (this.droneSprite.complete && this.droneSprite.naturalWidth > 0) {
                ctx.drawImage(this.droneSprite, -drone.radius, -drone.radius, drone.radius * 2, drone.radius * 2);
            } else {
                ctx.fillStyle = '#f0c16c';
                ctx.fillRect(-drone.radius, -drone.radius, drone.radius * 2, drone.radius * 2);
            }
            ctx.restore();

            ctx.beginPath();
            ctx.arc(drone.x, drone.y, drone.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 230, 180, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        const laserLength = Math.max(this.canvas.width, this.canvas.height) * 2;
        if (this.lasers.length > 0) {
            this.lasers.forEach(laser => {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(laser.angle);
                if (laser.state === 'warn') {
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(laserLength, 0);
                    ctx.stroke();
                }
                if (laser.state === 'fire') {
                    ctx.fillStyle = 'rgba(255, 70, 40, 0.9)';
                    ctx.fillRect(0, -12, laserLength, 24);
                }
                ctx.restore();
            });
        }

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(this.rotation);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.shadowColor = 'rgba(255, 200, 120, 0.8)';
        ctx.shadowBlur = 20 + pulse * 10;
        if (this.sprite.complete && this.sprite.naturalWidth > 0) {
            ctx.drawImage(this.sprite, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.fillStyle = '#f4b85f';
            ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 230, 180, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    drawBullets() {
        this.comets.forEach(comet => {
            if (comet.trail.length > 1) {
                this.ctx.save();
                this.ctx.lineCap = 'round';
                for (let i = 0; i < comet.trail.length - 1; i++) {
                    const p1 = comet.trail[i];
                    const p2 = comet.trail[i + 1];
                    const alpha = 1 - (i / comet.trail.length);
                    this.ctx.strokeStyle = `rgba(255, 200, 140, ${alpha * 0.5})`;
                    this.ctx.lineWidth = Math.max(1, comet.radius * alpha * 0.9);
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
                this.ctx.restore();
            }
            this.ctx.beginPath();
            this.ctx.arc(comet.x, comet.y, comet.radius + 6, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 230, 180, 0.4)';
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(comet.x, comet.y, comet.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffb96b';
            this.ctx.fill();
        });

        this.explosions.forEach(explosion => {
            if (explosion.state === 'warn') {
                this.ctx.beginPath();
                this.ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                this.ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('!', explosion.x, explosion.y);
            } else if (explosion.state === 'boom') {
                this.ctx.beginPath();
                this.ctx.arc(explosion.x, explosion.y, explosion.blastRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 140, 60, 0.4)';
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(explosion.x, explosion.y, explosion.blastRadius * 0.6, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 200, 120, 0.6)';
                this.ctx.fill();
            }
        });

        this.bullets.forEach(bullet => {
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ff9c40';
            this.ctx.fill();
            this.ctx.closePath();
        });
    }

    checkCollisionWithPlayer(player) {
        let collision = false;
        const offscreenMargin = 120;

        this.bullets = this.bullets.filter(bullet => {
            const dx = bullet.x - player.x;
            const dy = bullet.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.radius + bullet.radius) {
                collision = true;
                return false;
            }
            return bullet.x + bullet.radius > 0 &&
                   bullet.x - bullet.radius < this.canvas.width &&
                   bullet.y + bullet.radius > 0 &&
                   bullet.y - bullet.radius < this.canvas.height;
        });

        this.drones = this.drones.filter(drone => {
            const dx = drone.x - player.x;
            const dy = drone.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.radius + drone.radius) {
                collision = true;
                return false;
            }
            return drone.x + drone.radius > -offscreenMargin &&
                   drone.x - drone.radius < this.canvas.width + offscreenMargin &&
                   drone.y + drone.radius > -offscreenMargin &&
                   drone.y - drone.radius < this.canvas.height + offscreenMargin;
        });

        this.comets = this.comets.filter(comet => {
            const dx = comet.x - player.x;
            const dy = comet.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.radius + comet.radius) {
                collision = true;
                return false;
            }
            return comet.t < 1;
        });

        this.explosions.forEach(explosion => {
            if (explosion.state !== 'boom') return;
            const dx = explosion.x - player.x;
            const dy = explosion.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.radius + explosion.blastRadius) {
                collision = true;
            }
        });

        if (this.lasers.length > 0) {
            this.lasers.forEach(laser => {
                if (laser.state !== 'fire') return;
                const laserStartX = this.x;
                const laserStartY = this.y;
                const laserEndX = this.x + Math.cos(laser.angle) * 2000;
                const laserEndY = this.y + Math.sin(laser.angle) * 2000;

                const x0 = player.x;
                const y0 = player.y;
                const x1 = laserStartX;
                const y1 = laserStartY;
                const x2 = laserEndX;
                const y2 = laserEndY;

                const dot = ((x0 - x1) * (x2 - x1) + (y0 - y1) * (y2 - y1)) /
                    ((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

                if (dot >= 0 && dot <= 1) {
                    const distance = Math.abs((x2 - x1) * (y1 - y0) - (x1 - x0) * (y2 - y1)) /
                        Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
                    if (distance < player.radius + 12) {
                        collision = true;
                    }
                }
            });
        }

        const bossDX = player.x - this.x;
        const bossDY = player.y - this.y;
        const bossDistance = Math.sqrt(bossDX * bossDX + bossDY * bossDY);
        if (bossDistance < player.radius + this.radius) {
            collision = true;
        }

        return collision;
    }
}
