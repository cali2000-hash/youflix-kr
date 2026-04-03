/**
 * YOUFLIX.KR Premium Archive Engine (v14.0 - Data Integrity Edition)
 * Fixes: ID Synchronization for Video Grids, Category Loading Stability
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
const auth = firebase.auth();
let currentUser = null;
let cloudFavs = [];

// 1. Visit Counter
function trackPV() {
    if (localStorage.getItem('youflix_admin') === 'true') return;
    db.collection('statistics').doc('daily_pv').set({ count: firebase.firestore.FieldValue.increment(1), lastUpdate: new Date().toLocaleDateString() }, { merge: true });
}

// 2. Auth Actions (v13.1 - Popup Restored)
async function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
        await auth.signInWithPopup(provider);
    } catch (e) {
        if (e.code === 'auth/popup-blocked' || e.message.includes('popup')) {
            alert("🛑 팝업이 차단되었습니다! 크롬이나 사파리 일반 창에서 실행해 주세요!");
        } else {
            alert("Login System Error: " + e.message);
        }
    }
}

async function logout() {
    await auth.signOut();
    location.reload();
}

// 3. Smart UI Engine
function updateAuthUI(user) {
    const targets = document.querySelectorAll('.user-nav');
    targets.forEach(nav => {
        let authZone = nav.querySelector('.auth-zone');
        if (!authZone) {
            authZone = document.createElement('div');
            authZone.className = 'auth-zone';
            nav.appendChild(authZone);
        }

        if (user) {
            const photo = user.photoURL || 'https://www.gstatic.com/images/branding/product/1x/avatar_square_blue_512dp.png';
            authZone.innerHTML = `<img src="${photo}" alt="Profile" class="profile-img" onclick="logout()" title="Logout (${user.displayName})">`;
        } else {
            authZone.innerHTML = `<button class="btn btn-login" onclick="login()">SIGN IN</button>`;
        }
    });

    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        const isAdmin = user && user.email === 'cali20000@gmail.com';
        adminLink.style.display = isAdmin ? 'inline-block' : 'none';
    }
}

// 4. Cloud Sync Engine
async function syncFavorites() {
    if (!currentUser) return;
    const userRef = db.collection('users').doc(currentUser.uid);
    try {
        const doc = await userRef.get();
        let localFavs = JSON.parse(localStorage.getItem('youflix_favs') || '[]');
        if (doc.exists) {
            cloudFavs = doc.data().favs || [];
            const newOnes = localFavs.filter(l => !cloudFavs.some(c => c.id === l.id));
            if (newOnes.length > 0) {
                cloudFavs = [...newOnes, ...cloudFavs];
                await userRef.set({ favs: cloudFavs }, { merge: true });
                localStorage.removeItem('youflix_favs');
            }
        } else {
            cloudFavs = localFavs;
            await userRef.set({ favs: cloudFavs });
            localStorage.removeItem('youflix_favs');
        }
    } catch (e) { console.error("Sync Error", e); }
}

function getFavs() { return currentUser ? cloudFavs : JSON.parse(localStorage.getItem('youflix_favs') || '[]'); }
function checkFav(id) { return getFavs().some(f => f.id === id); }

async function toggleFav(v) {
    let favs = [...getFavs()];
    const idx = favs.findIndex(f => f.id === v.id);
    let result = false;
    if (idx > -1) { favs.splice(idx, 1); result = false; }
    else { favs.unshift(v); result = true; }
    
    if (currentUser) {
        cloudFavs = favs;
        await db.collection('users').doc(currentUser.uid).set({ favs: cloudFavs }, { merge: true });
    } else {
        localStorage.setItem('youflix_favs', JSON.stringify(favs));
    }
    renderMyList('mylist-grid');
    if (new URLSearchParams(window.location.search).get('c') === 'fav') renderMyList('category-grid');
    return result;
}

// 5. Component Loaders (v14.0 - Reliable IDs)
async function load(key, config) {
    const grid = document.getElementById(config.elementId);
    if (!grid) return;
    try {
        const snap = await db.collection(key).orderBy('date', 'desc').limit(20).get();
        grid.innerHTML = '';
        if (snap.empty) { grid.innerHTML = '<p class="loading-msg">현재 준비된 영상이 없습니다.</p>'; return; }
        snap.forEach(doc => {
            const v = doc.data(); v.category = key;
            const isFav = checkFav(v.id);
            const card = document.createElement('div');
            card.className = 'video-card animate-in';
            card.innerHTML = `
                <div class="thumbnail-container">
                    <img src="${v.thumbnail}" alt="${v.title}">
                    <div class="fav-icon ${isFav ? 'active' : ''}" data-id="${v.id}">❤</div>
                    <div class="play-overlay"><span class="play-icon">▶</span></div>
                </div>
                <div class="video-info"><h4>${v.title}</h4><p class="video-meta">${v.channel} • ${v.date}</p></div>
            `;
            card.querySelector('.thumbnail-container').onclick = () => openModal(v);
            grid.appendChild(card);
        });
    } catch (e) { 
        console.error("Load Error for " + key, e); 
        grid.innerHTML = '<p class="loading-msg">데이터 소환 중 오류가 발생했습니다.</p>';
    }
}

function openModal(v) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('player');
    const title = document.getElementById('modal-title');
    const controls = document.getElementById('modal-controls');
    if (!modal || !player) return;
    const isFav = checkFav(v.id);
    title.innerText = v.title;
    player.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    if (controls) {
        controls.innerHTML = `<button class="btn btn-fav ${isFav ? 'active' : ''}" id="modal-fav-btn">${isFav ? '❤ In My List' : '🤍 Add to My List'}</button>`;
        document.getElementById('modal-fav-btn').onclick = async (e) => {
            const res = await toggleFav(v);
            e.currentTarget.classList.toggle('active', res);
            e.currentTarget.innerText = res ? '❤ In My List' : '🤍 Add to My List';
        };
    }
    modal.style.display = 'block'; document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('video-modal');
    if (modal) modal.style.display = 'none';
    const player = document.getElementById('player');
    if (player) player.innerHTML = '';
    document.body.style.overflow = 'auto';
}

function renderMyList(targetGridId = 'mylist-grid') {
    const grid = document.getElementById(targetGridId);
    if (!grid) return;
    const favs = getFavs();
    const row = document.getElementById('mylist-row');
    if (targetGridId === 'mylist-grid' && row) row.style.display = favs.length > 0 ? 'block' : 'none';
    if (favs.length === 0) { 
        if (targetGridId === 'category-grid') grid.innerHTML = '<p class="loading-msg" style="padding:4rem 0;">마이 리스트가 비어 있습니다. 하트를 눌러보세요!</p>';
        return; 
    }
    grid.innerHTML = '';
    favs.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-card animate-in';
        card.innerHTML = `<div class="thumbnail-container"><img src="${v.thumbnail}" alt="${v.title}"><div class="fav-icon active">❤</div><div class="play-overlay"><span class="play-icon">▶</span></div></div><div class="video-info"><h4>${v.title}</h4><p class="video-meta">${v.channel}</p></div>`;
        card.querySelector('.thumbnail-container').onclick = () => openModal(v);
        grid.appendChild(card);
    });
}

// 6. Auth Listener
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) await syncFavorites();
    updateAuthUI(user);
    renderMyList('mylist-grid');
});

// 7. Initialization
document.addEventListener('DOMContentLoaded', async () => {
    trackPV();
    auth.getRedirectResult().catch(e => { console.error(e); });

    // Multi-Row Support (Main Page)
    const rows = ['kpop', 'kdrama', 'tvlit', 'kclassic', 'kmovie', 'kvariety', 'trending'];
    rows.forEach(row => { 
        const gridId = row + '-grid';
        if (document.getElementById(gridId)) load(row, { elementId: gridId }); 
    });

    // Category Page Logic (v15.4 - Full Title Support)
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('c');
    if (cat && document.getElementById('category-grid')) {
        const catTitle = document.getElementById('category-title');
        const titles = { 
            'kpop': 'K-Pop Universe', 
            'kdrama': 'Drama World', 
            'tvlit': 'TV Literature Hall', 
            'kclassic': 'Eternal Cinema', 
            'kmovie': 'Cinema Masterpieces',
            'kvariety': 'Variety Show Stars',
            'trending': 'Trending Now',
            'fav': 'My Secret List' 
        };
        
        if (catTitle) {
            // Priority: Defined title > Capitalized category name fallback
            catTitle.innerText = titles[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
        }
        
        if (cat === 'fav') renderMyList('category-grid');
        else load(cat, { elementId: 'category-grid' });
    }
    
    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        if (header) window.scrollY > 50 ? header.classList.add('scrolled') : header.classList.remove('scrolled');
    });
});
