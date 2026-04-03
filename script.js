/**
 * YOUFLIX.KR Premium Archive Engine (v12.9 - CO-EXISTENCE Edition)
 * Features: Google Auth (Redirect), Cloud Sync, Real-time Profile Swap without deleting SearchBox
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

// 2. Auth Actions
async function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await auth.signInWithRedirect(provider);
    } catch (e) {
        alert("Login process failed: " + e.message);
    }
}

async function logout() {
    await auth.signOut();
    location.reload();
}

// 3. Smart UI Engine (v12.9 - Protects SearchBox)
function updateAuthUI(user) {
    const targets = document.querySelectorAll('.user-nav');
    targets.forEach(nav => {
        // 기존에 생성된 버튼이나 프로필이 있는지 확인
        let authZone = nav.querySelector('.auth-zone');
        if (!authZone) {
            authZone = document.createElement('div');
            authZone.className = 'auth-zone';
            nav.appendChild(authZone); // 검색창 뒤에 추가
        }

        if (user) {
            const photo = user.photoURL || 'https://www.gstatic.com/images/branding/product/1x/avatar_square_blue_512dp.png';
            authZone.innerHTML = `<img src="${photo}" alt="Profile" class="profile-img" onclick="logout()" title="Logout (${user.displayName})">`;
        } else {
            authZone.innerHTML = `<button class="btn btn-login" onclick="login()">SIGN IN</button>`;
        }
    });
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

// 5. Component Loaders
async function load(key, config) {
    const grid = document.getElementById(config.elementId);
    if (!grid) return;
    try {
        const snap = await db.collection(key).orderBy('date', 'desc').limit(20).get();
        grid.innerHTML = '';
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
    } catch (e) { console.error(e); }
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
    if (favs.length === 0) { grid.innerHTML = '<p class="loading-msg" style="padding:4rem 0;">마이 리스트가 비어 있습니다.</p>'; return; }
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
    auth.getRedirectResult().catch(e => { console.error(e); if (e.code !== 'auth/internal-error') alert("Redirect Login Result: " + e.message); });
    
    const rows = ['kpop', 'kdrama', 'tvlit', 'kclassic', 'kmovie', 'kvariety', 'trending'];
    rows.forEach(row => { if (document.getElementById(row + '-grid')) load(row, { elementId: row + '-grid' }); });
    
    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    window.addEventListener('scroll', () => {
        const header = document.getElementById('main-header');
        if (header) window.scrollY > 50 ? header.classList.add('scrolled') : header.classList.remove('scrolled');
    });
});
