/**
 * YOUFLIX.IO - Ultimate Hybrid Auth Master (v6.0)
 * POPUP -> REDIRECT FALLBACK (UNSTOPPABLE)
 */

console.log("🎬 YOUFLIX Engine v6.0: Unstoppable Hybrid Auth Active...");

const UNIVERSAL_KEY = 'AIzaSyDArPdfLyswcFgLBW724ZTObPC4yQ9Py14';
const firebaseConfig = {
    apiKey: UNIVERSAL_KEY,
    authDomain: "gen-lang-client-0874410222.firebaseapp.com",
    projectId: "gen-lang-client-0874410222",
    storageBucket: "gen-lang-client-0874410222.firebasestorage.app",
    messagingSenderId: "970801923265",
    appId: "1:970801923265:web:e2ee1f82d2c567808d0040"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

let currentVideo = null;
let player = null;

// Unified UI Update
function updateAuthUI(user) {
    const hBtn = document.getElementById('login-btn');
    if (hBtn) {
        if (user) {
            hBtn.innerHTML = `<div style="display:flex;align-items:center;gap:8px;"><img src="${user.photoURL || ''}" style="width:24px;height:24px;border-radius:50%;border:1px solid #fff;"><span>Logout</span></div>`;
            hBtn.classList.add('logged-in');
        } else {
            hBtn.innerHTML = 'Google Login';
            hBtn.classList.remove('logged-in');
        }
        hBtn.onclick = window.handleAuth;
    }
    const mBtn = document.getElementById('modal-login-btn');
    if (mBtn) {
        mBtn.innerHTML = user ? `Welcome, ${user.displayName.split(' ')[0]} ✅` : `Login with Google 🔐`;
        mBtn.onclick = window.handleAuth;
    }
}

window.handleAuth = async function() {
    console.log("🔐 Unstoppable Auth Initiated...");
    try {
        if (auth.currentUser) {
            await auth.signOut();
            window.location.reload();
        } else {
            // Save state just in case we need to redirect
            const state = { url: window.location.href, video: currentVideo };
            sessionStorage.setItem('uf_recovery', JSON.stringify(state));

            try {
                // Try Popup First
                const result = await auth.signInWithPopup(provider);
                console.log("🌟 Popup Login Success:", result.user.displayName);
                updateAuthUI(result.user);
                sessionStorage.removeItem('uf_recovery'); // Not needed if popup worked
            } catch (pError) {
                if (pError.code === 'auth/popup-blocked') {
                    console.log("🛰️ Popup blocked! Switching to Redirect mode automatically...");
                    await auth.signInWithRedirect(provider);
                } else {
                    throw pError;
                }
            }
        }
    } catch (e) {
        console.error("🔑 Auth Fatal Error:", e.message);
        alert(`로그인 지원 모드 가동 중: ${e.message}`);
    }
};

// State Change Observer
auth.onAuthStateChanged(user => { updateAuthUI(user); });

// Watchdog (Force sync)
setInterval(() => { if (auth.currentUser) updateAuthUI(auth.currentUser); }, 3000);

document.addEventListener('DOMContentLoaded', () => {
    // Handle Redirect Result & Recovery
    auth.getRedirectResult().then(result => {
        if (result.user) updateAuthUI(result.user);
        
        const rec = sessionStorage.getItem('uf_recovery');
        if (rec) {
            const state = JSON.parse(rec);
            sessionStorage.removeItem('uf_recovery');
            if (state.video) {
                console.log("♻️ Post-Redirect Recovery:", state.video.title);
                setTimeout(() => open(state.video.id, state.video.title, state.video.channel), 1500);
            }
        }
    }).catch(e => console.error("Redirect Final Check Error:", e));

    const iCat = !!document.getElementById('category-grid');
    if (iCat) initCategoryPage(); else initMainPage();
    setupUI();
});

const CATEGORIES = {
    kpop: { query: 'Official K-POP MV 4K', elementId: 'kpop-grid' },
    kdrama: { query: 'Official K-Drama Trailer 4K', elementId: 'kdrama-grid' },
    kclassic: { query: 'KoreanClassicFilm Full Movie High Quality', elementId: 'kclassic-grid' },
    kmovie: { query: 'South Korea Movie Trailer 2024', elementId: 'kmovie-grid' },
    kvariety: { query: 'Korean Variety Show Highlight 2024', elementId: 'kvariety-grid' },
    trending: { query: 'Trending K-POP 2024 Today', elementId: 'trending-grid' }
};

async function load(key, config) {
    const grid = document.getElementById(config.elementId); if (!grid) return;
    grid.innerHTML = '<p class="loading-msg">Searching content...</p>';
    let vids = [];
    try {
        const snap = await db.collection(key).orderBy('date', 'desc').limit(15).get();
        vids = snap.docs.map(d => d.data());
        const last = localStorage.getItem(`f_${key}`);
        if (vids.length < 5 || !last || (Date.now() - last > 12 * 60 * 60 * 1000)) {
            const raw = await fetchYT(CATEGORIES[key].query);
            if (raw.length > 0) { vids = [...raw, ...vids].slice(0, 15); sync(key, raw); localStorage.setItem(`f_${key}`, Date.now()); }
        }
    } catch (e) {}
    if (vids.length === 0) vids = [{ id: '900X9f_vWRE', title: 'Loading...', channel: 'Archive', date: '2024', thumbnail: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800' }];
    grid.innerHTML = ''; vids.forEach(v => grid.appendChild(card(v)));
}

async function fetchYT(q) {
    try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(q)}&type=video&key=${UNIVERSAL_KEY}`);
        const d = await r.json();
        return (d.items || []).map(i => ({ id: i.id.videoId, title: i.snippet.title, channel: i.snippet.channelTitle, date: new Date(i.snippet.publishedAt).toLocaleDateString(), thumbnail: i.snippet.thumbnails.high ? i.snippet.thumbnails.high.url : i.snippet.thumbnails.medium.url, desc: i.snippet.description || "" }));
    } catch (e) { return []; }
}

function sync(col, vids) { const b = db.batch(); vids.forEach(v => b.set(db.collection(col).doc(v.id), v)); b.commit().catch(() => {}); }

function card(v) {
    const c = document.createElement('div'); c.className = 'video-card animate-in';
    c.innerHTML = `<div class="thumbnail-container"><img src="${v.thumbnail}" loading="lazy"><div class="play-overlay"><div class="play-icon">▶</div></div></div><div class="video-info"><h4>${encode(v.title)}</h4><div class="video-meta"><span>${encode(v.channel)}</span> • <span>${v.date}</span></div></div>`;
    c.onclick = () => open(v.id, v.title, v.channel); return c;
}

function open(id, title, channel) {
    currentVideo = { id, title, channel };
    const m = document.getElementById('video-modal'); m.style.display = 'block'; document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').textContent = title;
    let ctrls = document.getElementById('modal-controls');
    if (!ctrls) { ctrls = document.createElement('div'); ctrls.id = 'modal-controls'; ctrls.className = 'modal-controls'; document.querySelector('.modal-info')?.prepend(ctrls); }
    ctrls.innerHTML = '';
    const yt = document.createElement('a'); yt.id = 'modal-yt-link'; yt.className = 'btn btn-primary'; yt.target = '_blank'; yt.href = `https://www.youtube.com/watch?v=${id}`; yt.textContent = 'Watch on YouTube 🎬';
    ctrls.appendChild(yt);
    const lb = document.createElement('button'); lb.id = 'modal-login-btn'; lb.className = 'btn btn-secondary'; lb.style.marginLeft = '10px'; lb.onclick = window.handleAuth;
    lb.innerHTML = auth.currentUser ? `Welcome, ${auth.currentUser.displayName.split(' ')[0]} ✅` : `Login with Google 🔐`;
    ctrls.appendChild(lb);

    if (player && player.loadVideoById) {
        player.loadVideoById(id);
    } else {
        const pContainer = document.getElementById('player');
        if (pContainer) pContainer.innerHTML = '';
        if (window.YT && window.YT.Player) create(id);
        else {
            const t = document.createElement('script'); t.src = "https://www.youtube.com/iframe_api"; document.body.appendChild(t);
            window.onYouTubeIframeAPIReady = () => create(id);
        }
    }
}

function create(id) { player = new YT.Player('player', { height: '100%', width: '100%', videoId: id, playerVars: { 'autoplay': 1, 'controls': 1 }}); }
function close() { currentVideo = null; document.getElementById('video-modal').style.display = 'none'; document.body.style.overflow = 'auto'; if (player && player.stopVideo) player.stopVideo(); }
function encode(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function setupUI() { document.querySelector('.close-modal').onclick = close; window.onclick = (e) => { if (e.target.id === 'video-modal') close(); }; }
function initMainPage() { initHero(); Object.entries(CATEGORIES).forEach(([k, c]) => load(k, c)); }
function initHero() { const b = document.getElementById('hero-play-btn'); if (b) b.onclick = () => open('TUTP6D_X3Ww', 'Welcome', 'YOUFLIX'); }
