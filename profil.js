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
        try {
            localStorage.setItem(app.profil.key(), JSON.stringify(app.profil.data));
        } catch (e) { /* nevadí, profil se jen nezapamatuje */ }
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
