/**
 * YOUFLIX.IO - Premium YouTube Curation (Real-time Version)
 */

// 1. Configuration
const API_KEY = 'AIzaSyD0sN7skLFkm__ZCYQoTGKfjtKnaXxbvKU'; // 사용자가 발급한 API 키

const CATEGORIES = {
    nature: { query: 'Nature 4K 8K Travel Documentary 8K', elementId: 'nature-grid' },
    tech: { query: 'Minimalist Tech Review Desk Setup 2024', elementId: 'tech-grid' },
    knowledge: { query: 'Insightful Knowledge Documentary KR', elementId: 'knowledge-grid' },
    lofi: { query: 'Lofi hip hop beats long mix 2024', elementId: 'lofi-grid' },
    trending: { query: 'YouTube Trending Official Music Movie 2024', elementId: 'trending-grid' },
    movie: { query: 'Official Movie Trailer Cinema Essay Analysis', elementId: 'movie-grid' },
    healing: { query: 'Healing Nature 4K Meditation Relaxation Sound', elementId: 'healing-grid' }
};

const HERO_VIDEO = {
    id: 'f7_7vA_r_vM',
    title: 'YOUFLIX: 당신만의 새로운 시각',
    desc: '유튜브의 소음에서 벗어나, 당신이 선택한 카테고리로 구성된 프리미엄 스트리밍 경험을 YOUFLIX.KR에서 시작하세요.',
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
    if (heroTitle) heroTitle.textContent = HERO_VIDEO.title;
    if (heroDesc) heroDesc.textContent = HERO_VIDEO.desc;
    if (heroSection) heroSection.style.backgroundImage = `url('${HERO_VIDEO.bg}')`;
}

// 4. YouTube API Logic
async function fetchYouTubeVideos(query) {
    try {
        // maxResults를 10으로 상향하여 더욱 풍성한 리스트 제공
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('YouTube API Error:', data.error.message);
            return [];
        }

        return data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            date: new Date(item.snippet.publishedAt).toLocaleDateString(),
            thumbnail: item.snippet.thumbnails.medium.url
        }));
    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}

async function fetchAllCategories() {
    // 모든 섹션 작업
    for (const [key, category] of Object.entries(CATEGORIES)) {
        const videos = await fetchYouTubeVideos(category.query);
        const grid = document.getElementById(category.elementId);
        
        if (grid && videos.length > 0) {
            grid.innerHTML = ''; // 기존 목데이터 제거
            videos.forEach(v => grid.appendChild(createVideoCard(v)));
        }
    }
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <div class="thumbnail-container">
            <img src="${video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}" alt="${video.title}" loading="lazy">
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
    document.getElementById('modal-desc').textContent = `${channel} 채널의 엄선된 콘텐츠입니다.`;

    if (player && typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
    } else {
        // IFrame Player API already loaded?
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

    const heroPlayBtn = document.getElementById('hero-play-btn');
    if (heroPlayBtn) {
        heroPlayBtn.onclick = () => {
            openVideo(HERO_VIDEO.id, HERO_VIDEO.title, 'YOUFLIX');
        };
    }
}

