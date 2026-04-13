class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.lastPlayed = new Map();
        this.baseVolumes = new Map();
        this.categories = new Map();
        this.masterVolume = 1;
        this.musicVolume = 0.7;
        this.sfxVolume = 1;
    }

    add(name, src, options = {}) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.loop = !!options.loop;
        const baseVolume = options.volume ?? 1;
        this.categories.set(name, options.category ?? 'sfx');
        audio.volume = this.getEffectiveVolume(name, baseVolume);
        this.sounds.set(name, audio);
        this.baseVolumes.set(name, baseVolume);
    }

    getCategoryMultiplier(name) {
        const category = this.categories.get(name) ?? 'sfx';
        return category === 'music' ? this.musicVolume : this.sfxVolume;
    }

    getEffectiveVolume(name, baseVolume) {
        return baseVolume * this.masterVolume * this.getCategoryMultiplier(name);
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
            clone.volume = this.getEffectiveVolume(name, volume ?? (this.baseVolumes.get(name) ?? 1));
            clone.play().catch(() => {});
            return;
        }

        if (loop !== undefined) audio.loop = loop;
        audio.volume = this.getEffectiveVolume(name, volume ?? (this.baseVolumes.get(name) ?? 1));
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

    setMasterVolume(volume) {
        this.masterVolume = Math.min(1, Math.max(0, volume));
        this.sounds.forEach((audio, name) => {
            audio.volume = this.getEffectiveVolume(name, this.baseVolumes.get(name) ?? 1);
        });
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.min(1, Math.max(0, volume));
        this.sounds.forEach((audio, name) => {
            audio.volume = this.getEffectiveVolume(name, this.baseVolumes.get(name) ?? 1);
        });
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.min(1, Math.max(0, volume));
        this.sounds.forEach((audio, name) => {
            audio.volume = this.getEffectiveVolume(name, this.baseVolumes.get(name) ?? 1);
        });
    }
}

const sound = new SoundManager();
sound.add('waffle_theme', 'sounds/waffle/waffle_theme.wav', { loop: true, volume: 0.6, category: 'music' });
sound.add('waffle_spawn', 'sounds/waffle/spawn.mp3', { volume: 0.45, category: 'sfx' });
sound.add('waffle_comet', 'sounds/waffle/comet.mp3', { volume: 0.4, category: 'sfx' });
sound.add('waffle_laser', 'sounds/waffle/laser.mp3', { volume: 0.1, category: 'sfx' });
sound.add('waffle_explosion', 'sounds/waffle/explosion.mp3', { volume: 0.35, category: 'sfx' });
sound.add('waffle_yell_1', 'sounds/waffle/yell_1.mp3', { volume: 0.5, category: 'sfx' });
sound.add('waffle_yell_2', 'sounds/waffle/yell_2.mp3', { volume: 0.5, category: 'sfx' });
sound.add('balrog_unleash', 'sounds/balrog/unleash.ogg', { volume: 0.45, category: 'sfx' });
sound.add('balrog_throw', 'sounds/balrog/throw.ogg', { volume: 0.35, category: 'sfx' });
sound.add('balrog_roar', 'sounds/balrog/roar.ogg', { volume: 0.5, category: 'sfx' });
sound.add('balrog_roar_2', 'sounds/balrog/roar2.ogg', { volume: 0.5, category: 'sfx' });
sound.add('balrog_evillaff', 'sounds/balrog/evillaff.ogg', { volume: 0.5, category: 'sfx' });
sound.add('balrog_grow', 'sounds/balrog/grow.wav', { volume: 0.3, category: 'sfx' });
sound.add('balrog_theme', 'sounds/balrog/balrog_theme.wav', { loop: true, volume: 0.5, category: 'music' });
sound.add('balrog_chomp', 'sounds/balrog/chomp.wav', { volume: 0.3, category: 'sfx' });
sound.add('balrog_buzzer', 'sounds/balrog/buzzer.ogg', { volume: 0.25, category: 'sfx' });
sound.add('balrog_clamopen', 'sounds/balrog/clamopen.ogg', { volume: 0.35, category: 'sfx' });
sound.add('balrog_pearlfire', 'sounds/balrog/pearlfire.ogg', { volume: 0.28, category: 'sfx' });
sound.add('reaver_theme', 'sounds/reaver/reaver_theme.wav', { loop: true, volume: 0.55, category: 'music' });
sound.add('reaver_darkness', 'sounds/reaver/darkness.mp3', { volume: 0.4, category: 'sfx' });
sound.add('reaver_fire', 'sounds/reaver/reaver_fire.mp3', { volume: 0.28, category: 'sfx' });
sound.add('reaver_wave', 'sounds/reaver/wave.mp3', { volume: 0.26, category: 'sfx' });
sound.add('reaver_ray', 'sounds/reaver/ray.mp3', { volume: 0.22, category: 'sfx' });
sound.add('reaver_split', 'sounds/reaver/split.mp3', { volume: 0.22, category: 'sfx' });
sound.add('reaver_lightning_1', 'sounds/reaver/lightning_1.mp3', { volume: 0.2, category: 'sfx' });
sound.add('reaver_lightning_2', 'sounds/reaver/lightning_2.mp3', { volume: 0.2, category: 'sfx' });

window.sound = sound;
