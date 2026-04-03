/**
 * YOUFLIX.KR Premium Archive Engine (v11.1 - LOVE Explorer)
 * Core Logic: Database Fetching, YouTube Integration, Favorites, and Dedicated My List Page
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

// 1. Visit Counter
function trackPV() {
    if (localStorage.getItem('youflix_admin') === 'true') return;
    if (/bot|spider|crawl|slurp|ia_archiver/i.test(navigator.userAgent)) return;
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
        const snap = await db.collection(key).orderBy('date', 'desc').limit(20).get();
        grid.innerHTML = '';
        if (snap.empty) {
            grid.innerHTML = '<p class="loading-msg">Archive empty in this section.</p>';
            return;
        }
        snap.forEach(doc => {
            const v = doc.data(); v.category = key;
            const isFavorite = checkFav(v.id);
            const card = document.createElement('div');
            card.className = 'video-card animate-in';
            card.innerHTML = `
                <div class="thumbnail-container">
                    <img src="${v.thumbnail}" alt="${v.title}">
                    <div class="fav-icon ${isFavorite ? 'active' : ''}" data-id="${v.id}">❤</div>
                    <div class="play-overlay"><span class="play-icon">▶</span></div>
                </div>
                <div class="video-info">
                    <h4>${v.title}</h4>
                    <p class="video-meta">${v.channel} • ${v.date}</p>
                </div>
            `;
            card.querySelector('.thumbnail-container').onclick = () => openModal(v);
            card.querySelector('.video-info').onclick = () => openModal(v);
            card.querySelector('.fav-icon').onclick = (e) => {
                e.stopPropagation();
                const result = toggleFav(v);
                e.target.classList.toggle('active', result);
                e.target.classList.add('beat');
                setTimeout(() => e.target.classList.remove('beat'), 500);
            };
            grid.appendChild(card);
        });
    } catch (e) { console.error(e); grid.innerHTML = '<p class="loading-msg">System temporary offline.</p>'; }
}

// 3. Favorite Engine
function getFavs() { return JSON.parse(localStorage.getItem('youflix_favs') || '[]'); }
function checkFav(id) { return getFavs().some(f => f.id === id); }

function toggleFav(v) {
    let favs = getFavs();
    const idx = favs.findIndex(f => f.id === v.id);
    let result = false;
    if (idx > -1) { favs.splice(idx, 1); result = false; }
    else { favs.unshift(v); result = true; }
    localStorage.setItem('youflix_favs', JSON.stringify(favs));
    
    // 실시간 렌더링 갱신
    renderMyList('mylist-grid');
    if (new URLSearchParams(window.location.search).get('c') === 'fav') {
        renderMyList('category-grid');
    }
    return result;
}

// 4. Modal Logic
function openModal(v) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('player');
    const title = document.getElementById('modal-title');
    const controls = document.getElementById('modal-controls');
    if (!modal || !player) return;
    
    const isFavorite = checkFav(v.id);
    title.innerText = v.title;
    player.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    
    if (controls) {
        controls.innerHTML = `<button class="btn btn-fav ${isFavorite ? 'active' : ''}" id="modal-fav-btn">${isFavorite ? '❤ 찜한 영상' : '🤍 마이 리스트 추가'}</button>`;
        document.getElementById('modal-fav-btn').onclick = (e) => {
            const btn = e.currentTarget;
            const res = toggleFav(v);
            btn.classList.toggle('active', res);
            btn.innerText = res ? '❤ 찜한 영상' : '🤍 마이 리스트 추가';
        };
    }
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('player');
    if (modal) modal.style.display = 'none';
    if (player) player.innerHTML = '';
    document.body.style.overflow = 'auto';
    renderMyList('mylist-grid');
}

// 5. My List Renderer (v11.1 Enhanced Multi-Target)
function renderMyList(targetGridId = 'mylist-grid') {
    const grid = document.getElementById(targetGridId);
    if (!grid) return;
    
    const favs = getFavs();
    const row = document.getElementById('mylist-row');
    
    // 메인 페이지 전용 행 가시성 제어
    if (targetGridId === 'mylist-grid' && row) {
        row.style.display = favs.length > 0 ? 'block' : 'none';
    }
    
    if (favs.length === 0) {
        grid.innerHTML = '<p class="loading-msg" style="padding:4rem 0;">마이 리스트가 비어 있습니다.</p>';
        return;
    }
    
    grid.innerHTML = '';
    favs.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-card animate-in';
        card.innerHTML = `
            <div class="thumbnail-container">
                <img src="${v.thumbnail}" alt="${v.title}">
                <div class="fav-icon active">❤</div>
                <div class="play-overlay"><span class="play-icon">▶</span></div>
            </div>
            <div class="video-info">
                <h4>${v.title}</h4>
                <p class="video-meta">${v.channel}</p>
            </div>
        `;
        card.querySelector('.thumbnail-container').onclick = () => openModal(v);
        card.querySelector('.video-info').onclick = () => openModal(v);
        card.querySelector('.fav-icon').onclick = (e) => {
            e.stopPropagation();
            toggleFav(v);
        };
        grid.appendChild(card);
    });
}

// 6. Initialization
document.addEventListener('DOMContentLoaded', () => {
    trackPV();
    renderMyList('mylist-grid');
    
    const rows = ['kpop', 'kdrama', 'tvlit', 'kclassic', 'kmovie', 'kvariety', 'trending'];
    rows.forEach(row => { if (document.getElementById(row + '-grid')) load(row, { elementId: row + '-grid' }); });

    // Category Page Logic (v11.1 Dedicated FAV Page Support)
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('c') || params.get('id');
    
    if (cat) {
        const catKey = cat.toLowerCase();
        if (catKey === 'fav') {
            const titleEl = document.getElementById('category-title');
            if (titleEl) titleEl.innerText = '❤ My Favorite List';
            renderMyList('category-grid');
        } else {
            const titleMap = { 'kpop': 'K-POP MV Archive', 'kdrama': 'K-Drama World: Official Clips', 'tvlit': 'TV Literature Hall (TV문학관)', 'kclassic': 'Korean Classic Cinema (KOFA)', 'kvariety': 'K-Variety: Entertainment Buzz', 'kmovie': 'K-Cinema: Premium Masterpieces', 'trending': 'Trending Now in Seoul' };
            const titleEl = document.getElementById('category-title');
            if (titleEl && titleMap[catKey]) titleEl.innerText = titleMap[catKey];
            load(catKey, { elementId: 'category-grid' });
        }
    }

    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === document.getElementById('video-modal')) closeModal(); });
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        if (!header) return;
        if (window.scrollY > 50) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    });
});
