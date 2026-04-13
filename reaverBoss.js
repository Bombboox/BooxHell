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
        gradient.addColorStop(0, '#090013');
        gradient.addColorStop(0.45, '#1b0831');
        gradient.addColorStop(1, '#040008');
        this.ctx.fillStyle = gradient;
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
        if (this.echoes.length > 10) {
            this.echoes.pop();
        }
    }

    updateEffects(deltaFrames = 1) {
        this.effectTime += 0.04 * deltaFrames;
        this.auraBursts = this.auraBursts.filter(burst => burst.alpha > 0.01);
        this.auraBursts.forEach(burst => {
            burst.radius += 2.2 * deltaFrames;
            burst.alpha -= 0.012 * deltaFrames;
        });

        this.echoes = this.echoes.filter(echo => echo.alpha > 0.01);
        this.echoes.forEach(echo => {
            echo.scale += 0.012 * deltaFrames;
            echo.alpha -= 0.015 * deltaFrames;
        });
    }

    move(deltaFrames = 1) {
        const time = this.phaseTimer;
        this.x = this.canvas.width / 2 + Math.sin(time * 0.022) * this.canvas.width * 0.26;
        this.y = 108 + Math.sin(time * 0.05) * 16 + Math.cos(time * 0.018) * 8;
        this.rotation = Math.PI / 2;

        if (Math.random() < this.getDeltaChance(0.08, deltaFrames)) {
            this.captureEcho();
        }
    }

    playWaveSound() {
        if (typeof sound === 'undefined') return;
        sound.play('reaver_wave', { allowOverlap: true, cooldownMs: 90, volume: 0.25 });
    }

    playRaySound() {
        if (typeof sound === 'undefined') return;
        sound.play('reaver_ray', { allowOverlap: true, cooldownMs: 90, volume: 0.2 });
    }

    playSplitSound() {
        if (typeof sound === 'undefined') return;
        sound.play('reaver_split', { allowOverlap: true, cooldownMs: 140, volume: 0.2 });
    }

    playFireSound() {
        if (typeof sound === 'undefined') return;
        sound.play('reaver_fire', { allowOverlap: true, cooldownMs: 220, volume: 0.22 });
    }

    playLightningSound() {
        if (typeof sound === 'undefined') return;
        const key = this.volleyIndex % 2 === 0 ? 'reaver_lightning_1' : 'reaver_lightning_2';
        sound.play(key, { allowOverlap: true, cooldownMs: 220, volume: 0.18 });
    }

    spawnWaveRing(count = 36, angleOffset = 0) {
        for (let i = 0; i < count; i++) {
            const angle = angleOffset + (i / count) * Math.PI * 2;
            this.bullets.push({
                id: this.nextBulletId++,
                type: 'wave',
                originX: this.x,
                originY: this.y,
                x: this.x,
                y: this.y,
                angle,
                distance: 0,
                speed: 1.7 + Math.random() * 0.35,
                radius: 12 + Math.random() * 2,
                length: 54 + Math.random() * 18,
                amplitude: 7 + Math.random() * 5,
                thickness: 4 + Math.random(),
                wobble: Math.random() * Math.PI * 2,
                wobbleAmplitude: 7 + Math.random() * 8,
                wobbleSpeed: 0.08 + Math.random() * 0.03,
                wavePhase: Math.random() * Math.PI * 2,
                waveFrequency: 0.15 + Math.random() * 0.05
            });
        }
        this.emitAuraBurst(this.radius + 8, 0.35);
        this.playWaveSound();
    }

    spawnRayBurst(count = 26, angleOffset = 0) {
        for (let i = 0; i < count; i++) {
            const angle = angleOffset + (i / count) * Math.PI * 2;
            this.bullets.push({
                id: this.nextBulletId++,
                type: 'ray',
                originX: this.x,
                originY: this.y,
                x: this.x,
                y: this.y,
                angle,
                distance: 0,
                speed: 2.4 + Math.random() * 0.35,
                width: 5,
                length: 82 + Math.random() * 26
            });
        }
        this.emitAuraBurst(this.radius + 14, 0.48);
        this.playRaySound();
    }

    spawnShardBurst(count = 14, angleOffset = 0) {
        for (let i = 0; i < count; i++) {
            const angle = angleOffset + (i / count) * Math.PI * 2;
            this.bullets.push({
                id: this.nextBulletId++,
                type: 'shard',
                x: this.x,
                y: this.y,
                angle,
                speed: 4.1 + Math.random() * 0.7,
                radius: 10,
                length: 24
            });
        }
        this.playSplitSound();
    }

    shoot(deltaFrames = 1) {
        const previousAttackTimer = this.attackTimer;
        this.attackTimer += deltaFrames;

        const waveTriggers = this.countIntervalTriggers(previousAttackTimer, this.attackTimer, 30);
        for (let i = 0; i < waveTriggers; i++) {
            const offset = (this.volleyIndex * 0.11) % (Math.PI * 2);
            this.spawnWaveRing(24, offset);
            this.volleyIndex += 1;
        }

        const rayTriggers = this.countIntervalTriggers(previousAttackTimer, this.attackTimer, 54);
        for (let i = 0; i < rayTriggers; i++) {
            const offset = ((this.volleyIndex * 0.17) + Math.PI / 28) % (Math.PI * 2);
            this.spawnRayBurst(12, offset);
            this.volleyIndex += 1;
        }

        const shardTriggers = this.countIntervalTriggers(previousAttackTimer, this.attackTimer, 42);
        for (let i = 0; i < shardTriggers; i++) {
            const offset = (this.volleyIndex * 0.13 + Math.PI / 18) % (Math.PI * 2);
            this.spawnShardBurst(10, offset);
            this.volleyIndex += 1;
        }

        const specialTriggers = this.countIntervalTriggers(previousAttackTimer, this.attackTimer, 132);
        for (let i = 0; i < specialTriggers; i++) {
            const offset = (this.volleyIndex * 0.09) % (Math.PI * 2);
            this.spawnWaveRing(34, offset);
            this.spawnRayBurst(14, offset + Math.PI / 34);
            this.spawnShardBurst(12, offset + Math.PI / 20);
            this.playFireSound();
            this.playLightningSound();
            this.volleyIndex += 3;
        }
    }

    updateBullets(deltaFrames = 1) {
        this.bullets.forEach(bullet => {
            bullet.distance += bullet.speed * deltaFrames;

            if (bullet.type === 'wave') {
                bullet.wobble += bullet.wobbleSpeed * deltaFrames;
                bullet.wavePhase += bullet.waveFrequency * deltaFrames;
                const wobbleOffset = Math.sin(bullet.wobble) * bullet.wobbleAmplitude;
                const forwardX = Math.cos(bullet.angle) * bullet.distance;
                const forwardY = Math.sin(bullet.angle) * bullet.distance;
                const sidewaysX = Math.cos(bullet.angle + Math.PI / 2) * wobbleOffset;
                const sidewaysY = Math.sin(bullet.angle + Math.PI / 2) * wobbleOffset;
                bullet.x = bullet.originX + forwardX + sidewaysX;
                bullet.y = bullet.originY + forwardY + sidewaysY;
            } else if (bullet.type === 'ray') {
                bullet.x = bullet.originX + Math.cos(bullet.angle) * bullet.distance;
                bullet.y = bullet.originY + Math.sin(bullet.angle) * bullet.distance;
            } else if (bullet.type === 'shard') {
                bullet.x += Math.cos(bullet.angle) * bullet.speed * deltaFrames;
                bullet.y += Math.sin(bullet.angle) * bullet.speed * deltaFrames;
            }
        });

        this.bullets = this.bullets.filter(bullet =>
            bullet.x + 120 > 0 &&
            bullet.x - 120 < this.canvas.width &&
            bullet.y + 120 > 0 &&
            bullet.y - 120 < this.canvas.height
        );
    }

    update(deltaFrames = 1) {
        if (!this.active) return;

        this.phaseTimer += deltaFrames;
        this.updateHealthShake(deltaFrames);
        this.updateEffects(deltaFrames);
        this.move(deltaFrames);
        this.shoot(deltaFrames);
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
            if (this.sprite.complete && this.sprite.naturalWidth > 0) {
                this.ctx.drawImage(this.sprite, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
            } else {
                this.ctx.fillStyle = '#8c43ff';
                this.ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
            }
            this.ctx.restore();
        });

        this.auraBursts.forEach(burst => {
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
        if (this.sprite.complete && this.sprite.naturalWidth > 0) {
            this.ctx.drawImage(this.sprite, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
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

    drawBullets() {
        this.bullets.forEach(bullet => {
            if (bullet.type === 'wave') {
                this.ctx.save();
                this.ctx.strokeStyle = '#c889ff';
                this.ctx.lineWidth = bullet.thickness;
                this.ctx.beginPath();
                for (let i = 0; i <= 12; i++) {
                    const t = i / 12;
                    const localX = (t - 0.5) * bullet.length;
                    const localY = Math.sin(t * Math.PI * 4) * bullet.amplitude;
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
                if (this.shardSprite.complete && this.shardSprite.naturalWidth > 0) {
                    this.ctx.drawImage(this.shardSprite, -12, -18, 24, 36);
                } else {
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
        this.ctx.fillRect(
            barX - 5 + shakeX,
            this.healthBarY - 5 + shakeY,
            this.healthBarWidth + 10,
            this.healthBarHeight + 10
        );

        this.ctx.fillStyle = 'rgba(66, 28, 108, 0.6)';
        this.ctx.fillRect(
            barX + shakeX,
            this.healthBarY + shakeY,
            this.healthBarWidth,
            this.healthBarHeight
        );

        const gradient = this.ctx.createLinearGradient(
            barX,
            this.healthBarY,
            barX + this.healthBarWidth * healthPercentage,
            this.healthBarY
        );
        gradient.addColorStop(0, '#6f1fff');
        gradient.addColorStop(1, '#d2a6ff');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
            barX + shakeX,
            this.healthBarY + shakeY,
            this.healthBarWidth * healthPercentage,
            this.healthBarHeight
        );
    }

    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        if (lengthSquared === 0) {
            return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        }

        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        const distX = px - projX;
        const distY = py - projY;
        return Math.sqrt(distX * distX + distY * distY);
    }

    checkCollisionWithPlayer(player) {
        let collision = false;

        this.bullets = this.bullets.filter(bullet => {
            if (bullet.type === 'wave') {
                const dx = bullet.x - player.x;
                const dy = bullet.y - player.y;
                if (Math.sqrt(dx * dx + dy * dy) < player.radius + bullet.radius) {
                    collision = true;
                    return false;
                }
                return true;
            }

            if (bullet.type === 'shard') {
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
        if (Math.sqrt(dx * dx + dy * dy) < player.radius + this.radius) {
            collision = true;
        }

        return collision;
    }

    setupPixiScene(renderer) {
        if (!renderer.initialized) return;

        this._pixiRoot = renderer.ensureContainer(this, 'root', 10);
        this._pixiEchoes = renderer.ensureContainer(this, 'echoes', 5);
        this._pixiAuras = renderer.ensureContainer(this, 'auras', 12);
        this._pixiProjectiles = renderer.ensureContainer(this, 'projectiles', 20);
        this._pixiBoss = renderer.ensureContainer(this, 'boss', 30);
    }

    renderWithPixi(renderer) {
        this.setupPixiScene(renderer);

        const bossTexture = renderer.getTextureFromImage(this.sprite);
        const shardTexture = renderer.getTextureFromImage(this.shardSprite);
        const waveTexture = renderer.getWaveTexture();
        const rayTexture = renderer.getRayTexture();
        const auraTexture = renderer.getAuraTexture();

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
            this._pixiProjectiles,
            this.bullets,
            (bullet) => bullet.id,
            (bullet) => {
                const texture = bullet.type === 'wave'
                    ? waveTexture
                    : bullet.type === 'ray'
                        ? rayTexture
                        : shardTexture;
                const sprite = new PIXI.Sprite(texture ?? PIXI.Texture.EMPTY);
                sprite.anchor.set(0.5);
                sprite.blendMode = 'add';
                return sprite;
            },
            (sprite, bullet) => {
                if (bullet.type === 'wave') {
                    sprite.texture = waveTexture;
                    sprite.position.set(
                        bullet.x,
                        bullet.y + Math.sin(bullet.wavePhase) * 4
                    );
                    sprite.rotation = bullet.angle + Math.sin(bullet.wavePhase) * 0.04;
                    sprite.width = bullet.length;
                    sprite.height = bullet.amplitude * 4 + bullet.thickness * 4;
                    sprite.alpha = 0.84 + Math.sin(bullet.wavePhase * 1.2) * 0.08;
                    sprite.scale.y = 1 + Math.sin(bullet.wavePhase) * 0.16;
                    return;
                }

                if (bullet.type === 'ray') {
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

    teardownPixiScene(renderer) {
        if (!this._pixiScene) return;

        Object.values(this._pixiScene).forEach((container) => {
            container.removeChildren();
            container.destroy({ children: true });
        });
        this._pixiScene = null;
        this._pixiRoot = null;
        this._pixiEchoes = null;
        this._pixiAuras = null;
        this._pixiProjectiles = null;
        this._pixiBoss = null;
    }
}
