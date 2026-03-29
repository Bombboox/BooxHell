class SpriteSheetAnimation {
    constructor(image, options = {}) {
        this.image = image;
        this.columns = options.columns ?? 1;
        this.rows = options.rows ?? 1;
        this.fps = options.fps ?? 12;
        this.frameCount = options.frameCount ?? this.columns;
        this.startFrame = options.startFrame ?? 0;
        this.row = options.row ?? 0;
        this.loop = options.loop ?? true;
        this.currentFrame = this.startFrame;
        this.elapsedFrames = 0;
        this.finished = false;
    }

    setAnimation(options = {}) {
        const nextColumns = options.columns ?? this.columns;
        const nextRows = options.rows ?? this.rows;
        const nextFrameCount = options.frameCount ?? nextColumns;
        const nextStartFrame = options.startFrame ?? 0;
        const nextRow = options.row ?? 0;
        const nextFps = options.fps ?? this.fps;
        const nextLoop = options.loop ?? true;

        const changed = nextColumns !== this.columns ||
            nextRows !== this.rows ||
            nextFrameCount !== this.frameCount ||
            nextStartFrame !== this.startFrame ||
            nextRow !== this.row ||
            nextFps !== this.fps ||
            nextLoop !== this.loop;

        if (!changed) return;

        this.columns = nextColumns;
        this.rows = nextRows;
        this.frameCount = nextFrameCount;
        this.startFrame = nextStartFrame;
        this.row = nextRow;
        this.fps = nextFps;
        this.loop = nextLoop;
        this.reset();
    }

    reset() {
        this.currentFrame = this.startFrame;
        this.elapsedFrames = 0;
        this.finished = false;
    }

    update(deltaFrames = 1) {
        if (this.finished || this.frameCount <= 1 || this.fps <= 0) return;

        this.elapsedFrames += deltaFrames;
        const framesPerSpriteFrame = 60 / this.fps;

        while (this.elapsedFrames >= framesPerSpriteFrame) {
            this.elapsedFrames -= framesPerSpriteFrame;
            this.currentFrame += 1;

            const lastFrame = this.startFrame + this.frameCount - 1;
            if (this.currentFrame > lastFrame) {
                if (this.loop) {
                    this.currentFrame = this.startFrame;
                } else {
                    this.currentFrame = lastFrame;
                    this.finished = true;
                    break;
                }
            }
        }
    }

    draw(ctx, dx, dy, dWidth, dHeight, options = {}) {
        if (!this.image.complete || this.image.naturalWidth <= 0) return;

        const frameWidth = this.image.naturalWidth / this.columns;
        const frameHeight = this.image.naturalHeight / this.rows;
        const sx = this.currentFrame * frameWidth;
        const sy = this.row * frameHeight;

        ctx.save();
        if (options.flipX) {
            ctx.translate(dx + dWidth / 2, dy + dHeight / 2);
            ctx.scale(-1, 1);
            ctx.drawImage(
                this.image,
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
            ctx.drawImage(this.image, sx, sy, frameWidth, frameHeight, dx, dy, dWidth, dHeight);
        }
        ctx.restore();
    }
}

window.SpriteSheetAnimation = SpriteSheetAnimation;
