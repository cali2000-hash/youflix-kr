/**
 * YOUFLIX.KR Premium Archive Engine (v6.6 - Minimalist Version)
 * Core Logic: Database Fetching, YouTube Integration, and PV Tracking
 */

const UNIVERSAL_KEY = 'AIzaSyDArPdfLyswcFgLBW724ZTObPC4yQ9Py14';
const firebaseConfig = {
    apiKey: UNIVERSAL_KEY,
    authDomain: "gen-lang-client-0874410222.firebaseapp.com",
    projectId: "gen-lang-client-0874410222",
    storageBucket: "gen-lang-client-0874410222.firebasestorage.app",
    messagingSenderId: "970801923265",
    appId: "1:970801923265:web:e2ee1f82d2c567808d0040"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 1. Visit Counter (PV Tracker)
function trackPV() {
    db.collection('statistics').doc('daily_pv').set({
        count: firebase.firestore.FieldValue.increment(1),
        lastUpdate: new Date().toLocaleDateString()
    }, { merge: true });
}

// 2. High-Speed Category Loader
async function load(key, config) {
    const grid = document.getElementById(config.elementId);
    if (!grid) return;
    grid.innerHTML = '<p class="loading-msg">Searching treasures...</p>';
    
    try {
        const snap = await db.collection(key).orderBy('date', 'desc').limit(15).get();
        grid.innerHTML = '';
        
        if (snap.empty) {
            grid.innerHTML = '<p class="loading-msg">Archive empty in this section.</p>';
            return;
        }

        snap.forEach(doc => {
            const v = doc.data();
            const card = document.createElement('div');
            card.className = 'video-card animate-in';
            card.innerHTML = `
                <div class="thumbnail-container">
                    <img src="${v.thumbnail}" alt="${v.title}">
                    <div class="play-overlay"><span class="play-icon">▶</span></div>
                </div>
                <div class="video-info">
                    <h4>${v.title}</h4>
                    <p class="video-meta">${v.channel} • ${v.date}</p>
                </div>
            `;
            card.onclick = () => openModal(v);
            grid.appendChild(card);
        });
    } catch (e) {
        console.error("Load Error:", e);
        grid.innerHTML = '<p class="loading-msg">System temporary offline.</p>';
    }
}

// 3. Modal Logic
function openModal(v) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('player-area');
    const title = document.getElementById('modal-title');
    
    title.innerText = v.title;
    player.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('video-modal').style.display = 'none';
    document.getElementById('player-area').innerHTML = '';
    document.body.style.overflow = 'auto';
}

// 4. Initialization
document.addEventListener('DOMContentLoaded', () => {
    trackPV();
    
    // Main Page Rows (이 ID가 존재할 때만 작동)
    load('kpop', { elementId: 'kpop-grid' });
    load('kdrama', { elementId: 'kdrama-grid' });
    load('kclassic', { elementId: 'kclassic-grid' });
    load('trending', { elementId: 'trending-grid' });

    // Category Page Logic: URL 파라미터 감지
    const params = new URLSearchParams(window.location.search);
    const catKey = params.get('c') || params.get('id');
    
    if (catKey) {
        const titleMap = {
            'kpop': 'K-POP MV Archive',
            'kdrama': 'K-Drama World: Official Clips',
            'tvlit': 'TV Literature Hall (TV문학관)',
            'kclassic': 'Korean Classic Cinema (KOFA)',
            'kvariety': 'K-Variety: Entertainment Buzz',
            'kmovie': 'K-Cinema: Premium Masterpieces',
            'trending': 'Trending Now in Seoul'
        };
        const titleEl = document.getElementById('category-title');
        if (titleEl && titleMap[catKey.toLowerCase()]) {
            titleEl.innerText = titleMap[catKey.toLowerCase()];
        }
        
        load(catKey.toLowerCase(), { elementId: 'category-grid' });
    }

    // Header Scroll Effect
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        if (!header) return;
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });
});
