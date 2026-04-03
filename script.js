/**
 * YOUFLIX.IO - Premium YouTube Curation (Stable Version)
 */

// 1. Configuration & Fallback Data
const API_KEY = 'AIzaSyD0sN7skLFkm__ZCYQoTGKfjtKnaXxbvKU';

const FALLBACK_DATA = {
    nature: [
        { id: '_fL9vO1U1B8', title: 'Majestic Swiss Alps 4K', channel: 'Nature Relax', date: '2024-03-25', thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800' },
        { id: 'vGZ2709U8S8', title: 'Deep Ocean Wonders', channel: 'Traveler TV', date: '2024-01-15', thumbnail: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?auto=format&fit=crop&q=80&w=800' }
    ],
    tech: [
        { id: '3JZ_D3ELwOQ', title: 'Minimal Desk Setup 2024', channel: 'Tech Insider', date: '2024-02-28', thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800' }
    ],
    knowledge: [
        { id: 'cZ6_xK7_D_Q', title: 'How Big is the Universe?', channel: 'Kurzgesagt', date: '2023-12-15', thumbnail: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800' }
    ],
    lofi: [
        { id: 'jfKfPfyJRdk', title: 'Lofi Girl - Study Radio', channel: 'Lofi Girl', date: '2024-04-03', thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=800' }
    ]
};

const CATEGORIES = {
    nature: { query: 'Nature 4K 8K Travel Documentary', elementId: 'nature-grid' },
    tech: { query: 'Minimalist Tech Desk Setup review', elementId: 'tech-grid' },
    knowledge: { query: 'Video Essay Insight Discovery', elementId: 'knowledge-grid' },
    lofi: { query: 'Lofi hip hop beats long mix', elementId: 'lofi-grid' },
    trending: { query: 'Trending Trailer Viral Hot 2024', elementId: 'trending-grid' },
    movie: { query: 'Movie Trailer Review analysis', elementId: 'movie-grid' },
    healing: { query: 'Healing Relaxation 4K Nature Sound', elementId: 'healing-grid' }
};

const HERO_DEFAULT = {
    id: 'f7_7vA_r_vM',
    title: 'Experience the Best',
    desc: 'Dive into your own world with premium-curated YouTube content tailored to your taste at YOUFLIX.KR.',
    bg: 'https://images.unsplash.com/photo-1492619339914-5d5276f72e39?auto=format&fit=crop&q=80&w=1500' 
};

// 2. DOM Elements
const grids = {
    nature: document.getElementById('nature-grid'),
    tech: document.getElementById('tech-grid'),
    knowledge: document.getElementById('knowledge-grid'),
    lofi: document.getElementById('lofi-grid'),
    trending: document.getElementById('trending-grid'),
    movie: document.getElementById('movie-grid'),
    healing: document.getElementById('healing-grid')
};
const modal = document.getElementById('video-modal');
const closeModal = document.querySelector('.close-modal');
const heroTitle = document.getElementById('hero-title');
const heroDesc = document.getElementById('hero-desc');
const heroSection = document.getElementById('hero');

// 3. Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initHero();
    fetchAllCategories();
    setupEventListeners();
});

function initHero() {
    if (heroTitle) heroTitle.textContent = HERO_DEFAULT.title;
    if (heroDesc) heroDesc.textContent = HERO_DEFAULT.desc;
    if (heroSection) heroSection.style.backgroundImage = `linear-gradient(to right, rgba(12, 13, 22, 0.9) 15%, rgba(12, 13, 22, 0.4) 50%, rgba(12, 13, 22, 0.2) 100%), url('${HERO_DEFAULT.bg}')`;
    
    const heroPlayBtn = document.getElementById('hero-play-btn');
    if (heroPlayBtn) {
        heroPlayBtn.onclick = () => openVideo(HERO_DEFAULT.id, HERO_DEFAULT.title, 'YOUFLIX');
    }
}

// 4. YouTube API Logic
async function fetchYouTubeVideos(query) {
    const debugEl = getOrCreateDebugEl();
    try {
        console.log(`[API Diagnostic] Fetching for: "${query}" using key ending in: ...${API_KEY.substring(API_KEY.length - 5)}`);
        if (debugEl) debugEl.textContent = `API Status: Fetching "${query.substring(0,10)}..."`;
        
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('[API Error Detail]:', data.error.code, data.error.message, data.error.status);
            if (debugEl) {
                debugEl.style.color = '#ff4b4b';
                debugEl.textContent = `API Error ${data.error.code}: ${data.error.message} (${data.error.status})`;
            }
            return [];
        }

        if (debugEl) {
            debugEl.style.color = '#4CAF50';
            debugEl.textContent = `API Status: OK (Fetched ${data.items ? data.items.length : 0} items)`;
        }

        if (!data.items || data.items.length === 0) return [];

        return data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            date: new Date(item.snippet.publishedAt).toLocaleDateString(),
            thumbnail: item.snippet.thumbnails.high ? item.snippet.thumbnails.high.url : item.snippet.thumbnails.medium.url,
            desc: item.snippet.description || ""
        }));
    } catch (error) {
        console.error('[Network Error]:', error);
        if (debugEl) debugEl.textContent = `Network Error: ${error.message}`;
        return [];
    }
}

