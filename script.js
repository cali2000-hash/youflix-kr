/**
 * YOUFLIX.IO - Ultimate Robust Engine (v5.0)
 * GUARANTEED RENDER MODE
 */

console.log("🎬 YOUFLIX Engine v5.0: Ignition...");

// 1. Config
const API_KEY = 'AIzaSyDArPdfLyswcFgLBW724ZTObPC4yQ9Py14';
const firebaseConfig = {
    apiKey: "AIzaSyCjqOk6CidQvxXXFBVNa5liqshtpjQ3oQw",
    authDomain: "gen-lang-client-0874410222.firebaseapp.com",
    projectId: "gen-lang-client-0874410222",
    storageBucket: "gen-lang-client-0874410222.firebasestorage.app",
    messagingSenderId: "970801923265",
    appId: "1:970801923265:web:e2ee1f82d2c567808d0040"
};

// Initialize
try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase Connected");
} catch (e) {
    console.error("❌ Firebase Error:", e);
}

const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// 2. Demo Backup Data (Emergency Mode)
const DEMO_DATA = {
    kpop: [{ id: '900X9f_vWRE', title: 'Top K-POP Trends 2024', channel: 'K-Archive', date: '2024-04-03', thumbnail: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800', desc: 'Global K-Content' }],
    kdrama: [{ id: '900X9f_vWRE', title: 'K-Drama Essentials', channel: 'K-Archive', date: '2024-04-03', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800', desc: 'Dramatic Moments' }],
    kclassic: [{ id: 'TUTP6D_X3Ww', title: 'National Cinema Classic', channel: 'KOFA', date: '2024-04-03', thumbnail: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed0963c?auto=format&fit=crop&q=80&w=800', desc: 'Historical Gems' }]
};

const CATEGORIES = {
    kpop: { query: 'Official K-POP MV 4K', elementId: 'kpop-grid', title: 'K-POP MV' },
    kdrama: { query: 'Official K-Drama Trailer 4K', elementId: 'kdrama-grid', title: 'K-Drama' },
    kclassic: { query: 'KoreanClassicFilm Full Movie High Quality', elementId: 'kclassic-grid', title: 'K-Classic' },
    kmovie: { query: 'South Korea Movie Trailer 2024', elementId: 'kmovie-grid', title: 'K-Cinema' },
    kvariety: { query: 'Korean Variety Show Highlight 2024', elementId: 'kvariety-grid', title: 'K-Variety' },
    trending: { query: 'Trending K-POP 2024 Today', elementId: 'trending-grid', title: 'Trending' }
};

// 3. App Core
document.addEventListener('DOMContentLoaded', () => {
    console.log("💎 DOM Ready: Initializing Hub...");
    const categoryId = !!document.getElementById('category-grid');
    if (categoryId) initCategoryPage();
    else initMainPage();
    
    // Auth Listener
    auth.onAuthStateChanged(user => {
        const btn = document.getElementById('login-btn');
        if (btn) {
            btn.textContent = user ? 'Logout' : 'Google Login';
            btn.classList.toggle('logged-in', !!user);
        }
    });
});

async function handleAuth() {
    try {
        if (auth.currentUser) await auth.signOut();
        else await auth.signInWithPopup(provider);
        window.location.reload();
    } catch (e) {
        console.error("Auth Fail:", e);
    }
}

function initMainPage() {
    initHero();
    Object.entries(CATEGORIES).forEach(([key, config]) => loadSection(key, config));
}

async function loadSection(key, config) {
    const grid = document.getElementById(config.elementId);
    if (!grid) return;

    grid.innerHTML = '<p class="loading-msg">Summoning content...</p>';
    
    let videos = [];
    try {
        // Step 1: Firestore
        const snap = await db.collection(key).orderBy('date', 'desc').limit(15).get();
        videos = snap.docs.map(d => d.data());
        console.log(`📡 Loaded ${videos.length} docs from ${key}`);

        // Step 2: YouTube Fetch if empty or stale
        const lastFetch = localStorage.getItem(`fetch_${key}`);
        if (videos.length < 5 || !lastFetch || (Date.now() - lastFetch > 12 * 60 * 60 * 1000)) {
            const raw = await fetchYouTube(config.query);
            if (raw.length > 0) {
                videos = [...raw, ...videos].slice(0, 15);
                syncToDB(key, raw);
                localStorage.setItem(`fetch_${key}`, Date.now());
            }
        }
    } catch (e) {
        console.warn(`⚠️ API Error for ${key}:`, e);
    }

    // Step 3: Render or Demo Fallback
    if (videos.length === 0) videos = DEMO_DATA[key] || DEMO_DATA.kpop;
    
    grid.innerHTML = '';
    videos.forEach(v => grid.appendChild(createVideoCard(v)));
    if (key === 'kpop' || key === 'kmovie') updateHero(videos[0]);
}

async function fetchYouTube(query) {
    try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`);
        const data = await res.json();
        return (data.items || []).map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            date: new Date(item.snippet.publishedAt).toLocaleDateString(),
            thumbnail: item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.medium.url,
            desc: item.snippet.description || ""
        }));
    } catch (e) { return []; }
}

function syncToDB(col, videos) {
    const batch = db.batch();
    videos.forEach(v => batch.set(db.collection(col).doc(v.id), v));
    batch.commit().catch(() => {});
}

function createVideoCard(v) {
    const card = document.createElement('div');
    card.className = 'video-card animate-in';
    card.innerHTML = `
        <div class="thumbnail-container">
            <img src="${v.thumbnail}" alt="${v.title}" loading="lazy">
            <div class="play-overlay"><div class="play-icon">▶</div></div>
        </div>
        <div class="video-info">
            <h4>${encodeHTML(v.title)}</h4>
            <div class="video-meta"><span>${encodeHTML(v.channel)}</span> • <span>${v.date}</span></div>
        </div>
    `;
    card.onclick = () => openModal(v.id, v.title, v.channel);
    return card;
}

function updateHero(v) {
    const title = document.getElementById('hero-title');
    const desc = document.getElementById('hero-desc');
    const hero = document.getElementById('hero');
    const btn = document.getElementById('hero-play-btn');

    if (title && v.title) title.textContent = v.title;
    if (desc && v.desc) desc.textContent = v.desc.substring(0, 150) + "...";
    if (hero && v.thumbnail) hero.style.backgroundImage = `linear-gradient(to right, rgba(12, 13, 22, 0.9) 15%, rgba(12, 13, 22, 0.4) 50%, rgba(12, 13, 22, 0.2) 100%), url('${v.thumbnail}')`;
    if (btn) btn.onclick = () => openModal(v.id, v.title, v.channel);
}

// Player / Modal
let player;
function openModal(id, title, channel) {
    const modal = document.getElementById('video-modal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').textContent = title;

    let ytBtn = document.getElementById('modal-yt-link');
    if (!ytBtn) {
        ytBtn = document.createElement('a');
        ytBtn.id = 'modal-yt-link';
        ytBtn.className = 'btn btn-primary';
        ytBtn.target = '_blank';
        ytBtn.style.marginTop = '20px';
        document.querySelector('.modal-info').appendChild(ytBtn);
    }
    ytBtn.href = `https://www.youtube.com/watch?v=${id}`;
    ytBtn.textContent = 'Watch on YouTube 🎬';

    if (player && player.loadVideoById) {
        player.loadVideoById(id);
    } else {
        if (window.YT) createYT(id);
        else {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.body.appendChild(tag);
            window.onYouTubeIframeAPIReady = () => createYT(id);
        }
    }
}

function createYT(id) {
    player = new YT.Player('player', { height: '100%', width: '100%', videoId: id, playerVars: { 'autoplay': 1, 'controls': 1 }});
}

function closeModal() {
    document.getElementById('video-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    if (player && player.stopVideo) player.stopVideo();
}

document.querySelector('.close-modal').onclick = closeModal;
window.onclick = (e) => { if (e.target.id === 'video-modal') closeModal(); };

function encodeHTML(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function initHero() {
    const btn = document.getElementById('hero-play-btn');
    if (btn) btn.onclick = () => openModal('TUTP6D_X3Ww', 'Welcome to Archive', 'YOUFLIX');
}
