// Globální proměnné pro Firebase a Firestore
let db;

// PŘEDPOKLAD: Globální proměnná 'firebaseConfig' je definována a načtena ze souboru config.js.
// SDK soubory (firebase-app.js, firebase-firestore.js) jsou načteny v index.html.

const app = {
    // Statická data pro ryby a řád
    dataRyby: [],
    dataRad: [],
    user: null,
    
    // Stav hry
    gameMode: 'classic', // 'classic', 'timeattack', 'knowledge'
    score: 0,
    currentQuestionIndex: 0,
    questions: [],
    mistakes: [], // chybně zodpovězené otázky v aktuální hře
    isRetry: false, // true = opakování chyb (výsledek se neukládá do žebříčku)
    maxQuestions: 5,
    
    // Proměnné pro časovku
    timerInterval: null,
    startTime: 0,
    penaltyMs: 0,
    PENALTY_PER_MISTAKE_MS: 3000, // Kvíz na čas: trest za každou chybnou odpověď

    // Proměnné pro galerii
    galleryFishIndex: 0,
    galleryPhotoIndex: 0,

    // --- MODAL & GALERIE ---
    openGallery: (fishIndex, photoIndex) => {
        app.galleryFishIndex = fishIndex;
        app.galleryPhotoIndex = photoIndex;
        app.renderGalleryImage();
        document.getElementById('image-modal').classList.remove('hidden');
    },

    renderGalleryImage: () => {
        const fish = app.dataRyby[app.galleryFishIndex];
        const photos = fish.fotografie;
        const src = 'assets/images/' + photos[app.galleryPhotoIndex];
        document.getElementById('img-expanded').src = src;
        document.getElementById('gallery-fish-name').textContent = fish.nazev_cz;
        document.getElementById('gallery-counter').textContent =
            photos.length > 1 ? `${app.galleryPhotoIndex + 1} / ${photos.length}` : '';
        const prevBtn = document.querySelector('.gallery-prev');
        const nextBtn = document.querySelector('.gallery-next');
        const hidden = photos.length <= 1;
        prevBtn.classList.toggle('hidden', hidden);
        nextBtn.classList.toggle('hidden', hidden);
    },

    galleryPrev: () => {
        const photos = app.dataRyby[app.galleryFishIndex].fotografie;
        app.galleryPhotoIndex = (app.galleryPhotoIndex - 1 + photos.length) % photos.length;
        app.renderGalleryImage();
    },

    galleryNext: () => {
        const photos = app.dataRyby[app.galleryFishIndex].fotografie;
        app.galleryPhotoIndex = (app.galleryPhotoIndex + 1) % photos.length;
        app.renderGalleryImage();
    },

    openImage: (src) => {
        // Jednoduchý mód pro obrázky z kvízu (bez galerie)
        document.getElementById('img-expanded').src = src;
        document.getElementById('gallery-fish-name').textContent = '';
        document.getElementById('gallery-counter').textContent = '';
        document.querySelector('.gallery-prev').classList.add('hidden');
        document.querySelector('.gallery-next').classList.add('hidden');
        document.getElementById('image-modal').classList.remove('hidden');
    },

    closeImage: () => {
        document.getElementById('image-modal').classList.add('hidden');
    },

    formatHajeni: (fish) => {
        if (fish.doba_hajeni_od === "Celoročně" && fish.doba_hajeni_do === "chráněný") {
            return "🚫 Celoročně chráněný";
        }
        if (fish.doba_hajeni_od && fish.doba_hajeni_do) {
            return `${fish.doba_hajeni_od} - ${fish.doba_hajeni_do}`;
        }
        return "✅ Bez hájení";
    },

    formatDelka: (fish) => {
        if (!fish.min_delka_cm) {
            return "❌ Nemá stanoveno"; 
        }
        return `${fish.min_delka_cm} cm`;
    },

    // Fisher–Yates: vrací zamíchanou kopii, původní pole zůstává beze změny
    shuffle: (arr) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    formatTime: (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const hundreds = Math.floor((ms % 1000) / 10); 
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundreds.toString().padStart(2, '0')}`;
    },

    // --- INICIALIZACE A FIREBASE ZAPOJENÍ ---
    init: async () => {
        // Inicializace Firebase (používá globální proměnnou firebaseConfig)
        const isConfigured = typeof firebaseConfig !== 'undefined';
        if (typeof firebase !== 'undefined' && isConfigured) {
            try {
                firebase.initializeApp(firebaseConfig);
                db = firebase.firestore();
                console.log("✅ Firebase inicializován.");
            } catch (error) {
                console.error("Chyba při inicializaci Firebase:", error);
            }
        } else {
             console.warn("⚠️ Firebase není inicializován (chybí soubor config.js nebo SDK). Žebříček bude nefunkční.");
        }

        // Klávesnicová navigace v galerii
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('image-modal');
            if (!modal.classList.contains('hidden')) {
                if (e.key === 'ArrowLeft') app.galleryPrev();
                else if (e.key === 'ArrowRight') app.galleryNext();
                else if (e.key === 'Escape') app.closeImage();
            }
        });

        // Předvyplnění zapamatované přezdívky
        document.getElementById('username-input').value = app.loadSavedUsername();

        // Načtení statických dat (Ryby a Řád)
        try {
            const resRyby = await fetch('data/data_ryby.json');
            if (!resRyby.ok) throw new Error(`Soubor data_ryby.json nebyl nalezen (CHYBA 404)`);
            app.dataRyby = await resRyby.json();

            const resRad = await fetch('data/data_rad.json');
            if (!resRad.ok) throw new Error(`Soubor data_rad.json nebyl nalezen (CHYBA 404)`);
            app.dataRad = await resRad.json();
            
        } catch (error) {
            console.error("KRITICKÁ CHYBA LOKÁLNÍCH DAT:", error);
            alert(`⚠️ NEPODDAŘILO SE NAČÍST DATA: ${error.message}\n\nZkontrolujte Cestu (data/) a Syntaxi JSON souborů.`);
        }
    },
    
    showScreen: (screenId) => {
        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
        document.querySelector('.help-fab').classList.add('hidden');
    },

    addEmoji: (emoji) => {
        const input = document.getElementById('username-input');
        if (input.value.length < 15) {
            input.value += emoji;
        }
        input.focus();
    },

    // Zapamatování přezdívky (localStorage může být nedostupné, např. v anonymním okně)
    USERNAME_KEY: 'molipa_username',

    loadSavedUsername: () => {
        try {
            return localStorage.getItem(app.USERNAME_KEY) || '';
        } catch (e) {
            return '';
        }
    },

    saveUsername: (name) => {
        try {
            localStorage.setItem(app.USERNAME_KEY, name);
        } catch (e) { /* nevadí, jen se jméno nezapamatuje */ }
    },

    changeUser: () => {
        app.stopTimer();
        app.user = null;
        document.getElementById('user-display').classList.add('hidden');
        app.showScreen('screen-login');
        const input = document.getElementById('username-input');
        input.focus();
        input.select();
    },

    login: () => {
        const name = document.getElementById('username-input').value.trim();
        if (name) {
            app.user = name;
            app.saveUsername(name);
            document.getElementById('current-username').textContent = name;
            document.getElementById('user-display').classList.remove('hidden');
            app.showMenu();
        } else {
            alert("Zadej jméno!");
        }
    },

    showMenu: () => {
        app.stopTimer();
        app.showScreen('screen-menu');
        document.querySelector('.help-fab').classList.remove('hidden');
    },

    showLearning: () => {
        const list = document.getElementById('fish-list');
        list.innerHTML = '';
        app.dataRyby.forEach((fish, fishIndex) => {
            const card = document.createElement('div');
            card.className = 'fish-card';
            const imgPath = fish.fotografie.length > 0 ? 'assets/images/' + fish.fotografie[0] : '';
            const photoCount = fish.fotografie.length;
            const badge = photoCount > 1 ? `<span class="photo-count-badge">📷 ${photoCount}</span>` : '';

            card.innerHTML = `
                <div style="position:relative">
                    <img src="${imgPath}" alt="${fish.nazev_cz}" onclick="app.openGallery(${fishIndex}, 0)" style="cursor:pointer" title="Klikni pro galerii fotek">
                    ${badge}
                </div>
                <h3>${fish.nazev_cz}</h3>
                <p><i>${fish.nazev_latinsky}</i></p>
                <p><strong>Min. délka:</strong> ${app.formatDelka(fish)}</p>
                <p><strong>Hájení:</strong> ${app.formatHajeni(fish)}</p>
            `;
            list.appendChild(card);
        });
        app.showScreen('screen-learning');
    },

    showHelp: () => {
        const list = document.getElementById('help-list');
        list.innerHTML = '';
        app.dataRad.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'help-card';
            const optionsHtml = q.moznosti.map(opt => {
                const isCorrect = opt === q.spravna_odpoved;
                return `<span class="help-option ${isCorrect ? 'help-option-correct' : ''}">${opt}</span>`;
            }).join('');
            card.innerHTML = `
                <div class="help-question"><strong>${index + 1}. ${q.otazka}</strong></div>
                <div class="help-options">${optionsHtml}</div>
                <div class="help-explanation">💡 ${q.vysvetleni}</div>
            `;
            list.appendChild(card);
        });
        app.showScreen('screen-help');
    },

    // --- LOGIKA KVÍZU ---

    startQuiz: (mode) => {
        app.gameMode = mode;
        const countInput = document.getElementById('question-count');
        let count = parseInt(countInput.value);
        if (isNaN(count) || count < 1) count = 5;
        app.maxQuestions = count;

        app.isRetry = false;
        app.generateQuestions();
        app.launchQuiz();
    },

    // Opakování otázek, které hráč právě zkazil (bez ukládání do žebříčku a bez časovače)
    startRetry: () => {
        if (app.mistakes.length === 0) return;

        app.isRetry = true;
        if (app.gameMode === 'timeattack') app.gameMode = 'classic';
        app.questions = app.shuffle(app.mistakes.map(m => ({
            ...m.question,
            options: app.shuffle(m.question.options)
        })));
        app.launchQuiz();
    },

    launchQuiz: () => {
        const mode = app.gameMode;
        app.score = 0;
        app.penaltyMs = 0;
        app.mistakes = [];
        app.currentQuestionIndex = 0;
        app.showScreen('screen-quiz');

        document.getElementById('status-classic').classList.add('hidden');
        document.getElementById('status-time').classList.add('hidden');

        if (mode === 'timeattack') {
            document.getElementById('status-time').classList.remove('hidden');
            document.getElementById('q-current-time').textContent = 1;
            document.getElementById('q-total-time').textContent = app.questions.length;
            app.startTimer();
        } else {
            document.getElementById('status-classic').classList.remove('hidden');
            document.getElementById('q-current').textContent = 1;
            document.getElementById('q-total').textContent = app.questions.length;
            document.getElementById('score').textContent = 0;
        }

        app.renderQuestion();
    },

    startTimer: () => {
        app.startTime = Date.now();
        const timerEl = document.getElementById('timer-val');
        app.timerInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - app.startTime + app.penaltyMs;
            timerEl.textContent = app.formatTime(elapsed);
        }, 50);
    },

    // Krátce zobrazí u časovače „+3 s“ po chybné odpovědi
    flashPenalty: () => {
        const el = document.getElementById('penalty-flash');
        el.textContent = `+${app.PENALTY_PER_MISTAKE_MS / 1000} s`;
        el.classList.remove('show');
        void el.offsetWidth; // restart animace
        el.classList.add('show');
    },

    stopTimer: () => {
        if (app.timerInterval) clearInterval(app.timerInterval);
    },

    // --- HRA „CO SE DNES NECHYTÁ?“ (režim 'situace') ---

    MESICE: ['ledna', 'února', 'března', 'dubna', 'května', 'června',
             'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'],
    DNY_V_MESICI: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],

    randInt: (min, max) => min + Math.floor(Math.random() * (max - min + 1)),

    // "16. března" -> číslo 316 (měsíc*100 + den), pro porovnávání dat bez roku
    parseDatum: (text) => {
        const m = /^(\d+)\.\s*(\S+)$/.exec((text || '').trim());
        if (!m) return null;
        const month = app.MESICE.indexOf(m[2]);
        return month < 0 ? null : (month + 1) * 100 + parseInt(m[1]);
    },

    formatDatum: (md) => `${md % 100}. ${app.MESICE[Math.floor(md / 100) - 1]}`,

    randomDatum: () => {
        const month = app.randInt(1, 12);
        return month * 100 + app.randInt(1, app.DNY_V_MESICI[month - 1]);
    },

    // Interval hájení ryby jako {od, do} nebo null (chráněné ryby řeší isChranena)
    getHajeni: (fish) => {
        const od = app.parseDatum(fish.doba_hajeni_od);
        const do_ = app.parseDatum(fish.doba_hajeni_do);
        return (od && do_) ? { od, do: do_ } : null;
    },

    isChranena: (fish) =>
        fish.doba_hajeni_od === 'Celoročně' && fish.doba_hajeni_do === 'chráněný',

    // Je datum v hájení? Podporuje i interval přes přelom roku (např. 1. prosince – 31. srpna)
    jeVHajeni: (hajeni, md) => hajeni.od <= hajeni.do
        ? (md >= hajeni.od && md <= hajeni.do)
        : (md >= hajeni.od || md <= hajeni.do),

    randomDatumPodleHajeni: (hajeni, vHajeni) => {
        for (let i = 0; i < 200; i++) {
            const md = app.randomDatum();
            if (app.jeVHajeni(hajeni, md) === vHajeni) return md;
        }
        return app.randomDatum();
    },

    // Rozhodnutí podle pravidel: smí si hráč rybu ponechat? (jediný zdroj pravdy pro správnou odpověď)
    posudSituaci: (fish, md, delka) => {
        if (app.isChranena(fish)) return { keep: false, reason: 'chranena' };
        const hajeni = app.getHajeni(fish);
        if (hajeni && app.jeVHajeni(hajeni, md)) return { keep: false, reason: 'hajeni' };
        if (fish.min_delka_cm && delka < fish.min_delka_cm) return { keep: false, reason: 'mira' };
        return { keep: true, reason: 'ok' };
    },

    // Sestaví situaci s požadovaným výsledkem; null, pokud to pro danou rybu nejde
    sestavSituaci: (fish, chceKeep) => {
        const hajeni = app.getHajeni(fish);
        const min = fish.min_delka_cm || 0;
        const okDelka = () => min ? min + app.randInt(0, 25) : app.randInt(15, 60);
        let md, delka;

        if (chceKeep) {
            if (app.isChranena(fish)) return null;
            md = hajeni ? app.randomDatumPodleHajeni(hajeni, false) : app.randomDatum();
            delka = okDelka();
        } else {
            const duvody = [];
            if (app.isChranena(fish)) duvody.push('chranena');
            if (hajeni) duvody.push('hajeni');
            if (min) duvody.push('mira');
            if (duvody.length === 0) return null;

            const duvod = duvody[app.randInt(0, duvody.length - 1)];
            if (duvod === 'chranena') {
                md = app.randomDatum();
                delka = app.randInt(15, 60);
            } else if (duvod === 'hajeni') {
                md = app.randomDatumPodleHajeni(hajeni, true);
                delka = okDelka();
            } else {
                md = hajeni ? app.randomDatumPodleHajeni(hajeni, false) : app.randomDatum();
                delka = Math.max(5, min - app.randInt(1, Math.max(1, Math.round(min * 0.35))));
            }
        }
        return { md, delka };
    },

    vysvetleniSituace: (fish, md, delka, verdict) => {
        const datum = app.formatDatum(md);
        const hajeni = app.getHajeni(fish);
        if (verdict.reason === 'chranena') {
            return `🚫 ${fish.nazev_cz} je celoročně chráněná ryba, musíš ji vždy pustit zpět.`;
        }
        if (verdict.reason === 'hajeni') {
            return `Doba hájení: ${fish.doba_hajeni_od} – ${fish.doba_hajeni_do}. Dne ${datum} je ryba v hájení, musíš ji pustit.`;
        }
        if (verdict.reason === 'mira') {
            return `Minimální lovná míra je ${fish.min_delka_cm} cm, tvoje ryba má ${delka} cm. Je podměrečná, pusť ji.`;
        }
        const casti = [];
        if (fish.min_delka_cm) casti.push(`míra ${fish.min_delka_cm} cm je splněna (${delka} cm)`);
        else casti.push('míra není stanovena');
        casti.push(hajeni
            ? `${datum} je mimo hájení (${fish.doba_hajeni_od} – ${fish.doba_hajeni_do})`
            : 'ryba nemá dobu hájení');
        return `Ryba je v pořádku: ${casti.join(', ')}. Můžeš si ji ponechat.`;
    },

    generateSituations: () => {
        const KEEP = '✅ Ponechat si';
        const RELEASE = '↩️ Pustit zpět';
        const questions = [];
        let pool = app.shuffle(app.dataRyby);

        while (questions.length < app.maxQuestions) {
            if (pool.length === 0) pool = app.shuffle(app.dataRyby);
            const fish = pool.pop();

            // Cca polovina situací má skončit ponecháním, polovina puštěním
            const chceKeep = Math.random() < 0.5;
            const sit = app.sestavSituaci(fish, chceKeep) || app.sestavSituaci(fish, !chceKeep);
            if (!sit) continue;

            const verdict = app.posudSituaci(fish, sit.md, sit.delka);
            questions.push({
                text: `Je ${app.formatDatum(sit.md)}. Chytil jsi rybu: ${fish.nazev_cz}, ${sit.delka} cm. Co uděláš?`,
                image: fish.fotografie && fish.fotografie.length > 0
                    ? 'assets/images/' + fish.fotografie[app.randInt(0, fish.fotografie.length - 1)]
                    : null,
                options: [KEEP, RELEASE],
                correctAnswer: verdict.keep ? KEEP : RELEASE,
                explanation: app.vysvetleniSituace(fish, sit.md, sit.delka, verdict)
            });
        }
        return questions;
    },

    generateQuestions: () => {
        app.questions = [];

        // --- 0. Mód CO SE DNES NECHYTÁ? (situace z míry a hájení) ---
        if (app.gameMode === 'situace') {
            app.questions = app.generateSituations();
            return;
        }

        // --- 1. Mód ZNALEC ŘÁDU (z data_rad.json) ---
        if (app.gameMode === 'knowledge') {
            const shuffled = app.shuffle(app.dataRad);
            const selected = shuffled.slice(0, Math.min(app.maxQuestions, app.dataRad.length));

            app.questions = selected.map(q => ({
                text: q.otazka,
                image: null,
                options: app.shuffle(q.moznosti),
                correctAnswer: q.spravna_odpoved,
                explanation: q.vysvetleni
            }));
            return;
        }

        // --- 2. Mód POZNÁVAČKA (pouze foto) ---
        if (app.gameMode === 'poznavacka') {
            const fishWithPhotos = app.dataRyby.filter(f => f.fotografie && f.fotografie.length > 0);
            const shuffled = app.shuffle(fishWithPhotos);
            const selected = shuffled.slice(0, Math.min(app.maxQuestions, fishWithPhotos.length));

            app.questions = selected.map(targetFish => {
                const randomPhotoIdx = Math.floor(Math.random() * targetFish.fotografie.length);
                const correctVal = targetFish.nazev_cz;
                let options = [correctVal];
                const otherFish = app.shuffle(fishWithPhotos.filter(f => f.nazev_cz !== correctVal));
                let i = 0;
                while (options.length < 4 && i < otherFish.length) {
                    options.push(otherFish[i].nazev_cz);
                    i++;
                }
                return {
                    text: "Jak se jmenuje ryba na obrázku?",
                    image: 'assets/images/' + targetFish.fotografie[randomPhotoIdx],
                    options: app.shuffle(options),
                    correctAnswer: correctVal,
                    explanation: null
                };
            });
            return;
        }

        // --- 3. Módy KVÍZ (Classic + Timeattack) ---
        let shuffledPool = app.shuffle(app.dataRyby);

        for (let i = 0; i < app.maxQuestions; i++) {
            if (shuffledPool.length === 0) {
                shuffledPool = app.shuffle(app.dataRyby);
            }
            const targetFish = shuffledPool.pop();
            const type = Math.random() > 0.5 ? 1 : 2;
            
            let questionObj = { 
                fish: targetFish, 
                type: type, 
                options: [],
                explanation: null
            };
            let correctVal, questionTypeKey;

            // Fallback: Pokud ryba nemá fotky, přepneme na textovou otázku
            let actualType = type;
            if (actualType === 1 && (!targetFish.fotografie || targetFish.fotografie.length === 0)) {
                actualType = 2;
            }

            if (actualType === 1) {
                questionObj.text = "Jak se jmenuje ryba na obrázku?";
                const randomPhotoIdx = Math.floor(Math.random() * targetFish.fotografie.length);
                questionObj.image = 'assets/images/' + targetFish.fotografie[randomPhotoIdx];
                correctVal = targetFish.nazev_cz;
                questionTypeKey = 'nazev';
            } else {
                const ruleType = Math.random() > 0.5 ? 'length' : 'season';
                if (ruleType === 'length') {
                    questionObj.text = `Jaká je minimální lovná délka ryby: ${targetFish.nazev_cz}?`;
                    correctVal = app.formatDelka(targetFish);
                    questionTypeKey = 'delka'; 
                } else {
                    questionObj.text = `Kdy je doba hájení pro rybu: ${targetFish.nazev_cz}?`;
                    correctVal = app.formatHajeni(targetFish);
                    questionTypeKey = 'hajeni';
                }
            }

            questionObj.correctAnswer = correctVal;
            let options = [correctVal];
            
            let attempts = 0;
            while (options.length < 4 && attempts < 50) {
                attempts++;
                const randomFish = app.dataRyby[Math.floor(Math.random() * app.dataRyby.length)];
                let wrongVal;
                
                if (questionTypeKey === 'nazev') wrongVal = randomFish.nazev_cz;
                else if (questionTypeKey === 'delka') wrongVal = app.formatDelka(randomFish);
                else if (questionTypeKey === 'hajeni') wrongVal = app.formatHajeni(randomFish);

                if (!options.includes(wrongVal)) options.push(wrongVal);
            }
            
            questionObj.options = app.shuffle(options);
            app.questions.push(questionObj);
        }
    },

    renderQuestion: () => {
        const q = app.questions[app.currentQuestionIndex];
        const container = document.getElementById('question-container');
        const optionsContainer = document.getElementById('options-container');
        const feedback = document.getElementById('feedback');
        const nextBtn = document.getElementById('next-btn');

        feedback.className = 'hidden';
        nextBtn.className = 'hidden';
        nextBtn.style.backgroundColor = '';
        nextBtn.textContent = 'Další otázka';
        optionsContainer.innerHTML = '';
        
        if (app.gameMode === 'timeattack') {
            document.getElementById('q-current-time').textContent = app.currentQuestionIndex + 1;
        } else {
            document.getElementById('q-current').textContent = app.currentQuestionIndex + 1;
            document.getElementById('score').textContent = app.score;
            document.getElementById('q-total').textContent = app.questions.length;
        }

        let html = `<h3>${q.text}</h3>`;
        if (q.image) {
            html += `<img src="${q.image}" 
                     onclick="app.openImage('${q.image}')" 
                     style="max-width:100%; height:200px; object-fit:contain; border-radius:5px; cursor:zoom-in" 
                     title="Klikni pro zvětšení">`;
        }
        container.innerHTML = html;

        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt;
            btn.onclick = () => app.handleAnswer(btn, opt, q.correctAnswer, q.explanation);
            optionsContainer.appendChild(btn);
        });
    },

    handleAnswer: (btn, selected, correct, explanation) => {
        const isCorrect = (selected === correct);

        if (!isCorrect) {
            const q = app.questions[app.currentQuestionIndex];
            app.mistakes.push({
                question: q,
                text: q.text,
                image: q.image || null,
                selected: selected,
                correct: correct,
                explanation: explanation || null
            });
        }

        if (app.gameMode === 'timeattack') {
            // Zamezí dvojitému kliknutí během krátké pauzy před další otázkou
            document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
            if (isCorrect) {
                app.score++;
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
                app.penaltyMs += app.PENALTY_PER_MISTAKE_MS;
                app.flashPenalty();
            }
            setTimeout(() => app.nextQuestion(), 300);
            return; 
        }

        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true);
        const feedback = document.getElementById('feedback');
        const nextBtn = document.getElementById('next-btn');

        if (isCorrect) {
            app.score++;
            btn.classList.add('correct');
            nextBtn.style.backgroundColor = '#28a745';
            nextBtn.textContent = '✅ Správně! Další otázka';
            feedback.classList.add('hidden');
        } else {
            btn.classList.add('wrong');
            allBtns.forEach(b => {
                if (b.textContent === correct) b.classList.add('correct');
            });
            nextBtn.style.backgroundColor = '';
            nextBtn.textContent = 'Další otázka';
            let feedbackText = `<span style="color:red">Chyba! Správně je: ${correct}</span>`;
            if (explanation) {
                feedbackText += `<br><small style="color:#555; font-style:italic; display:block; margin-top:5px;">💡 ${explanation}</small>`;
            }
            feedback.innerHTML = feedbackText;
            feedback.classList.remove('hidden');
        }

        nextBtn.classList.remove('hidden');
    },

    nextQuestion: () => {
        app.currentQuestionIndex++;
        if (app.currentQuestionIndex < app.questions.length) {
            app.renderQuestion();
        } else {
            app.finishQuiz();
        }
    },

    // --- FIREBASE UKLÁDÁNÍ A NAČÍTÁNÍ ---

    saveScoreToDatabase: async (score, mode, duration = null) => {
        if (!app.user || !db) return;

        const collectionName = 'leaderboard';
        
        try {
            await db.collection(collectionName).add({
                name: app.user,
                score: score,
                mode: mode,
                durationMs: duration,
                questions: app.questions.length,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Skóre (${mode}) úspěšně uloženo na Firebase.`);

        } catch (e) {
            console.error("Chyba při ukládání skóre na Firebase: ", e);
        }
    },

    saveResultClassic: (score) => { app.saveScoreToDatabase(score, 'classic'); },
    saveResultTimeAttack: (score, timeMs) => { app.saveScoreToDatabase(score, 'timeattack', timeMs); },
    saveResultKnowledge: (score) => { app.saveScoreToDatabase(score, 'knowledge'); },
    saveResultPoznavacka: (score) => { app.saveScoreToDatabase(score, 'poznavacka'); },
    saveResultSituace: (score) => { app.saveScoreToDatabase(score, 'situace'); },

    finishQuiz: () => {
        app.stopTimer();
        
        let resultText = "";
        
        // --- NOVÁ LOGIKA PRO VÝPOČET ÚSPĚŠNOSTI A VÝBĚR GIFU ---
        const percentage = app.score / app.questions.length;
        let gifCategory = "";
        let maxGifs = 0;

        // Podmínky pro výběr kategorie (1a, 1b, 1c)
        if (percentage > 0.8) {
            gifCategory = "winner";
            maxGifs = 4; // Máš winner_1 až winner_4
        } else if (percentage >= 0.4 && percentage <= 0.8) {
            gifCategory = "well_done";
            maxGifs = 4; // Máš well_done_1 až well_done_4
        } else {
            gifCategory = "looser";
            maxGifs = 7; // Máš looser_1 až looser_7
        }

        // Náhodný výběr z dostupné sady (1 až maxGifs)
        const randomNum = Math.floor(Math.random() * maxGifs) + 1;
        const gifFileName = `${gifCategory}_${randomNum}.gif`;
        const gifPath = `assets/images/${gifFileName}`; // Cesta dle tvé struktury

        // Nastavení GIFu do HTML a jeho zobrazení
        const gifElement = document.getElementById('result-gif');
        gifElement.src = gifPath;
        gifElement.style.display = "block"; 
        // --------------------------------------------------------

        if (app.gameMode === 'timeattack') {
            const now = Date.now();
            const finalTime = now - app.startTime + app.penaltyMs;
            const timeString = app.formatTime(finalTime);
            const mistakeCount = app.questions.length - app.score;
            const penaltyNote = app.penaltyMs > 0
                ? `<br><small>včetně penalizace +${app.formatTime(app.penaltyMs)} (${mistakeCount}× chyba)</small>`
                : '';
            resultText = `
                Dosažené body: <span style="font-size:1.5em; font-weight:bold">${app.score} / ${app.questions.length}</span><br>
                Výsledný čas: <span style="font-size:1.5em; font-weight:bold">${timeString}</span>${penaltyNote}
            `;
            if (!app.isRetry) app.saveResultTimeAttack(app.score, finalTime);
        } else if (app.gameMode === 'knowledge') {
            resultText = `Získal jsi <span style="font-size:1.5em; font-weight:bold">${app.score}</span> bodů z ${app.questions.length}.`;
            if (!app.isRetry) app.saveResultKnowledge(app.score);
        } else if (app.gameMode === 'poznavacka') {
            resultText = `Získal jsi <span style="font-size:1.5em; font-weight:bold">${app.score}</span> bodů z ${app.questions.length}.`;
            if (!app.isRetry) app.saveResultPoznavacka(app.score);
        } else if (app.gameMode === 'situace') {
            resultText = `Správně jsi rozhodl <span style="font-size:1.5em; font-weight:bold">${app.score}</span> z ${app.questions.length} situací.`;
            if (!app.isRetry) app.saveResultSituace(app.score);
        } else {
            resultText = `Získal jsi <span style="font-size:1.5em; font-weight:bold">${app.score}</span> bodů z ${app.questions.length}.`;
            if (!app.isRetry) app.saveResultClassic(app.score);
        }

        if (app.isRetry) {
            resultText += `<br><small>Opakování chyb se do žebříčku neukládá.</small>`;
        }
        document.getElementById('result-title').textContent =
            app.isRetry ? 'Opakování dokončeno!' : 'Kvíz dokončen!';
        document.getElementById('result-text').innerHTML = resultText;
        app.renderMistakes();
        app.showScreen('screen-result');
        const btnLeaderboard = document.querySelector('#screen-result .secondary');
        btnLeaderboard.onclick = () => app.showLeaderboard(app.gameMode);
    },

    // Přehled chybně zodpovězených otázek na obrazovce s výsledkem
    renderMistakes: () => {
        const section = document.getElementById('mistakes-section');
        const list = document.getElementById('mistakes-list');
        list.innerHTML = '';

        if (app.mistakes.length === 0) {
            section.classList.add('hidden');
            return;
        }

        document.getElementById('mistakes-title').textContent =
            `❌ Co ti nevyšlo (${app.mistakes.length})`;

        app.mistakes.forEach(m => {
            const card = document.createElement('div');
            card.className = 'mistake-card';

            const q = document.createElement('div');
            q.className = 'mistake-question';
            q.textContent = m.text;
            card.appendChild(q);

            if (m.image) {
                const img = document.createElement('img');
                img.className = 'mistake-img';
                img.src = m.image;
                img.alt = '';
                img.onclick = () => app.openImage(m.image);
                card.appendChild(img);
            }

            const wrong = document.createElement('div');
            wrong.className = 'mistake-wrong';
            wrong.textContent = `Tvoje odpověď: ${m.selected}`;
            card.appendChild(wrong);

            const right = document.createElement('div');
            right.className = 'mistake-right';
            right.textContent = `Správně: ${m.correct}`;
            card.appendChild(right);

            if (m.explanation) {
                const exp = document.createElement('div');
                exp.className = 'help-explanation';
                exp.textContent = `💡 ${m.explanation}`;
                card.appendChild(exp);
            }

            list.appendChild(card);
        });

        section.classList.remove('hidden');
    },

    fetchLeaderboard: async (mode) => {
        if (!db) return [];
        
        try {
            let query = db.collection('leaderboard')
                .where('mode', '==', mode)
                .limit(20);

            // Speciální řazení pro Time Attack (Body DESC, Čas ASC)
            if (mode === 'timeattack') {
                query = query.orderBy('score', 'desc').orderBy('durationMs', 'asc');
            } else {
                // Standardní řazení (Classic, Knowledge) jen podle skóre
                query = query.orderBy('score', 'desc');
            }

            const snapshot = await query.get();
                
            return snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                score: doc.data().score,
                durationMs: doc.data().durationMs,
                questions: doc.data().questions,
                timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toLocaleString() : 'N/A'
            }));
        } catch (e) {
            console.error("Chyba při načítání dat z Firestore: ", e);
            // Důležité: Tady by se měla objevit ta chyba s chybějícím indexem
            throw e;
        }
    },

    showLeaderboard: (mode = 'classic') => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = '<tr><td colspan="4">Načítám data ze serveru...</td></tr>';
        
        let sortField = 'score';
        let sortDirection = 'desc';

        if (mode === 'classic') {
            document.getElementById('tab-classic').classList.add('active');
            sortField = 'score';
        } else if (mode === 'knowledge') {
            document.getElementById('tab-knowledge').classList.add('active');
            sortField = 'score';
        } else if (mode === 'poznavacka') {
            document.getElementById('tab-poznavacka').classList.add('active');
            sortField = 'score';
        } else if (mode === 'situace') {
            document.getElementById('tab-situace').classList.add('active');
            sortField = 'score';
        } else {
            document.getElementById('tab-time').classList.add('active');
            sortField = 'durationMs';
            sortDirection = 'asc';
        }
        
        app.fetchLeaderboard(mode)
            .then(data => {
                if (mode === 'timeattack') {
                    app.renderLeaderboardTime(data);
                } else {
                    app.renderLeaderboardPoints(data);
                }
            })
            .catch(e => {
                console.error("Chyba při načítání žebříčku: ", e);
                tbody.innerHTML = '<tr><td colspan="4">Nepodařilo se načíst data žebříčku. (Zkontrolujte klíče a pravidla Firebase.)</td></tr>';
            });
        
        document.getElementById('history-section').classList.add('hidden');
        app.showScreen('screen-leaderboard');
    },

    renderLeaderboardPoints: (data) => {
        document.getElementById('table-header').innerHTML = `<th>Pořadí</th><th>Jméno</th><th>Body</th><th>Datum</th>`;
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = '';
        
        data.forEach((u, index) => {
            const tr = document.createElement('tr');
            if (app.user && u.name === app.user) {
                tr.classList.add('active-row');
            }
            
            const tdPos = document.createElement('td');
            tdPos.textContent = `${index + 1}.`;
            
            const tdName = document.createElement('td');
            tdName.textContent = u.name;
            
            const tdScore = document.createElement('td');
            tdScore.textContent = `${u.score} / ${u.questions}`;
            
            const tdDate = document.createElement('td');
            tdDate.textContent = u.timestamp;
            
            tr.appendChild(tdPos);
            tr.appendChild(tdName);
            tr.appendChild(tdScore);
            tr.appendChild(tdDate);
            
            tbody.appendChild(tr);
        });
    },

    renderLeaderboardTime: (data) => {
        document.getElementById('table-header').innerHTML = `<th>Pořadí</th><th>Jméno</th><th>Body</th><th>Čas</th>`;
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = '';

        data.forEach((u, index) => {
            const tr = document.createElement('tr');
            if (app.user && u.name === app.user) {
                tr.classList.add('active-row');
            }
            
            const tdPos = document.createElement('td');
            tdPos.textContent = `${index + 1}.`;
            
            const tdName = document.createElement('td');
            tdName.textContent = u.name;
            
            const tdScore = document.createElement('td');
            tdScore.textContent = `${u.score} / ${u.questions}`;
            
            const tdTime = document.createElement('td');
            tdTime.textContent = app.formatTime(u.durationMs);
            
            tr.appendChild(tdPos);
            tr.appendChild(tdName);
            tr.appendChild(tdScore);
            tr.appendChild(tdTime);
            
            tbody.appendChild(tr);
        });
    },

    showHistory: () => { /* Funkce historie je zatím zástupná, jelikož se data nejsou strukturována pro historii */ }
};

window.onload = app.init;