function getOrCreateDebugEl() {
    let el = document.getElementById('api-debug');
    if (!el) {
        el = document.createElement('div');
        el.id = 'api-debug';
        el.style.position = 'fixed';
        el.style.bottom = '10px';
        el.style.right = '10px';
        el.style.width = '350px';
        el.style.backgroundColor = 'rgba(0,0,0,0.9)';
        el.style.color = '#fff';
        el.style.fontSize = '11px';
        el.style.padding = '10px';
        el.style.borderRadius = '5px';
        el.style.zIndex = '9999';
        el.style.wordBreak = 'break-word';
        el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
    }
    return el;
}

async function fetchAllCategories() {
    let heroSetFromAPI = false;

    for (const [key, category] of Object.entries(CATEGORIES)) {
        let videos = await fetchYouTubeVideos(category.query);
        const grid = document.getElementById(category.elementId);
        
        if (!grid) continue;

        // Fallback if API fails
        if (videos.length === 0 && FALLBACK_DATA[key]) {
            console.warn(`No API results for ${key}, using fallback data.`);
            videos = FALLBACK_DATA[key];
        }

        if (videos.length > 0) {
            grid.innerHTML = ''; 
            videos.forEach(v => grid.appendChild(createVideoCard(v)));

            // Dynamic Hero Update from the very first video fetched from API/Nature
            if (!heroSetFromAPI && (key === 'nature' || key === 'trending')) {
                updateHeroContent(videos[0]);
                heroSetFromAPI = true;
            }
        }
    }
}

function updateHeroContent(video) {
    if (!video) return;
    if (heroTitle) heroTitle.textContent = video.title;
    if (heroDesc) heroDesc.textContent = video.desc.substring(0, 150) + "...";
    if (heroSection) {
        heroSection.style.backgroundImage = `linear-gradient(to right, rgba(12, 13, 22, 0.9) 15%, rgba(12, 13, 22, 0.4) 50%, rgba(12, 13, 22, 0.2) 100%), url('${video.thumbnail}')`;
    }
    
    const heroPlayBtn = document.getElementById('hero-play-btn');
    if (heroPlayBtn) {
        heroPlayBtn.onclick = () => openVideo(video.id, video.title, video.channel);
    }
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <div class="thumbnail-container">
            <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
            <div class="play-overlay">
                <div class="play-icon">▶</div>
            </div>
        </div>
        <div class="video-info">
            <h4>${video.title}</h4>
            <div class="video-meta">
                <span>${video.channel}</span> • <span>${video.date}</span>
            </div>
        </div>
    `;
    card.addEventListener('click', () => openVideo(video.id, video.title, video.channel));
    return card;
}

// 5. Modal & Player Logic
let player;
function openVideo(videoId, title, channel) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').textContent = title;
    
    const descEl = document.getElementById('modal-desc');
    if (descEl) descEl.textContent = `Curated content from the ${channel} channel. Enjoy high-quality streaming.`;

    if (player && typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
    } else {
        if (window.YT && window.YT.Player) {
            createPlayer(videoId);
        } else {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => createPlayer(videoId);
        }
    }
}

function createPlayer(videoId) {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'autoplay': 1,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0
        }
    });
}

function closeVideoModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    if (player && typeof player.stopVideo === 'function') player.stopVideo();
}

function setupEventListeners() {
    if (closeModal) closeModal.onclick = closeVideoModal;
    window.onclick = (event) => {
        if (event.target == modal) closeVideoModal();
    };

    // --- Real-time Search Implementation ---
    const searchInput = document.getElementById('video-search');
    const searchBtn = document.getElementById('search-btn');

    if (searchBtn && searchInput) {
        searchBtn.onclick = () => performSearch(searchInput.value);
        searchInput.onkeypress = (e) => {
            if (e.key === 'Enter') performSearch(searchInput.value);
        };
    }
}

async function performSearch(query) {
    if (!query || query.trim() === "") return;
    
    console.log(`Performing live search for: ${query}`);
    const natureRowTitle = document.querySelector('#nature-grid').previousElementSibling;
    if (natureRowTitle) natureRowTitle.textContent = `Search Results: "${query}"`;

    const videos = await fetchYouTubeVideos(query);
    const grid = document.getElementById('nature-grid');
    
    if (grid) {
        grid.innerHTML = '';
        if (videos.length > 0) {
            videos.forEach(v => grid.appendChild(createVideoCard(v)));
            // Optionally update hero with the top search result
            updateHeroContent(videos[0]);
        } else {
            grid.innerHTML = '<p style="padding: 2rem; color: #666;">No results found for your search.</p>';
        }
    }
}


