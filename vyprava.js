// vyprava.js – hra „Výprava k vodě“: nahoď, zasekni, zdolej rybu, poznej ji a rozhodni podle řádu.
// Cestou číhají překvapení: vodník, zlatá rybka, rybářská stráž i stará bota.
// Načítá se až po script.js, fx.js a profil.js.

(() => {
    const KEEP = '🧺 Ponechat si';
    const RELEASE = '↩️ Pustit zpět';

    // Souřadnice ve scéně (viewBox 400 × 250)
    const TIP = { x: 118, y: 60 };      // špička prutu v klidu
    const SHORE = { x: 150, y: 212 };   // místo u mola, kam se ryba přitahuje

    // Obvyklé délky ryb na udici v cm [od, do] – aby střevle neměřila půl metru
    const TYP_DELKA = {
        'Amur bílý': [50, 100], 'Bolen dravý': [30, 70], 'Candát obecný': [35, 80],
        'Cejn perleťový': [15, 30], 'Cejn velký': [20, 55], 'Hlavatka obecná': [50, 100],
        'Hrouzek obecný': [8, 15], 'Jelec tloušť': [18, 50], 'Drsek menší': [8, 15],
        'Jelec jesen': [20, 45], 'Jelec proudník': [15, 30], 'Jeseter malý': [25, 60],
        'Ježdík obecný': [8, 15], 'Kapr obecný': [30, 80], 'Karas obecný': [12, 30],
        'Karas stříbřitý': [15, 40], 'Koljuška tříostná': [4, 8], 'Lín obecný': [15, 45],
        'Lipan podhorní': [25, 48], 'Losos obecný': [45, 90], 'Mihule potoční': [10, 16],
        'Mník jednovousý': [22, 50], 'Mřenka mramorovaná': [7, 13], 'Okoun říční': [12, 38],
        'Ostroretka stěhovavá': [22, 45], 'Ostrucha křivočára': [20, 40], 'Ouklej obecná': [8, 16],
        'Ouklejka pruhovaná': [7, 12], 'Parma obecná': [30, 65], 'Perlín ostrobřichý': [12, 30],
        'Piskoř pruhovaný': [12, 25], 'Plotice obecná': [12, 32], 'Podoustev říční': [18, 38],
        'Pstruh duhový': [20, 50], 'Pstruh obecný': [18, 45], 'Síh maréna': [25, 50],
        'Siven americký': [18, 35], 'Slunka obecná': [5, 9], 'Štika obecná': [35, 100],
        'Střevle potoční': [5, 10], 'Sumec velký': [50, 160], 'Sumeček americký': [12, 28],
        'Tolstolobec pestrý': [50, 100], 'Tolstolobik bílý': [50, 100], 'Úhoř říční': [40, 90],
        'Vranka obecná': [7, 13]
    };

    // Denní limity kusů podle řádu (mimopstruhový revír)
    const USLECHTILE = ['Kapr obecný', 'Amur bílý', 'Štika obecná', 'Candát obecný', 'Bolen dravý', 'Sumec velký'];
    const LOSOSOVITE = ['Pstruh obecný', 'Pstruh duhový', 'Siven americký', 'Lipan podhorní'];
    const LIMIT_USLECHTILE = 2;
    const LIMIT_LOSOSOVITE = 3;

    const ODPADKY = [
        { emoji: '🥾', koho: 'starou botu' },
        { emoji: '🥫', koho: 'rezavou plechovku' },
        { emoji: '🛍️', koho: 'igelitovou tašku' },
        { emoji: '🛞', koho: 'starou pneumatiku' }
    ];

    const AVATAR_VODNIK = `<svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="#bfe9f5"/>
        <path d="M24 50 q-8 22 0 38 M76 50 q8 22 0 38 M31 54 q-5 18 0 30 M69 54 q5 18 0 30" stroke="#2f7d3b" stroke-width="6" fill="none" stroke-linecap="round"/>
        <ellipse cx="50" cy="60" rx="25" ry="23" fill="#93d48d"/>
        <rect x="31" y="12" width="38" height="26" rx="5" fill="#1f6b3a"/>
        <rect x="20" y="35" width="60" height="8" rx="4" fill="#1f6b3a"/>
        <rect x="31" y="28" width="38" height="6" fill="#e23d3d"/>
        <circle cx="40" cy="56" r="6.5" fill="#fff"/><circle cx="60" cy="56" r="6.5" fill="#fff"/>
        <circle cx="41" cy="57" r="2.8" fill="#1e293b"/><circle cx="61" cy="57" r="2.8" fill="#1e293b"/>
        <ellipse cx="50" cy="65" rx="4" ry="3" fill="#6fb86c"/>
        <path d="M37 71 q13 11 26 0" stroke="#1e293b" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <path d="M84 30 q4 6 0 9 q-4 -3 0 -9z M14 62 q3 5 0 7 q-3 -2 0 -7z" fill="#4db5e6"/>
    </svg>`;

    const AVATAR_STRAZ = `<svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="#e4f2df"/>
        <path d="M16 100 q0 -26 34 -26 q34 0 34 26z" fill="#4b6b3a"/>
        <circle cx="50" cy="54" r="22" fill="#f2c9a0"/>
        <path d="M26 44 q24 -34 48 0z" fill="#3d5a2e"/>
        <rect x="22" y="41" width="56" height="7" rx="3.5" fill="#2c4421"/>
        <circle cx="50" cy="32" r="5" fill="#f5c542" stroke="#b7791f" stroke-width="1"/>
        <circle cx="42" cy="55" r="2.6" fill="#1e293b"/><circle cx="58" cy="55" r="2.6" fill="#1e293b"/>
        <path d="M38 65 q12 -8 24 0 q-12 6 -24 0z" fill="#6b4a2b"/>
        <circle cx="34" cy="90" r="4" fill="#f5c542"/>
    </svg>`;

    const AVATAR_ZLATA = `<svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="#fff5cc"/>
        <path d="M66 54 l22 -16 v32z" fill="#f59e0b"/>
        <ellipse cx="45" cy="54" rx="26" ry="16" fill="#fbbf24"/>
        <path d="M40 40 q8 -10 18 -2z" fill="#f59e0b"/>
        <circle cx="31" cy="50" r="4.2" fill="#fff"/><circle cx="30.4" cy="50" r="2" fill="#1e293b"/>
        <path d="M24 58 q5 4 10 1" stroke="#b45309" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M30 34 l3 -11 6 8 6 -8 3 11z" fill="#fde047" stroke="#d97706" stroke-width="1.2"/>
        <path d="M78 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z M16 26 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill="#fbbf24"/>
    </svg>`;

    const $ = (id) => document.getElementById(id);
    const rand = (a, b) => a + Math.random() * (b - a);
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const hexToRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const mixColor = (a, b, t) => {
        const ca = hexToRgb(a), cb = hexToRgb(b);
        return `rgb(${ca.map((c, i) => Math.round(lerp(c, cb[i], t))).join(',')})`;
    };

    // Obloha během dne: [podíl dne, barva nahoře, barva u obzoru, barva slunce]
    const OBLOHA = [
        [0,    '#a9cdee', '#ffe1c4', '#ffb347'],
        [0.25, '#7cc4f5', '#dcf1ff', '#ffe066'],
        [0.65, '#4aa8ee', '#c9e8ff', '#fff3a3'],
        [1,    '#5d4f96', '#fba672', '#ff7b54']
    ];

    const v = {
        NAVNAD: 6,
        st: null,          // stav celé výpravy
        sc: null,          // stav scény (splávek, zdolávání…)
        phase: 'off',      // off | idle | flying | waiting | bite | reeling | busy
        running: false,
        holding: false,
        session: 0,
        last: 0,
        t: 0,
        ready: false,

        // --- Jednorázová příprava scény a ovládání ---
        initOnce: () => {
            if (v.ready) return;
            v.ready = true;

            // Vlnky
            const waves = $('vy-waves');
            [128, 150, 176, 206, 236].forEach((y, i) => {
                const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                let d = `M-40 ${y} q10 -3 20 0`;
                for (let k = 0; k < 23; k++) d += ' t20 0';
                p.setAttribute('d', d);
                p.setAttribute('class', 'vy-wave');
                p.style.animationDuration = `${5 + i * 1.3}s`;
                p.style.opacity = 0.25 + i * 0.07;
                waves.appendChild(p);
            });

            const action = $('vy-action');
            const scene = $('vy-scene');
            const down = (e) => { e.preventDefault(); v.press(); };
            action.addEventListener('pointerdown', down);
            scene.addEventListener('pointerdown', down);
            ['pointerup', 'pointercancel'].forEach(ev => window.addEventListener(ev, () => v.release()));
            action.addEventListener('contextmenu', (e) => e.preventDefault());
            scene.addEventListener('contextmenu', (e) => e.preventDefault());

            // Mezerník = akční tlačítko (nahodit / zaseknout / navíjet)
            document.addEventListener('keydown', (e) => {
                if (e.code !== 'Space' || !v.running || v.phase === 'busy') return;
                e.preventDefault();
                if (!e.repeat) v.press();
            });
            document.addEventListener('keyup', (e) => {
                if (e.code === 'Space') v.release();
            });
        },

        // --- Start a konec ---
        start: () => {
            v.initOnce();
            v.stop();
            v.session++;

            app.gameMode = 'vyprava';
            app.isRetry = false;
            app.mistakes = [];

            const specialy = app.shuffle(['odpad', 'vodnik', 'zlata']).slice(0, 2);
            let balicek = app.shuffle(['ryba', 'ryba', 'ryba', 'ryba', ...specialy]);
            // První nához je vždy obyčejná ryba, ať si hráč osahá ovládání
            const prvniRyba = balicek.indexOf('ryba');
            [balicek[0], balicek[prvniRyba]] = [balicek[prvniRyba], balicek[0]];

            v.st = {
                md: app.randomDatum(),
                navnady: v.NAVNAD,
                celkemHodu: v.NAVNAD,
                hod: 0,
                body: 0,
                otazky: [],      // všechny položené otázky
                spravne: 0,
                serie: 0,
                vezirek: [],     // ponechané ryby
                ulovky: [],      // řádky úlovkového lístku
                pouziteRyby: new Set(),
                pouziteOtazky: new Set(),
                zlataNavnada: false,
                balicek,
                strazPo: app.randInt(2, 4),
                strazByla: false,
                prvniZaber: true,
                prasknuti: 0     // kolikrát praskl vlasec – další zdolávání je pak snazší
            };
            v.sc = { fx: TIP.x, fy: TIP.y, target: { x: 280, y: 165 }, floatVisible: false };
            v.reel = null;
            v.anim = null;
            v.holding = false;
            v.t = 0;

            app.showScreen('screen-vyprava');
            v.closePanel();
            v.hidePostava();
            v.renderHud();
            v.updateSky();
            v.setPhase('idle');
            v.say(`Je <strong>${app.formatDatum(v.st.md)}</strong> a ty sedíš u vody. Nahoď udici!`, 6000);

            v.running = true;
            v.last = performance.now();
            requestAnimationFrame(v.tick);
        },

        stop: () => {
            v.running = false;
            v.session++;
            v.phase = 'off';
            v.holding = false;
        },

        // setTimeout, který se neprovede, pokud mezitím výprava skončila nebo začala nová
        later: (fn, ms) => {
            const session = v.session;
            setTimeout(() => { if (v.session === session && v.running) fn(); }, ms);
        },

        // --- Vykreslení rozhraní ---
        setPhase: (phase) => {
            v.phase = phase;
            const btn = $('vy-action');
            const labels = {
                idle: '🎣 Nahodit!',
                flying: '…',
                waiting: '⚡ Zaseknout!',
                bite: '⚡ ZASEKNI!',
                reeling: '🌀 Drž a navíjej'
            };
            btn.classList.toggle('hidden', !(phase in labels));
            btn.textContent = labels[phase] || '';
            btn.classList.toggle('vy-action-alert', phase === 'bite');
            btn.classList.toggle('vy-action-wait', phase === 'waiting' || phase === 'flying');
            $('vy-alert').classList.toggle('hidden', phase !== 'bite');
            $('vy-reel').classList.toggle('hidden', phase !== 'reeling');
            $('vy-scene').classList.toggle('vy-scene-bite', phase === 'bite');
        },

        renderHud: () => {
            const st = v.st;
            $('vy-hud-datum').textContent = app.formatDatum(st.md);
            $('vy-hud-navnady').textContent = st.navnady;
            $('vy-hud-vezirek').textContent = st.vezirek.length;
            $('vy-hud-body').textContent = st.body;
            $('vy-hud-zlata').classList.toggle('hidden', !st.zlataNavnada);
            $('vy-hud-vezirek-chip').title = st.vezirek.length
                ? 'Ve vezírku: ' + st.vezirek.map(f => f.nazev_cz).join(', ')
                : 'Vezírek je zatím prázdný';
        },

        bump: (id) => {
            const el = $(id);
            el.classList.remove('vy-bump');
            void el.offsetWidth;
            el.classList.add('vy-bump');
        },

        addBody: (n) => {
            if (!n) return;
            v.st.body += n;
            v.renderHud();
            v.bump('vy-hud-body-chip');
        },

        say: (html, ms = 3500) => {
            const el = $('vy-bubble');
            el.innerHTML = html;
            el.classList.remove('hidden');
            const token = (v.sayToken = (v.sayToken || 0) + 1);
            if (ms) setTimeout(() => { if (v.sayToken === token) el.classList.add('hidden'); }, ms);
        },

        pop: (emoji) => {
            const el = $('vy-pop');
            el.textContent = emoji;
            el.classList.remove('vy-pop-show');
            void el.offsetWidth;
            el.classList.add('vy-pop-show');
        },

        showPostava: (svg) => {
            const el = $('vy-postava');
            el.innerHTML = svg;
            el.classList.remove('hidden');
        },

        hidePostava: () => $('vy-postava').classList.add('hidden'),

        ripple: (x, y) => {
            const circles = document.querySelectorAll('#vy-ripples circle');
            v.rippleIdx = ((v.rippleIdx || 0) + 1) % circles.length;
            const c = circles[v.rippleIdx];
            c.setAttribute('cx', x);
            c.setAttribute('cy', y);
            c.classList.remove('vy-ripple-go');
            void c.getBoundingClientRect();
            c.classList.add('vy-ripple-go');
        },

        // Obloha se během výpravy mění od svítání po západ slunce
        updateSky: () => {
            const st = v.st;
            const p = clamp01(st.hod / Math.max(1, st.celkemHodu));
            let i = 0;
            while (i < OBLOHA.length - 2 && p > OBLOHA[i + 1][0]) i++;
            const a = OBLOHA[i], b = OBLOHA[i + 1];
            const t = clamp01((p - a[0]) / (b[0] - a[0]));
            $('vy-sky-top').setAttribute('stop-color', mixColor(a[1], b[1], t));
            $('vy-sky-bottom').setAttribute('stop-color', mixColor(a[2], b[2], t));
            const sun = $('vy-sun');
            sun.setAttribute('fill', mixColor(a[3], b[3], t));
            sun.setAttribute('cx', 45 + 310 * p);
            sun.setAttribute('cy', 98 - Math.sin(Math.PI * p) * 72);
            $('vy-tint').setAttribute('opacity', (Math.pow(Math.abs(p - 0.5) * 2, 3) * 0.2).toFixed(3));
            $('vy-tint').setAttribute('fill', p < 0.5 ? '#ffb27a' : '#ff7b54');
        },

        // --- Ovládání jedním tlačítkem ---
        press: () => {
            if (!v.running) return;
            v.holding = true;
            switch (v.phase) {
                case 'idle': v.cast(); break;
                case 'waiting': v.predcasnyZasek(); break;
                case 'bite': v.zasek(); break;
            }
        },

        release: () => { v.holding = false; },

        cast: () => {
            const st = v.st;
            if (st.navnady <= 0) return;
            st.navnady--;
            st.hod++;
            st.aktualni = { typ: st.balicek.shift() || 'ryba' };
            if (st.aktualni.typ === 'ryba') Object.assign(st.aktualni, v.vyberRybu());

            v.sc.target = { x: rand(215, 335), y: rand(150, 188) };
            v.sc.flyT = 0;
            v.sc.floatVisible = true;
            v.renderHud();
            v.bump('vy-hud-navnady-chip');
            v.updateSky();
            $('vy-bubble').classList.add('hidden');
            app.fx.play('cast');
            v.setPhase('flying');
        },

        dopad: () => {
            const sc = v.sc;
            app.fx.play('plop');
            v.ripple(sc.target.x, sc.target.y);
            const cekani = rand(2.2, 5);
            sc.biteAt = v.t + cekani;
            // Falešná ťuknutí před záběrem – na ta se nezasekává!
            sc.nibbles = [];
            const pocet = app.randInt(0, 2);
            for (let i = 0; i < pocet; i++) sc.nibbles.push(v.t + rand(0.7, cekani - 0.6));
            sc.nibbles.sort((a, b) => a - b);
            sc.nibbleUntil = 0;
            v.setPhase('waiting');
            if (v.st.prvniZaber) v.say('Čekej… Až se splávek <strong>potopí</strong>, rychle zasekni!', 5000);
        },

        predcasnyZasek: () => {
            app.fx.play('wrong');
            v.ztrataNavnady('Moc brzy! Ryba se vyplašila a návnada je pryč.');
        },

        zaber: () => {
            const sc = v.sc;
            sc.biteDeadline = v.t + (v.st.prvniZaber ? 2.4 : 1.5);
            app.fx.play('bite');
            app.fx.vibrate([80, 40, 80]);
            v.ripple(sc.target.x, sc.target.y);
            v.setPhase('bite');
            v.say('<strong>ZÁBĚR!</strong> Zasekni!', 2000);
        },

        zasek: () => {
            const st = v.st;
            st.prvniZaber = false;
            app.fx.play('splash');
            v.ripple(v.sc.target.x, v.sc.target.y);
            v.sc.floatVisible = false;
            const typ = st.aktualni.typ;

            if (typ === 'vodnik') {
                v.setPhase('busy');
                v.say('Uf, tohle je něco <strong>strašně těžkého</strong>…', 1600);
                v.later(v.vodnikFlow, 1500);
                return;
            }

            const delka = typ === 'ryba' ? st.aktualni.delka : 30;
            const uleva = Math.max(0.5, 1 - 0.25 * st.prasknuti);
            v.reel = {
                progress: 0,
                tension: 0.15,
                surge: false,
                bezZaberu: typ === 'odpad',   // bota se nebrání, jen jde ztuha
                speed: typ === 'odpad' ? 0.2 : 0.3,
                diff: uleva * (typ === 'zlata' ? 1.25 : Math.max(0.85, Math.min(1.5, 0.8 + delka / 110))),
                nextSwitch: v.t + rand(0.9, 1.6),
                lastClick: 0
            };
            v.setPhase('reeling');
            $('vy-bubble').classList.add('hidden');   // místo bubliny je teď vidět ukazatel napětí
            v.renderReel();
        },

        ztrataNavnady: (hlaska) => {
            v.sc.floatVisible = false;
            v.st.serie = 0;
            v.setPhase('busy');
            v.say(hlaska, 2600);
            v.later(v.nextStep, 1900);
        },

        // --- Herní smyčka ---
        tick: (now) => {
            if (!v.running) return;
            const dt = Math.min(0.05, (now - v.last) / 1000);
            v.last = now;
            v.t += dt;
            const sc = v.sc;

            if (v.phase === 'flying') {
                sc.flyT += dt / 0.7;
                const t = clamp01(sc.flyT);
                sc.fx = lerp(TIP.x, sc.target.x, t);
                sc.fy = lerp(TIP.y, sc.target.y, t) - Math.sin(Math.PI * t) * 55;
                if (t >= 1) v.dopad();
            } else if (v.phase === 'waiting') {
                sc.fx = sc.target.x;
                sc.fy = sc.target.y + Math.sin(v.t * 3) * 1.2;
                if (sc.nibbles.length && v.t >= sc.nibbles[0]) {
                    sc.nibbles.shift();
                    sc.nibbleUntil = v.t + 0.35;
                    app.fx.play('nibble');
                    v.ripple(sc.target.x, sc.target.y);
                }
                if (v.t < sc.nibbleUntil) sc.fy += Math.abs(Math.sin(v.t * 28)) * 3;
                if (v.t >= sc.biteAt) v.zaber();
            } else if (v.phase === 'bite') {
                sc.fx = sc.target.x + Math.sin(v.t * 45) * 1.5;
                sc.fy = sc.target.y + 9;
                if (v.t >= sc.biteDeadline) {
                    v.st.prvniZaber = false;
                    app.fx.play('wrong');
                    v.ztrataNavnady('Pozdě! Ryba ti sežrala návnadu a uplavala.');
                }
            } else if (v.phase === 'reeling') {
                v.tickReel(dt);
            }

            if (v.anim) v.tickAnim(dt);
            v.draw();
            requestAnimationFrame(v.tick);
        },

        // Zdolávání: drž = navíjíš. Když ryba zabere, musíš povolit, jinak praskne vlasec.
        tickReel: (dt) => {
            const r = v.reel;
            const sc = v.sc;

            if (!r.bezZaberu && v.t >= r.nextSwitch) {
                r.surge = !r.surge;
                r.nextSwitch = v.t + (r.surge ? rand(0.7, 1.2) : rand(1.1, 2.2));
                if (r.surge) {
                    app.fx.play('pull');
                    app.fx.vibrate(60);
                }
                v.renderReel();
            }

            if (v.holding) {
                if (r.surge) {
                    r.tension += 0.95 * r.diff * dt;
                    r.progress -= 0.03 * dt;
                } else {
                    r.tension += 0.2 * dt;
                    r.progress += r.speed * dt;
                    if (v.t - r.lastClick > 0.09) {
                        r.lastClick = v.t;
                        app.fx.play('reel');
                    }
                }
            } else {
                r.tension -= 0.7 * dt;
                if (r.surge) r.progress -= 0.05 * dt;
            }
            r.tension = Math.max(0, r.tension);
            r.progress = Math.max(0, r.progress);

            // Poloha ryby na vlasci
            const p = clamp01(r.progress);
            const rozkmit = r.bezZaberu ? 1 : (r.surge ? 14 : 5);
            sc.fx = lerp(sc.target.x, SHORE.x, p) + Math.sin(v.t * 5) * rozkmit;
            sc.fy = lerp(sc.target.y, SHORE.y, p) + Math.cos(v.t * 4) * (r.surge ? 4 : 2);
            if (r.surge && Math.random() < dt * 5) v.ripple(sc.fx, sc.fy);

            $('vy-tension-fill').style.width = `${clamp01(r.tension) * 100}%`;
            $('vy-tension-fill').className = r.tension > 0.75 ? 'danger' : (r.tension > 0.5 ? 'warn' : '');
            $('vy-dist-fish').style.left = `${(1 - p) * 100}%`;

            if (r.tension >= 1) {
                app.fx.play('snap');
                app.fx.vibrate(200);
                v.reel = null;
                v.st.prasknuti++;
                v.ztrataNavnady('Prásk! Vlasec nevydržel. Když ryba táhne, musíš povolit.');
            } else if (r.progress >= 1) {
                v.reel = null;
                v.vytazeno();
            }
        },

        renderReel: () => {
            const r = v.reel;
            if (!r) return;
            const hint = $('vy-reel-hint');
            hint.textContent = r.surge ? '🐟 Ryba táhne – POVOL!' : (r.bezZaberu ? '🌀 Jde to ztuha… drž a navíjej!' : '🌀 Drž a navíjej!');
            hint.classList.toggle('vy-reel-hint-danger', r.surge);
            $('vy-action').textContent = r.surge ? '✋ Povol!' : '🌀 Drž a navíjej';
            $('vy-action').classList.toggle('vy-action-alert', r.surge);
        },

        // Krátké animace mimo fáze (puštěná ryba odplouvá)
        tickAnim: (dt) => {
            const a = v.anim;
            a.t += dt / a.dur;
            if (a.t >= 1) v.anim = null;
        },

        draw: () => {
            const sc = v.sc;
            const r = v.reel;
            const bend = r ? clamp01(r.tension) : (v.phase === 'bite' ? 0.35 : 0);
            const tipX = TIP.x + bend * 16;
            const tipY = TIP.y + bend * 26;
            $('vy-rod').setAttribute('d', `M34 250 Q${70 + bend * 10} ${150 + bend * 12} ${tipX} ${tipY}`);

            const line = $('vy-line');
            const float = $('vy-float');
            const hooked = $('vy-hooked');
            const lineOn = sc.floatVisible || v.phase === 'reeling';

            if (lineOn) {
                const sag = v.phase === 'waiting' ? 22 : (v.phase === 'flying' ? 8 : 0);
                const mx = (tipX + sc.fx) / 2;
                const my = (tipY + sc.fy) / 2 + sag;
                line.setAttribute('d', `M${tipX} ${tipY} Q${mx} ${my} ${sc.fx} ${sc.fy}`);
            } else {
                // Vlasec visí ze špičky prutu
                line.setAttribute('d', `M${tipX} ${tipY} q2 30 -4 52`);
            }

            float.style.display = sc.floatVisible ? '' : 'none';
            if (sc.floatVisible) float.setAttribute('transform', `translate(${sc.fx.toFixed(1)} ${sc.fy.toFixed(1)})`);

            if (v.phase === 'reeling') {
                hooked.style.display = '';
                hooked.style.opacity = 1;
                hooked.setAttribute('transform', `translate(${sc.fx.toFixed(1)} ${sc.fy.toFixed(1)})`);
            } else if (v.anim && v.anim.type === 'pusteni') {
                const t = v.anim.t;
                hooked.style.display = '';
                hooked.style.opacity = 1 - t;
                hooked.setAttribute('transform',
                    `translate(${lerp(SHORE.x, 340, t).toFixed(1)} ${(lerp(SHORE.y, 170, t) + Math.sin(t * 12) * 4).toFixed(1)}) scale(-1 1)`);
            } else {
                hooked.style.display = 'none';
            }
        },

        // --- Co se chytilo ---
        vytazeno: () => {
            const st = v.st;
            v.setPhase('busy');
            app.fx.play('splash');
            v.ripple(SHORE.x, SHORE.y);
            const typ = st.aktualni.typ;
            if (typ === 'odpad') {
                st.aktualni.odpad = pick(ODPADKY);
                v.pop(st.aktualni.odpad.emoji);
                v.later(v.odpadFlow, 700);
            } else if (typ === 'zlata') {
                v.pop('✨');
                app.fx.play('magic');
                v.later(v.zlataFlow, 700);
            } else {
                v.pop('💦');
                app.fx.play('fanfare');
                v.later(v.rybaFlow, 600);
            }
        },

        isUslechtila: (fish) => USLECHTILE.includes(fish.nazev_cz),
        isLososovita: (fish) => LOSOSOVITE.includes(fish.nazev_cz),

        vHajeniDnes: (fish) => {
            const hajeni = app.getHajeni(fish);
            return !!hajeni && app.jeVHajeni(hajeni, v.st.md);
        },

        // Vybere rybu pro nához. Ušlechtilé ryby berou častěji, aby došlo i na denní limit 2 kusů.
        vyberRybu: () => {
            const st = v.st;
            const sFotkou = app.dataRyby.filter(f => f.fotografie && f.fotografie.length > 0);
            const uslVeVezirku = st.vezirek.filter(v.isUslechtila).length;

            // Past na denní limit: ve vezírku už jsou 2 ušlechtilé ryby a bere třetí, jinak v pořádku
            if (uslVeVezirku >= LIMIT_USLECHTILE && Math.random() < 0.6) {
                const kandidati = sFotkou.filter(f => v.isUslechtila(f) && !v.vHajeniDnes(f));
                if (kandidati.length) {
                    const fish = pick(kandidati);
                    return { fish, delka: v.genDelka(fish, true) };
                }
            }

            let kandidati = sFotkou.filter(f => !st.pouziteRyby.has(f.id));
            if (!kandidati.length) kandidati = sFotkou;
            const losy = [];
            kandidati.forEach(f => {
                const vaha = v.isUslechtila(f) ? 3 : 1;
                for (let i = 0; i < vaha; i++) losy.push(f);
            });
            const fish = pick(losy);
            st.pouziteRyby.add(fish.id);
            // Ušlechtilá ryba mimo hájení má častěji míru, ať se vezírek plní
            const chceMiru = v.isUslechtila(fish) ? Math.random() < 0.7 : Math.random() < 0.55;
            return { fish, delka: v.genDelka(fish, chceMiru) };
        },

        genDelka: (fish, chceMiru) => {
            const [od, do_] = TYP_DELKA[fish.nazev_cz] || [15, 40];
            const min = fish.min_delka_cm;
            if (!min || app.isChranena(fish) || v.vHajeniDnes(fish)) return app.randInt(od, do_);
            if (chceMiru) return app.randInt(min, Math.max(min + 3, do_));
            return app.randInt(Math.max(5, Math.min(od, min - 8)), min - 1);
        },

        // Verdikt podle řádu včetně denních limitů kusů (rozšiřuje app.posudSituaci)
        posud: (fish, delka) => {
            const verdict = app.posudSituaci(fish, v.st.md, delka);
            if (!verdict.keep) return verdict;
            const vez = v.st.vezirek;
            if (v.isUslechtila(fish) && vez.filter(v.isUslechtila).length >= LIMIT_USLECHTILE) {
                return { keep: false, reason: 'limit-uslechtile' };
            }
            if (v.isLososovita(fish) && vez.filter(v.isLososovita).length >= LIMIT_LOSOSOVITE) {
                return { keep: false, reason: 'limit-lososovite' };
            }
            return verdict;
        },

        vysvetleni: (fish, delka, verdict) => {
            if (verdict.reason === 'limit-uslechtile') {
                return `Ve vezírku už máš ${LIMIT_USLECHTILE} ušlechtilé ryby. V denním úlovku smí být nejvýše 2 kusy kapra, amura, štiky, candáta, bolena nebo sumce (i v kombinaci) – další musíš pustit.`;
            }
            if (verdict.reason === 'limit-lososovite') {
                return `Ve vezírku už máš ${LIMIT_LOSOSOVITE} lososovité ryby. Víc si jich v jednom dni ponechat nesmíš.`;
            }
            return app.vysvetleniSituace(fish, v.st.md, delka, verdict);
        },

        rybaFlow: () => {
            const st = v.st;
            const { fish, delka } = st.aktualni;
            const foto = 'assets/images/' + pick(fish.fotografie);
            const nasobic = st.zlataNavnada ? 2 : 1;
            if (st.zlataNavnada) {
                st.zlataNavnada = false;
                v.renderHud();
                app.fx.toast('✨ Zlatá návnada: tahle ryba je za dvojnásobek bodů!', 'toast-gold');
            }

            const jine = app.shuffle(app.dataRyby.filter(f => f.id !== fish.id)).slice(0, 3).map(f => f.nazev_cz);
            const zaznam = { fish, delka, poznal: false };

            // 1) Poznej rybu
            v.ask({
                text: '<strong>Máš ji!</strong> Co je to za rybu?',
                plain: 'Jak se jmenuje ryba na obrázku?',
                image: foto,
                options: app.shuffle([fish.nazev_cz, ...jine]),
                correct: fish.nazev_cz,
                body: 10 * nasobic,
                onDone: (ok) => {
                    zaznam.poznal = ok;
                    v.mereni(zaznam, foto, nasobic);
                }
            });
        },

        // 2) Přeměření ryby a rozhodnutí podle řádu
        mereni: (zaznam, foto, nasobic) => {
            const st = v.st;
            const { fish, delka } = zaznam;
            const panel = $('vy-panel');
            panel.innerHTML = `
                <div class="vy-mereni">
                    <img class="vy-photo" src="${foto}" alt="">
                    <div class="vy-pravitko"><div class="vy-pravitko-fill" id="vy-pravitko-fill"></div></div>
                    <div class="vy-mereni-text">📏 <strong>${fish.nazev_cz}</strong> měří <span id="vy-mereni-cm">0</span> cm</div>
                </div>`;

            const session = v.session;
            const start = performance.now();
            const DUR = 1100;
            const maxCm = (TYP_DELKA[fish.nazev_cz] || [15, 40])[1];
            const krok = (now) => {
                if (v.session !== session) return;
                const t = clamp01((now - start) / DUR);
                const e = 1 - Math.pow(1 - t, 3);
                const cm = $('vy-mereni-cm');
                if (!cm) return;
                cm.textContent = Math.round(delka * e);
                $('vy-pravitko-fill').style.width = `${Math.min(100, delka / Math.max(maxCm, delka) * 100) * e}%`;
                if (t < 1) requestAnimationFrame(krok);
                else v.rozhodnuti(zaznam, foto, nasobic);
            };
            requestAnimationFrame(krok);
        },

        rozhodnuti: (zaznam, foto, nasobic) => {
            const st = v.st;
            const { fish, delka } = zaznam;
            const verdict = v.posud(fish, delka);
            const datum = app.formatDatum(st.md);
            const vezirekText = st.vezirek.length
                ? ` Ve vezírku už máš: ${st.vezirek.map(f => f.nazev_cz).join(', ')}.`
                : '';

            v.ask({
                text: `Dnes je <strong>${datum}</strong>. <strong>${fish.nazev_cz}</strong> měří <strong>${delka} cm</strong>.${vezirekText} Co uděláš?`,
                plain: `Je ${datum}. Chytil jsi rybu: ${fish.nazev_cz}, ${delka} cm.${vezirekText} Co uděláš?`,
                image: foto,
                options: [KEEP, RELEASE],
                correct: verdict.keep ? KEEP : RELEASE,
                explanation: v.vysvetleni(fish, delka, verdict),
                body: 10 * nasobic,
                onAnswer: (ok, selected) => {
                    const ponechal = selected === KEEP;
                    let stav;
                    if (ponechal && verdict.keep) {
                        st.vezirek.push(fish);
                        v.renderHud();
                        v.bump('vy-hud-vezirek-chip');
                        stav = 'ponechana';
                    } else if (ponechal) {
                        // Chtěl si nechat rybu, kterou nesmí – zasahuje rybářská stráž
                        app.fx.play('whistle');
                        v.showPostava(AVATAR_STRAZ);
                        v.say('🚨 <strong>Stát! Rybářská stráž!</strong> Tuhle rybu si nechat nesmíš.', 4000);
                        stav = 'prestupek';
                    } else {
                        v.anim = { type: 'pusteni', t: 0, dur: 1.4 };
                        v.say(verdict.keep ? 'Ryba odplouvá… a tuhle sis přitom mohl nechat.' : '„Díky, rybáři!“ 🫧', 3000);
                        stav = 'pustena';
                    }
                    st.ulovky.push({ nazev: fish.nazev_cz, delka, stav, ok });

                    if (zaznam.poznal) {
                        const sb = app.profil.zaznamenejUlovek(fish, delka);
                        if (sb.novy) app.fx.toast(`🆕 Nový druh ve sbírce: <strong>${fish.nazev_cz}</strong>`, 'toast-green');
                        else if (sb.rekord) app.fx.toast(`🏆 Osobní rekord: ${fish.nazev_cz} ${delka} cm`, 'toast-gold');
                    }
                },
                onDone: () => {
                    v.hidePostava();
                    v.nextStep();
                }
            });
        },

        odpadFlow: () => {
            const odpad = v.st.aktualni.odpad;
            const spravne = '🗑️ Odnesu ji do koše';
            v.ask({
                text: `${odpad.emoji} Ale ne! Vytáhl jsi z vody <strong>${odpad.koho}</strong>. Co s ní uděláš?`,
                plain: `Vytáhl jsi z vody ${odpad.koho}. Co s ní uděláš?`,
                options: app.shuffle([spravne, '🌊 Hodím ji zpátky do vody', '🌿 Nechám ji ležet na břehu']),
                correct: spravne,
                explanation: 'Odpadky se nesmí nechávat na břehu ani házet do vody. Správný rybář udržuje u vody pořádek a uklidí i to, co tam nechali jiní.',
                body: 5,
                onDone: v.nextStep
            });
        },

        zlataFlow: () => {
            const st = v.st;
            v.showPostava(AVATAR_ZLATA);
            const prani = [
                { text: '⭐ 25 bodů', fn: () => { v.addBody(25); app.fx.play('coin'); } },
                { text: '🪱 2 návnady navíc', fn: () => { st.navnady += 2; st.celkemHodu += 2; v.renderHud(); v.bump('vy-hud-navnady-chip'); } },
                { text: '✨ Zlatá návnada (další ryba za dvojnásobek)', fn: () => { st.zlataNavnada = true; v.renderHud(); } }
            ];
            v.openPanel(`
                <div class="vy-dialog vy-dialog-gold">
                    <div class="vy-avatar">${AVATAR_ZLATA}</div>
                    <div class="vy-speech">
                        <div class="vy-kdo">Zlatá rybka</div>
                        <div>„Pusť mě zpátky do vody, rybáři, a splním ti jedno přání!“</div>
                    </div>
                </div>
                <div class="grid-options vy-options vy-options-1"></div>`);
            const box = $('vy-panel').querySelector('.vy-options');
            prani.forEach(p => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = p.text;
                btn.onclick = () => {
                    box.querySelectorAll('button').forEach(b => b.disabled = true);
                    btn.classList.add('correct');
                    app.fx.play('magic');
                    p.fn();
                    v.anim = { type: 'pusteni', t: 0, dur: 1.4 };
                    v.say('„Tvé přání je splněno!“ ✨', 2500);
                    v.later(() => { v.hidePostava(); v.nextStep(); }, 1300);
                };
                box.appendChild(btn);
            });
        },

        nahodnaOtazkaZRadu: () => {
            const st = v.st;
            let pool = app.dataRad.filter(q => !st.pouziteOtazky.has(q.id));
            if (!pool.length) pool = app.dataRad;
            const q = pick(pool);
            st.pouziteOtazky.add(q.id);
            return q;
        },

        vodnikFlow: () => {
            const st = v.st;
            const q = v.nahodnaOtazkaZRadu();
            app.fx.play('brekeke');
            app.fx.vibrate([120, 60, 120]);
            v.showPostava(AVATAR_VODNIK);
            v.ripple(v.sc.target.x, v.sc.target.y);
            v.ask({
                avatar: AVATAR_VODNIK,
                kdo: 'Vodník',
                variant: 'vy-dialog-vodnik',
                text: `„Brekeke! Kdopak mi to tahá za šos? Uhodneš-li mou hádanku, dostaneš <strong>zlatou návnadu</strong>. Neuhodneš – vezmu si žížalu!“<div class="vy-otazka">${q.otazka}</div>`,
                plain: q.otazka,
                options: app.shuffle(q.moznosti),
                correct: q.spravna_odpoved,
                explanation: q.vysvetleni,
                body: 10,
                onAnswer: (ok) => {
                    if (ok) {
                        st.zlataNavnada = true;
                        app.fx.play('magic');
                        app.fx.toast('✨ Vodník ti dal zlatou návnadu: další ryba za dvojnásobek bodů!', 'toast-gold');
                    } else if (st.navnady > 0) {
                        st.navnady--;
                        v.bump('vy-hud-navnady-chip');
                        v.say('„Brekeke, žížala je moje!“ 🪱', 3000);
                    }
                    v.renderHud();
                },
                onDone: () => {
                    v.hidePostava();
                    v.nextStep();
                }
            });
        },

        strazFlow: () => {
            const q = v.nahodnaOtazkaZRadu();
            v.setPhase('busy');
            app.fx.play('whistle');
            v.showPostava(AVATAR_STRAZ);
            v.say('🚨 Někdo jde po břehu…', 2500);
            v.ask({
                avatar: AVATAR_STRAZ,
                kdo: 'Rybářská stráž',
                variant: 'vy-dialog-straz',
                text: `„Dobrý den, kontrola! Povolenku máš, to je dobře. A teď mi řekni:“<div class="vy-otazka">${q.otazka}</div>`,
                plain: q.otazka,
                options: app.shuffle(q.moznosti),
                correct: q.spravna_odpoved,
                explanation: q.vysvetleni,
                body: 10,
                onAnswer: (ok) => v.say(ok ? '„Výborně. Petrův zdar!“' : '„To si ještě nastuduj, rybáři.“', 3000),
                onDone: () => {
                    v.hidePostava();
                    v.nextStep();
                }
            });
        },

        // --- Panel s otázkou ---
        openPanel: (html) => {
            const panel = $('vy-panel');
            panel.innerHTML = html;
            panel.classList.remove('hidden');
            $('vy-scene').classList.add('vy-scene-compact');
            v.setPhase('busy');
        },

        closePanel: () => {
            const panel = $('vy-panel');
            panel.innerHTML = '';
            panel.classList.add('hidden');
            $('vy-scene').classList.remove('vy-scene-compact');
        },

        // Otázka s možnostmi: o = { text, plain, image, options, correct, explanation, body, avatar, kdo, variant, onAnswer, onDone }
        ask: (o) => {
            const st = v.st;
            const dialog = o.avatar
                ? `<div class="vy-dialog ${o.variant || ''}">
                       <div class="vy-avatar">${o.avatar}</div>
                       <div class="vy-speech"><div class="vy-kdo">${o.kdo}</div><div>${o.text}</div></div>
                   </div>`
                : `<div class="vy-question">${o.text}</div>`;
            v.openPanel(`
                ${dialog}
                ${o.image ? `<img class="vy-photo" src="${o.image}" alt="" title="Klikni pro zvětšení">` : ''}
                <div class="grid-options vy-options ${o.options.length === 3 ? 'vy-options-1' : ''}"></div>
                <div class="vy-feedback hidden"></div>
                <button type="button" class="vy-next hidden">Pokračovat ▶</button>`);

            const panel = $('vy-panel');
            const img = panel.querySelector('.vy-photo');
            if (img) img.onclick = () => app.openImage(o.image);

            const question = {
                text: o.plain,
                image: o.image || null,
                options: o.options,
                correctAnswer: o.correct,
                explanation: o.explanation || null
            };
            st.otazky.push(question);

            const box = panel.querySelector('.vy-options');
            o.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = opt;
                btn.onclick = () => {
                    const buttons = box.querySelectorAll('button');
                    buttons.forEach(b => b.disabled = true);
                    const ok = opt === o.correct;
                    const feedback = panel.querySelector('.vy-feedback');
                    let html;

                    if (ok) {
                        st.spravne++;
                        st.serie++;
                        let body = o.body;
                        let serieText = '';
                        if (st.serie >= 3) {
                            body += 2;
                            serieText = ` <span class="vy-serie">🔥 ${st.serie}× v řadě (+2)</span>`;
                        }
                        btn.classList.add('correct');
                        app.fx.play('correct');
                        v.addBody(body);
                        html = `<span class="vy-ok">✅ Správně! +${body} b.</span>${serieText}`;
                    } else {
                        st.serie = 0;
                        btn.classList.add('wrong', 'shake');
                        buttons.forEach(b => { if (b.textContent === o.correct) b.classList.add('correct'); });
                        app.fx.play('wrong');
                        app.mistakes.push({
                            question,
                            text: o.plain,
                            image: o.image || null,
                            selected: opt,
                            correct: o.correct,
                            explanation: o.explanation || null
                        });
                        html = `<span class="vy-bad">❌ Správně je: ${o.correct}</span>`;
                    }
                    if (o.explanation) html += `<small>💡 ${o.explanation}</small>`;
                    feedback.innerHTML = html;
                    feedback.classList.remove('hidden');
                    feedback.classList.toggle('vy-feedback-ok', ok);

                    if (o.onAnswer) o.onAnswer(ok, opt);

                    const next = panel.querySelector('.vy-next');
                    next.classList.remove('hidden');
                    next.onclick = () => o.onDone(ok);
                    next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                };
                box.appendChild(btn);
            });
        },

        // --- Další krok po dokončení náhozu ---
        nextStep: () => {
            const st = v.st;
            v.closePanel();
            v.sc.floatVisible = false;
            if (!st.strazByla && st.hod >= st.strazPo) {
                st.strazByla = true;
                v.strazFlow();
                return;
            }
            if (st.navnady <= 0) {
                v.finish();
                return;
            }
            v.setPhase('idle');
        },

        finish: () => {
            const st = v.st;
            v.setPhase('busy');
            st.hod = st.celkemHodu;
            v.updateSky();
            v.say('Slunce zapadá a návnady došly. Balíme!', 0);
            v.later(v.showResult, 1600);
        },

        showResult: () => {
            const st = v.st;
            v.stop();

            const pocetOtazek = st.otazky.length;
            const uspesnost = pocetOtazek ? st.spravne / pocetOtazek : 0;
            app.questions = st.otazky;   // kvůli uložení počtu otázek a „Opakovat jen chyby“
            app.score = st.spravne;
            app.showResultGif(uspesnost);

            const STAVY = {
                ponechana: '🧺 ponechána',
                pustena: '↩️ puštěna',
                prestupek: '🚨 přestupek'
            };
            const radky = st.ulovky.map(u => `
                <tr>
                    <td>${u.nazev}</td>
                    <td>${u.delka} cm</td>
                    <td>${STAVY[u.stav]}</td>
                    <td>${u.ok ? '✅' : '❌'}</td>
                </tr>`).join('');
            const listek = st.ulovky.length
                ? `<div class="vy-listek">
                       <div class="vy-listek-nadpis">📋 Úlovkový lístek – ${app.formatDatum(st.md)}</div>
                       <table><thead><tr><th>Ryba</th><th>Délka</th><th>Co s ní</th><th></th></tr></thead><tbody>${radky}</tbody></table>
                   </div>`
                : '<p><small>Dneska nic nezabralo. Zkus to znovu – ryby čekají!</small></p>';

            document.getElementById('result-title').textContent = 'Výprava skončila!';
            document.getElementById('result-text').innerHTML = `
                <span class="vy-vysledek-body">⭐ ${st.body} bodů</span><br>
                <small>${st.spravne} z ${pocetOtazek} otázek správně · ve vezírku: ${st.vezirek.length} ks</small>
                ${listek}`;

            app.profil.data.vypravy++;
            app.profil.addXp(Math.round(st.body / 4));
            app.profil.save();
            if (st.body > 0) app.saveScoreToDatabase(st.body, 'vyprava');

            app.renderMistakes();
            app.showScreen('screen-result');
            document.querySelector('#screen-result .secondary').onclick = () => app.showLeaderboard('vyprava');
            if (uspesnost > 0.8 && pocetOtazek > 0) {
                app.fx.play('fanfare');
                app.fx.confetti();
            }
        }
    };

    app.vyprava = v;
})();
