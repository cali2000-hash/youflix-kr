/**
 * YOUFLIX.KR Core Engine (v22.0 PURE - Stitch Restoration) 🚀
 * Official Stitch 'Editorial Cinematic' Implementation.
 */

const firebaseConfig = {
    apiKey: 'AIzaSyDArPdfLyswcFgLBW724ZTObPC4yQ9Py14',
    authDomain: "gen-lang-client-0874410222.firebaseapp.com",
    projectId: "gen-lang-client-0874410222",
    storageBucket: "gen-lang-client-0874410222.firebasestorage.app",
    messagingSenderId: "970801923265",
    appId: "1:970801923265:web:e2ee1f82d2c567808d0040"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 🌎 Language Manager
const currentLang = (function() {
    const saved = localStorage.getItem('yfx_lang');
    if (saved) return saved;
    const browserLang = navigator.language.split('-')[0];
    return (browserLang === 'ko') ? 'ko' : 'en';
})();

function setLanguage(lang) {
    localStorage.setItem('yfx_lang', lang);
    window.location.reload();
}

function t(key) {
    if (!window.TRANSLATIONS) return key;
    return window.TRANSLATIONS[currentLang][key] || window.TRANSLATIONS['en'][key] || key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = translated;
        } else {
            el.innerText = translated;
        }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

// --- [Core] Stitch Rendering Engine (v22.0) ---
function renderStitchCards(container, vList, mode = 'standard') {
    vList.forEach((v) => {
        const card = document.createElement('div');
        let cardClass = 'card animate-in';
        if (mode === 'large') cardClass += ' card-large';
        if (mode === 'square') cardClass += ' card-square';
        if (mode === 'shelf') cardClass += ' shelf-item';
        
        card.className = cardClass;
        
        card.innerHTML = `
            <img src="${v.thumbnail}" class="card-img" alt="${v.title}">
            <div class="card-content">
                <span style="color:var(--primary); font-weight:900; font-size:0.7rem; letter-spacing:2px; text-transform:uppercase;">
                    ${v.category === 'kpop' ? 'K-POP' : 'CINEMATIC'}
                </span>
                <h3 class="card-title">${v.title}</h3>
                <p class="card-subtitle">${v.channel || 'Official Archive'} • ${v.date || 'Restored'}</p>
            </div>
        `;
        
        card.onclick = () => openModal(v);
        container.appendChild(card);
    });
}

// --- [Core] Asymmetric Grid Population ---
async function setupStitchGrids() {
    const featuredCon = document.getElementById('trending-featured');
    const squareCon = document.getElementById('trending-square');
    const shelfCon = document.getElementById('trending-shelf');

    if (!featuredCon) return;

    try {
        const kpopSnap = await db.collection('kpop').orderBy('timestamp', 'desc').limit(6).get();
        if (!kpopSnap.empty) {
            const docs = kpopSnap.docs;
            featuredCon.innerHTML = '';
            squareCon.innerHTML = '';
            shelfCon.innerHTML = '';

            // 1. Large Feature Card
            const vL = docs[0].data(); vL.id = docs[0].id; vL.category = 'kpop';
            renderStitchCards(featuredCon, [vL], 'large');

            // 2. Square Context Card
            const vS = docs[1].data(); vS.id = docs[1].id; vS.category = 'kpop';
            renderStitchCards(squareCon, [vS], 'square');

            // 3. Horizontal Shelf Cards
            const shelfList = docs.slice(2).map(d => {
                const v = d.data(); v.id = d.id; v.category = 'kpop';
                return v;
            });
            renderStitchCards(shelfCon, shelfList, 'shelf');
        }
    } catch (e) {
        console.error("Grid curation deferred.", e);
        featuredCon.innerText = "Curator deferred.";
    }
}

// --- [UI] Modal (Cinema Mode) ---
function openModal(v) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('player');
    if (!modal || !player) return;
    
    document.getElementById('modal-title').innerText = v.title;
    document.getElementById('modal-desc').innerText = v.description || 'Premium curation from the YOUFLIX official archive.';
    player.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    
    modal.style.display = 'block'; document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('video-modal').style.display = 'none';
    document.getElementById('player').innerHTML = '';
    document.body.style.overflow = 'auto';
}

// --- [Init] Entry Point ---
async function initApp() {
    if (!window.TRANSLATIONS) {
        setTimeout(initApp, 150);
        return;
    }

    applyTranslations();
    
    // Language Toggle
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.onclick = (e) => setLanguage(e.target.dataset.lang);
    });

    // Navbar Scrolled Effect
    window.onscroll = () => {
        const nav = document.getElementById('main-nav');
        if (window.pageYOffset > 55) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
    };

    // Populate Grids
    setupStitchGrids();

    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
}

document.addEventListener('DOMContentLoaded', initApp);
