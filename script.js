/**
 * YOUFLIX.IO - Stable Redirect Auth Engine (v5.2)
 * NO POPUP BLOCKED ERRORS
 */

console.log("🎬 YOUFLIX Engine v5.2: Redirect Mode...");

const API_KEY = 'AIzaSyDArPdfLyswcFgLBW724ZTObPC4yQ9Py14';
const firebaseConfig = {
    apiKey: "AIzaSyCjqOk6CidQvxXXFBVNa5liqshtpjQ3oQw",
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

const DEMO_DATA = {
    kpop: [{ id: '900X9f_vWRE', title: 'Top K-POP Trends 2024', channel: 'K-Archive', date: '2024-04-03', thumbnail: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800', desc: 'Global K-Content' }],
    kdrama: [{ id: '900X9f_vWRE', title: 'K-Drama Essentials', channel: 'K-Archive', date: '2024-04-03', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800', desc: 'Dramatic Moments' }],
    kclassic: [{ id: 'TUTP6D_X3Ww', title: 'National Cinema Classic', channel: 'KOFA', date: '2024-04-03', thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed0963c?auto=format&fit=crop&q=80&w=800', desc: 'Historical Gems' }]
};

const CATEGORIES = {
    kpop: { query: 'Official K-POP MV 4K', elementId: 'kpop-grid' },
    kdrama: { query: 'Official K-Drama Trailer 4K', elementId: 'kdrama-grid' },
    kclassic: { query: 'KoreanClassicFilm Full Movie High Quality', elementId: 'kclassic-grid' },
    kmovie: { query: 'South Korea Movie Trailer 2024', elementId: 'kmovie-grid' },
    kvariety: { query: 'Korean Variety Show Highlight 2024', elementId: 'kvariety-grid' },
    trending: { query: 'Trending K-POP 2024 Today', elementId: 'trending-grid' }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Redirect Result
    auth.getRedirectResult().then(result => {
        if (result.user) console.log("👋 Welcome back, " + result.user.displayName);
    }).catch(e => {
        console.error("Redirect Error:", e.message);
        if (e.code === 'auth/unauthorized-domain') {
            alert("Please add 'youflix.kr' to Authorized Domains in Firebase Console Settings!");
        }
    });

    const isCategory = !!document.getElementById('category-grid');
    if (isCategory) initCategoryPage(); else initMainPage();
    setupGeneric();
});

// Sync UI with Auth State
auth.onAuthStateChanged(user => {
    const headerBtn = document.getElementById('login-btn');
    if (headerBtn) {
        headerBtn.textContent = user ? 'Logout' : 'Google Login';
        headerBtn.classList.toggle('logged-in', !!user);
    }
    const modalBtn = document.getElementById('modal-login-btn');
    if (modalBtn) modalBtn.innerHTML = user ? `Logged in ✅` : `Login with Google 🔐`;
});

async function handleAuth() {
    if (auth.currentUser) {
        await auth.signOut();
    } else {
        console.log("🚀 Redirecting to Google Login...");
        await auth.signInWithRedirect(provider);
    }
}

function initMainPage() {
    initHero();
    Object.entries(CATEGORIES).forEach(([k, c]) => load(k, c));
}

async function load(key, config) {
    const grid = document.getElementById(config.elementId);
    if (!grid) return;
    grid.innerHTML = '<p class="loading-msg">Summoning content...</p>';
    
    let vids = [];
    try {
        const snap = await db.collection(key).orderBy('date', 'desc').limit(15).get();
        vids = snap.docs.map(d => d.data());
        const last = localStorage.getItem(`f_${key}`);
        if (vids.length < 5 || !last || (Date.now() - last > 12 * 60 * 60 * 1000)) {
            const raw = await fetchYT(CATEGORIES[key].query || key);
            if (raw.length > 0) {
                vids = [...raw, ...vids].slice(0, 15);
                sync(key, raw);
                localStorage.setItem(`f_${key}`, Date.now());
            }
        }
    } catch (e) { console.warn("Load Error:", e); }

    if (vids.length === 0) vids = DEMO_DATA[key] || DEMO_DATA.kpop;
    grid.innerHTML = '';
    vids.forEach(v => grid.appendChild(card(v)));
}

async function fetchYT(q) {
    try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(q)}&type=video&key=${API_KEY}`);
        const d = await r.json();
        return (d.items || []).map(i => ({
            id: i.id.videoId, title: i.snippet.title, channel: i.snippet.channelTitle,
            date: new Date(i.snippet.publishedAt).toLocaleDateString(),
            thumbnail: i.snippet.thumbnails.high ? i.snippet.thumbnails.high.url : i.snippet.thumbnails.medium.url,
            desc: i.snippet.description || ""
        }));
    } catch (e) { return []; }
}

function sync(col, vids) {
    const b = db.batch();
    vids.forEach(v => b.set(db.collection(col).doc(v.id), v));
    b.commit().catch(() => {});
}

function card(v) {
    const c = document.createElement('div');
    c.className = 'video-card animate-in';
    c.innerHTML = `
        <div class="thumbnail-container">
            <img src="${v.thumbnail}" loading="lazy">
            <div class="play-overlay"><div class="play-icon">▶</div></div>
        </div>
        <div class="video-info">
            <h4>${encode(v.title)}</h4>
            <div class="video-meta"><span>${encode(v.channel)}</span> • <span>${v.date}</span></div>
        </div>
    `;
    c.onclick = () => open(v.id, v.title, v.channel);
    return c;
}

function open(id, title, channel) {
    const m = document.getElementById('video-modal');
    m.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').textContent = title;

    let yt = document.getElementById('modal-yt-link');
    if (!yt) {
        yt = document.createElement('a'); yt.id = 'modal-yt-link';
        yt.className = 'btn btn-primary'; yt.target = '_blank';
        document.querySelector('.modal-info').appendChild(yt);
    }
    yt.href = `https://www.youtube.com/watch?v=${id}`;
    yt.textContent = 'Watch on YouTube 🎬';

    let lb = document.getElementById('modal-login-btn');
    if (!lb) {
        lb = document.createElement('button'); lb.id = 'modal-login-btn';
        lb.className = 'btn btn-secondary'; lb.style.marginLeft = '10px';
        document.querySelector('.modal-info').appendChild(lb);
    }
    lb.onclick = handleAuth;
    lb.innerHTML = auth.currentUser ? `Logged in ✅` : `Login with Google 🔐`;

    if (player && player.loadVideoById) player.loadVideoById(id);
    else { if (window.YT) create(id); else { const t = document.createElement('script'); t.src = "https://www.youtube.com/iframe_api"; document.body.appendChild(t); window.onYouTubeIframeAPIReady = () => create(id); } }
}

function create(id) { player = new YT.Player('player', { height: '100%', width: '100%', videoId: id, playerVars: { 'autoplay': 1, 'controls': 1 }}); }
function close() { document.getElementById('video-modal').style.display = 'none'; document.body.style.overflow = 'auto'; if (player && player.stopVideo) player.stopVideo(); }
function encode(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function setupGeneric() { document.querySelector('.close-modal').onclick = close; window.onclick = (e) => { if (e.target.id === 'video-modal') close(); }; }
function initHero() { const b = document.getElementById('hero-play-btn'); if (b) b.onclick = () => open('TUTP6D_X3Ww', 'Welcome', 'YOUFLIX'); }
