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
    maxQuestions: 5,
    
    // Proměnné pro časovku
    timerInterval: null,
    startTime: 0,

    // --- MODAL & FORMATOVACI FUNKCE ---
    openImage: (src) => {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('img-expanded');
        modalImg.src = src;
        modal.classList.remove('hidden');
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
    },

    login: () => {
        const name = document.getElementById('username-input').value.trim();
        if (name) {
            app.user = name;
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
    },

    showLearning: () => {
        const list = document.getElementById('fish-list');
        list.innerHTML = '';
        app.dataRyby.forEach(fish => {
            const card = document.createElement('div');
            card.className = 'fish-card';
            const imgPath = fish.fotografie.length > 0 ? 'assets/images/' + fish.fotografie[0] : '';
            
            card.innerHTML = `
                <img src="${imgPath}" alt="${fish.nazev_cz}" onclick="app.openImage('${imgPath}')" style="cursor:pointer" title="Klikni pro zvětšení">
                <h3>${fish.nazev_cz}</h3>
                <p><i>${fish.nazev_latinsky}</i></p>
                <p><strong>Min. délka:</strong> ${app.formatDelka(fish)}</p>
                <p><strong>Hájení:</strong> ${app.formatHajeni(fish)}</p>
            `;
            list.appendChild(card);
        });
        app.showScreen('screen-learning');
    },

    // --- LOGIKA KVÍZU ---

    startQuiz: (mode) => {
        app.gameMode = mode;
        const countInput = document.getElementById('question-count');
        let count = parseInt(countInput.value);
        if (isNaN(count) || count < 1) count = 5;
        app.maxQuestions = count;

        app.score = 0;
        app.currentQuestionIndex = 0;
        app.generateQuestions();
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
            const elapsed = now - app.startTime;
            timerEl.textContent = app.formatTime(elapsed);
        }, 50);
    },

    stopTimer: () => {
        if (app.timerInterval) clearInterval(app.timerInterval);
    },

    generateQuestions: () => {
        app.questions = [];
        
        // --- 1. Mód ZNALEC ŘÁDU (z data_rad.json) ---
        if (app.gameMode === 'knowledge') {
            const availableQuestions = [...app.dataRad]; 
            const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, Math.min(app.maxQuestions, availableQuestions.length));
            
            app.questions = selected.map(q => ({
                text: q.otazka,
                image: null, 
                options: q.moznosti.sort(() => Math.random() - 0.5), 
                correctAnswer: q.spravna_odpoved,
                explanation: q.vysvetleni
            }));
            return;
        }

        // --- 2. Mód POZNÁVAČKA (pouze foto) ---
        if (app.gameMode === 'poznavacka') {
            const fishWithPhotos = app.dataRyby.filter(f => f.fotografie && f.fotografie.length > 0);
            const shuffled = [...fishWithPhotos].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, Math.min(app.maxQuestions, fishWithPhotos.length));

            app.questions = selected.map(targetFish => {
                const randomPhotoIdx = Math.floor(Math.random() * targetFish.fotografie.length);
                const correctVal = targetFish.nazev_cz;
                let options = [correctVal];
                const otherFish = fishWithPhotos.filter(f => f.nazev_cz !== correctVal).sort(() => Math.random() - 0.5);
                let i = 0;
                while (options.length < 4 && i < otherFish.length) {
                    options.push(otherFish[i].nazev_cz);
                    i++;
                }
                return {
                    text: "Jak se jmenuje ryba na obrázku?",
                    image: 'assets/images/' + targetFish.fotografie[randomPhotoIdx],
                    options: options.sort(() => Math.random() - 0.5),
                    correctAnswer: correctVal,
                    explanation: null
                };
            });
            return;
        }

        // --- 3. Módy KVÍZ (Classic + Timeattack) ---
        for (let i = 0; i < app.maxQuestions; i++) {
            const type = Math.random() > 0.5 ? 1 : 2;
            const targetFish = app.dataRyby[Math.floor(Math.random() * app.dataRyby.length)];
            
            let questionObj = { 
                fish: targetFish, 
                type: type, 
                options: [],
                explanation: null
            };
            let correctVal, questionTypeKey;

            if (type === 1) {
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
            
            questionObj.options = options.sort(() => Math.random() - 0.5);
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

        if (app.gameMode === 'timeattack') {
            if (isCorrect) {
                app.score++;
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
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
            const finalTime = now - app.startTime;
            const timeString = app.formatTime(finalTime);
            resultText = `
                Dosažené body: <span style="font-size:1.5em; font-weight:bold">${app.score} / ${app.questions.length}</span><br>
                Výsledný čas: <span style="font-size:1.5em; font-weight:bold">${timeString}</span>
            `;
            app.saveResultTimeAttack(app.score, finalTime);
        } else if (app.gameMode === 'knowledge') {
            resultText = `Získal jsi <span style="font-size:1.5em; font-weight:bold">${app.score}</span> bodů z ${app.questions.length}.`;
            app.saveResultKnowledge(app.score);
        } else if (app.gameMode === 'poznavacka') {
            resultText = `Získal jsi <span style="font-size:1.5em; font-weight:bold">${app.score}</span> bodů z ${app.questions.length}.`;
            app.saveResultPoznavacka(app.score);
        } else {
            resultText = `Získal jsi <span style="font-size:1.5em; font-weight:bold">${app.score}</span> bodů z ${app.questions.length}.`;
            app.saveResultClassic(app.score);
        }

        document.getElementById('result-text').innerHTML = resultText;
        app.showScreen('screen-result');
        const btnLeaderboard = document.querySelector('#screen-result .secondary');
        btnLeaderboard.onclick = () => app.showLeaderboard(app.gameMode);
    },

    fetchLeaderboard: async (mode, sortField, direction) => {
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
            return [];
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
        } else {
            document.getElementById('tab-time').classList.add('active');
            sortField = 'durationMs';
            sortDirection = 'asc';
        }
        
        app.fetchLeaderboard(mode, sortField, sortDirection)
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
            tr.innerHTML = `
                <td>${index + 1}.</td>
                <td>${u.name}</td>
                <td>${u.score} / ${u.questions}</td>
                <td>${u.timestamp}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderLeaderboardTime: (data) => {
        document.getElementById('table-header').innerHTML = `<th>Pořadí</th><th>Jméno</th><th>Body</th><th>Čas</th>`;
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = '';

        data.forEach((u, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}.</td>
                <td>${u.name}</td>
                <td>${u.score}</td>
                <td>${app.formatTime(u.durationMs)}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    showHistory: () => { /* Funkce historie je zatím zástupná, jelikož se data nejsou strukturována pro historii */ }
};

window.onload = app.init;