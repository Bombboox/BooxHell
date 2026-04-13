class BossPixiRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.enabled = typeof PIXI !== 'undefined';
        this.initialized = false;
        this.activeBoss = null;
        this.generatedTextures = new Map();
        this.imageTextures = new WeakMap();
        this.ready = this.enabled ? this.init() : Promise.resolve(false);
    }

    getAddBlendMode() {
        if (typeof PIXI === 'undefined') return 'add';
        if (PIXI.BLEND_MODES?.ADD !== undefined) return PIXI.BLEND_MODES.ADD;
        if (PIXI.BLEND_MODE?.ADD !== undefined) return PIXI.BLEND_MODE.ADD;
        return 'add';
    }

    async init() {
        if (!this.enabled) return false;

        this.app = new PIXI.Application();
        await this.app.init({
            canvas: this.canvas,
            width: this.canvas.width || window.innerWidth,
            height: this.canvas.height || window.innerHeight,
            backgroundAlpha: 0,
            antialias: true,
            preference: 'webgl',
            clearBeforeRender: true,
            autoDensity: true,
            eventFeatures: {
                move: false,
                click: false,
                wheel: false,
                globalMove: false
            }
        });

        this.stage = this.app.stage;
        this.stage.sortableChildren = true;
        this.initialized = true;
        this.resize(
            this.canvas.clientWidth || this.canvas.width || window.innerWidth,
            this.canvas.clientHeight || this.canvas.height || window.innerHeight
        );
        this.app.render();
        return true;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        if (this.initialized) {
            this.app.renderer.resize(width, height);
        }
    }

    clear() {
        if (!this.initialized) return;
        if (this.activeBoss?.teardownPixiScene) {
            this.activeBoss.teardownPixiScene(this);
        }
        this.activeBoss = null;
        this.stage.removeChildren();
        this.app.render();
    }

    render(boss) {
        if (!this.initialized || !boss?.renderWithPixi) return false;

        if (this.activeBoss !== boss) {
            this.activeBoss?.teardownPixiScene?.(this);
            this.activeBoss = boss;
            boss.setupPixiScene?.(this);
        }

        boss.renderWithPixi(this);
        this.app.render();
        return true;
    }

    getTextureFromImage(image) {
        if (!image?.complete || image.naturalWidth <= 0) return null;
        const cached = this.imageTextures.get(image);
        if (cached) return cached;

        const texture = PIXI.Texture.from(image);
        this.imageTextures.set(image, texture);
        return texture;
    }

    getGeneratedTexture(key, width, height, drawFn) {
        const cached = this.generatedTextures.get(key);
        if (cached) return cached;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, width, height);

        const texture = PIXI.Texture.from(canvas);
        this.generatedTextures.set(key, texture);
        return texture;
    }

    getWaveTexture(phase = 0) {
        const normalizedPhase = Number.isFinite(phase) ? phase : 0;
        return this.getGeneratedTexture(`reaver-wave:${normalizedPhase.toFixed(3)}`, 180, 72, (ctx, width, height) => {
            const centerY = height / 2;
            const startX = 8;
            const endX = width - 8;
            const steps = 40;

            const drawRibbon = (lineWidth, strokeStyle, phase, alpha = 1) => {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = strokeStyle;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const x = startX + (endX - startX) * t;
                    const y = centerY + Math.sin(t * Math.PI * 4 + phase) * 14;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.restore();
            };

            ctx.shadowColor = 'rgba(182, 104, 255, 0.42)';
            ctx.shadowBlur = 12;
            drawRibbon(14, 'rgba(182, 104, 255, 0.3)', normalizedPhase, 0.88);
            ctx.shadowBlur = 0;
            drawRibbon(8, '#c889ff', normalizedPhase, 1);
        });
    }

    getStormTexture() {
        return this.getGeneratedTexture('reaver-storm', 240, 240, (ctx, width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            const bg = ctx.createRadialGradient(cx, cy, width * 0.1, cx, cy, width * 0.5);
            bg.addColorStop(0, 'rgba(239, 226, 255, 0.8)');
            bg.addColorStop(0.35, 'rgba(158, 104, 255, 0.42)');
            bg.addColorStop(0.72, 'rgba(68, 24, 116, 0.3)');
            bg.addColorStop(1, 'rgba(18, 6, 34, 0)');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < 9; i++) {
                const radius = width * (0.18 + i * 0.03);
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(198, 146, 255, ${0.08 + (8 - i) * 0.02})`;
                ctx.lineWidth = 2 + i * 0.25;
                ctx.stroke();
            }
        });
    }

    getStormCoreTexture() {
        return this.getGeneratedTexture('reaver-storm-core', 96, 96, (ctx, width, height) => {
            const glow = ctx.createRadialGradient(
                width / 2,
                height / 2,
                width * 0.06,
                width / 2,
                height / 2,
                width * 0.5
            );
            glow.addColorStop(0, 'rgba(255, 245, 255, 0.95)');
            glow.addColorStop(0.5, 'rgba(223, 171, 255, 0.45)');
            glow.addColorStop(1, 'rgba(223, 171, 255, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);
        });
    }

    getRayTexture() {
        return this.getGeneratedTexture('reaver-ray', 180, 20, (ctx, width, height) => {
            const gradient = ctx.createLinearGradient(0, height / 2, width, height / 2);
            gradient.addColorStop(0, 'rgba(182, 104, 255, 0)');
            gradient.addColorStop(0.3, 'rgba(182, 104, 255, 0.55)');
            gradient.addColorStop(1, 'rgba(255, 236, 255, 0.95)');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.shadowColor = 'rgba(208, 145, 255, 0.45)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(10, height / 2);
            ctx.lineTo(width - 10, height / 2);
            ctx.stroke();
        });
    }

    getAuraTexture() {
        return this.getGeneratedTexture('reaver-aura', 256, 256, (ctx, width, height) => {
            const cx = width / 2;
            const cy = height / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 104, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(186, 110, 255, 0.65)';
            ctx.lineWidth = 6;
            ctx.stroke();
        });
    }

    getBackgroundTexture(width, height) {
        return this.getGeneratedTexture(`reaver-background:${width}:${height}`, width, height, (ctx, w, h) => {
            const base = ctx.createLinearGradient(0, 0, 0, h);
            base.addColorStop(0, '#06000d');
            base.addColorStop(0.5, '#140421');
            base.addColorStop(1, '#020005');
            ctx.fillStyle = base;
            ctx.fillRect(0, 0, w, h);

            const radial = ctx.createRadialGradient(
                w * 0.5,
                h * 0.26,
                Math.min(w, h) * 0.08,
                w * 0.5,
                h * 0.34,
                Math.max(w, h) * 0.72
            );
            radial.addColorStop(0, 'rgba(208, 126, 255, 0.42)');
            radial.addColorStop(0.24, 'rgba(144, 66, 222, 0.28)');
            radial.addColorStop(0.56, 'rgba(74, 22, 122, 0.18)');
            radial.addColorStop(1, 'rgba(7, 0, 15, 0)');
            ctx.fillStyle = radial;
            ctx.fillRect(0, 0, w, h);
        });
    }

    getGlowTexture() {
        return this.getGeneratedTexture('reaver-background-glow', 900, 500, (ctx, width, height) => {
            const glow = ctx.createRadialGradient(
                width / 2,
                height * 0.22,
                30,
                width / 2,
                height * 0.22,
                width * 0.42
            );
            glow.addColorStop(0, 'rgba(178, 86, 255, 0.34)');
            glow.addColorStop(0.42, 'rgba(94, 40, 154, 0.18)');
            glow.addColorStop(1, 'rgba(15, 0, 28, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);
        });
    }

    ensureContainer(owner, key, zIndex = 0) {
        owner._pixiScene ??= {};
        if (!owner._pixiScene[key]) {
            const container = new PIXI.Container();
            container.zIndex = zIndex;
            owner._pixiScene[key] = container;
            this.stage.addChild(container);
        } else if (!owner._pixiScene[key].parent) {
            this.stage.addChild(owner._pixiScene[key]);
        }
        return owner._pixiScene[key];
    }

    syncDisplayObjects(container, items, getId, createDisplayObject, updateDisplayObject) {
        container._displayMap ??= new Map();
        const activeIds = new Set();

        items.forEach((item) => {
            const id = getId(item);
            activeIds.add(id);

            let display = container._displayMap.get(id);
            if (!display) {
                display = createDisplayObject(item);
                container._displayMap.set(id, display);
                container.addChild(display);
            }

            updateDisplayObject(display, item);
        });

        for (const [id, display] of container._displayMap.entries()) {
            if (activeIds.has(id)) continue;
            container.removeChild(display);
            display.destroy?.();
            container._displayMap.delete(id);
        }
    }
}

window.BossPixiRenderer = BossPixiRenderer;
