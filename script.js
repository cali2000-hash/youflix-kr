/**
 * YOUFLIX.KR Premium Archive Engine (v17.0 - Infinite Scroll Edition)
 * Features: Pagination with Firestore, IntersectionObserver, and Dynamic Curation
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

// Pagination State (v17.0)
const lastDocMap = {};
const loadingMap = {};
const reachedEndMap = {};

// 1. Visit Counter & Presence (v13.0)
(function() {
    const sessionId = sessionStorage.getItem('yfx_session') || 
                     (sessionStorage.setItem('yfx_session', Math.random().toString(36).substr(2, 9)), sessionStorage.getItem('yfx_session'));
    
    let userLoc = "Unknown";
    fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
            userLoc = `${data.city}, ${data.country_code}`;
            updatePresence();
        })
        .catch(() => updatePresence());

    async function updatePresence() {
        if (typeof db === 'undefined') return;
        try {
            await db.collection('presence').doc(sessionId).set({
                last_active: firebase.firestore.FieldValue.serverTimestamp(),
                page: window.location.pathname,
                search: window.location.search,
                location: userLoc,
                ua: navigator.userAgent
            }, { merge: true });
        } catch (e) { console.warn("Presence sync fail."); }
    }

    setInterval(updatePresence, 30000);
})();

function trackPV() {
    if (localStorage.getItem('youflix_admin') === 'true') return;
    db.collection('statistics').doc('daily_pv').set({ count: firebase.firestore.FieldValue.increment(1), lastUpdate: new Date().toLocaleDateString() }, { merge: true });
}

setInterval(updatePresence, 30000);

// 2. Auth Actions
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
    if (!currentUser) {
        if (confirm("❤ 이 기능은 로그인이 필요합니다. 지금 로그인하시겠습니까?")) {
            login();
        }
        return false;
    }
    let favs = [...getFavs()];
    const idx = favs.findIndex(f => f.id === v.id);
    let result = false;
    if (idx > -1) { favs.splice(idx, 1); result = false; }
    else { favs.unshift(v); result = true; }
    
    cloudFavs = favs;
    await db.collection('users').doc(currentUser.uid).set({ favs: cloudFavs }, { merge: true });
    
    renderMyList('mylist-grid');
    if (new URLSearchParams(window.location.search).get('c') === 'fav') renderMyList('category-grid');
    return result;
}

// 5. Infinite Load Engine (v17.0 Upgrade)
async function load(key, config = {}, isAppend = false) {
    const gridId = config.elementId || 'category-grid';
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    // Prevent double loading
    if (loadingMap[key] || reachedEndMap[key]) return;
    loadingMap[key] = true;

    // Show spinner if appending
    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel && isAppend) sentinel.classList.add('loading');

    try {
        // Category-specific order (v18.0)
        let orderField = 'timestamp';
        let orderDirection = 'desc';
        if (key === 'tvlit' || key === 'dramagame') {
            orderField = 'sort_idx';
            orderDirection = 'asc';
        }
        
        let query = db.collection(key).orderBy(orderField, orderDirection).limit(20);
        
        // Paging logic (v17.5 / v18.0)
        if (isAppend && lastDocMap[key]) {
            query = query.startAfter(lastDocMap[key]);
        }

        const snap = await query.get();
        if (!isAppend) grid.innerHTML = '';
        
        if (snap.empty) {
            if (!isAppend) grid.innerHTML = '<p class="loading-msg">현재 준비된 영상이 없습니다.</p>';
            reachedEndMap[key] = true;
            if (sentinel) sentinel.style.display = 'none';
        } else {
            lastDocMap[key] = snap.docs[snap.docs.length - 1];
            
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
                card.querySelector('.fav-icon').onclick = async (e) => {
                    e.stopPropagation();
                    const res = await toggleFav(v);
                    e.currentTarget.classList.toggle('active', res);
                };
                card.querySelector('.thumbnail-container').onclick = () => openModal(v);
                grid.appendChild(card);
            });
            
            // If fewer than limit returned, we've reached the end
            if (snap.docs.length < 20) {
                reachedEndMap[key] = true;
                if (sentinel) sentinel.style.display = 'none';
            }
        }
    } catch (e) { 
        console.error("Load Error for " + key, e); 
        if (!isAppend) grid.innerHTML = '<p class="loading-msg">데이터 소환 중 오류가 발생했습니다.</p>';
    } finally {
        loadingMap[key] = false;
        if (sentinel) sentinel.classList.remove('loading');
    }
}

// 6. Intersection Observer for Infinite Scroll
function setupInfiniteScroll(key) {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
        // Ensure we ONLY load more if we are NOT already loading (v18.0 Fix)
        if (entries[0].isIntersecting && !loadingMap[key] && !reachedEndMap[key]) {
            load(key, { elementId: 'category-grid' }, true);
        }
    }, { threshold: 0.01 });

    observer.observe(sentinel);
}

// 7. Modals
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

// 8. My List
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
        card.querySelector('.fav-icon').onclick = async (e) => {
            e.stopPropagation();
            await toggleFav(v);
        };
        card.querySelector('.thumbnail-container').onclick = () => openModal(v);
        grid.appendChild(card);
    });
}


// 9. Init & Listeners
async function initApp() {
    trackPV();
    
    // Main Page Rows
    const rows = ['kpop', 'kdrama', 'tvlit', 'dramagame', 'kclassic', 'kmovie', 'kvariety', 'trending'];
    rows.forEach(row => { 
        const gridId = row + '-grid';
        if (document.getElementById(gridId)) load(row, { elementId: gridId }); 
    });

    // Category Page (v17.0 Infinite Scroll Integration)
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('c');
    if (cat && document.getElementById('category-grid')) {
        const titles = { 
            'kpop': 'K-Pop Universe', 'kdrama': 'Drama World', 'tvlit': 'TV Literature Hall', 
            'dramagame': 'Drama Game Archive',
            'kclassic': 'Eternal Cinema', 'kmovie': 'Cinema Masterpieces',
            'kvariety': 'Variety Show Stars', 'trending': 'Trending Now', 'fav': 'My Secret List' 
        };
        const catTitle = document.getElementById('category-title');
        if (catTitle) {
            if (cat && titles[cat]) {
                catTitle.innerText = titles[cat];
            } else if (cat) {
                catTitle.innerText = cat.charAt(0).toUpperCase() + cat.slice(1);
            } else {
                catTitle.innerText = "Archive Explorer";
            }
        }
        
        if (!cat) {
            const grid = document.getElementById('category-grid');
            if (grid) grid.innerHTML = '<p class="loading-msg">Please select a category from the menu.</p>';
            const sentinel = document.getElementById('scroll-sentinel');
            if (sentinel) sentinel.style.display = 'none';
        } else if (cat === 'fav') {
            renderMyList('category-grid');
            const sentinel = document.getElementById('scroll-sentinel');
            if (sentinel) sentinel.style.display = 'none';
        } else {
            // Sequential load (v18.0)
            load(cat, { elementId: 'category-grid' }).then(() => {
                setupInfiniteScroll(cat);
            });
        }
    }
    
    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        if (header) window.scrollY > 50 ? header.classList.add('scrolled') : header.classList.remove('scrolled');
    });

    // Mobile Menu Engine (v18.0)
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        // Close menu on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileBtn.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }
}

auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) await syncFavorites();
    updateAuthUI(user);
    renderMyList('mylist-grid');
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
