/**
 * YOUFLIX.IO - Debugging & Diagnostics Master (v6.2)
 * LIVE ERROR TRACKING & TOAST NOTIFICATIONS
 */

console.log("🎬 YOUFLIX Engine v6.2: Diagnostics Active...");

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
provider.setCustomParameters({ prompt: 'select_account' });

// Persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(e => console.error(e));

let currentVideo = null;
let player = null;

// Notification System
function showToast(msg, color = "#e50914") {
    const t = document.createElement('div');
    t.style = `position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:${color}; color:#fff; padding:12px 24px; border-radius:30px; z-index:10000; font-weight:bold; box-shadow:0 10px 30px rgba(0,0,0,0.5); font-family:sans-serif;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function updateAuthUI(user) {
    console.log("👤 State Check:", user ? user.displayName : "None");
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
    try {
        if (auth.currentUser) {
            await auth.signOut();
            showToast("로그아웃 되었습니다.", "#444");
            window.location.reload();
        } else {
            const state = { url: window.location.href, video: currentVideo };
            sessionStorage.setItem('uf_recovery', JSON.stringify(state));
            try {
                const res = await auth.signInWithPopup(provider);
                showToast(`로그인 성공! 반가워요, ${res.user.displayName}님! ✨`, "#2ecc71");
                updateAuthUI(res.user);
            } catch (pErr) {
                if (pErr.code === 'auth/popup-blocked') {
                    showToast("팝업 차단 감지: 리다이렉트 모드로 자동 전환합니다... 🚀");
                    await auth.signInWithRedirect(provider);
                } else { throw pErr; }
            }
        }
    } catch (e) {
        console.error("Critical Auth Error:", e);
        if (e.code === 'auth/unauthorized-domain') {
            alert("❌ 도메인 승인 에러: Firebase Console에서 'youflix.kr'을 승인된 도메인으로 추가해야 합니다!");
        } else {
            alert(`🔍 인증 확인 실패: ${e.message} (에러코드: ${e.code})`);
        }
    }
};

auth.onAuthStateChanged(user => { 
    if (user) console.log("👑 User Detected:", user.displayName);
    updateAuthUI(user); 
});

document.addEventListener('DOMContentLoaded', () => {
    auth.getRedirectResult().then(result => {
        if (result.user) {
            showToast(`리다이렉트 로그인 성공! ✨`, "#2ecc71");
            updateAuthUI(result.user);
        }
        const rec = sessionStorage.getItem('uf_recovery');
        if (rec) {
            const st = JSON.parse(rec);
            sessionStorage.removeItem('uf_recovery');
            if (st.video) setTimeout(() => open(st.video.id, st.video.title, st.video.channel), 1500);
        }
    }).catch(e => {
        console.error("Redirect Result Error:", e);
        if (e.code === 'auth/unauthorized-domain') {
            alert("❌ 도메인 승인 에러: 'youflix.kr'을 파이어베이스에 먼저 등록해 주세요!");
        }
    });

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
