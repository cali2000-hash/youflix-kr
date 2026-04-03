/**
 * YOUFLIX.IO - Global Premium YouTube Archive (Ultimate Version)
 * Features: YouTube API v3, Firebase Firestore Archive, 24h Smart Caching, Live Search, Pagination
 */

// 1. Configuration (YouTube & Firebase)
const API_KEY = 'AIzaSyDArPdfLyswcFgLBW724ZTObPC4yQ9Py14';

const firebaseConfig = {
    apiKey: "AIzaSyCjqOk6CidQvxXXFBVNa5liqshtpjQ3oQw",
    authDomain: "gen-lang-client-0874410222.firebaseapp.com", // Corrected Auth Domain
    projectId: "gen-lang-client-0874410222",
    storageBucket: "gen-lang-client-0874410222.firebasestorage.app",
    messagingSenderId: "970801923265",
    appId: "1:970801923265:web:e2ee1f82d2c567808d0040",
    measurementId: "G-W46PH03XQE"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 2. Category Configuration (K-Content Focus)
const CATEGORIES = {
    kpop: { query: 'Official K-POP Music Video 2024 New 4K', title: 'K-POP MV: The Official Archive', elementId: 'kpop-grid' },
    kdrama: { query: 'K-Drama Official Highlights Playlist 4K', title: 'K-Drama World: Teasers & Clips', elementId: 'kdrama-grid' },
    kvariety: { query: 'Korean Variety Show Highlight Funny 2024', title: 'K-Variety Buzz: Viral Moments', elementId: 'kvariety-grid' },
    kstage: { query: 'K-POP Live Performance Stage 4K Focus', title: 'K-Stage Live: Absolute Performance', elementId: 'kstage-grid' },
    trending: { query: 'K-POP Trending Video South Korea 2024', title: 'NOW: Trending in Korea', elementId: 'trending-grid' },
    kfood: { query: 'Korean Street Food Mukbang 4K UHD High Quality', title: 'K-Food & Mukbang Essentials', elementId: 'kfood-grid' }
};

const FALLBACK_DATA = {
    kpop: [{ id: '900X9f_vWRE', title: 'Global K-POP Standard', channel: 'Official Channel', date: '2024-03-25', thumbnail: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800', desc: "Experience the pinnacle of K-POP performance." }]
};

const HERO_DEFAULT = {
    id: 'TUTP6D_X3Ww', // New K-POP Related or Trending Video ID if needed
    title: 'K-IDENTITY: THE ARCHIVE',
    desc: 'The complete digital archive of South Korea’s most viral cultural exports. From official K-POP MV to Cinema gems.',
    bg: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=1500' 
};

const API_FETCH_COOLDOWN = 12 * 60 * 60 * 1000; // Build Archive every 12h

// 3. App State & Logic
const grids = {};
const modal = document.getElementById('video-modal');
const closeModal = document.querySelector('.close-modal');
const heroTitle = document.getElementById('hero-title');
const heroDesc = document.getElementById('hero-desc');
const heroSection = document.getElementById('hero');

let lastDoc = null; // For Archive Pagination
let currentCategoryId = null;

// 4. Initialization Logic
document.addEventListener('DOMContentLoaded', () => {
    const categoryGrid = document.getElementById('category-grid');
    if (categoryGrid) {
        initCategoryPage();
    } else {
        initMainPage();
    }
});

function initMainPage() {
    Object.keys(CATEGORIES).forEach(key => grids[key] = document.getElementById(CATEGORIES[key].elementId));
    initHero();
    fetchAllCategories();
    setupEventListeners();
}

async function initHero() {
    if (heroTitle) heroTitle.textContent = HERO_DEFAULT.title;
    if (heroDesc) heroDesc.textContent = HERO_DEFAULT.desc;
    if (heroSection) heroSection.style.backgroundImage = `linear-gradient(to right, rgba(12, 13, 22, 0.9) 15%, rgba(12, 13, 22, 0.4) 50%, rgba(12, 13, 22, 0.2) 100%), url('${HERO_DEFAULT.bg}')`;
    
    const heroPlayBtn = document.getElementById('hero-play-btn');
    if (heroPlayBtn) {
        heroPlayBtn.onclick = () => openVideo(HERO_DEFAULT.id, HERO_DEFAULT.title, 'YOUFLIX');
    }
}

// 5. Category Details Logic (category.html)
async function initCategoryPage() {
    const urlParams = new URLSearchParams(window.location.search);
    currentCategoryId = urlParams.get('id');
    
    if (!currentCategoryId || !CATEGORIES[currentCategoryId]) {
        window.location.href = 'index.html';
        return;
    }

    const titleEl = document.getElementById('category-title');
    if (titleEl) titleEl.textContent = CATEGORIES[currentCategoryId].title;
    
    setupEventListeners();
    loadCategoryVideos(true); // Load initial batch from Archive

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.onclick = () => loadCategoryVideos(false);
    }
}

async function loadCategoryVideos(isInitial = false) {
    const grid = document.getElementById('category-grid');
    const loadMoreArea = document.getElementById('load-more-area');
    if (!grid) return;

    if (isInitial) {
        grid.innerHTML = '<p style="padding: 4rem 0; color: #666; text-align: center;">Opening the vault...</p>';
        lastDoc = null;
    }

    try {
        let query = db.collection(currentCategoryId).orderBy('date', 'desc').limit(20);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        if (isInitial) grid.innerHTML = '';

        if (snapshot.empty) {
            if (loadMoreArea) loadMoreArea.style.display = 'none';
            if (isInitial) grid.innerHTML = '<p style="padding: 4rem 0; color: #666; text-align: center;">No items found in this archive yet.</p>';
            return;
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        snapshot.docs.forEach(doc => {
            grid.appendChild(createVideoCard(doc.data()));
        });

        // Use 'flex' to match CSS and show it correctly
        if (loadMoreArea) loadMoreArea.style.display = 'flex';
        
        // If we fetched less than the limit, we might want to hide it or keep it for future sync
        if (snapshot.docs.length < 20) {
           console.log("End of current archive reached.");
           // Optional: You can hide it or keep it visible. Let's keep it visible for now as requested.
        }
    } catch (e) {
        console.error("Pagination Error:", e);
        if (isInitial) grid.innerHTML = '<p>Error connecting to archive.</p>';
    }
}

// 6. Main Data Core (index.html)
async function fetchAllCategories() {
    let heroSet = false;

    for (const [key, category] of Object.entries(CATEGORIES)) {
        if (!grids[key]) continue;

        let videos = [];
        try {
            const snapshot = await db.collection(key).orderBy('date', 'desc').limit(20).get();
            videos = snapshot.docs.map(doc => doc.data());

            const lastFetch = localStorage.getItem(`last_fetch_${key}`);
            const needsRefresh = !lastFetch || (Date.now() - parseInt(lastFetch) > API_FETCH_COOLDOWN);
            
            if (needsRefresh) {
                const newDiscovery = await fetchYouTubeVideos(category.query);
                if (newDiscovery.length > 0) {
                    const batch = db.batch();
                    newDiscovery.forEach(v => {
                        const docRef = db.collection(key).doc(v.id);
                        batch.set(docRef, v);
                    });
                    await batch.commit();
                    
                    const existingIds = new Set(videos.map(v => v.id));
                    newDiscovery.forEach(v => {
                        if (!existingIds.has(v.id)) videos.unshift(v);
                    });
                    localStorage.setItem(`last_fetch_${key}`, Date.now().toString());
                }
            }
        } catch (error) {
            console.error(`[Data System Error]:`, error);
        }

        if (videos.length === 0 && FALLBACK_DATA[key]) videos = FALLBACK_DATA[key];

        if (videos.length > 0) {
            grids[key].innerHTML = ''; 
            videos.forEach(v => grids[key].appendChild(createVideoCard(v)));
            
            if (!heroSet && (key === 'nature' || key === 'trending' || key === 'movie')) {
                updateHeroContent(videos[0]);
                heroSet = true;
            }
        }
    }
}

async function fetchYouTubeVideos(query) {
    const debugEl = getOrCreateDebugEl();
    try {
        if (debugEl) debugEl.textContent = `Searching: "${query.substring(0,10)}..."`;
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`);
        const data = await response.json();
        
        if (data.error) {
            if (debugEl) {
                debugEl.style.color = '#ff4b4b';
                debugEl.textContent = `API Error ${data.error.code}: ${data.error.message}`;
            }
            return [];
        }

        if (debugEl) {
            debugEl.style.color = '#4CAF50';
            debugEl.textContent = `Search OK: Found ${data.items ? data.items.length : 0} items`;
            setTimeout(() => { debugEl.style.display = 'none'; }, 5000);
        }

        if (!data.items) return [];
        return data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            date: new Date(item.snippet.publishedAt).toLocaleDateString(),
            thumbnail: item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.medium.url,
            desc: item.snippet.description || ""
        }));
    } catch (error) {
        return [];
    }
}

// 7. UI Rendering Logic
function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <div class="thumbnail-container">
            <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
            <div class="play-overlay"><div class="play-icon">▶</div></div>
        </div>
        <div class="video-info">
            <h4>${video.title}</h4>
            <div class="video-meta"><span>${video.channel}</span> • <span>${video.date}</span></div>
        </div>
    `;
    card.addEventListener('click', () => openVideo(video.id, video.title, video.channel));
    return card;
}

function updateHeroContent(video) {
    if (!video) return;
    if (heroTitle) heroTitle.textContent = video.title;
    if (heroDesc) heroDesc.textContent = video.desc.substring(0, 160) + "...";
    if (heroSection) {
        heroSection.style.backgroundImage = `linear-gradient(to right, rgba(12, 13, 22, 0.9) 15%, rgba(12, 13, 22, 0.4) 50%, rgba(12, 13, 22, 0.2) 100%), url('${video.thumbnail}')`;
    }
    const heroPlayBtn = document.getElementById('hero-play-btn');
    if (heroPlayBtn) heroPlayBtn.onclick = () => openVideo(video.id, video.title, video.channel);
}

// 8. Player & Modal Systems
let player;
function openVideo(videoId, title, channel) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').textContent = title;
    const descEl = document.getElementById('modal-desc');
    if (descEl) descEl.textContent = `Visual Essence from the ${channel} channel. Premium streaming archive.`;

    if (player && typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
    } else {
        if (window.YT && window.YT.Player) {
            createPlayer(videoId);
        } else {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.body.appendChild(tag);
            window.onYouTubeIframeAPIReady = () => createPlayer(videoId);
        }
    }
}

function createPlayer(videoId) {
    player = new YT.Player('player', {
        height: '100%', width: '100%',
        videoId: videoId,
        playerVars: { 'autoplay': 1, 'controls': 1, 'modestbranding': 1, 'rel': 0 }
    });
}

function closeVideoModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    if (player && typeof player.stopVideo === 'function') player.stopVideo();
}

function setupEventListeners() {
    if (closeModal) closeModal.onclick = closeVideoModal;
    window.onclick = (e) => { if (e.target == modal) closeVideoModal(); };

    const searchInput = document.getElementById('video-search');
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn && searchInput) {
        searchBtn.onclick = () => performSearch(searchInput.value);
        searchInput.onkeypress = (e) => { if (e.key === 'Enter') performSearch(searchInput.value); };
    }
}

async function performSearch(query) {
    if (!query || query.trim() === "") return;
    const natureRowTitle = document.querySelector('#nature-grid').previousElementSibling;
    if (natureRowTitle) natureRowTitle.textContent = `Search Results: "${query}"`;
    const videos = await fetchYouTubeVideos(query);
    const grid = document.getElementById('nature-grid');
    if (grid) {
        grid.innerHTML = '';
        if (videos.length > 0) {
            videos.forEach(v => grid.appendChild(createVideoCard(v)));
            updateHeroContent(videos[0]);
        }
    }
}

function getOrCreateDebugEl() {
    let el = document.getElementById('api-debug');
    if (!el) {
        el = document.createElement('div');
        el.id = 'api-debug';
        el.style.position = 'fixed'; el.style.bottom = '10px'; el.style.right = '10px';
        el.style.width = '350px'; el.style.backgroundColor = 'rgba(0,0,0,0.9)'; el.style.color = '#fff';
        el.style.fontSize = '11px'; el.style.padding = '10px'; el.style.borderRadius = '5px';
        el.style.zIndex = '9999'; el.style.wordBreak = 'break-word'; el.style.pointerEvents = 'none';
        document.body.appendChild(el);
    }
    return el;
}
