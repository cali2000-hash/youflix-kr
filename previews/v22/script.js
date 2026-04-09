/**
 * YOUFLIX.KR Core Engine (v22.1 PURE - Restoration Patch) 🚀
 * Official Stitch 'Editorial Cinematic' Implementation.
 */

// 💎 Firebase Configuration (v22.1 Engine)
const firebaseConfig = {
    apiKey: 'AIzaSyDArPdfLyswcFgLBW724ZTObPC4yQ9Py14',
    authDomain: "gen-lang-client-0874410222.firebaseapp.com",
    projectId: "gen-lang-client-0874410222",
    storageBucket: "gen-lang-client-0874410222.firebasestorage.app",
    messagingSenderId: "970801923265",
    appId: "1:970801923265:web:e2ee1f82d2c567808d0040"
};

let db = null;
try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("✅ YOUFLIX Engine: Firebase Initialized");
} catch (e) {
    console.error("🚨 YOUFLIX Engine: Firebase Initialization Failed", e);
}

// 🌎 Language Manager
let currentLang = (function() {
    try {
        const saved = localStorage.getItem('yfx_lang');
        if (saved) return saved;
    } catch(e) {}
    const browserLang = navigator.language.split('-')[0];
    return (browserLang === 'ko') ? 'ko' : 'en';
})();

function setLanguage(lang) {
    try {
        localStorage.setItem('yfx_lang', lang);
        window.location.reload();
    } catch(e) { window.location.reload(); }
}

function t(key) {
    const registry = window.TRANSLATIONS || (typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS : null);
    if (!registry) return key;
    return registry[currentLang]?.[key] || registry['en']?.[key] || key;
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

// --- [Core] Stitch Rendering Engine ---
function renderStitchCards(container, vList, mode = 'standard') {
    if (!container) return;
    vList.forEach((v) => {
        const card = document.createElement('div');
        let cardClass = 'card animate-in';
        if (mode === 'large') cardClass += ' card-large';
        if (mode === 'square') cardClass += ' card-square';
        if (mode === 'shelf') cardClass += ' shelf-item';
        
        card.className = cardClass;
        card.innerHTML = `
            <img src="${v.thumbnail}" class="card-img" alt="${v.title}" loading="lazy">
            <div class="card-content">
                <span style="color:var(--primary); font-weight:900; font-size:0.7rem; letter-spacing:2px; text-transform:uppercase;">
                    ${(v.category || 'CINEMATIC').toUpperCase()}
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

    if (!featuredCon || !db) return;

    try {
        // Fetch trending content from 'kpop' or 'trending' collections
        const kpopSnap = await db.collection('kpop').orderBy('timestamp', 'desc').limit(6).get();
        if (!kpopSnap.empty) {
            const docs = kpopSnap.docs;
            featuredCon.innerHTML = '';
            if (squareCon) squareCon.innerHTML = '';
            if (shelfCon) shelfCon.innerHTML = '';

            // 1. Large Feature Card
            const vL = docs[0].data(); vL.id = docs[0].id; vL.category = 'kpop';
            renderStitchCards(featuredCon, [vL], 'large');

            // 2. Square Context Card
            if (squareCon && docs[1]) {
                const vS = docs[1].data(); vS.id = docs[1].id; vS.category = 'kpop';
                renderStitchCards(squareCon, [vS], 'square');
            }

            // 3. Horizontal Shelf Cards
            if (shelfCon && docs.length > 2) {
                const shelfList = docs.slice(2).map(d => {
                    const v = d.data(); v.id = d.id; v.category = 'kpop';
                    return v;
                });
                renderStitchCards(shelfCon, shelfList, 'shelf');
            }
        } else {
            featuredCon.innerHTML = '<div style="padding:40px; opacity:0.5;">No items found.</div>';
        }
    } catch (e) {
        console.error("🚨 YOUFLIX: Grid Sync Error", e);
        if (featuredCon) featuredCon.innerHTML = '<div style="padding:40px; opacity:0.5;">Sync Deferred.</div>';
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
    const modal = document.getElementById('video-modal');
    if (modal) modal.style.display = 'none';
    const player = document.getElementById('player');
    if (player) player.innerHTML = '';
    document.body.style.overflow = 'auto';
}

// --- [Init] Robust Application Entry ---
function initApp() {
    console.log("🚀 YOUFLIX Core: Initializing...");
    
    // Check if translations are ready
    const hasTranslations = window.TRANSLATIONS || (typeof TRANSLATIONS !== 'undefined');
    if (!hasTranslations) {
        console.warn("⏳ YOUFLIX: Waiting for Translations...");
        setTimeout(initApp, 100);
        return;
    }

    applyTranslations();
    
    // Language Toggle
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.onclick = (e) => setLanguage(e.target.dataset.lang);
    });

    // Navbar Scroll Effect
    window.onscroll = () => {
        const nav = document.getElementById('main-nav');
        if (nav) {
            if (window.pageYOffset > 40) nav.classList.add('scrolled');
            else nav.classList.remove('scrolled');
        }
    };

    // Populate Grids
    setupStitchGrids();

    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
}

// Wait for DOM to be fully ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
