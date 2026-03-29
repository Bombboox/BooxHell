class BalrogBoss extends Boss {
    constructor(canvas) {
        super(canvas);
        this.drawWidth = 260;
        this.drawHeight = 180;
        this.width = 148;
        this.height = 96;
        this.maxHealth = 18000;
        this.health = 18000;
        this.isCircular = false;

        this.background = new Image();
        this.background.src = 'sprites/balrog/aquarium.png';

        this.balrogImage = new Image();
        this.balrogImage.src = 'sprites/balrog/balrog.png';

        this.guppyImage = new Image();
        this.guppyImage.src = 'sprites/balrog/guppy.png';

        this.ballsImage = new Image();
        this.ballsImage.src = 'sprites/balrog/balls.png';

        this.jumperImage = new Image();
        this.jumperImage.src = 'sprites/balrog/jumper.png';

        this.clamImage = new Image();
        this.clamImage.src = 'sprites/balrog/clam.png';

        this.pearlImage = new Image();
        this.pearlImage.src = 'sprites/balrog/pearl.png';

        this.sylvesterImage = new Image();
        this.sylvesterImage.src = 'sprites/balrog/sylvester.png';

        this.bodyAnimation = new SpriteSheetAnimation(this.balrogImage, {
            columns: 10,
            rows: 2,
            row: 0,
            frameCount: 10,
            fps: 10,
            loop: true
        });

        this.turnAnimation = new SpriteSheetAnimation(this.balrogImage, {
            columns: 10,
            rows: 2,
            row: 1,
            frameCount: 10,
            fps: 16,
            loop: false
        });

        this.guppyAnimation = new SpriteSheetAnimation(this.guppyImage, {
            columns: 10,
            rows: 1,
            row: 0,
            frameCount: 10,
            fps: 12,
            loop: true
        });

        this.jumperAnimation = new SpriteSheetAnimation(this.jumperImage, {
            columns: 10,
            rows: 1,
            row: 0,
            frameCount: 10,
            fps: 14,
            loop: true
        });

        this.clamFallAnimation = new SpriteSheetAnimation(this.clamImage, {
            columns: 10,
            rows: 3,
            row: 0,
            frameCount: 10,
            fps: 10,
            loop: true
        });

        this.clamOpenAnimation = new SpriteSheetAnimation(this.clamImage, {
            columns: 10,
            rows: 3,
            row: 1,
            frameCount: 10,
            fps: 14,
            loop: false
        });

        this.sylvesterAnimation = new SpriteSheetAnimation(this.sylvesterImage, {
            columns: 10,
            rows: 2,
            row: 0,
            frameCount: 10,
            fps: 14,
            loop: true
        });

        this.ballAnimations = Array.from({ length: 4 }, (_, row) => new SpriteSheetAnimation(this.ballsImage, {
            columns: 10,
            rows: 4,
            row,
            frameCount: 10,
            fps: 12 + row * 2,
            loop: true
        }));

        this.facingRight = false;
        this.turnTargetFacingRight = false;
        this.isTurning = false;
        this.useLinearRush = false;
        this.rushSpeed = 0.11;
        this.maxTrailLength = 8;
        this.trailOpacityStart = 0.28;
        this.trailOpacityDecay = 0.03;
        this.trailUpdateInterval = 1.2;
        this.effectTime = 0;
        this.heatBursts = [];
        this.embers = Array.from({ length: 20 }, () => this.createEmber());
        this.bubbles = Array.from({ length: 24 }, () => this.createBubble());

        this.bouncingBalls = [];
        this.schoolGuppies = [];
        this.tunnelGuppies = [];
        this.firedGuppies = [];
        this.jumpers = [];
        this.pearls = [];
        this.sylvesters = [];
        this.clam = null;
        this.clamTrailPositions = [];
        this.clamTrailFrameCount = 0;

        this.phaseOrder = ['rush_combo', 'balls', 'school', 'stampede', 'finale'];
        this.phaseIndex = 0;
        this.phase = '';
        this.phaseTimer = 0;
        this.phaseData = {};

        this.setPhase(this.phaseOrder[0]);
    }

    onStart() {
        if (typeof sound === 'undefined') return;
        sound.play('balrog_roar', { restart: true, volume: 0.5 });
        sound.play('balrog_unleash', { restart: true, volume: 0.4 });
        sound.play('balrog_theme', { loop: true, restart: true, volume: 0.5 });
    }

    onStop() {
        if (typeof sound === 'undefined') return;
        sound.stop('balrog_roar');
        sound.stop('balrog_roar_2');
        sound.stop('balrog_evillaff');
        sound.stop('balrog_unleash');
        sound.stop('balrog_throw');
        sound.stop('balrog_grow');
        sound.stop('balrog_theme');
        sound.stop('balrog_buzzer');
        sound.stop('balrog_chomp');
    }

    drawBackground() {
        if (this.background.complete && this.background.naturalWidth > 0) {
            const imageAspect = this.background.naturalWidth / this.background.naturalHeight;
            const canvasAspect = this.canvas.width / this.canvas.height;

            let sourceWidth = this.background.naturalWidth;
            let sourceHeight = this.background.naturalHeight;
            let sourceX = 0;
            let sourceY = 0;

            if (canvasAspect > imageAspect) {
                sourceHeight = this.background.naturalWidth / canvasAspect;
                sourceY = (this.background.naturalHeight - sourceHeight) / 2;
            } else {
                sourceWidth = this.background.naturalHeight * canvasAspect;
                sourceX = (this.background.naturalWidth - sourceWidth) / 2;
            }

            this.ctx.drawImage(
                this.background,
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                0,
                0,
                this.canvas.width,
                this.canvas.height
            );
            this.drawBubbles();
            return true;
        }

        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#031f33');
        gradient.addColorStop(1, '#0c5c72');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBubbles();
        return true;
    }

    setPhase(phaseName) {
        this.phase = phaseName;
        this.phaseTimer = 0;
        this.phaseData = {};
        this.schoolGuppies = [];
        this.tunnelGuppies = [];
        this.jumpers = [];
        this.pearls = [];
        this.sylvesters = [];
        this.clam = null;
        this.clearClamRushTrail();
        this.emitHeatBurst(this.x, this.y, 28, 0.45);

        if (phaseName === 'rush_combo') {
            this.startRushCombo();
        } else if (phaseName === 'balls') {
            this.startBallPhase();
        } else if (phaseName === 'school') {
            this.startSchoolPhase();
        } else if (phaseName === 'stampede') {
            this.startStampedePhase();
        } else if (phaseName === 'finale') {
            this.startFinalePhase();
        }
    }

    nextPhase() {
        this.phaseIndex = (this.phaseIndex + 1) % this.phaseOrder.length;
        this.setPhase(this.phaseOrder[this.phaseIndex]);
    }

    randomOffscreenPoint() {
        const margin = 220;
        const side = Math.floor(Math.random() * 4);

        if (side === 0) {
            return { x: -margin, y: Math.random() * this.canvas.height };
        }
        if (side === 1) {
            return { x: this.canvas.width + margin, y: Math.random() * this.canvas.height };
        }
        if (side === 2) {
            return { x: Math.random() * this.canvas.width, y: -margin };
        }
        return { x: Math.random() * this.canvas.width, y: this.canvas.height + margin };
    }

    createEmber() {
        return {
            orbit: Math.random() * Math.PI * 2,
            radius: this.drawWidth * (0.32 + Math.random() * 0.18),
            size: 2 + Math.random() * 4,
            speed: 0.01 + Math.random() * 0.02,
            drift: Math.random() * Math.PI * 2,
            alpha: 0.2 + Math.random() * 0.25,
            lift: 0.5 + Math.random() * 1.3
        };
    }

    createBubble() {
        const size = 8 + Math.random() * 28;
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size,
            speed: 0.5 + Math.random() * 1.4,
            drift: Math.random() * Math.PI * 2,
            alpha: 0.12 + Math.random() * 0.22
        };
    }

    emitHeatBurst(x = this.x, y = this.y, radius = 24, alpha = 0.4) {
        this.heatBursts.push({
            x,
            y,
            radius,
            alpha,
            lineWidth: 4 + Math.random() * 3
        });
    }

    updateBubbles(deltaFrames) {
        this.bubbles.forEach(bubble => {
            bubble.y -= bubble.speed * deltaFrames;
            bubble.x += Math.sin(bubble.drift) * 0.4 * deltaFrames;
            bubble.drift += 0.015 * deltaFrames;

            if (bubble.y + bubble.size < 0) {
                const next = this.createBubble();
                bubble.x = next.x;
                bubble.y = this.canvas.height + next.size + Math.random() * 80;
                bubble.size = next.size;
                bubble.speed = next.speed;
                bubble.drift = next.drift;
                bubble.alpha = next.alpha;
            }
        });
    }

    drawBubbles() {
        this.bubbles.forEach(bubble => {
            this.ctx.save();
            this.ctx.globalAlpha = bubble.alpha;
            this.ctx.strokeStyle = '#c8f4ff';
            this.ctx.lineWidth = Math.max(1, bubble.size * 0.08);
            this.ctx.beginPath();
            this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.18, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255,255,255,0.45)';
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    isOffscreen(margin = 0) {
        return this.x + this.drawWidth / 2 < -margin ||
            this.x - this.drawWidth / 2 > this.canvas.width + margin ||
            this.y + this.drawHeight / 2 < -margin ||
            this.y - this.drawHeight / 2 > this.canvas.height + margin;
    }

    startTurnToward(targetFacingRight) {
        if (this.facingRight === targetFacingRight) return;
        this.isTurning = true;
        this.turnTargetFacingRight = targetFacingRight;
        this.turnAnimation.reset();
    }

    setFacingImmediate(targetFacingRight) {
        this.facingRight = targetFacingRight;
        this.turnTargetFacingRight = targetFacingRight;
        this.isTurning = false;
        this.turnAnimation.reset();
    }

    updateTurn(deltaFrames) {
        this.bodyAnimation.update(deltaFrames);
        if (!this.isTurning) return;

        this.turnAnimation.update(deltaFrames);
        if (this.turnAnimation.finished) {
            this.isTurning = false;
            this.facingRight = this.turnTargetFacingRight;
            this.turnAnimation.reset();
        }
    }

    updateVisualEffects(deltaFrames) {
        this.effectTime += 0.04 * deltaFrames;
        this.heatBursts = this.heatBursts.filter(burst => burst.alpha > 0.01);
        this.heatBursts.forEach(burst => {
            burst.radius += 2.4 * deltaFrames;
            burst.alpha -= 0.016 * deltaFrames;
        });

        this.embers.forEach(ember => {
            ember.orbit += ember.speed * deltaFrames;
            ember.drift += 0.02 * deltaFrames;
        });

        if (Math.random() < this.getDeltaChance(0.04, deltaFrames)) {
            this.emitHeatBurst(this.x, this.y, 18 + Math.random() * 18, 0.22 + Math.random() * 0.18);
        }
        this.updateBubbles(deltaFrames);
    }

    moveLinear(vx, vy, deltaFrames = 1) {
        this.x += vx * deltaFrames;
        this.y += vy * deltaFrames;
    }

    updateClamRushTrail(deltaFrames = 1) {
        if (!this.clam || !this.maxTrailLength || !this.trailUpdateInterval) return;

        this.clamTrailFrameCount += deltaFrames;
        while (this.clamTrailFrameCount >= this.trailUpdateInterval) {
            this.clamTrailPositions.unshift({
                x: this.clam.x,
                y: this.clam.y
            });
            if (this.clamTrailPositions.length > this.maxTrailLength) {
                this.clamTrailPositions.pop();
            }
            this.clamTrailFrameCount -= this.trailUpdateInterval;
        }
    }

    clearClamRushTrail() {
        this.clamTrailPositions = [];
        this.clamTrailFrameCount = 0;
    }

    startRushCombo() {
        this.clearRushTrail();
        this.phaseData = {
            dashIndex: 0,
            dashTotal: 4,
            state: 'spawn',
            cooldown: 24,
            rush: null
        };
        this.spawnRushPath();
    }

    spawnRushPath() {
        const start = this.randomOffscreenPoint();
        const aimX = player.x;
        const aimY = player.y;
        const dx = aimX - start.x;
        const dy = aimY - start.y;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const nx = dx / distance;
        const ny = dy / distance;
        const overshoot = Math.max(this.canvas.width, this.canvas.height) + 320;
        const end = {
            x: aimX + nx * overshoot,
            y: aimY + ny * overshoot
        };

        this.x = start.x;
        this.y = start.y;
        this.setFacingImmediate(nx > 0);
        this.phaseData.rush = {
            start,
            end
        };
    }

    updateRushCombo(deltaFrames) {
        if (this.phaseData.state === 'spawn') {
            this.phaseData.cooldown -= deltaFrames;
            if (this.phaseData.cooldown <= 0) {
                this.phaseData.state = 'rush';
                if (typeof sound !== 'undefined') {
                    sound.play('balrog_unleash', { restart: true, volume: 0.35 });
                    sound.play('balrog_chomp', { allowOverlap: true, volume: 0.2 });
                }
            }
            return;
        }

        if (this.phaseData.state === 'rush') {
            const reachedTarget = this.rush(
                this.phaseData.rush.end.x,
                this.phaseData.rush.end.y,
                this.rushSpeed,
                deltaFrames
            );
            if (reachedTarget) {
                this.phaseData.dashIndex += 1;
                if (this.phaseData.dashIndex >= this.phaseData.dashTotal) {
                    this.clearRushTrail();
                    this.nextPhase();
                    return;
                }
                this.phaseData.state = 'spawn';
                this.phaseData.cooldown = 8;
                this.spawnRushPath();
            }
        }
    }

    startBallPhase() {
        this.clearRushTrail();
        const desiredX = this.canvas.width * 0.5;
        if (!this.isOffscreen(20)) {
            this.x = Math.max(120, Math.min(this.canvas.width - 120, this.x));
            this.y = -this.drawHeight;
        }
        this.setFacingImmediate(this.x < desiredX);
        this.phaseData = {
            state: 'enter',
            timer: 0,
            paceDirection: -1,
            tossTimer: 12,
            duration: 450,
            exitSpeed: 3.8,
            enterTargetX: desiredX,
            enterTargetY: 130
        };
    }

    createBallProjectile(x, y, angle, speed, row) {
        return {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 18 + row * 1.5,
            row,
            bounces: 0,
            floorActive: true,
            postBounceTimer: 28,
            rotation: 0
        };
    }

    spawnBouncingBallVolley(originX = this.x, originY = this.y - 12, soundKey = 'balrog_throw') {
        const count = 1 + Math.floor(Math.random() * 2);
        const shuffledRows = [0, 1, 2, 3].sort(() => Math.random() - 0.5);

        for (let i = 0; i < count; i++) {
            const row = shuffledRows[i];
            const angle = (-Math.PI / 2) + ((Math.random() - 0.5) * 0.9);
            const speed = 8.5 + Math.random() * 2.5;
            this.bouncingBalls.push(this.createBallProjectile(originX, originY, angle, speed, row));
            this.bouncingBalls[this.bouncingBalls.length - 1].vx = (Math.random() - 0.5) * (6 + Math.random() * 4);
            this.bouncingBalls[this.bouncingBalls.length - 1].vy = -(8 + Math.random() * 4);
        }

        if (typeof sound !== 'undefined' && soundKey) {
            const volume = soundKey === 'balrog_grow' ? 0.18 : 0.22;
            sound.play(soundKey, { allowOverlap: true, volume, cooldownMs: 45 });
        }
    }

    updateBouncingBalls(deltaFrames) {
        const floor = this.canvas.height - 22;

        this.bouncingBalls.forEach(ball => {
            ball.vy += 0.55 * deltaFrames;
            ball.x += ball.vx * deltaFrames;
            ball.y += ball.vy * deltaFrames;
            ball.rotation += ball.vx * 0.02 * deltaFrames;

            if (ball.x - ball.radius < 0) {
                ball.x = ball.radius;
                ball.vx *= -0.92;
            } else if (ball.x + ball.radius > this.canvas.width) {
                ball.x = this.canvas.width - ball.radius;
                ball.vx *= -0.92;
            }

            if (ball.floorActive && ball.y + ball.radius >= floor) {
                ball.y = floor - ball.radius;
                ball.vy = -Math.abs(ball.vy) * 0.78;
                ball.vx *= 0.97;
                ball.bounces += 1;
                if (ball.bounces >= 3) {
                    ball.floorActive = false;
                }
            }

            if (!ball.floorActive) {
                ball.postBounceTimer -= deltaFrames;
                if (ball.postBounceTimer <= 0) {
                    ball.vy += 0.35 * deltaFrames;
                }
            }
        });

        this.bouncingBalls = this.bouncingBalls.filter(ball =>
            ball.x + ball.radius > 0 &&
            ball.x - ball.radius < this.canvas.width &&
            ball.y - ball.radius < this.canvas.height &&
            ball.y + ball.radius > 0
        );
    }

    beginBallExit() {
        this.phaseData.state = 'exit';
    }

    updateBallPhase(deltaFrames) {
        if (this.phaseData.state === 'enter') {
            const targetFacingRight = this.x < this.phaseData.enterTargetX;
            if (!this.isTurning && this.facingRight !== targetFacingRight) {
                this.startTurnToward(targetFacingRight);
            }

            const arrived = this.rush(
                this.phaseData.enterTargetX,
                this.phaseData.enterTargetY,
                0.09,
                deltaFrames
            );

            if (arrived) {
                this.clearRushTrail();
                this.setFacingImmediate(false);
                this.phaseData.state = 'pattern';
                this.phaseData.timer = 0;
                this.phaseData.tossTimer = 10;
            }
            return;
        }

        if (this.phaseData.state === 'pattern') {
            this.phaseData.timer += deltaFrames;
            this.phaseData.tossTimer -= deltaFrames;

            const paceSpeed = 4.6;
            this.x += this.phaseData.paceDirection * paceSpeed * deltaFrames;
            this.y = this.phaseData.enterTargetY + Math.sin(this.phaseData.timer * 0.08) * 10;

            if (this.x < 130) {
                this.x = 130;
                this.phaseData.paceDirection = 1;
                this.startTurnToward(true);
            } else if (this.x > this.canvas.width - 130) {
                this.x = this.canvas.width - 130;
                this.phaseData.paceDirection = -1;
                this.startTurnToward(false);
            }

            if (this.phaseData.tossTimer <= 0) {
                this.spawnBouncingBallVolley(this.x, this.y - 16, 'balrog_throw');
                this.phaseData.tossTimer = 21;
            }

            if (this.phaseData.timer >= this.phaseData.duration) {
                this.beginBallExit();
            }
            return;
        }

        if (this.phaseData.state === 'exit') {
            this.y -= this.phaseData.exitSpeed * deltaFrames;
            this.x += Math.sin(this.phaseTimer * 0.04) * 1.4 * deltaFrames;
            if (this.y + this.drawHeight / 2 < 0) {
                this.nextPhase();
            }
        }
    }

    startSchoolPhase() {
        this.clearRushTrail();
        if (!this.isOffscreen(20)) {
            this.x = -this.drawWidth;
            this.y = -this.drawHeight;
        }
        this.setFacingImmediate(false);
        this.phaseData = {
            state: 'swim_in',
            timer: 0,
            freezeTimer: 60,
            tunnelTimer: 0,
            tunnelDuration: 0,
            guppySpawnTimer: 0,
            ballBurstTimer: 45,
            tunnelGraceTimer: 0
        };

        this.schoolGuppies = Array.from({ length: 18 }, (_, index) => this.createSchoolGuppy(
            this.canvas.width + 140 + index * 52
        ));

        this.buildTunnelGuppies();
    }

    createSchoolGuppy(spawnX = this.canvas.width + 120) {
        if (typeof sound !== 'undefined') {
            sound.play('balrog_grow', { allowOverlap: true, cooldownMs: 50, volume: 0.18 });
        }
        return {
            x: spawnX,
            y: 36 + Math.random() * (this.canvas.height - 72),
            baseY: 36 + Math.random() * (this.canvas.height - 72),
            speed: 2.4 + Math.random() * 1.6,
            direction: -1,
            size: 72 + Math.random() * 72,
            bobOffset: Math.random() * Math.PI * 2,
            state: 'swim',
            warning: false
        };
    }

    spawnSchoolBallBurst() {
        const spawnX = 60 + Math.random() * (this.canvas.width - 120);
        this.spawnBouncingBallVolley(spawnX, -36, 'balrog_grow');
    }

    buildTunnelGuppies() {
        this.tunnelGuppies = [];
        const sliceCount = 70;
        const spacing = 62;
        const tunnelSpeed = 12.2;
        for (let i = 0; i < sliceCount; i++) {
            const edgeDistance = Math.min(i, sliceCount - 1 - i);
            const edgeBlend = Math.min(1, edgeDistance / 6);
            const edgeChaos = 1 - edgeBlend;
            const x = -160 - i * spacing + ((Math.random() - 0.5) * 24);
            const gapCenter = this.canvas.height * 0.52 + Math.sin(i * 0.65) * 120;
            const gapHeight = 240;
            const gapTop = gapCenter - gapHeight / 2;
            const gapBottom = gapCenter + gapHeight / 2;

            for (let topY = 26; topY < gapTop - 8; topY += 22 + Math.random() * 18) {
                const taperOffset = ((topY / this.canvas.height) - 0.5) * 90 * edgeChaos;
                this.tunnelGuppies.push({
                    x: x + taperOffset + ((Math.random() - 0.5) * (30 + edgeChaos * 30)),
                    y: topY + ((Math.random() - 0.5) * 16),
                    size: 54 + Math.random() * 34,
                    direction: 1,
                    speed: tunnelSpeed,
                    dangerous: true
                });

                if (Math.random() < (0.45 - edgeChaos * 0.15)) {
                    this.tunnelGuppies.push({
                        x: x + taperOffset + ((Math.random() - 0.5) * (42 + edgeChaos * 36)),
                        y: topY + ((Math.random() - 0.5) * 28),
                        size: 46 + Math.random() * 28,
                        direction: 1,
                        speed: tunnelSpeed,
                        dangerous: true
                    });
                }
            }

            for (let bottomY = gapBottom + 8; bottomY < this.canvas.height - 10; bottomY += 22 + Math.random() * 18) {
                const taperOffset = ((bottomY / this.canvas.height) - 0.5) * 90 * edgeChaos;
                this.tunnelGuppies.push({
                    x: x + taperOffset + ((Math.random() - 0.5) * (30 + edgeChaos * 30)),
                    y: bottomY + ((Math.random() - 0.5) * 16),
                    size: 54 + Math.random() * 34,
                    direction: 1,
                    speed: tunnelSpeed,
                    dangerous: true
                });

                if (Math.random() < (0.45 - edgeChaos * 0.15)) {
                    this.tunnelGuppies.push({
                        x: x + taperOffset + ((Math.random() - 0.5) * (42 + edgeChaos * 36)),
                        y: bottomY + ((Math.random() - 0.5) * 28),
                        size: 46 + Math.random() * 28,
                        direction: 1,
                        speed: tunnelSpeed,
                        dangerous: true
                    });
                }
            }
        }
    }

    getTunnelBounds(x) {
        const nearbyFish = this.tunnelGuppies
            .filter(guppy => Math.abs(guppy.x - x) <= 56)
            .map(guppy => ({
                top: guppy.y - 12,
                bottom: guppy.y + 12
            }))
            .sort((a, b) => a.top - b.top);

        if (nearbyFish.length === 0) {
            return null;
        }

        let previousBottom = 0;
        let bestGap = {
            top: 0,
            bottom: this.canvas.height,
            size: 0
        };

        nearbyFish.forEach(interval => {
            const gapSize = interval.top - previousBottom;
            if (gapSize > bestGap.size) {
                bestGap = {
                    top: previousBottom,
                    bottom: interval.top,
                    size: gapSize
                };
            }
            previousBottom = Math.max(previousBottom, interval.bottom);
        });

        const finalGap = this.canvas.height - previousBottom;
        if (finalGap > bestGap.size) {
            bestGap = {
                top: previousBottom,
                bottom: this.canvas.height,
                size: finalGap
            };
        }

        return {
            top: bestGap.top,
            bottom: bestGap.bottom
        };
    }

    updateSchoolPhase(deltaFrames) {
        if (this.phaseData.state === 'swim_in') {
            this.phaseData.timer += deltaFrames;
            this.phaseData.guppySpawnTimer += deltaFrames;
            this.phaseData.ballBurstTimer -= deltaFrames;

            while (this.phaseData.guppySpawnTimer >= 10) {
                this.phaseData.guppySpawnTimer -= 10;
                this.schoolGuppies.push(this.createSchoolGuppy(
                    this.canvas.width + 120 + Math.random() * 180
                ));
            }

            if (this.phaseData.ballBurstTimer <= 0) {
                this.spawnSchoolBallBurst();
                this.phaseData.ballBurstTimer = 34 + Math.random() * 22;
            }

            this.schoolGuppies.forEach(guppy => {
                guppy.bobOffset += 0.06 * deltaFrames;
                guppy.x -= guppy.speed * deltaFrames;
                guppy.y = guppy.baseY + Math.sin(guppy.bobOffset) * 24;
            });

            if (this.phaseData.timer > 630) {
                this.phaseData.state = 'freeze';
                this.schoolGuppies.forEach(guppy => {
                    guppy.warning = true;
                    guppy.state = 'freeze';
                });
                if (typeof sound !== 'undefined') {
                    sound.play('balrog_roar_2', { restart: true, volume: 0.45 });
                }
            }
            return;
        }

        if (this.phaseData.state === 'freeze') {
            this.phaseData.freezeTimer -= deltaFrames;
            if (this.phaseData.freezeTimer <= 0) {
                this.phaseData.state = 'flee';
                this.schoolGuppies.forEach(guppy => {
                    guppy.warning = false;
                    guppy.state = 'flee';
                    guppy.direction = 1;
                });
                if (typeof sound !== 'undefined') {
                    sound.play('balrog_buzzer', { allowOverlap: true, volume: 0.25 });
                }
            }
            return;
        }

        if (this.phaseData.state === 'flee') {
            this.schoolGuppies.forEach(guppy => {
                guppy.x += 12 * deltaFrames;
            });
            this.schoolGuppies = this.schoolGuppies.filter(guppy =>
                guppy.x - guppy.size / 2 <= this.canvas.width
            );
            if (this.schoolGuppies.length === 0) {
                this.phaseData.state = 'tunnel';
                this.phaseData.tunnelGraceTimer = 60;
                if (typeof sound !== 'undefined') {
                    sound.play('balrog_evillaff', { restart: true, volume: 0.5 });
                }
            }
            return;
        }

        if (this.phaseData.state === 'tunnel') {
            this.phaseData.tunnelTimer += deltaFrames;
            this.phaseData.tunnelGraceTimer = Math.max(0, this.phaseData.tunnelGraceTimer - deltaFrames);
            this.tunnelGuppies.forEach(guppy => {
                guppy.x += guppy.speed * deltaFrames;
            });

            if (this.tunnelGuppies.length === 0) {
                this.nextPhase();
            }
        }
    }

    startStampedePhase() {
        this.clearRushTrail();
        const curveStart = { x: -this.drawWidth, y: this.canvas.height * 0.72 };
        if (!this.isOffscreen(20)) {
            this.x = curveStart.x;
            this.y = curveStart.y;
        }
        this.setFacingImmediate(true);
        this.phaseData = {
            state: 'pre_enter',
            timer: 0,
            arenaTimer: 0,
            arenaOffsetX: 0,
            arenaOffsetY: 0,
            releaseTimer: 32,
            jumperTimer: 30,
            loopDelayTimer: 270,
            curveStart,
            enterStart: null,
            curveEnd: { x: this.canvas.width * 0.58, y: this.canvas.height * 0.28 }
        };
    }

    spawnRadialGuppies() {
        const count = 12;
        for (let i = 0; i < count; i++) {
            const angle = (-Math.PI * 0.9) + (i / (count - 1)) * Math.PI * 1.8;
            const speed = 2.4 + Math.random() * 0.8;
            this.firedGuppies.push({
                originX: this.x,
                originY: this.y + 10,
                x: this.x,
                y: this.y + 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 56,
                travel: 0,
                bobOffset: Math.random() * Math.PI * 2,
                bobAmplitude: 10 + Math.random() * 6,
                dangerous: true,
                angle
            });
        }

        if (typeof sound !== 'undefined') {
            sound.play('balrog_throw', { allowOverlap: true, volume: 0.18, cooldownMs: 60 });
        }
    }

    spawnJumper() {
        this.jumpers.push({
            x: 80 + Math.random() * (this.canvas.width - 160),
            y: this.canvas.height + 110,
            width: 110,
            height: 110,
            state: 'warn',
            warningTimer: 38,
            vy: -(28 + Math.random() * 5),
            gravity: 0.6,
            dangerous: true
        });
    }

    startFinalePhase() {
        this.clearRushTrail();
        this.x = -this.drawWidth * 2;
        this.y = -this.drawHeight * 2;

        const clamX = Math.max(125, Math.min(this.canvas.width * 0.2, this.canvas.width - 220));
        this.clamFallAnimation.reset();
        this.clamOpenAnimation.reset();
        this.clam = {
            x: clamX,
            y: -120,
            width: 180,
            height: 132,
            targetY: this.canvas.height * 0.73,
            fallSpeed: 3.2,
            state: 'fall'
        };

        this.phaseData = {
            state: 'drop',
            bounceVelocity: 0,
            pearlTimer: 22,
            pearlBaseDelay: 22,
            pearlDuration: 540,
            sylvesterSpawnTimer: 48,
            closeDelayTimer: 55,
            closeDuration: 38,
            clamRush: null,
            clamRushSpeed: 0.02
        };
    }

    getClamMouthPosition() {
        if (!this.clam) {
            return { x: 0, y: 0 };
        }

        return {
            x: this.clam.x,
            y: this.clam.y + this.clam.height * 0.16
        };
    }

    spawnClamPearl() {
        if (!this.clam) return;

        const mouth = this.getClamMouthPosition();
        const leadFrames = 12 + Math.random() * 24;
        const predictedX = player.x + (player.vx ?? 0) * leadFrames;
        const predictedY = player.y + (player.vy ?? 0) * leadFrames;
        const lateralOffset = (Math.random() - 0.5) * 120;
        const verticalOffset = (Math.random() - 0.5) * 90;
        const targetX = predictedX + lateralOffset;
        const targetY = predictedY + verticalOffset;
        const dx = targetX - mouth.x;
        const dy = targetY - mouth.y;
        const angle = Math.atan2(dy, dx) + ((Math.random() - 0.5) * 0.06);
        const speed = 20 + Math.random() * 4.2;

        this.pearls.push({
            x: mouth.x,
            y: mouth.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 40,
            rotation: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.18
        });

        if (typeof sound !== 'undefined') {
            sound.play('balrog_pearlfire', { allowOverlap: true, volume: 0.22, cooldownMs: 18 });
        }
    }

    randomSylvesterSpawn() {
        const margin = 150;
        const side = Math.floor(Math.random() * 4);

        if (side === 0) {
            return { x: -margin, y: 80 + Math.random() * (this.canvas.height - 160) };
        }
        if (side === 1) {
            return { x: this.canvas.width + margin, y: 80 + Math.random() * (this.canvas.height - 160) };
        }
        if (side === 2) {
            return { x: 80 + Math.random() * (this.canvas.width - 160), y: -margin };
        }
        return { x: 80 + Math.random() * (this.canvas.width - 160), y: this.canvas.height + margin };
    }

    spawnSylvester() {
        const spawn = this.randomSylvesterSpawn();
        this.sylvesters.push({
            x: spawn.x,
            y: spawn.y,
            vx: 0,
            vy: 0,
            ax: 0.32 + Math.random() * 0.06,
            maxSpeed: 11.5 + Math.random() * 1.8,
            width: 160,
            height: 160,
            exit: false,
            exitVectorX: 0,
            exitVectorY: 0,
            facingRight: spawn.x < this.canvas.width * 0.5,
            turnTargetFacingRight: spawn.x < this.canvas.width * 0.5,
            isTurning: false,
            turnElapsed: 0,
            animTime: Math.random() * 20
        });

        if (typeof sound !== 'undefined') {
            sound.play('balrog_chomp', { allowOverlap: true, volume: 0.16, cooldownMs: 55 });
        }
    }

    releaseSylvesters() {
        this.sylvesters.forEach(sylvester => {
            const awayX = sylvester.x - (this.canvas.width * 0.5);
            const awayY = sylvester.y - (this.canvas.height * 0.5);
            const length = Math.max(1, Math.sqrt(awayX * awayX + awayY * awayY));
            sylvester.exit = true;
            sylvester.exitVectorX = awayX / length;
            sylvester.exitVectorY = awayY / length;
        });
    }

    updateFinalePhase(deltaFrames) {
        if (!this.clam) return;

        if (this.phaseData.state === 'drop') {
            this.clamFallAnimation.update(deltaFrames);
            this.clam.fallSpeed += 0.12 * deltaFrames;
            this.clam.y += this.clam.fallSpeed * deltaFrames;

            if (this.clam.y >= this.clam.targetY) {
                this.clam.y = this.clam.targetY;
                this.phaseData.state = 'bounce';
                this.phaseData.bounceVelocity = -Math.min(4.8, Math.max(1.8, this.clam.fallSpeed * 0.18));
            }
            return;
        }

        if (this.phaseData.state === 'bounce') {
            this.clamFallAnimation.update(deltaFrames);
            this.phaseData.bounceVelocity += 0.22 * deltaFrames;
            this.clam.y += this.phaseData.bounceVelocity * deltaFrames;

            if (this.clam.y >= this.clam.targetY && this.phaseData.bounceVelocity > 0) {
                this.clam.y = this.clam.targetY;
                if (this.phaseData.bounceVelocity < 1.2) {
                    this.clam.state = 'open';
                    this.phaseData.state = 'open';
                    this.clamOpenAnimation.reset();
                    if (typeof sound !== 'undefined') {
                        sound.play('balrog_clamopen', { restart: true, volume: 0.3 });
                    }
                } else {
                    this.phaseData.bounceVelocity *= -0.35;
                }
            }
            return;
        }

        if (this.phaseData.state === 'open') {
            this.clamOpenAnimation.update(deltaFrames);
            if (this.clamOpenAnimation.finished) {
                this.clam.state = 'open_hold';
                this.phaseData.state = 'barrage';
            }
            return;
        }

        if (this.phaseData.state === 'barrage') {
            this.phaseData.pearlDuration -= deltaFrames;
            this.phaseData.pearlTimer -= deltaFrames;
            this.phaseData.sylvesterSpawnTimer -= deltaFrames;

            while (this.phaseData.pearlTimer <= 0) {
                this.spawnClamPearl();
                const nextDelay = this.phaseData.pearlBaseDelay * (0.5 + Math.random());
                this.phaseData.pearlTimer += nextDelay;
            }

            while (this.phaseData.sylvesterSpawnTimer <= 0 && this.sylvesters.length < 3) {
                this.spawnSylvester();
                this.phaseData.sylvesterSpawnTimer += 70;
            }

            if (this.phaseData.pearlDuration <= 0) {
                this.phaseData.state = 'disengage';
                this.releaseSylvesters();
            }
            return;
        }

        if (this.phaseData.state === 'disengage') {
            this.phaseData.closeDelayTimer -= deltaFrames;
            if (this.phaseData.closeDelayTimer <= 0) {
                this.phaseData.state = 'close';
                this.clam.state = 'close';
            }
            return;
        }

        if (this.phaseData.state === 'close') {
            this.phaseData.closeDuration -= deltaFrames;
            if (this.phaseData.closeDuration <= 0) {
                const dx = player.x - this.clam.x;
                const dy = player.y - this.clam.y;
                const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                const overshoot = Math.max(this.canvas.width, this.canvas.height) + 320;
                this.phaseData.state = 'rush_out';
                this.phaseData.clamRush = {
                    targetX: player.x + (dx / distance) * overshoot,
                    targetY: player.y + (dy / distance) * overshoot
                };
                this.clam.state = 'rush_out';
                this.clearClamRushTrail();
                if (typeof sound !== 'undefined') {
                    sound.play('balrog_buzzer', { allowOverlap: true, restart: true, volume: 0.28 });
                }
            }
            return;
        }

        if (this.phaseData.state === 'rush_out') {
            const dx = this.phaseData.clamRush.targetX - this.clam.x;
            const dy = this.phaseData.clamRush.targetY - this.clam.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            this.updateClamRushTrail(deltaFrames);

            if (distance > 0.1) {
                const moveFactor = this.getDeltaFactor(this.phaseData.clamRushSpeed, deltaFrames);
                this.clam.x += dx * moveFactor;
                this.clam.y += dy * moveFactor;
            } else {
                this.clam.x = this.phaseData.clamRush.targetX;
                this.clam.y = this.phaseData.clamRush.targetY;
            }

            if (this.clam.x + this.clam.width / 2 < -220 ||
                this.clam.x - this.clam.width / 2 > this.canvas.width + 220 ||
                this.clam.y + this.clam.height / 2 < -220 ||
                this.clam.y - this.clam.height / 2 > this.canvas.height + 220) {
                this.clearClamRushTrail();
                this.nextPhase();
            }
        }
    }

    updateStampedePhase(deltaFrames) {
        if (this.phaseData.state === 'pre_enter') {
            const aligned = this.rush(
                this.phaseData.curveStart.x,
                this.phaseData.curveStart.y,
                0.08,
                deltaFrames
            );
            if (aligned) {
                this.clearRushTrail();
                this.phaseData.state = 'enter';
                this.phaseData.timer = 0;
                this.phaseData.enterStart = {
                    x: this.x,
                    y: this.y
                };
                if (typeof sound !== 'undefined') {
                    sound.play('balrog_roar', { restart: true, volume: 0.5 });
                }
            }
            return;
        }

        if (this.phaseData.state === 'enter') {
            this.phaseData.timer += deltaFrames;
            const progress = Math.min(1, this.phaseData.timer / 120);
            const eased = 1 - Math.pow(1 - progress, 2);
            const enterStart = this.phaseData.enterStart ?? this.phaseData.curveStart;
            this.x = enterStart.x + (this.phaseData.curveEnd.x - enterStart.x) * eased;
            this.y = enterStart.y + (this.phaseData.curveEnd.y - enterStart.y) * eased - Math.sin(progress * Math.PI) * 90 * eased;

            if (progress >= 1) {
                const arenaCenterX = this.canvas.width * 0.5;
                const arenaAmplitudeX = this.canvas.width * 0.3;
                const arenaBaseY = this.canvas.height * 0.28;
                const arenaAmplitudeY = 85;
                const normalizedX = Math.max(-1, Math.min(1, (this.x - arenaCenterX) / arenaAmplitudeX));
                const normalizedY = Math.max(-1, Math.min(1, (this.y - arenaBaseY) / arenaAmplitudeY));
                this.phaseData.state = 'arena';
                this.phaseData.arenaTimer = 0;
                this.phaseData.arenaOffsetX = Math.asin(normalizedX) / 0.02;
                this.phaseData.arenaOffsetY = Math.asin(normalizedY) / 0.07;
            }
            return;
        }

        if (this.phaseData.state === 'arena') {
            this.phaseData.arenaTimer += deltaFrames;
            this.phaseData.releaseTimer -= deltaFrames;
            this.phaseData.jumperTimer -= deltaFrames;

            const t = this.phaseData.arenaTimer;
            const previousFacingRight = this.facingRight;
            const xPhase = t + this.phaseData.arenaOffsetX;
            const yPhase = t + this.phaseData.arenaOffsetY;
            this.x = this.canvas.width * 0.5 + Math.sin(xPhase * 0.02) * (this.canvas.width * 0.3);
            this.y = this.canvas.height * 0.28 + Math.sin(yPhase * 0.07) * 85;
            const targetFacingRight = Math.cos(xPhase * 0.02) >= 0;
            if (!this.isTurning && previousFacingRight !== targetFacingRight) {
                this.startTurnToward(targetFacingRight);
            }

            if (this.phaseData.releaseTimer <= 0) {
                this.spawnRadialGuppies();
                this.phaseData.releaseTimer = 32;
            }

            if (this.phaseData.jumperTimer <= 0) {
                this.spawnJumper();
                this.phaseData.jumperTimer = 34;
            }

            if (this.phaseData.arenaTimer >= 360) {
                this.phaseData.state = 'ascend';
            }
            return;
        }

        if (this.phaseData.state === 'ascend') {
            this.y -= 5 * deltaFrames;
            this.x += Math.sin(this.phaseTimer * 0.03) * 1.8 * deltaFrames;
            if (this.y < -this.drawHeight) {
                this.phaseData.state = 'linger';
            }
            return;
        }

        if (this.phaseData.state === 'linger') {
            this.phaseData.loopDelayTimer -= deltaFrames;
            if (this.phaseData.loopDelayTimer <= 0) {
                this.nextPhase();
            }
        }
    }

    updateSchoolGuppies(deltaFrames) {
        this.schoolGuppies.forEach(guppy => {
            if (guppy.state === 'freeze') return;
            guppy.bobOffset += 0.04 * deltaFrames;
            if (guppy.state === 'flee') {
                guppy.y += Math.sin(guppy.bobOffset) * 0.6 * deltaFrames;
            }
        });
    }

    updateTunnelGuppies(deltaFrames) {
        if (this.phase !== 'school' || this.phaseData.state !== 'tunnel') return;
        this.tunnelGuppies = this.tunnelGuppies.filter(guppy =>
            guppy.x - guppy.size / 2 <= this.canvas.width
        );
    }

    updateFiredGuppies(deltaFrames) {
        this.firedGuppies.forEach(guppy => {
            guppy.travel += deltaFrames;
            const bob = Math.sin((guppy.travel * 0.12) + guppy.bobOffset) * guppy.bobAmplitude;
            const perpX = -Math.sin(guppy.angle);
            const perpY = Math.cos(guppy.angle);
            guppy.originX += guppy.vx * deltaFrames;
            guppy.originY += guppy.vy * deltaFrames;
            guppy.x = guppy.originX + perpX * bob;
            guppy.y = guppy.originY + perpY * bob;
        });

        this.firedGuppies = this.firedGuppies.filter(guppy =>
            guppy.x + guppy.size > -80 &&
            guppy.x - guppy.size < this.canvas.width + 80 &&
            guppy.y + guppy.size > -80 &&
            guppy.y - guppy.size < this.canvas.height + 80
        );
    }

    updateJumpers(deltaFrames) {
        this.jumpers.forEach(jumper => {
            if (jumper.state === 'warn') {
                jumper.warningTimer -= deltaFrames;
                if (jumper.warningTimer <= 0) {
                    jumper.state = 'jump';
                    if (typeof sound !== 'undefined') {
                        sound.play('balrog_chomp', { allowOverlap: true, volume: 0.22, cooldownMs: 40 });
                    }
                }
                return;
            }

            jumper.vy += jumper.gravity * deltaFrames;
            jumper.y += jumper.vy * deltaFrames;
        });

        this.jumpers = this.jumpers.filter(jumper =>
            jumper.state === 'warn' || jumper.y - jumper.height / 2 < this.canvas.height + 140
        );
    }

    updatePearls(deltaFrames) {
        this.pearls.forEach(pearl => {
            pearl.x += pearl.vx * deltaFrames;
            pearl.y += pearl.vy * deltaFrames;
            pearl.rotation += pearl.spin * deltaFrames;
        });

        this.pearls = this.pearls.filter(pearl =>
            pearl.x + pearl.radius > -80 &&
            pearl.x - pearl.radius < this.canvas.width + 80 &&
            pearl.y + pearl.radius > -80 &&
            pearl.y - pearl.radius < this.canvas.height + 80
        );
    }

    updateSylvesters(deltaFrames) {
        this.sylvesters.forEach(sylvester => {
            let targetX;
            let targetY;

            if (sylvester.exit) {
                targetX = sylvester.x + sylvester.exitVectorX * 200;
                targetY = sylvester.y + sylvester.exitVectorY * 200;
            } else {
                targetX = player.x;
                targetY = player.y;
            }

            const dx = targetX - sylvester.x;
            const dy = targetY - sylvester.y;
            const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const accel = sylvester.exit ? 0.42 : sylvester.ax;
            const desiredFacingRight = dx > 0;

            if (!sylvester.isTurning && sylvester.facingRight !== desiredFacingRight) {
                sylvester.isTurning = true;
                sylvester.turnTargetFacingRight = desiredFacingRight;
                sylvester.turnElapsed = 0;
            }

            sylvester.vx += (dx / distance) * accel * deltaFrames;
            sylvester.vy += (dy / distance) * accel * deltaFrames;

            const speed = Math.sqrt(sylvester.vx * sylvester.vx + sylvester.vy * sylvester.vy);
            const maxSpeed = sylvester.exit ? 16 : sylvester.maxSpeed;
            if (speed > maxSpeed) {
                sylvester.vx = (sylvester.vx / speed) * maxSpeed;
                sylvester.vy = (sylvester.vy / speed) * maxSpeed;
            }

            sylvester.x += sylvester.vx * deltaFrames;
            sylvester.y += sylvester.vy * deltaFrames;
            sylvester.animTime += deltaFrames;

            if (sylvester.isTurning) {
                sylvester.turnElapsed += deltaFrames;
                const turnFrame = Math.floor((sylvester.turnElapsed * 14) / 60);
                if (turnFrame >= 10) {
                    sylvester.isTurning = false;
                    sylvester.facingRight = sylvester.turnTargetFacingRight;
                    sylvester.turnElapsed = 0;
                }
            }
        });

        this.sylvesters = this.sylvesters.filter(sylvester => {
            if (!sylvester.exit) {
                return sylvester.x + sylvester.width > -260 &&
                    sylvester.x - sylvester.width < this.canvas.width + 260 &&
                    sylvester.y + sylvester.height > -260 &&
                    sylvester.y - sylvester.height < this.canvas.height + 260;
            }

            return sylvester.x + sylvester.width > -320 &&
                sylvester.x - sylvester.width < this.canvas.width + 320 &&
                sylvester.y + sylvester.height > -320 &&
                sylvester.y - sylvester.height < this.canvas.height + 320;
        });
    }

    update(deltaFrames = 1) {
        if (!this.active) return;

        this.phaseTimer += deltaFrames;
        this.updateHealthShake(deltaFrames);
        this.updateTurn(deltaFrames);
        this.updateVisualEffects(deltaFrames);
        this.guppyAnimation.update(deltaFrames);
        this.jumperAnimation.update(deltaFrames);
        this.sylvesterAnimation.update(deltaFrames);
        this.ballAnimations.forEach(animation => animation.update(deltaFrames));
        this.updateBouncingBalls(deltaFrames);

        if (this.phase === 'rush_combo') {
            this.updateRushCombo(deltaFrames);
        } else if (this.phase === 'balls') {
            this.updateBallPhase(deltaFrames);
        } else if (this.phase === 'school') {
            this.updateSchoolPhase(deltaFrames);
        } else if (this.phase === 'stampede') {
            this.updateStampedePhase(deltaFrames);
        } else if (this.phase === 'finale') {
            this.updateFinalePhase(deltaFrames);
        }

        this.updateSchoolGuppies(deltaFrames);
        this.updateTunnelGuppies(deltaFrames);
        this.updateFiredGuppies(deltaFrames);
        this.updateJumpers(deltaFrames);
        this.updatePearls(deltaFrames);
        this.updateSylvesters(deltaFrames);
    }

    drawBullets() {
        this.drawBouncingBalls();
        this.drawSchoolGuppies();
        this.drawTunnelGuppies();
        this.drawClam();
        this.drawPearls();
        this.drawSylvesters();
        this.drawJumpers();
    }

    drawBoss() {
        this.drawFiredGuppies();

        if (this.x < -this.drawWidth * 1.5 ||
            this.x > this.canvas.width + this.drawWidth * 1.5 ||
            this.y < -this.drawHeight * 1.5 ||
            this.y > this.canvas.height + this.drawHeight * 1.5) {
            return;
        }

        const animation = this.isTurning ? this.turnAnimation : this.bodyAnimation;
        const drawX = this.x - this.drawWidth / 2;
        const drawY = this.y - this.drawHeight / 2;
        const pulse = (Math.sin(this.effectTime) + 1) / 2;

        this.trailPositions.forEach((pos, index) => {
            const opacity = this.trailOpacityStart - (index * this.trailOpacityDecay);
            if (opacity <= 0) return;

            this.ctx.save();
            this.ctx.globalAlpha = opacity;
            this.ctx.shadowColor = 'rgba(255, 145, 30, 0.45)';
            this.ctx.shadowBlur = 18;
            animation.draw(
                this.ctx,
                pos.x - this.drawWidth / 2,
                pos.y - this.drawHeight / 2,
                this.drawWidth,
                this.drawHeight,
                { flipX: this.facingRight }
            );
            this.ctx.restore();
        });

        this.heatBursts.forEach(burst => {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.ellipse(burst.x, burst.y, burst.radius * 1.15, burst.radius * 0.7, 0, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255, 156, 54, ${burst.alpha})`;
            this.ctx.lineWidth = burst.lineWidth;
            this.ctx.stroke();
            this.ctx.restore();
        });

        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        const glowRadiusX = this.drawWidth * 0.36 + pulse * 10;
        const glowRadiusY = this.drawHeight * 0.22 + pulse * 5;
        this.ctx.scale(1, glowRadiusY / glowRadiusX);
        const glow = this.ctx.createRadialGradient(0, 0, glowRadiusX * 0.12, 0, 0, glowRadiusX);
        glow.addColorStop(0, `rgba(255, 152, 36, ${0.22 + pulse * 0.1})`);
        glow.addColorStop(0.55, `rgba(255, 126, 18, ${0.1 + pulse * 0.06})`);
        glow.addColorStop(1, 'rgba(255, 126, 18, 0)');
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, glowRadiusX, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        this.embers.forEach(ember => {
            const emberX = this.x + Math.cos(ember.orbit) * ember.radius;
            const emberY = this.y + Math.sin(ember.orbit * 1.3) * (this.drawHeight * 0.2) - Math.cos(ember.drift) * ember.lift * 8;
            this.ctx.save();
            this.ctx.globalAlpha = ember.alpha;
            this.ctx.fillStyle = '#ff9a2f';
            this.ctx.shadowColor = 'rgba(255, 160, 40, 0.7)';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(emberX, emberY, ember.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        this.ctx.save();
        this.ctx.shadowColor = `rgba(255, 140, 35, ${0.45 + pulse * 0.2})`;
        this.ctx.shadowBlur = 20 + pulse * 10;
        animation.draw(this.ctx, drawX, drawY, this.drawWidth, this.drawHeight, {
            flipX: this.facingRight
        });
        this.ctx.restore();
    }

    drawBouncingBalls() {
        this.bouncingBalls.forEach(ball => {
            this.ctx.save();
            this.ctx.translate(ball.x, ball.y);
            this.ctx.rotate(ball.rotation);
            this.ballAnimations[ball.row].draw(
                this.ctx,
                -ball.radius * 1.5,
                -ball.radius * 1.5,
                ball.radius * 3,
                ball.radius * 3
            );
            this.ctx.restore();
        });
    }

    drawSchoolGuppies() {
        this.schoolGuppies.forEach(guppy => {
            this.guppyAnimation.draw(
                this.ctx,
                guppy.x - guppy.size / 2,
                guppy.y - guppy.size / 2,
                guppy.size,
                guppy.size,
                { flipX: guppy.direction > 0 }
            );

            if (guppy.warning) {
                this.ctx.save();
                this.ctx.font = 'bold 26px Arial';
                this.ctx.fillStyle = '#fff2a8';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('!', guppy.x, guppy.y - guppy.size * 0.7);
                this.ctx.restore();
            }
        });
    }

    drawTunnelGuppies() {
        this.tunnelGuppies.forEach(guppy => {
            this.guppyAnimation.draw(
                this.ctx,
                guppy.x - guppy.size / 2,
                guppy.y - guppy.size / 2,
                guppy.size,
                guppy.size,
                { flipX: true }
            );
        });
    }

    drawFiredGuppies() {
        this.firedGuppies.forEach(guppy => {
            this.ctx.save();
            this.ctx.translate(guppy.x, guppy.y);
            this.ctx.rotate(guppy.angle - Math.PI);
            this.guppyAnimation.draw(
                this.ctx,
                -guppy.size / 2,
                -guppy.size / 2,
                guppy.size,
                guppy.size
            );
            this.ctx.restore();
        });
    }

    drawSpriteFrame(image, columns, rows, frame, row, dx, dy, dWidth, dHeight, flipX = false) {
        if (!image.complete || image.naturalWidth <= 0) return;

        const frameWidth = image.naturalWidth / columns;
        const frameHeight = image.naturalHeight / rows;
        const sx = frame * frameWidth;
        const sy = row * frameHeight;

        this.ctx.save();
        if (flipX) {
            this.ctx.translate(dx + dWidth / 2, dy + dHeight / 2);
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(
                image,
                sx,
                sy,
                frameWidth,
                frameHeight,
                -dWidth / 2,
                -dHeight / 2,
                dWidth,
                dHeight
            );
        } else {
            this.ctx.drawImage(image, sx, sy, frameWidth, frameHeight, dx, dy, dWidth, dHeight);
        }
        this.ctx.restore();
    }

    drawClam() {
        if (!this.clam) return;

        const drawX = this.clam.x - this.clam.width / 2;
        const drawY = this.clam.y - this.clam.height / 2;

        if (this.clam.state === 'fall' || this.clam.state === 'rush_out') {
            if (this.clam.state === 'rush_out') {
                this.clamTrailPositions.forEach((pos, index) => {
                    const opacity = this.trailOpacityStart - (index * this.trailOpacityDecay);
                    if (opacity <= 0) return;

                    this.ctx.save();
                    this.ctx.globalAlpha = opacity;
                    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
                    this.ctx.shadowBlur = 14;
                    this.drawSpriteFrame(
                        this.clamImage,
                        10,
                        3,
                        this.clamFallAnimation.currentFrame,
                        0,
                        pos.x - this.clam.width / 2,
                        pos.y - this.clam.height / 2,
                        this.clam.width,
                        this.clam.height
                    );
                    this.ctx.restore();
                });
            }
            this.clamFallAnimation.draw(
                this.ctx,
                drawX,
                drawY,
                this.clam.width,
                this.clam.height
            );
            return;
        }

        if (this.clam.state === 'open') {
            this.clamOpenAnimation.draw(
                this.ctx,
                drawX,
                drawY,
                this.clam.width,
                this.clam.height
            );
            return;
        }

        if (this.clam.state === 'open_hold') {
            this.drawSpriteFrame(
                this.clamImage,
                10,
                3,
                9,
                1,
                drawX,
                drawY,
                this.clam.width,
                this.clam.height
            );
            return;
        }

        if (this.clam.state === 'close') {
            const ratio = Math.max(0, Math.min(1, this.phaseData.closeDuration / 38));
            const frame = Math.max(0, Math.min(9, Math.round(ratio * 9)));
            this.drawSpriteFrame(
                this.clamImage,
                10,
                3,
                frame,
                2,
                drawX,
                drawY,
                this.clam.width,
                this.clam.height
            );
        }
    }

    drawPearls() {
        this.pearls.forEach(pearl => {
            this.ctx.save();
            this.ctx.translate(pearl.x, pearl.y);
            this.ctx.rotate(pearl.rotation);
            this.ctx.shadowColor = 'rgba(255, 246, 215, 0.6)';
            this.ctx.shadowBlur = 12;
            this.ctx.drawImage(
                this.pearlImage,
                -pearl.radius,
                -pearl.radius,
                pearl.radius * 2,
                pearl.radius * 2
            );
            this.ctx.restore();
        });
    }

    drawSylvesters() {
        this.sylvesters.forEach(sylvester => {
            const frame = sylvester.isTurning
                ? Math.min(9, Math.floor((sylvester.turnElapsed * 14) / 60))
                : Math.floor((sylvester.animTime * 14) / 60) % 10;
            this.drawSpriteFrame(
                this.sylvesterImage,
                10,
                2,
                frame,
                sylvester.isTurning ? 1 : 0,
                sylvester.x - sylvester.width / 2,
                sylvester.y - sylvester.height / 2,
                sylvester.width,
                sylvester.height,
                sylvester.facingRight
            );
        });
    }

    drawJumpers() {
        this.jumpers.forEach(jumper => {
            if (jumper.state === 'warn') {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(255, 60, 60, 0.14)';
                this.ctx.fillRect(
                    jumper.x - jumper.width / 2,
                    0,
                    jumper.width,
                    this.canvas.height
                );
                this.ctx.strokeStyle = 'rgba(255, 120, 120, 0.22)';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(
                    jumper.x - jumper.width / 2,
                    0,
                    jumper.width,
                    this.canvas.height
                );
                this.ctx.restore();
                return;
            }

            this.jumperAnimation.draw(
                this.ctx,
                jumper.x - jumper.width / 2,
                jumper.y - jumper.height / 2,
                jumper.width,
                jumper.height
            );
        });
    }

    circleRectCollision(circleX, circleY, circleRadius, rectX, rectY, rectWidth, rectHeight) {
        const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
        const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
        const dx = circleX - closestX;
        const dy = circleY - closestY;
        return dx * dx + dy * dy < circleRadius * circleRadius;
    }

    checkCollisionWithPlayer(player) {
        const directCollision = this.x > -200 &&
            this.x < this.canvas.width + 200 &&
            this.y > -200 &&
            this.y < this.canvas.height + 200 &&
            Math.abs(player.x - this.x) < this.width / 2 + player.radius &&
            Math.abs(player.y - this.y) < this.height / 2 + player.radius;

        const ballCollision = this.bouncingBalls.some(ball => {
            const dx = ball.x - player.x;
            const dy = ball.y - player.y;
            return dx * dx + dy * dy < (ball.radius + player.radius) * (ball.radius + player.radius);
        });

        const schoolCollision = this.schoolGuppies.some(guppy =>
            this.circleRectCollision(player.x, player.y, player.radius, guppy.x - 15, guppy.y - 12, 30, 24)
        );

        const tunnelFishCollision = this.tunnelGuppies.some(guppy =>
            this.circleRectCollision(player.x, player.y, player.radius, guppy.x - 15, guppy.y - 12, 30, 24)
        );

        const firedFishCollision = this.firedGuppies.some(guppy =>
            this.circleRectCollision(player.x, player.y, player.radius, guppy.x - 15, guppy.y - 12, 30, 24)
        );

        const clamCollision = this.clam &&
            this.phase === 'finale' &&
            this.circleRectCollision(
                player.x,
                player.y,
                player.radius,
                this.clam.x - this.clam.width * 0.42,
                this.clam.y - this.clam.height * 0.34,
                this.clam.width * 0.84,
                this.clam.height * 0.68
            );

        const pearlCollision = this.pearls.some(pearl => {
            const dx = pearl.x - player.x;
            const dy = pearl.y - player.y;
            return dx * dx + dy * dy < (pearl.radius + player.radius) * (pearl.radius + player.radius);
        });

        const sylvesterCollision = this.sylvesters.some(sylvester =>
            this.circleRectCollision(
                player.x,
                player.y,
                player.radius,
                sylvester.x - sylvester.width * 0.2,
                sylvester.y - sylvester.height * 0.24,
                sylvester.width * 0.4,
                sylvester.height * 0.48
            )
        );

        const jumperCollision = this.jumpers.some(jumper =>
            jumper.state === 'jump' &&
            this.circleRectCollision(
                player.x,
                player.y,
                player.radius,
                jumper.x - jumper.width * 0.22,
                jumper.y - jumper.height * 0.26,
                jumper.width * 0.44,
                jumper.height * 0.52
            )
        );

        return directCollision ||
            ballCollision ||
            schoolCollision ||
            tunnelFishCollision ||
            firedFishCollision ||
            clamCollision ||
            pearlCollision ||
            sylvesterCollision ||
            jumperCollision;
    }
}
