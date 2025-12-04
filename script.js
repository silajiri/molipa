// Globální proměnné pro Firebase a Firestore
let db;

const app = {
    // Statická data pro ryby a řád
    dataRyby: [],
    dataRad: [],
    user: null,
    
    // Stav hry
    gameMode: 'classic', 
    score: 0,
    currentQuestionIndex: 0,
    questions: [],
    maxQuestions: 5,
    
    // Proměnné pro časovku
    timerInterval: null,
    startTime: 0,

    // --- FIREBASE KONFIGURACE (NAHRADIT SVÝMI KLÍČI!) ---
    firebaseConfig: {
        apiKey: "AIzaSyDglbU-Fh3jYWOZ2RsQerbZBpYl-dM8U9E",
        authDomain: "molipa-3921a.firebaseapp.com",
        projectId: "molipa-3921a",
        storageBucket: "molipa-3921a.firebasestorage.app",
        messagingSenderId: "981161888486",
        appId: "981161888486:web:c2f1e200c1fd6a92694927"
    },
    // ----------------------------------------------------

    // --- MODAL & FORMATOVACI FUNKCE ---
    openImage: (src) => { /* Funkce zůstává stejná */ 
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('img-expanded');
        modalImg.src = src;
        modal.classList.remove('hidden');
    },

    closeImage: () => { /* Funkce zůstává stejná */ 
        document.getElementById('image-modal').classList.add('hidden');
    },

    formatHajeni: (fish) => { /* Funkce zůstává stejná */
        if (fish.doba_hajeni_od === "Celoročně" && fish.doba_hajeni_do === "chráněný") {
            return "🚫 Celoročně chráněný";
        }
        if (fish.doba_hajeni_od && fish.doba_hajeni_do) {
            return `${fish.doba_hajeni_od} - ${fish.doba_hajeni_do}`;
        }
        return "✅ Bez hájení";
    },

    formatDelka: (fish) => { /* Funkce zůstává stejná */
        if (!fish.min_delka_cm) {
            return "❌ Nemá stanoveno"; 
        }
        return `${fish.min_delka_cm} cm`;
    },

    formatTime: (ms) => { /* Funkce zůstává stejná */
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const hundreds = Math.floor((ms % 1000) / 10); 
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundreds.toString().padStart(2, '0')}`;
    },

    // --- INICIALIZACE A FIREBASE ZAPOJENÍ ---
    init: async () => {
        // Inicializace Firebase
        if (typeof firebase !== 'undefined') {
            try {
                firebase.initializeApp(app.firebaseConfig);
                db = firebase.firestore();
                console.log("Firebase inicializován.");
            } catch (error) {
                console.error("Chyba při inicializaci Firebase:", error);
                alert("Chyba Firebase: Zkontrolujte API klíče v script.js!");
            }
        }
        
        // Načtení statických dat (Ryby a Řád)
        try {
            const [resRyby, resRad] = await Promise.all([
                fetch('data/data_ryby.json'),
                fetch('data/data_rad.json')
            ]);
            
            if (resRyby.ok) app.dataRyby = await resRyby.json();
            if (resRad.ok) app.dataRad = await resRad.json();
            
        } catch (error) {
            console.error(error);
            alert("Nepodařilo se načíst lokální data (JSON soubory).");
        }
    },
    
    // --- UKLÁDÁNÍ DAT NA FIREBASE ---
    saveScoreToDatabase: async (score, mode, duration = null) => {
        if (!app.user) return;

        const collectionName = 'leaderboard'; // Jedna kolekce pro všechny módy
        
        try {
            await db.collection(collectionName).add({
                name: app.user,
                score: score,
                mode: mode,
                durationMs: duration,
                questions: app.questions.length,
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // Přesný čas uložení
            });
            console.log(`Skóre (${mode}) úspěšně uloženo na Firebase.`);

        } catch (e) {
            console.error("Chyba při ukládání skóre na Firebase: ", e);
            alert("Chyba při ukládání skóre. Zkontrolujte připojení a pravidla Firestore.");
        }
    },

    // --- PŘEPSANÉ FUNKCE UKLÁDÁNÍ ---
    saveResultClassic: (score) => {
        // Už neukládáme lokálně, voláme centrální funkci
        app.saveScoreToDatabase(score, 'classic');
    },

    saveResultTimeAttack: (score, timeMs) => {
        // Ukládáme skóre s časem
        app.saveScoreToDatabase(score, 'timeattack', timeMs);
    },
    
    saveResultKnowledge: (score) => {
        // Ukládáme skóre pro kvíz Řádu
        app.saveScoreToDatabase(score, 'knowledge');
    },

    // --- PŘEPSANÁ FUNKCE NAČÍTÁNÍ ŽEBŘÍČKU Z FIREBASE ---
    fetchLeaderboard: async (mode, sortField, direction) => {
        const snapshot = await db.collection('leaderboard')
            .where('mode', '==', mode) // Filtrujeme jen daný mód
            .orderBy(sortField, direction)
            .limit(20) // Omezíme na top 20 výsledků pro přehlednost
            .get();
            
        // Mapujeme výsledky do struktury, kterou očekává renderLeaderboard...
        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            bestValue: doc.data().score, // Použijeme pro Classic/Knowledge
            bestScore: doc.data().score, // Použijeme pro Timeattack (body)
            bestTime: doc.data().durationMs, // Použijeme pro Timeattack (čas)
            questions: doc.data().questions,
            timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toLocaleString() : 'N/A'
        }));
    },


    // --- PŮVODNÍ FUNKCE (Změněny jen volání dat) ---

    // Funkce login, showMenu, showLearning, startQuiz, generateQuestions atd.
    // Zůstávají v logice stejné, jen se spoléhají na app.dataRyby / app.dataRad

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

    // ... (ostatní funkce startTimer, stopTimer, generateQuestions, renderQuestion, handleAnswer, nextQuestion)
    // ... (kvůli omezení prostoru zde vynechány, ale předpokládá se, že jsou z předchozího kroku)

    // POUŽIJEME ZÁSTUPNÉ FUNKCE PRO ZACHOVÁNÍ ČISTOTY VÝSTUPU
    
    startTimer: () => { /* Zástupná fce */ },
    stopTimer: () => { /* Zástupná fce */ },
    generateQuestions: () => { /* Zástupná fce */ },
    renderQuestion: () => { /* Zástupná fce */ },
    handleAnswer: (btn, selected, correct, explanation) => { /* Zástupná fce */ },
    nextQuestion: () => { /* Zástupná fce */ },
    
    // --- KOMPLETNÍ FUNKCE ---

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
        } else if (app.gameMode === 'knowledge') {
            resultText = `Získal jsi <span style="font-size:1.5em; font-weight:bold">${app.score}</span> bodů z ${app.questions.length}.`;
            app.saveResultKnowledge(app.score);
        } else {
            resultText = `Získal jsi <span style="font-size:1.5em; font-weight:bold">${app.score}</span> bodů z ${app.questions.length}.`;
            app.saveResultClassic(app.score);
        }

        document.getElementById('result-text').innerHTML = resultText;
        app.showScreen('screen-result');
        const btnLeaderboard = document.querySelector('#screen-result .secondary');
        btnLeaderboard.onclick = () => app.showLeaderboard(app.gameMode);
    },

    showLeaderboard: (mode = 'classic') => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        
        // Zobrazíme načítání
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = '<tr><td colspan="4">Načítám data ze serveru...</td></tr>';
        
        let sortField = 'score'; // default
        let sortDirection = 'desc';

        if (mode === 'classic') {
            document.getElementById('tab-classic').classList.add('active');
            sortField = 'score';
        } else if (mode === 'knowledge') {
            document.getElementById('tab-knowledge').classList.add('active');
            sortField = 'score';
        } else {
            document.getElementById('tab-time').classList.add('active');
            // Pro timeattack prioritizujeme skóre DESC, pak čas ASC
            sortField = 'durationMs'; // Složitější sorting se provede v renderu
        }
        
        // Načteme data a zavoláme render
        app.fetchLeaderboard(mode, sortField, sortDirection)
            .then(data => {
                if (mode === 'timeattack') {
                    app.renderLeaderboardTime(data);
                } else {
                    // Sorting pro points-based kvízy (Classic, Knowledge)
                    data.sort((a, b) => b.score - a.score);
                    app.renderLeaderboardPoints(data, mode);
                }
            })
            .catch(e => {
                console.error("Chyba při načítání žebříčku: ", e);
                tbody.innerHTML = '<tr><td colspan="4">Nepodařilo se načíst data žebříčku.</td></tr>';
            });
        
        document.getElementById('history-section').classList.add('hidden');
        app.showScreen('screen-leaderboard');
    },

    renderLeaderboardPoints: (data, mode) => {
        document.getElementById('table-header').innerHTML = `<th>Pořadí</th><th>Jméno</th><th>Body</th><th>Datum</th>`;
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = '';
        
        data.forEach((u, index) => {
            const tr = document.createElement('tr');
            if (u.name === app.user) tr.classList.add('active-row');
            tr.innerHTML = `
                <td>${index + 1}.</td>
                <td>${u.name}</td>
                <td>${u.bestValue} / ${u.questions}</td>
                <td>${u.timestamp}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderLeaderboardTime: (data) => {
        // Složené řazení: body DESC, čas ASC. Vzhledem k tomu, že Firestore to neudělá optimálně jen jedním dotazem,
        // stáhli jsme data a řadíme je zde na straně klienta.
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
                <td>${u.name}</td>
                <td>${u.bestScore}</td>
                <td>${app.formatTime(u.bestTime)}</td>
            `;
            tbody.appendChild(tr);
        });
    },
    
    // ... (showHistory není potřeba, dokud neimplementujeme historii na serveru)
    showHistory: (userName, mode) => { /* Zástupná fce */ }
};

window.onload = app.init;