
class ReaverBoss extends Boss {
    constructor(canvas) {
        super(canvas);
        this.radius = 72;
        this.width = this.radius * 2;
        this.height = this.radius * 2;
        this.isCircular = true;
        this.maxHealth = 24000;
        this.health = 24000;

        this.phaseTimer = 0;
        this.attackTimer = 0;
        this.effectTime = 0;
        this.volleyIndex = 0;
        this.rotation = Math.PI / 2;
        this.nextBulletId = 1;
        this.nextEffectId = 1;
        this.auraBursts = [];
        this.echoes = [];

        this.attackPhase = 1;
        this.phaseFrameTimer = 0;
        this.attackOneFireFrames = 600;
        this.attackOneTotalFrames = 900;
        this.phaseTwoRushComplete = false;
        this.lockTargetX = this.canvas.width * 0.5;
        this.lockTargetY = 140;
        this.phaseTwoShardTimer = 0;
        this.storms = [];
        this.stormTelegraphs = [];

        this.sprite = new Image();
        this.sprite.src = 'sprites/reaver/reaver.png';
        this.shardSprite = new Image();
        this.shardSprite.src = 'sprites/reaver_shard.png';
        this.usesPixiRenderer = true;
    }

    onStart() {
        if (typeof sound === 'undefined') return;
        sound.play('reaver_darkness', { restart: true, volume: 0.45 });
        sound.play('reaver_fire', { restart: true, volume: 0.26 });
        sound.play('reaver_theme', { loop: true, restart: true, volume: 0.55 });
    }

    onStop() {
        if (typeof sound === 'undefined') return;
        sound.stop('reaver_theme');
        sound.stop('reaver_darkness');
        sound.stop('reaver_fire');
        sound.stop('reaver_wave');
        sound.stop('reaver_ray');
        sound.stop('reaver_split');
        sound.stop('reaver_lightning_1');
        sound.stop('reaver_lightning_2');
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#06000d');
        gradient.addColorStop(0.5, '#140421');
        gradient.addColorStop(1, '#020005');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const radial = this.ctx.createRadialGradient(
            this.canvas.width * 0.5,
            this.canvas.height * 0.26,
            Math.min(this.canvas.width, this.canvas.height) * 0.08,
            this.canvas.width * 0.5,
            this.canvas.height * 0.34,
            Math.max(this.canvas.width, this.canvas.height) * 0.72
        );
        radial.addColorStop(0, 'rgba(208, 126, 255, 0.42)');
        radial.addColorStop(0.24, 'rgba(144, 66, 222, 0.28)');
        radial.addColorStop(0.56, 'rgba(74, 22, 122, 0.18)');
        radial.addColorStop(1, 'rgba(7, 0, 15, 0)');
        this.ctx.fillStyle = radial;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const pulse = (Math.sin(this.effectTime * 0.75) + 1) / 2;
        const glow = this.ctx.createRadialGradient(
            this.canvas.width * 0.5,
            this.canvas.height * 0.18,
            40,
            this.canvas.width * 0.5,
            this.canvas.height * 0.18,
            this.canvas.width * 0.55
        );
        glow.addColorStop(0, `rgba(178, 86, 255, ${0.22 + pulse * 0.08})`);
        glow.addColorStop(0.4, 'rgba(94, 40, 154, 0.18)');
        glow.addColorStop(1, 'rgba(15, 0, 28, 0)');
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        return true;
    }

    emitAuraBurst(radius = this.radius + 10, alpha = 0.42) {
        this.auraBursts.push({
            id: this.nextEffectId++,
            radius,
            alpha,
            lineWidth: 3 + Math.random() * 2
        });
    }

    captureEcho() {
        this.echoes.unshift({
            id: this.nextEffectId++,
            x: this.x,
            y: this.y,
            scale: 1,
            alpha: 0.16
        });
        if (this.echoes.length > 10) this.echoes.pop();
    }

    updateEffects(deltaFrames = 1) {
        this.effectTime += 0.04 * deltaFrames;
        this.auraBursts = this.auraBursts.filter((b) => b.alpha > 0.01);
        this.auraBursts.forEach((b) => {
            b.radius += 2.2 * deltaFrames;
            b.alpha -= 0.012 * deltaFrames;
        });
        this.echoes = this.echoes.filter((e) => e.alpha > 0.01);
        this.echoes.forEach((e) => {
            e.scale += 0.012 * deltaFrames;
            e.alpha -= 0.015 * deltaFrames;
        });
    }

    playWaveSound() { if (typeof sound !== 'undefined') sound.play('reaver_wave', { allowOverlap: true, cooldownMs: 100, volume: 0.24 }); }
    playRaySound() { if (typeof sound !== 'undefined') sound.play('reaver_ray', { allowOverlap: true, cooldownMs: 100, volume: 0.2 }); }
    playSplitSound() { if (typeof sound !== 'undefined') sound.play('reaver_split', { allowOverlap: true, cooldownMs: 140, volume: 0.2 }); }
    playFireSound() { if (typeof sound !== 'undefined') sound.play('reaver_fire', { allowOverlap: true, cooldownMs: 220, volume: 0.22 }); }
    playLightningSound() {
        if (typeof sound === 'undefined') return;
        const key = this.volleyIndex % 2 === 0 ? 'reaver_lightning_1' : 'reaver_lightning_2';
        sound.play(key, { allowOverlap: true, cooldownMs: 220, volume: 0.18 });
    }

