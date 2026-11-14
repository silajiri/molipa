// profil.js – rybářský průkaz hráče: zkušenosti (XP), hodnosti a sbírka ulovených druhů.
// Ukládá se do localStorage zvlášť pro každou přezdívku. Načítá se až po script.js.

app.profil = {
    KEY_PREFIX: 'molipa_profil_',
    XP_ZA_ODPOVED: 5,

    // Hodnosti podle nasbíraných XP (od jikry až po vodníkova parťáka)
    HODNOSTI: [
        { xp: 0,    nazev: 'Jikra',            ikona: '🥚' },
        { xp: 30,   nazev: 'Plůdek',           ikona: '🫧' },
        { xp: 80,   nazev: 'Potěr',            ikona: '🐟' },
        { xp: 160,  nazev: 'Rybářský učeň',    ikona: '🪱' },
        { xp: 300,  nazev: 'Rybář',            ikona: '🎣' },
        { xp: 500,  nazev: 'Ostřílený rybář',  ikona: '🧢' },
        { xp: 800,  nazev: 'Mistr prutu',      ikona: '🏅' },
        { xp: 1200, nazev: 'Král revíru',      ikona: '👑' },
        { xp: 2000, nazev: 'Vodníkův parťák',  ikona: '🧙' }
    ],

    data: { xp: 0, sbirka: {}, vypravy: 0 },

    key: () => app.profil.KEY_PREFIX + (app.user || '').toLowerCase(),

    load: () => {
        const prazdny = { xp: 0, sbirka: {}, vypravy: 0 };
        try {
            const raw = localStorage.getItem(app.profil.key());
            app.profil.data = raw ? { ...prazdny, ...JSON.parse(raw) } : prazdny;
        } catch (e) {
            app.profil.data = prazdny;
        }
    },

    save: () => {
        app.profil.saveLocal();
        app.profil.naplanujSync();
    },

    saveLocal: () => {
        try {
            localStorage.setItem(app.profil.key(), JSON.stringify(app.profil.data));
        } catch (e) { /* nevadí, profil se jen nezapamatuje */ }
    },

    // --- Přenos mezi zařízeními (Firestore, kolekce „profily“) ---
    // Profil se páruje jen podle přezdívky. Slučuje se vždy „po maximech“ (XP, počty úlovků,
    // rekordy), takže žádné zařízení nemůže druhému postup snížit. Když databáze není dostupná
    // nebo zápis nepovolí pravidla, hra tiše pokračuje jen s localStorage. Žebříčku se to netýká.
    CLOUD_KOLEKCE: 'profily',
    cloudVypnuto: false,
    syncTimer: null,

    cloudDoc: () => {
        if (app.profil.cloudVypnuto || typeof db === 'undefined' || !db || !app.user) return null;
        return db.collection(app.profil.CLOUD_KOLEKCE).doc('u_' + encodeURIComponent(app.user.toLowerCase()));
    },

    cislo: (x) => (Number.isFinite(x) && x > 0 ? Math.floor(x) : 0),

    sloucit: (a, b) => {
        const c = app.profil.cislo;
        const out = { xp: Math.max(c(a.xp), c(b.xp)), vypravy: Math.max(c(a.vypravy), c(b.vypravy)), sbirka: {} };
        const sa = a.sbirka || {}, sb = b.sbirka || {};
        new Set([...Object.keys(sa), ...Object.keys(sb)]).forEach(id => {
            const x = sa[id] || {}, y = sb[id] || {};
            out.sbirka[id] = { pocet: Math.max(c(x.pocet), c(y.pocet)), max: Math.max(c(x.max), c(y.max)) };
        });
        return out;
    },

    stejne: (a, b) => JSON.stringify(app.profil.sloucit(a, {})) === JSON.stringify(app.profil.sloucit(b, {})),

    naplanujSync: () => {
        const p = app.profil;
        if (!p.cloudDoc()) return;
        clearTimeout(p.syncTimer);
        p.syncTimer = setTimeout(p.sync, 2500);
    },

    // Stáhne profil z databáze, sloučí s místním a případný rozdíl zapíše na obě strany
    sync: async () => {
        const p = app.profil;
        clearTimeout(p.syncTimer);
        const doc = p.cloudDoc();
        if (!doc) return;
        const user = app.user;
        try {
            const snap = await doc.get();
            if (app.user !== user) return;   // mezitím se přihlásil někdo jiný
            const vzdaleny = snap.exists ? snap.data() : {};
            const slouceny = p.sloucit(p.data, vzdaleny);
            if (!p.stejne(slouceny, p.data)) {
                p.data = slouceny;
                p.saveLocal();
                p.render();
            }
            if (!snap.exists || !p.stejne(slouceny, vzdaleny)) {
                await doc.set({ name: user, ...slouceny, updated: firebase.firestore.FieldValue.serverTimestamp() });
            }
        } catch (e) {
            // Typicky „permission-denied“, dokud pravidla Firestore kolekci profily nepovolí
            if (e && e.code === 'permission-denied') p.cloudVypnuto = true;
            console.warn('Profil se nepodařilo synchronizovat:', e && e.code ? e.code : e);
        }
    },

    indexHodnosti: (xp) => {
        let idx = 0;
        app.profil.HODNOSTI.forEach((h, i) => { if (xp >= h.xp) idx = i; });
        return idx;
    },

    addXp: (n) => {
        if (!n || n <= 0) return;
        const p = app.profil;
        const pred = p.indexHodnosti(p.data.xp);
        p.data.xp += n;
        p.save();
        const po = p.indexHodnosti(p.data.xp);
        if (po > pred) {
            const h = p.HODNOSTI[po];
            app.fx.play('levelup');
            app.fx.toast(`${h.ikona} Nová hodnost: <strong>${h.nazev}</strong>!`, 'toast-gold');
        }
    },

    // Zapíše úlovek z výpravy do sbírky; vrací, jestli jde o nový druh nebo osobní rekord
    zaznamenejUlovek: (fish, delka) => {
        const p = app.profil;
        const zaznam = p.data.sbirka[fish.id];
        let vysledek;
        if (!zaznam) {
            p.data.sbirka[fish.id] = { pocet: 1, max: delka };
            vysledek = { novy: true, rekord: false };
        } else {
            zaznam.pocet++;
            const rekord = delka > zaznam.max;
            if (rekord) zaznam.max = delka;
            vysledek = { novy: false, rekord };
        }
        p.save();
        return vysledek;
    },

    pocetDruhu: () => Object.keys(app.profil.data.sbirka).length,

    // Kartička „rybářský průkaz“ v menu
    render: () => {
        const el = document.getElementById('profil-card');
        if (!el) return;
        const p = app.profil;
        const xp = p.data.xp;
        const idx = p.indexHodnosti(xp);
        const h = p.HODNOSTI[idx];
        const dalsi = p.HODNOSTI[idx + 1];
        const procent = dalsi ? Math.round((xp - h.xp) / (dalsi.xp - h.xp) * 100) : 100;
        const dalsiText = dalsi
            ? `ještě ${dalsi.xp - xp} XP do hodnosti ${dalsi.ikona} ${dalsi.nazev}`
            : 'nejvyšší hodnost – klobouk dolů!';

        el.innerHTML = `
            <div class="profil-ikona">${h.ikona}</div>
            <div class="profil-info">
                <div class="profil-radek">
                    <span class="profil-hodnost">${h.nazev}</span>
                    <span class="profil-xp">${xp} XP</span>
                </div>
                <div class="profil-bar"><div class="profil-bar-fill" style="width:${procent}%"></div></div>
                <div class="profil-dalsi">${dalsiText}</div>
            </div>
            <button type="button" class="profil-sbirka" onclick="app.showLearning()" title="Sbírka ulovených druhů v atlasu">
                <span class="profil-sbirka-cislo">${p.pocetDruhu()}/${app.dataRyby.length}</span>
                <span class="profil-sbirka-popis">sbírka</span>
            </button>
        `;
    }
};
