class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.lastPlayed = new Map();
    }

    add(name, src, options = {}) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.loop = !!options.loop;
        audio.volume = options.volume ?? 1;
        this.sounds.set(name, audio);
    }

    play(name, options = {}) {
        const audio = this.sounds.get(name);
        if (!audio) return;

        const now = performance.now();
        const cooldownMs = options.cooldownMs ?? 0;
        const last = this.lastPlayed.get(name) ?? -Infinity;
        if (cooldownMs > 0 && now - last < cooldownMs) {
            return;
        }
        this.lastPlayed.set(name, now);

        const allowOverlap = options.allowOverlap ?? false;
        const volume = options.volume;
        const loop = options.loop;
        const restart = options.restart ?? false;

        if (allowOverlap) {
            const clone = audio.cloneNode();
            clone.loop = loop ?? audio.loop;
            if (volume !== undefined) clone.volume = volume;
            clone.play().catch(() => {});
            return;
        }

        if (loop !== undefined) audio.loop = loop;
        if (volume !== undefined) audio.volume = volume;
        if (restart) audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    stop(name) {
        const audio = this.sounds.get(name);
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
    }

    stopAll() {
        this.sounds.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }
}

const sound = new SoundManager();
sound.add('waffle_theme', 'sounds/waffle/waffle_theme.wav', { loop: true, volume: 0.6 });
sound.add('waffle_spawn', 'sounds/waffle/spawn.mp3', { volume: 0.45 });
sound.add('waffle_comet', 'sounds/waffle/comet.mp3', { volume: 0.4 });
sound.add('waffle_laser', 'sounds/waffle/laser.mp3', { volume: 0.1 });
sound.add('waffle_explosion', 'sounds/waffle/explosion.mp3', { volume: 0.35 });
sound.add('waffle_yell_1', 'sounds/waffle/yell_1.mp3', { volume: 0.5 });
sound.add('waffle_yell_2', 'sounds/waffle/yell_2.mp3', { volume: 0.5 });

window.sound = sound;