    spawnWaveRing(count = 18, angleOffset = 0) {
        for (let i = 0; i < count; i++) {
            const angle = angleOffset + (i / count) * Math.PI * 2;
            this.bullets.push({
                id: this.nextBulletId++, type: 'wave', originX: this.x, originY: this.y, x: this.x, y: this.y, angle,
                distance: 0, speed: 1.55 + Math.random() * 0.22, radius: 11 + Math.random() * 2,
                length: 52 + Math.random() * 14, amplitude: 6 + Math.random() * 4, thickness: 3.2 + Math.random() * 0.9,
                wobble: Math.random() * Math.PI * 2, wobbleAmplitude: 4 + Math.random() * 6,
                wobbleSpeed: 0.06 + Math.random() * 0.03, wavePhase: Math.random() * Math.PI * 2,
                waveFrequency: 0.13 + Math.random() * 0.05
            });
        }
        this.emitAuraBurst(this.radius + 8, 0.35);
        this.playWaveSound();
    }

    spawnRayBurst(count = 10, angleOffset = 0) {
        for (let i = 0; i < count; i++) {
            const angle = angleOffset + (i / count) * Math.PI * 2;
            this.bullets.push({
                id: this.nextBulletId++, type: 'ray', originX: this.x, originY: this.y, x: this.x, y: this.y, angle,
                distance: 0, speed: 2.15 + Math.random() * 0.3, width: 4.4, length: 74 + Math.random() * 22
            });
        }
        this.emitAuraBurst(this.radius + 14, 0.45);
        this.playRaySound();
    }

    spawnShardBurst(count = 8, angleOffset = 0) {
        for (let i = 0; i < count; i++) {
            const angle = angleOffset + (i / count) * Math.PI * 2;
            this.bullets.push({
                id: this.nextBulletId++, type: 'shard', x: this.x, y: this.y, angle,
                speed: 4.1 + Math.random() * 0.7, radius: 10, length: 24
            });
        }
        this.playSplitSound();
    }

    spawnTargetedShardVolley() {
        if (typeof player === 'undefined') return;
        const straightDown = Math.random() < 0.5;
        if (straightDown) {
            this.bullets.push({
                id: this.nextBulletId++, type: 'shard', x: this.x, y: this.y + this.radius * 0.25,
                angle: Math.PI / 2, speed: 6 + Math.random() * 0.8, radius: 10, length: 24
            });
            this.playSplitSound();
            return;
        }

        const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
        const arcDirection = Math.random() < 0.5 ? -1 : 1;
        const arcStartAngle = baseAngle - arcDirection * (1.2 + Math.random() * 0.3);
        const arcEndAngle = baseAngle - arcDirection * (0.16 + Math.random() * 0.12);
        this.bullets.push({
            id: this.nextBulletId++, type: 'shard', x: this.x, y: this.y + this.radius * 0.22,
            angle: baseAngle, speed: 5.8 + Math.random() * 1.1, radius: 10, length: 24,
            arcActive: true,
            arcTimer: 0,
            arcDuration: 24 + Math.random() * 10,
            arcRadius: 120 + Math.random() * 90,
            arcStartAngle,
            arcEndAngle,
            originX: this.x,
            originY: this.y + this.radius * 0.22
        });
        this.playSplitSound();
    }
    updatePhaseOne(deltaFrames = 1) {
        const centerX = this.canvas.width * 0.5;
        this.x = centerX + Math.sin(this.phaseTimer * 0.03) * this.canvas.width * 0.08;
        this.y = 112 + Math.sin(this.phaseTimer * 0.042) * 9 + Math.cos(this.phaseTimer * 0.021) * 5;
        this.rotation = Math.PI / 2 + Math.sin(this.phaseTimer * 0.03) * 0.05;
        if (Math.random() < this.getDeltaChance(0.06, deltaFrames)) this.captureEcho();

        const previousAttackTimer = this.attackTimer;
        this.attackTimer += deltaFrames;

        if (this.phaseFrameTimer <= this.attackOneFireFrames) {
            const waveTriggers = this.countIntervalTriggers(previousAttackTimer, this.attackTimer, 30);
            for (let i = 0; i < waveTriggers; i++) {
                const offset = (this.volleyIndex * 0.13) % (Math.PI * 2);
                this.spawnWaveRing(24, offset);
                this.volleyIndex += 1;
            }

            const rayTriggers = this.countIntervalTriggers(previousAttackTimer, this.attackTimer, 58);
            for (let i = 0; i < rayTriggers; i++) {
                const offset = (this.volleyIndex * 0.21 + Math.PI / 18) % (Math.PI * 2);
                this.spawnRayBurst(12, offset);
                this.volleyIndex += 1;
            }

            const shardTriggers = this.countIntervalTriggers(previousAttackTimer, this.attackTimer, 44);
            for (let i = 0; i < shardTriggers; i++) {
                const offset = (this.volleyIndex * 0.16 + Math.PI / 12) % (Math.PI * 2);
                this.spawnShardBurst(11, offset);
                this.volleyIndex += 1;
            }
        }

        if (this.phaseFrameTimer >= this.attackOneTotalFrames) this.startPhaseTwo();
    }

