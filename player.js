class Player {
    constructor(canvas) {
        this.x = canvas.width / 2;
        this.y = canvas.height - 50;
        this.radius = 15;
        this.color = 'white';
        this.isShooting = false;
        this.lastShot = 0;
        this.fireRate = 100;
        this.bullets = [];
        this.alive = true;
    }

    move(x, y, canvas) {
        if (this.alive) {
            this.x = Math.max(this.radius, Math.min(x, canvas.width - this.radius));
            this.y = Math.max(100, Math.min(y, canvas.height - this.radius));
        }
    }

    shoot() {
        if (!this.alive) return;
        
        const currentTime = Date.now();
        if (this.isShooting && currentTime - this.lastShot >= this.fireRate) {
            this.bullets.push({
                x: this.x,
                y: this.y,
                radius: 5,
                speed: 30,
                damage: Math.floor(Math.random() * 20) + 100
            });
            this.lastShot = currentTime;
        }
    }

    updateBullets() {
        this.bullets.forEach(bullet => bullet.y -= bullet.speed);
        this.bullets = this.bullets.filter(bullet => bullet.y > 0);
    }

    draw(ctx) {
        // Draw bullets
        this.bullets.forEach(bullet => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'yellow';
            ctx.fill();
            ctx.closePath();
        });

        // Draw player
        if (this.alive) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }
    }

    die() {
        this.alive = false;
        this.bullets = [];
        
        // Create death animation particles
        const particles = [];
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: this.x,
                y: this.y,
                radius: Math.random() * 3 + 1,
                speed: Math.random() * 5 + 2,
                angle: Math.random() * Math.PI * 2,
                color: 'white',
                alpha: 1,
                decay: Math.random() * 0.02 + 0.01
            });
        }
        return particles;
    }

    reset(canvas) {
        this.x = canvas.width / 2;
        this.y = canvas.height - 50;
        this.bullets = [];
        this.alive = true;
        this.isShooting = false;
    }
}
