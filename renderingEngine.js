class RenderingEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', {
            alpha: false,
            desynchronized: true
        }) || canvas.getContext('2d');
        this.textureCache = new Map();
    }

    getTexture(key, width, height, drawTexture) {
        const cached = this.textureCache.get(key);
        if (cached) return cached;

        const texture = document.createElement('canvas');
        texture.width = width;
        texture.height = height;
        const textureCtx = texture.getContext('2d');
        drawTexture(textureCtx, width, height);
        this.textureCache.set(key, texture);
        return texture;
    }

    drawTexture(texture, x, y, options = {}) {
        const ctx = options.ctx || this.ctx;
        const width = options.width ?? texture.width;
        const height = options.height ?? texture.height;
        const rotation = options.rotation ?? 0;
        const alpha = options.alpha ?? 1;
        const scaleX = options.scaleX ?? 1;
        const scaleY = options.scaleY ?? 1;
        const composite = options.compositeOperation;

        ctx.save();
        ctx.globalAlpha = alpha;
        if (composite) {
            ctx.globalCompositeOperation = composite;
        }
        ctx.translate(x, y);
        if (rotation) {
            ctx.rotate(rotation);
        }
        if (scaleX !== 1 || scaleY !== 1) {
            ctx.scale(scaleX, scaleY);
        }
        ctx.drawImage(texture, -width / 2, -height / 2, width, height);
        ctx.restore();
    }

    getOrbTexture(radius, colors = {}) {
        const glow = colors.glow ?? 'rgba(188, 92, 255, 0.18)';
        const fill = colors.fill ?? '#c889ff';
        const center = colors.center ?? '#f5e7ff';
        const key = `orb:${radius}:${glow}:${fill}:${center}`;
        const size = Math.ceil((radius + 8) * 2);

        return this.getTexture(key, size, size, (ctx, width, height) => {
            const cx = width / 2;
            const cy = height / 2;

            ctx.beginPath();
            ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = fill;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(2, radius * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = center;
            ctx.fill();
        });
    }

    getWaveTexture(length, amplitude, thickness, colors = {}) {
        const glow = colors.glow ?? 'rgba(182, 104, 255, 0.3)';
        const stroke = colors.stroke ?? '#dca6ff';
        const highlight = colors.highlight ?? 'rgba(255, 239, 255, 0.85)';
        const key = `wave:${length}:${amplitude}:${thickness}:${glow}:${stroke}:${highlight}`;
        const width = Math.ceil(length + 20);
        const height = Math.ceil(amplitude * 4 + thickness * 4 + 20);

        return this.getTexture(key, width, height, (ctx, texWidth, texHeight) => {
            const centerY = texHeight / 2;
            const startX = 10;
            const endX = texWidth - 10;
            const steps = Math.max(24, Math.floor(length / 6));

            const drawRibbon = (lineWidth, color, phase, alpha = 1) => {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();

                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const x = startX + (endX - startX) * t;
                    const y = centerY + Math.sin(t * Math.PI * 4 + phase) * amplitude;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.stroke();
                ctx.restore();
            };

            ctx.shadowColor = glow;
            ctx.shadowBlur = thickness * 1.5;
            drawRibbon(thickness * 1.8, glow, 0, 0.8);
            ctx.shadowBlur = 0;
            drawRibbon(thickness, stroke, 0);
            drawRibbon(Math.max(1, thickness * 0.35), highlight, Math.PI / 4, 0.9);
        });
    }

    drawWaveProjectile(x, y, angle, length, amplitude, thickness, colors, alpha = 1, ctx = this.ctx) {
        const texture = this.getWaveTexture(length, amplitude, thickness, colors);
        this.drawTexture(texture, x, y, {
            ctx,
            rotation: angle,
            alpha,
            compositeOperation: 'lighter'
        });
    }
}

window.RenderingEngine = RenderingEngine;