    startPhaseTwo() {
        this.attackPhase = 2;
        this.phaseFrameTimer = 0;
        this.attackTimer = 0;
        this.phaseTwoShardTimer = 0;
        this.phaseTwoRushComplete = false;

        const px = typeof player !== 'undefined' ? player.x : this.canvas.width * 0.5;
        const py = typeof player !== 'undefined' ? player.y : this.canvas.height * 0.74;
        this.lockTargetX = px;
        this.lockTargetY = py - 180;

        this.storms = [];
        const stormCenterY = this.canvas.height * 0.43;
        const baseRadiusX = this.canvas.width * 0.28;
        const baseRadiusY = this.canvas.height * 0.2;
        for (let i = 0; i < 4; i++) {
            this.storms.push({
                id: this.nextEffectId++, angle: (i / 4) * Math.PI * 2, speed: 0.01 + i * 0.0014,
                radiusX: baseRadiusX + i * this.canvas.width * 0.025,
                radiusY: baseRadiusY + i * this.canvas.height * 0.018,
                centerX: this.canvas.width * 0.5, centerY: stormCenterY,
                x: this.canvas.width * 0.5, y: stormCenterY, spin: Math.random() * Math.PI * 2,
                fireTimer: i * 22, fireInterval: 80 + i * 7, size: 112 + i * 10, volleyOffset: i * 0.45
            });
        }

        this.stormTelegraphs = [];
        this.emitAuraBurst(this.radius + 18, 0.58);
        this.playFireSound();
    }

    spawnStormTelegraph(storm) {
        const length = 420;
        const width = 46;
        const baseAngle = storm.angle + storm.volleyOffset;
        for (let i = 0; i < 5; i++) {
            this.stormTelegraphs.push({
                id: this.nextEffectId++, x: storm.x, y: storm.y,
                angle: baseAngle + (i / 5) * Math.PI * 2,
                length, width, timer: 0, chargeFrames: 24, lingerFrames: 12, fired: false
            });
        }
        this.playLightningSound();
    }

