const app = {
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

    // --- MODAL ---
    openImage: (src) => {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('img-expanded');
        modalImg.src = src;
        modal.classList.remove('hidden');
    },

    closeImage: () => {
        document.getElementById('image-modal').classList.add('hidden');
    },

    // --- FORMATOVACI FUNKCE ---
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

    // --- INICIALIZACE ---
    init: async () => {
        try {
            // Načteme oba soubory s daty
            const [resRyby, resRad] = await Promise.all([
                fetch('data/data_ryby.json'),
                fetch('data/data_rad.json')
            ]);
            
            if (resRyby.ok) app.dataRyby = await resRyby.json();
            if (resRad.ok) app.dataRad = await resRad.json();
            
            console.log("Data načtena:", { ryby: app.dataRyby.length, rad: app.dataRad.length });

        } catch (error) {
            console.error(error);
            alert("Nepodařilo se načíst data. Zkontrolujte, zda existují soubory data_ryby.json a data_rad.json");
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
        
        // Načtení počtu otázek z inputu
        const countInput = document.getElementById('question-count');
        let count = parseInt(countInput.value);
        if (isNaN(count) || count < 1) count = 5;
        app.maxQuestions = count;

        app.score = 0;
        app.currentQuestionIndex = 0;
        
        // Vygenerování otázek podle módu
        app.generateQuestions();
        
        app.showScreen('screen-quiz');

        // Reset UI panelů
        document.getElementById('status-classic').classList.add('hidden');
        document.getElementById('status-time').classList.add('hidden');

        if (mode === 'timeattack') {
            document.getElementById('status-time').classList.remove('hidden');
            document.getElementById('q-current-time').textContent = 1;
            document.getElementById('q-total-time').textContent = app.questions.length;
            app.startTimer();
        } else {
            // Classic i Knowledge používají stejný panel
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
            // Zamícháme všechny dostupné otázky z řádu a vezmeme jich 'maxQuestions'
            // Pokud je v JSONu méně otázek než požadovaný počet, vezmeme všechny
            const availableQuestions = [...app.dataRad]; 
            const shuffled = availableQuestions.sort(() => Math.random() - 0.5);
            
            // Vezmeme X otázek, ale maximálně tolik, kolik jich máme
            const selected = shuffled.slice(0, Math.min(app.maxQuestions, availableQuestions.length));
            
            // Namapujeme do formátu, který používá renderQuestion
            app.questions = selected.map(q => ({
                text: q.otazka,
                image: null, // Žádný obrázek
                options: q.moznosti.sort(() => Math.random() - 0.5), // Zamíchat možnosti
                correctAnswer: q.spravna_odpoved,
                explanation: q.vysvetleni // Nová vlastnost pro vysvětlení
            }));
            
            return;
        }

        // --- 2. Módy POZNÁVAČKA RYB (Classic + Timeattack) ---
        // Generování otázek jako dříve, ale z app.dataRyby
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
        optionsContainer.innerHTML = '';
        
        // Aktualizace počítadla
        if (app.gameMode === 'timeattack') {
            document.getElementById('q-current-time').textContent = app.currentQuestionIndex + 1;
        } else {
            document.getElementById('q-current').textContent = app.currentQuestionIndex + 1;
            document.getElementById('score').textContent = app.score;
            // Aktualizujeme i celkový počet, protože u Řádu se může lišit od maxQuestions (pokud dojdou otázky)
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

        // --- Logika pro Časovku ---
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

        // --- Logika pro Klasický mód a Znalce řádu ---
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true);
        const feedback = document.getElementById('feedback');
        feedback.classList.remove('hidden');

        let feedbackText = "";
        if (isCorrect) {
            app.score++;
            btn.classList.add('correct');
            feedbackText = `<span style="color:green">Správně! +1 bod</span>`;
        } else {
            btn.classList.add('wrong');
            allBtns.forEach(b => {
                if (b.textContent === correct) b.classList.add('correct');
            });
            feedbackText = `<span style="color:red">Chyba! Správně je: ${correct}</span>`;
        }
        
        // Pokud existuje vysvětlení (pro Znalce řádu), přidáme ho
        if (explanation) {
            feedbackText += `<br><small style="color:#555; font-style:italic; display:block; margin-top:5px;">💡 ${explanation}</small>`;
        }
        
        feedback.innerHTML = feedbackText;
        document.getElementById('next-btn').classList.remove('hidden');
    },

    nextQuestion: () => {
        app.currentQuestionIndex++;
        if (app.currentQuestionIndex < app.questions.length) {
            app.renderQuestion();
        } else {
            app.finishQuiz();
        }
    },

    finishQuiz: () => {
        app.stopTimer();
        
        let resultText = "";
        
        if (app.gameMode === 'timeattack') {
            const now = Date.now();
            const finalTime = now - app.startTime;
            const timeString = app.formatTime(finalTime);
            
            resultText = `
                Dosažené body: <span style="font-size:1.5em; font-weight:bold">${app.score} / ${app.questions.length}</span><br>
                Výsledný čas: <span style="font-size:1.5em; font-weight:bold">${timeString}</span>
            `;
            app.saveResultTimeAttack(app.score, finalTime);
        } else {
            // Společné pro Classic i Knowledge
            resultText = `Získal jsi <span style="font-size:1.5em; font-weight:bold">${app.score}</span> bodů z ${app.questions.length}.`;
            // Uložíme do správného žebříčku podle módu
            const storageKey = app.gameMode === 'knowledge' ? 'rad_leaderboard' : 'ryby_leaderboard';
            app.saveResultClassic(app.score, storageKey);
        }

        document.getElementById('result-text').innerHTML = resultText;
        app.showScreen('screen-result');
        // Nastavíme tlačítko "Zobrazit žebříček" na správnou záložku
        const btnLeaderboard = document.querySelector('#screen-result .secondary');
        btnLeaderboard.onclick = () => app.showLeaderboard(app.gameMode);
    },

    // --- UKLÁDÁNÍ A ŽEBŘÍČKY ---

    saveResultClassic: (score, storageKey) => {
        let data = JSON.parse(localStorage.getItem(storageKey)) || [];
        let userRecord = data.find(u => u.name === app.user);
        const newResult = { score: score, date: new Date().toLocaleString() };

        if (userRecord) {
            userRecord.history.push(newResult);
            if (score > userRecord.bestValue) userRecord.bestValue = score;
        } else {
            data.push({ name: app.user, bestValue: score, history: [newResult] });
        }
        localStorage.setItem(storageKey, JSON.stringify(data));
    },

    saveResultTimeAttack: (score, timeMs) => {
        const storageKey = 'ryby_leaderboard_time_v2';
        let data = JSON.parse(localStorage.getItem(storageKey)) || [];
        let userRecord = data.find(u => u.name === app.user);
        const newResult = { score: score, time: timeMs, date: new Date().toLocaleString() };

        if (userRecord) {
            userRecord.history.push(newResult);
            if (score > userRecord.bestScore || (score === userRecord.bestScore && timeMs < userRecord.bestTime)) {
                userRecord.bestScore = score;
                userRecord.bestTime = timeMs;
            }
        } else {
            data.push({ name: app.user, bestScore: score, bestTime: timeMs, history: [newResult] });
        }
        localStorage.setItem(storageKey, JSON.stringify(data));
    },

    showLeaderboard: (mode = 'classic') => {
        // Reset aktivních tlačítek
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        
        let storageKey = 'ryby_leaderboard'; // default

        if (mode === 'classic') {
            document.getElementById('tab-classic').classList.add('active');
            storageKey = 'ryby_leaderboard';
            app.renderLeaderboardPoints(storageKey);
        } else if (mode === 'knowledge') {
            document.getElementById('tab-knowledge').classList.add('active');
            storageKey = 'rad_leaderboard';
            app.renderLeaderboardPoints(storageKey);
        } else {
            document.getElementById('tab-time').classList.add('active');
            storageKey = 'ryby_leaderboard_time_v2';
            app.renderLeaderboardTime(storageKey);
        }
        
        document.getElementById('history-section').classList.add('hidden');
        app.showScreen('screen-leaderboard');
    },

    renderLeaderboardPoints: (storageKey) => {
        const data = JSON.parse(localStorage.getItem(storageKey)) || [];
        data.sort((a, b) => b.bestValue - a.bestValue);
        
        document.getElementById('table-header').innerHTML = `<th>Pořadí</th><th>Jméno</th><th>Body</th>`;
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = '';
        
        // Určíme "mód" pro zobrazení historie
        const historyMode = (storageKey === 'rad_leaderboard') ? 'knowledge' : 'classic';

        data.forEach((u, index) => {
            const tr = document.createElement('tr');
            if (u.name === app.user) tr.classList.add('active-row');
            tr.innerHTML = `
                <td>${index + 1}.</td>
                <td class="clickable-name" onclick="app.showHistory('${u.name}', '${historyMode}')">${u.name}</td>
                <td>${u.bestValue}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderLeaderboardTime: (storageKey) => {
        const data = JSON.parse(localStorage.getItem(storageKey)) || [];
        data.sort((a, b) => {
            if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore; 
            return a.bestTime - b.bestTime; 
        });
        
        document.getElementById('table-header').innerHTML = `<th>Pořadí</th><th>Jméno</th><th>Body</th><th>Čas</th>`;
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = '';

        data.forEach((u, index) => {
            const tr = document.createElement('tr');
            if (u.name === app.user) tr.classList.add('active-row');
            tr.innerHTML = `
                <td>${index + 1}.</td>
                <td class="clickable-name" onclick="app.showHistory('${u.name}', 'timeattack')">${u.name}</td>
                <td>${u.bestScore}</td>
                <td>${app.formatTime(u.bestTime)}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    showHistory: (userName, mode) => {
        let storageKey = 'ryby_leaderboard';
        if (mode === 'knowledge') storageKey = 'rad_leaderboard';
        if (mode === 'timeattack') storageKey = 'ryby_leaderboard_time_v2';

        let data = JSON.parse(localStorage.getItem(storageKey)) || [];
        const user = data.find(u => u.name === userName);

        if (user) {
            const historyList = document.getElementById('history-list');
            historyList.innerHTML = '';
            document.getElementById('history-name').textContent = user.name;
            
            user.history.reverse().forEach(h => {
                let text = "";
                if (mode === 'timeattack') {
                    text = `${h.score} bodů v čase ${app.formatTime(h.time)}`;
                } else {
                    text = `${h.score} bodů`;
                }
                
                const li = document.createElement('li');
                li.textContent = `${h.date} - ${text}`;
                historyList.appendChild(li);
            });
            document.getElementById('history-section').classList.remove('hidden');
        }
    }
};

window.onload = app.init;