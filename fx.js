// fx.js – zvuky (syntetizované přes WebAudio, bez zvukových souborů), konfety, vibrace a hlášky.
// Načítá se až po script.js, takže rozšiřuje existující objekt `app`.

app.fx = {
    MUTE_KEY: 'molipa_mute',
    muted: false,
    ctx: null,
    noiseBuffer: null,

    init: () => {
        try { app.fx.muted = localStorage.getItem(app.fx.MUTE_KEY) === '1'; } catch (e) { /* nevadí */ }
        app.fx.renderSoundBtn();
    },

    renderSoundBtn: () => {
        const btn = document.getElementById('sound-btn');
        if (!btn) return;
        btn.textContent = app.fx.muted ? '🔇' : '🔊';
        btn.title = app.fx.muted ? 'Zapnout zvuky' : 'Vypnout zvuky';
    },

    toggleSound: () => {
        app.fx.muted = !app.fx.muted;
        try { localStorage.setItem(app.fx.MUTE_KEY, app.fx.muted ? '1' : '0'); } catch (e) { /* nevadí */ }
        app.fx.renderSoundBtn();
        if (!app.fx.muted) app.fx.play('correct');
    },

    // AudioContext smí vzniknout až po prvním kliknutí uživatele, proto líně
    audio: () => {
        if (app.fx.muted) return null;
        try {
            if (!app.fx.ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return null;
                app.fx.ctx = new AC();
            }
            if (app.fx.ctx.state === 'suspended') app.fx.ctx.resume();
            return app.fx.ctx;
        } catch (e) {
            return null;
        }
    },

    // Jeden tón: frekvence (případně klouzavá do `slideTo`), délka v s, tvar vlny, hlasitost, zpoždění v s
    tone: (freq, dur, type = 'sine', vol = 0.15, delay = 0, slideTo = null) => {
        const ctx = app.fx.audio();
        if (!ctx) return;
        const t0 = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.03);
    },

    // Šum protažený filtrem – šplouchnutí a prasknutí vlasce
    noise: (dur, vol = 0.2, filterFreq = 1200, delay = 0) => {
        const ctx = app.fx.audio();
        if (!ctx) return;
        if (!app.fx.noiseBuffer) {
            const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            app.fx.noiseBuffer = buf;
        }
        const t0 = ctx.currentTime + delay;
        const src = ctx.createBufferSource();
        src.buffer = app.fx.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, t0);
        filter.frequency.exponentialRampToValueAtTime(Math.max(120, filterFreq / 6), t0 + dur);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(filter).connect(gain).connect(ctx.destination);
        src.start(t0);
        src.stop(t0 + dur + 0.03);
    },

    play: (name) => {
        const fx = app.fx;
        switch (name) {
            case 'correct':
                fx.tone(660, 0.12, 'triangle', 0.16);
                fx.tone(990, 0.2, 'triangle', 0.16, 0.1);
                break;
            case 'wrong':
                fx.tone(220, 0.28, 'sawtooth', 0.09, 0, 120);
                break;
            case 'click':
                fx.tone(520, 0.05, 'triangle', 0.08);
                break;
            case 'cast':
                fx.tone(300, 0.35, 'sine', 0.07, 0, 1400);
                break;
            case 'plop':
                fx.tone(520, 0.16, 'sine', 0.2, 0, 110);
                fx.noise(0.22, 0.1, 1800);
                break;
            case 'nibble':
                fx.tone(880, 0.05, 'sine', 0.07);
                break;
            case 'bite':
                fx.tone(1175, 0.09, 'square', 0.1);
                fx.tone(1568, 0.14, 'square', 0.1, 0.11);
                break;
            case 'reel':
                fx.tone(330, 0.03, 'square', 0.035);
                break;
            case 'pull':
                fx.tone(150, 0.18, 'sawtooth', 0.06, 0, 240);
                break;
            case 'snap':
                fx.tone(1300, 0.22, 'sawtooth', 0.14, 0, 90);
                fx.noise(0.18, 0.18, 4000);
                break;
            case 'splash':
                fx.noise(0.5, 0.22, 2600);
                break;
            case 'fanfare':
                [523, 659, 784, 1047].forEach((f, i) => fx.tone(f, 0.2, 'triangle', 0.15, i * 0.11));
                fx.tone(1047, 0.45, 'triangle', 0.13, 0.46);
                break;
            case 'coin':
                fx.tone(988, 0.08, 'square', 0.08);
                fx.tone(1319, 0.3, 'square', 0.08, 0.08);
                break;
            case 'magic':
                [784, 988, 1175, 1568, 1976].forEach((f, i) => fx.tone(f, 0.22, 'sine', 0.1, i * 0.07));
                break;
            case 'whistle':
                for (let i = 0; i < 6; i++) fx.tone(i % 2 ? 2300 : 2050, 0.07, 'sine', 0.1, i * 0.065);
                break;
            case 'brekeke':
                [0, 0.16, 0.32].forEach((d, i) => fx.tone(i === 2 ? 95 : 120, i === 2 ? 0.3 : 0.11, 'sawtooth', 0.13, d, i === 2 ? 70 : null));
                break;
            case 'levelup':
                [392, 523, 659, 784, 1047, 1319].forEach((f, i) => fx.tone(f, 0.18, 'triangle', 0.14, i * 0.09));
                break;
        }
    },

    vibrate: (pattern) => {
        try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* nevadí */ }
    },

    // Krátká hláška uprostřed nahoře (kombo, nová hodnost, nový druh ve sbírce…)
    toast: (html, variant = '') => {
        let box = document.getElementById('toast-box');
        if (!box) {
            box = document.createElement('div');
            box.id = 'toast-box';
            document.body.appendChild(box);
        }
        const el = document.createElement('div');
        el.className = 'toast ' + variant;
        el.innerHTML = html;
        box.appendChild(el);
        setTimeout(() => el.classList.add('toast-out'), 2300);
        setTimeout(() => el.remove(), 2800);
    },

    // Konfety přes celou obrazovku (canvas se po doběhnutí sám odstraní)
    confetti: (count = 140) => {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const canvas = document.createElement('canvas');
        canvas.className = 'confetti-canvas';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.appendChild(canvas);
        const g = canvas.getContext('2d');
        const colors = ['#0077be', '#00a86b', '#f59e0b', '#ef4444', '#8e44ad', '#fde047', '#38bdf8'];
        const parts = [];
        for (let i = 0; i < count; i++) {
            parts.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.5,
                y: canvas.height * 0.35,
                vx: (Math.random() - 0.5) * 14,
                vy: -Math.random() * 13 - 3,
                size: 5 + Math.random() * 7,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.4,
                color: colors[i % colors.length],
                fish: i % 9 === 0
            });
        }
        const start = performance.now();
        const DURATION = 3200;
        const step = (now) => {
            const t = now - start;
            g.clearRect(0, 0, canvas.width, canvas.height);
            g.globalAlpha = Math.max(0, 1 - Math.max(0, t - DURATION + 800) / 800);
            parts.forEach(p => {
                p.vy += 0.32;
                p.vx *= 0.99;
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vr;
                g.save();
                g.translate(p.x, p.y);
                g.rotate(p.rot);
                if (p.fish) {
                    g.font = `${p.size * 2.4}px serif`;
                    g.fillText('🐟', 0, 0);
                } else {
                    g.fillStyle = p.color;
                    g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
                }
                g.restore();
            });
            if (t < DURATION) requestAnimationFrame(step);
            else canvas.remove();
        };
        requestAnimationFrame(step);
    }
};