    buildLightningPath(startX, startY, angle, length, maxOffset, steps = 10) {
        const points = [{ x: startX, y: startY }];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const perpCos = Math.cos(angle + Math.PI / 2);
        const perpSin = Math.sin(angle + Math.PI / 2);
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const along = length * t;
            const jitter = (Math.random() * 2 - 1) * maxOffset * (1 - t * 0.75);
            points.push({
                x: startX + cos * along + perpCos * jitter,
                y: startY + sin * along + perpSin * jitter
            });
        }
        return points;
    }

    spawnLightningFromTelegraph(telegraph) {
        const maxOffset = telegraph.width * 0.34;
        const mainPath = this.buildLightningPath(telegraph.x, telegraph.y, telegraph.angle, telegraph.length, maxOffset, 11);
        const segments = [{ points: mainPath, width: 12.5, alpha: 1 }];

        const branchCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < branchCount; i++) {
            const start = mainPath[3 + Math.floor(Math.random() * 5)];
            const branchAngle = telegraph.angle + (Math.random() > 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.45);
            const branchLength = telegraph.length * (0.24 + Math.random() * 0.24);
            const branchPath = this.buildLightningPath(start.x, start.y, branchAngle, branchLength, maxOffset * 0.55, 7);
            segments.push({ points: branchPath, width: 7.2, alpha: 0.78 });
        }

        this.bullets.push({
            id: this.nextBulletId++, type: 'lightning', x: telegraph.x, y: telegraph.y,
            angle: telegraph.angle, length: telegraph.length, width: telegraph.width,
            life: 0, maxLife: 16, segments
        });
    }

    updateStorms(deltaFrames = 1) {
        this.storms.forEach((storm) => {
            storm.angle += storm.speed * deltaFrames;
            storm.spin += 0.04 * deltaFrames;
            storm.x = storm.centerX + Math.cos(storm.angle) * storm.radiusX;
            storm.y = storm.centerY + Math.sin(storm.angle * 1.25) * storm.radiusY;
            storm.fireTimer += deltaFrames;
            while (storm.fireTimer >= storm.fireInterval) {
                storm.fireTimer -= storm.fireInterval;
                this.spawnStormTelegraph(storm);
            }
        });
    }

    updateStormTelegraphs(deltaFrames = 1) {
        this.stormTelegraphs.forEach((telegraph) => {
            telegraph.timer += deltaFrames;
            if (!telegraph.fired && telegraph.timer >= telegraph.chargeFrames) {
                telegraph.fired = true;
                this.spawnLightningFromTelegraph(telegraph);
            }
        });
        this.stormTelegraphs = this.stormTelegraphs.filter((t) => t.timer < t.chargeFrames + t.lingerFrames);
    }

    updatePhaseTwo(deltaFrames = 1) {
        this.lockTargetX = typeof player !== 'undefined' ? player.x : this.lockTargetX;
        this.lockTargetY = typeof player !== 'undefined' ? player.y - 180 : this.lockTargetY;

        if (!this.phaseTwoRushComplete) {
            this.phaseTwoRushComplete = this.rush(this.lockTargetX, this.lockTargetY, 0.13, deltaFrames);
        } else {
            const shake = 2.6;
            this.rush(this.lockTargetX, this.lockTargetY, 0.3, deltaFrames);
            this.x += Math.sin(this.phaseTimer * 0.31) * shake + (Math.random() - 0.5) * 1.4;
            this.y += Math.cos(this.phaseTimer * 0.28) * shake + (Math.random() - 0.5) * 1.4;
        }
        this.rotation = Math.PI / 2 + Math.sin(this.phaseTimer * 0.09) * 0.03;
        if (Math.random() < this.getDeltaChance(0.08, deltaFrames)) this.captureEcho();

        this.updateStorms(deltaFrames);
        this.updateStormTelegraphs(deltaFrames);

        this.phaseTwoShardTimer += deltaFrames;
        while (this.phaseTwoShardTimer >= 30) {
            this.phaseTwoShardTimer -= 30;
            this.spawnTargetedShardVolley();
        }
    }

    updateBullets(deltaFrames = 1) {
        this.bullets.forEach((bullet) => {
            if (bullet.type === 'lightning') {
                bullet.life += deltaFrames;
                return;
            }

            bullet.distance ??= 0;
            bullet.distance += bullet.speed * deltaFrames;

            if (bullet.type === 'wave') {
                bullet.wobble += bullet.wobbleSpeed * deltaFrames;
                bullet.wavePhase += bullet.waveFrequency * deltaFrames;
                const wobbleOffset = Math.sin(bullet.wobble) * bullet.wobbleAmplitude;
                bullet.x = bullet.originX + Math.cos(bullet.angle) * bullet.distance + Math.cos(bullet.angle + Math.PI / 2) * wobbleOffset;
                bullet.y = bullet.originY + Math.sin(bullet.angle) * bullet.distance + Math.sin(bullet.angle + Math.PI / 2) * wobbleOffset;
                return;
            }

            if (bullet.type === 'ray') {
                bullet.x = bullet.originX + Math.cos(bullet.angle) * bullet.distance;
                bullet.y = bullet.originY + Math.sin(bullet.angle) * bullet.distance;
                return;
            }

            if (bullet.type === 'shard' && bullet.arcActive) {
                bullet.arcTimer += deltaFrames;
                const t = Math.min(1, bullet.arcTimer / bullet.arcDuration);
                const eased = 1 - Math.pow(1 - t, 2);
                const currentAngle = bullet.arcStartAngle + (bullet.arcEndAngle - bullet.arcStartAngle) * eased;
                const currentRadius = 8 + bullet.arcRadius * eased;
                bullet.x = bullet.originX + Math.cos(currentAngle) * currentRadius;
                bullet.y = bullet.originY + Math.sin(currentAngle) * currentRadius;

                if (t >= 1) {
                    bullet.arcActive = false;
                    if (typeof player !== 'undefined') {
                        bullet.angle = Math.atan2(player.y - bullet.y, player.x - bullet.x);
                    }
                }
                return;
            }

            bullet.x += Math.cos(bullet.angle) * bullet.speed * deltaFrames;
            bullet.y += Math.sin(bullet.angle) * bullet.speed * deltaFrames;
        });

        this.bullets = this.bullets.filter((bullet) => {
            if (bullet.type === 'lightning') return bullet.life < bullet.maxLife;
            const margin = bullet.type === 'ray' ? 180 : 140;
            return bullet.x + margin > 0 && bullet.x - margin < this.canvas.width && bullet.y + margin > 0 && bullet.y - margin < this.canvas.height;
        });
    }

    update(deltaFrames = 1) {
        if (!this.active) return;
        this.phaseTimer += deltaFrames;
        this.phaseFrameTimer += deltaFrames;
        this.updateHealthShake(deltaFrames);
        this.updateEffects(deltaFrames);
        if (this.attackPhase === 1) this.updatePhaseOne(deltaFrames);
        else this.updatePhaseTwo(deltaFrames);
        this.updateBullets(deltaFrames);
    }
    drawBoss() {
        const pulse = (Math.sin(this.effectTime * 1.8) + 1) / 2;

        this.echoes.forEach((echo, index) => {
            this.ctx.save();
            this.ctx.globalAlpha = echo.alpha * (1 - index / 12);
            this.ctx.translate(echo.x, echo.y);
            this.ctx.rotate(this.rotation);
            this.ctx.scale(echo.scale, echo.scale);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            this.ctx.clip();
            if (this.sprite.complete && this.sprite.naturalWidth > 0) this.ctx.drawImage(this.sprite, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
            else {
                this.ctx.fillStyle = '#8c43ff';
                this.ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
            }
            this.ctx.restore();
        });

        this.auraBursts.forEach((burst) => {
            this.ctx.beginPath();
            this.ctx.arc(this.x, this.y, burst.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(186, 110, 255, ${burst.alpha})`;
            this.ctx.lineWidth = burst.lineWidth;
            this.ctx.stroke();
        });

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius + 18 + pulse * 10, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(182, 94, 255, ${0.18 + pulse * 0.16})`;
        this.ctx.fill();
        this.ctx.restore();

        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.rotation);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        this.ctx.clip();
        this.ctx.shadowColor = `rgba(196, 116, 255, ${0.55 + pulse * 0.18})`;
        this.ctx.shadowBlur = 26 + pulse * 10;
        if (this.sprite.complete && this.sprite.naturalWidth > 0) this.ctx.drawImage(this.sprite, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        else {
            this.ctx.fillStyle = '#8c43ff';
            this.ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        }
        this.ctx.restore();

        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius + 1.5, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(232, 208, 255, 0.72)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }

    drawStormsAndTelegraphs() {
        this.storms.forEach((storm) => {
            const gradient = this.ctx.createRadialGradient(storm.x, storm.y, storm.size * 0.16, storm.x, storm.y, storm.size);
            gradient.addColorStop(0, 'rgba(246, 238, 255, 0.95)');
            gradient.addColorStop(0.35, 'rgba(174, 118, 255, 0.5)');
            gradient.addColorStop(0.7, 'rgba(76, 36, 130, 0.34)');
            gradient.addColorStop(1, 'rgba(17, 8, 35, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(storm.x, storm.y, storm.size, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.save();
            this.ctx.translate(storm.x, storm.y);
            this.ctx.rotate(storm.spin);
            this.ctx.strokeStyle = 'rgba(206, 171, 255, 0.4)';
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, storm.size * (0.42 + i * 0.19), i * 0.7, i * 0.7 + Math.PI * 1.35);
                this.ctx.stroke();
            }
            this.ctx.restore();
        });

        this.stormTelegraphs.forEach((telegraph) => {
            const charge = Math.min(1, telegraph.timer / telegraph.chargeFrames);
            const fadeOut = telegraph.fired ? Math.max(0, 1 - (telegraph.timer - telegraph.chargeFrames) / telegraph.lingerFrames) : 1;
            const alpha = (0.2 + charge * 0.45) * fadeOut;
            const headX = telegraph.x + Math.cos(telegraph.angle) * telegraph.length;
            const headY = telegraph.y + Math.sin(telegraph.angle) * telegraph.length;

            this.ctx.save();
            this.ctx.strokeStyle = `rgba(255, 70, 70, ${alpha})`;
            this.ctx.lineWidth = telegraph.width * (0.68 + charge * 0.32);
            this.ctx.lineCap = 'round';
            this.ctx.shadowColor = `rgba(255, 75, 75, ${alpha * 0.85})`;
            this.ctx.shadowBlur = 16;
            this.ctx.beginPath();
            this.ctx.moveTo(telegraph.x, telegraph.y);
            this.ctx.lineTo(headX, headY);
            this.ctx.stroke();
            this.ctx.restore();
        });
    }

    drawLightningBullet(bullet) {
        const fade = 1 - bullet.life / bullet.maxLife;
        bullet.segments.forEach((segment, index) => {
            this.ctx.save();
            this.ctx.strokeStyle = index === 0
                ? `rgba(255, 245, 255, ${0.96 * fade * segment.alpha})`
                : `rgba(207, 170, 255, ${0.72 * fade * segment.alpha})`;
            this.ctx.lineWidth = segment.width * (0.7 + fade * 0.35);
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.shadowColor = `rgba(224, 188, 255, ${0.8 * fade})`;
            this.ctx.shadowBlur = 10 + fade * 8;
            this.ctx.beginPath();
            segment.points.forEach((point, pointIndex) => {
                if (pointIndex === 0) this.ctx.moveTo(point.x, point.y);
                else this.ctx.lineTo(point.x, point.y);
            });
            this.ctx.stroke();
            this.ctx.restore();
        });
    }

    drawBullets() {
        this.drawStormsAndTelegraphs();

        this.bullets.forEach((bullet) => {
            if (bullet.type === 'lightning') {
                this.drawLightningBullet(bullet);
                return;
            }

            if (bullet.type === 'wave') {
                this.ctx.save();
                this.ctx.strokeStyle = '#c889ff';
                this.ctx.lineWidth = bullet.thickness;
                this.ctx.beginPath();
                for (let i = 0; i <= 14; i++) {
                    const t = i / 14;
                    const localX = (t - 0.5) * bullet.length;
                    const localY = Math.sin(t * Math.PI * 4 + bullet.wavePhase) * bullet.amplitude;
                    const cos = Math.cos(bullet.angle);
                    const sin = Math.sin(bullet.angle);
                    const x = bullet.x + localX * cos - localY * sin;
                    const y = bullet.y + localX * sin + localY * cos;
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.stroke();
                this.ctx.restore();
                return;
            }

            if (bullet.type === 'shard') {
                this.ctx.save();
                this.ctx.translate(bullet.x, bullet.y);
                this.ctx.rotate(bullet.angle);
                if (this.shardSprite.complete && this.shardSprite.naturalWidth > 0) this.ctx.drawImage(this.shardSprite, -12, -18, 24, 36);
                else {
                    this.ctx.fillStyle = '#c889ff';
                    this.ctx.fillRect(-8, -14, 16, 28);
                }
                this.ctx.restore();
                return;
            }

            const tailX = bullet.x - Math.cos(bullet.angle) * bullet.length;
            const tailY = bullet.y - Math.sin(bullet.angle) * bullet.length;
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(182, 104, 255, 0.95)';
            this.ctx.lineWidth = bullet.width;
            this.ctx.lineCap = 'round';
            this.ctx.shadowColor = 'rgba(208, 145, 255, 0.5)';
            this.ctx.shadowBlur = 14;
            this.ctx.beginPath();
            this.ctx.moveTo(tailX, tailY);
            this.ctx.lineTo(bullet.x, bullet.y);
            this.ctx.stroke();
            this.ctx.restore();
        });
    }
    drawHealthBar() {
        const barX = (this.canvas.width - this.healthBarWidth) / 2;
        const healthPercentage = this.health / this.maxHealth;
        const shakeX = Math.random() * this.healthShake * (Math.random() > 0.5 ? 1 : -1);
        const shakeY = Math.random() * this.healthShake * (Math.random() > 0.5 ? 1 : -1);

        this.ctx.fillStyle = 'rgba(8, 0, 18, 0.82)';
        this.ctx.fillRect(barX - 5 + shakeX, this.healthBarY - 5 + shakeY, this.healthBarWidth + 10, this.healthBarHeight + 10);

        this.ctx.fillStyle = 'rgba(66, 28, 108, 0.6)';
        this.ctx.fillRect(barX + shakeX, this.healthBarY + shakeY, this.healthBarWidth, this.healthBarHeight);

        const gradient = this.ctx.createLinearGradient(barX, this.healthBarY, barX + this.healthBarWidth * healthPercentage, this.healthBarY);
        gradient.addColorStop(0, '#6f1fff');
        gradient.addColorStop(1, '#d2a6ff');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(barX + shakeX, this.healthBarY + shakeY, this.healthBarWidth * healthPercentage, this.healthBarHeight);
    }

    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
    }

    checkLightningCollision(bullet, player) {
        for (const segment of bullet.segments) {
            for (let i = 1; i < segment.points.length; i++) {
                const p1 = segment.points[i - 1];
                const p2 = segment.points[i];
                const distance = this.pointToSegmentDistance(player.x, player.y, p1.x, p1.y, p2.x, p2.y);
                if (distance < player.radius + segment.width * 0.45) return true;
            }
        }
        return false;
    }

    checkCollisionWithPlayer(player) {
        let collision = false;
        this.bullets = this.bullets.filter((bullet) => {
            if (bullet.type === 'lightning') {
                if (this.checkLightningCollision(bullet, player)) collision = true;
                return bullet.life < bullet.maxLife;
            }

            if (bullet.type === 'wave' || bullet.type === 'shard') {
                const dx = bullet.x - player.x;
                const dy = bullet.y - player.y;
                if (Math.sqrt(dx * dx + dy * dy) < player.radius + bullet.radius) {
                    collision = true;
                    return false;
                }
                return true;
            }

            const tailX = bullet.x - Math.cos(bullet.angle) * bullet.length;
            const tailY = bullet.y - Math.sin(bullet.angle) * bullet.length;
            const distance = this.pointToSegmentDistance(player.x, player.y, tailX, tailY, bullet.x, bullet.y);
            if (distance < player.radius + bullet.width * 0.5) {
                collision = true;
                return false;
            }
            return true;
        });

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        if (Math.sqrt(dx * dx + dy * dy) < player.radius + this.radius) collision = true;
        return collision;
    }

    setupPixiScene(renderer) {
        if (!renderer.initialized) return;
        this._pixiRoot = renderer.ensureContainer(this, 'root', 0);
        this._pixiStorms = renderer.ensureContainer(this, 'storms', 4);
        this._pixiEchoes = renderer.ensureContainer(this, 'echoes', 5);
        this._pixiAuras = renderer.ensureContainer(this, 'auras', 12);
        this._pixiTelegraphs = renderer.ensureContainer(this, 'telegraphs', 18);
        this._pixiProjectiles = renderer.ensureContainer(this, 'projectiles', 20);
        this._pixiBoss = renderer.ensureContainer(this, 'boss', 30);
    }

    renderWithPixi(renderer) {
        this.setupPixiScene(renderer);

        const bossTexture = renderer.getTextureFromImage(this.sprite);
        const shardTexture = renderer.getTextureFromImage(this.shardSprite);
        const rayTexture = renderer.getRayTexture();
        const auraTexture = renderer.getAuraTexture();
        const stormTexture = renderer.getStormTexture();
        const stormCoreTexture = renderer.getStormCoreTexture();
        const backgroundTexture = renderer.getBackgroundTexture(this.canvas.width, this.canvas.height);
        const glowTexture = renderer.getGlowTexture();
        const pulse = (Math.sin(this.effectTime * 0.75) + 1) / 2;

        renderer.syncDisplayObjects(
            this._pixiRoot,
            [{ id: 'background', kind: 'background' }, { id: 'glow', kind: 'glow' }],
            (item) => item.id,
            (item) => {
                const sprite = new PIXI.Sprite(item.kind === 'background' ? backgroundTexture : glowTexture ?? PIXI.Texture.EMPTY);
                sprite.anchor.set(0.5);
                return sprite;
            },
            (sprite, item) => {
                if (item.kind === 'background') {
                    sprite.texture = backgroundTexture;
                    sprite.position.set(this.canvas.width * 0.5, this.canvas.height * 0.5);
                    sprite.width = this.canvas.width;
                    sprite.height = this.canvas.height;
                    sprite.alpha = 1;
                    return;
                }
                sprite.texture = glowTexture;
                sprite.position.set(this.canvas.width * 0.5, this.canvas.height * 0.3);
                sprite.width = this.canvas.width * 1.1;
                sprite.height = this.canvas.height * 0.9;
                sprite.alpha = 0.76 + pulse * 0.18;
                sprite.scale.set(1 + pulse * 0.04);
            }
        );

        renderer.syncDisplayObjects(
            this._pixiStorms,
            this.storms,
            (storm) => storm.id,
            () => {
                const container = new PIXI.Container();
                const outer = new PIXI.Sprite(stormTexture ?? PIXI.Texture.EMPTY);
                outer.anchor.set(0.5);
                outer.blendMode = 'add';
                const core = new PIXI.Sprite(stormCoreTexture ?? PIXI.Texture.EMPTY);
                core.anchor.set(0.5);
                core.blendMode = 'add';
                container.addChild(outer, core);
                container._outer = outer;
                container._core = core;
                return container;
            },
            (container, storm) => {
                container.position.set(storm.x, storm.y);
                container._outer.texture = stormTexture;
                container._outer.width = storm.size * 2.1;
                container._outer.height = storm.size * 2.1;
                container._outer.rotation = storm.spin;
                container._outer.alpha = 0.78;
                container._core.texture = stormCoreTexture;
                container._core.width = storm.size * 0.95;
                container._core.height = storm.size * 0.95;
                container._core.rotation = -storm.spin * 1.6;
                container._core.alpha = 0.82;
            }
        );
        renderer.syncDisplayObjects(
            this._pixiEchoes,
            this.echoes,
            (echo) => echo.id,
            () => {
                const sprite = new PIXI.Sprite(bossTexture ?? PIXI.Texture.EMPTY);
                sprite.anchor.set(0.5);
                sprite.blendMode = 'add';
                return sprite;
            },
            (sprite, echo) => {
                if (bossTexture) sprite.texture = bossTexture;
                sprite.position.set(echo.x, echo.y);
                sprite.rotation = this.rotation;
                sprite.scale.set(echo.scale);
                sprite.alpha = echo.alpha;
                sprite.width = this.radius * 2;
                sprite.height = this.radius * 2;
            }
        );

        renderer.syncDisplayObjects(
            this._pixiAuras,
            this.auraBursts,
            (burst) => burst.id,
            () => {
                const sprite = new PIXI.Sprite(auraTexture ?? PIXI.Texture.EMPTY);
                sprite.anchor.set(0.5);
                sprite.blendMode = 'add';
                return sprite;
            },
            (sprite, burst) => {
                sprite.texture = auraTexture;
                sprite.position.set(this.x, this.y);
                const diameter = burst.radius * 2;
                sprite.width = diameter;
                sprite.height = diameter;
                sprite.alpha = burst.alpha;
            }
        );

        renderer.syncDisplayObjects(
            this._pixiTelegraphs,
            this.stormTelegraphs,
            (telegraph) => telegraph.id,
            () => {
                const sprite = new PIXI.Sprite(rayTexture ?? PIXI.Texture.EMPTY);
                sprite.anchor.set(0.5);
                sprite.blendMode = 'normal';
                sprite.tint = 0xff5353;
                return sprite;
            },
            (sprite, telegraph) => {
                sprite.texture = rayTexture;
                const charge = Math.min(1, telegraph.timer / telegraph.chargeFrames);
                const fadeOut = telegraph.fired ? Math.max(0, 1 - (telegraph.timer - telegraph.chargeFrames) / telegraph.lingerFrames) : 1;
                sprite.position.set(
                    telegraph.x + Math.cos(telegraph.angle) * telegraph.length * 0.5,
                    telegraph.y + Math.sin(telegraph.angle) * telegraph.length * 0.5
                );
                sprite.rotation = telegraph.angle;
                sprite.width = telegraph.length;
                sprite.height = telegraph.width * (0.72 + charge * 0.28);
                sprite.alpha = (0.24 + charge * 0.45) * fadeOut;
            }
        );

        renderer.syncDisplayObjects(
            this._pixiProjectiles,
            this.bullets,
            (bullet) => bullet.id,
            (bullet) => {
                if (bullet.type === 'lightning') {
                    const graphic = new PIXI.Graphics();
                    graphic.blendMode = 'add';
                    return graphic;
                }
                const texture = bullet.type === 'wave' ? renderer.getWaveTexture(0) : bullet.type === 'ray' ? rayTexture : shardTexture;
                const sprite = new PIXI.Sprite(texture ?? PIXI.Texture.EMPTY);
                sprite.anchor.set(0.5);
                sprite.blendMode = 'add';
                return sprite;
            },
            (display, bullet) => {
                if (bullet.type === 'lightning') {
                    const graphic = display;
                    graphic.clear();
                    const fade = 1 - bullet.life / bullet.maxLife;
                    bullet.segments.forEach((segment, index) => {
                        graphic.setStrokeStyle({
                            width: segment.width * (0.7 + fade * 0.35),
                            color: index === 0 ? 0xfff7ff : 0xcfafff,
                            alpha: (index === 0 ? 0.95 : 0.7) * fade * segment.alpha,
                            cap: 'round',
                            join: 'round'
                        });
                        segment.points.forEach((point, pointIndex) => {
                            if (pointIndex === 0) graphic.moveTo(point.x, point.y);
                            else graphic.lineTo(point.x, point.y);
                        });
                        graphic.stroke();
                    });
                    return;
                }

                if (bullet.type === 'wave') {
                    const sprite = display;
                    const phaseBucketCount = 8;
                    const normalized = ((bullet.wavePhase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    const phaseIndex = Math.floor((normalized / (Math.PI * 2)) * phaseBucketCount);
                    const phase = (phaseIndex / phaseBucketCount) * Math.PI * 2;
                    sprite.texture = renderer.getWaveTexture(phase);
                    sprite.position.set(bullet.x, bullet.y + Math.sin(bullet.wavePhase) * 3.6);
                    sprite.rotation = bullet.angle + Math.sin(bullet.wavePhase * 0.9) * 0.05;
                    sprite.width = bullet.length;
                    sprite.height = bullet.amplitude * 3.6 + bullet.thickness * 4.1;
                    sprite.alpha = 0.82 + Math.sin(bullet.wavePhase * 1.2) * 0.08;
                    return;
                }

                if (bullet.type === 'ray') {
                    const sprite = display;
                    sprite.texture = rayTexture;
                    sprite.position.set(
                        bullet.x - Math.cos(bullet.angle) * bullet.length * 0.5,
                        bullet.y - Math.sin(bullet.angle) * bullet.length * 0.5
                    );
                    sprite.rotation = bullet.angle;
                    sprite.width = bullet.length;
                    sprite.height = bullet.width * 2.4;
                    sprite.alpha = 0.9;
                    return;
                }

                const sprite = display;
                if (shardTexture) sprite.texture = shardTexture;
                sprite.position.set(bullet.x, bullet.y);
                sprite.rotation = bullet.angle;
                sprite.width = 24;
                sprite.height = 36;
                sprite.alpha = 1;
            }
        );

        renderer.syncDisplayObjects(
            this._pixiBoss,
            [{ id: 'boss' }],
            (item) => item.id,
            () => {
                const sprite = new PIXI.Sprite(bossTexture ?? PIXI.Texture.EMPTY);
                sprite.anchor.set(0.5);
                sprite.blendMode = 'add';
                return sprite;
            },
            (sprite) => {
                if (bossTexture) sprite.texture = bossTexture;
                sprite.position.set(this.x, this.y);
                sprite.rotation = this.rotation;
                sprite.width = this.radius * 2;
                sprite.height = this.radius * 2;
                sprite.alpha = 1;
            }
        );
    }

    teardownPixiScene() {
        if (!this._pixiScene) return;
        Object.values(this._pixiScene).forEach((container) => {
            container.removeChildren();
            container.destroy({ children: true });
        });
        this._pixiScene = null;
        this._pixiRoot = null;
        this._pixiStorms = null;
        this._pixiEchoes = null;
        this._pixiAuras = null;
        this._pixiTelegraphs = null;
        this._pixiProjectiles = null;
        this._pixiBoss = null;
    }
}
