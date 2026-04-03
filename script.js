/**
 * YOUFLIX.IO - Premium YouTube Curation
 */

// 1. Mock Data (4대 핵심 카테고리 구성)
const MOCK_DATA = {
    nature: [
        { id: '_fL9vO1U1B8', title: '4K 스위스 알프스 자연 풍경', channel: 'NATURE RELAX', date: '2024-03-25' },
        { id: 'vGZ2709U8S8', title: '세계에서 가장 아름다운 바다', channel: 'Traveler TV', date: '2024-01-15' },
        { id: '9kAt_b400Nw', title: '당신을 설레게 할 최고의 영화 음악', channel: 'Music Paradise', date: '2024-04-01' },
        { id: '6v2L2UGZJAM', title: '8K 오로라의 신비한 밤하늘', channel: 'Cosmos', date: '2024-02-10' },
        { id: 'Bey4XXJAqS8', title: '뉴질랜드의 광활한 평원', channel: 'World Travel', date: '2024-01-05' }
    ],
    tech: [
        { id: 'XQu8Tt8U9YQ', title: 'M3 Pro 맥북 프로 리뷰: 진정한 프로의 도구', channel: 'MKBHD', date: '2024-03-12' },
        { id: '3JZ_D3ELwOQ', title: '미니멀 데스크 셋업 2024', channel: 'Justin Tse', date: '2024-01-30' },
        { id: 'f7_7vA_r_vM', title: '애플 비전 프로의 모든 것', channel: 'Tech Insider', date: '2024-02-28' },
        { id: 'v_zSjP0ZqYg', title: 'AI가 바꾸는 우리의 미래', channel: 'Future Tech', date: '2024-03-31' }
    ],
    knowledge: [
        { id: 'L_LUpnjCOp0', title: '자바스크립트의 숨겨진 비밀', channel: 'Code Master', date: '2024-03-10' },
        { id: 'M7lc1UVf-VE', title: 'YouTube API 마스터하기', channel: 'Google Devs', date: '2022-05-12' },
        { id: 'cZ6_xK7_D_Q', title: '우주의 크기는 얼마나 클까?', channel: 'Kurzgesagt', date: '2023-12-15' },
        { id: 'u0p8_v_8N8k', title: '지속 가능한 삶을 위한 습관', channel: 'Insight Daily', date: '2024-03-15' }
    ],
    lofi: [
        { id: 'jfKfPfyJRdk', title: 'Lofi Girl - 정오의 공부 음악', channel: 'Lofi Girl', date: '2024-04-03' },
        { id: 'hHW1oY26kxQ', title: '빗소리와 함께 듣는 로파이', channel: 'Chill Mix', date: '2024-03-20' },
        { id: '5qap5aO4i9A', title: '밤샘 작업을 위한 앰비언트', channel: 'Deep Sleep', date: '2024-01-10' },
        { id: '8mZqQ0mZ8D0', title: '재즈 카페 분위기의 사운드', channel: 'Jazz Lounge', date: '2024-02-25' }
    ]
};

const HERO_VIDEO = {
    id: 'f7_7vA_r_vM',
    title: 'YOUFLIX: 당신만의 새로운 시각',
    desc: '유튜브의 소음에서 벗어나, 당신이 선택한 채널과 카테고리로 구성된 프리미엄 스트리밍 경험을 YOUFLIX.KR에서 시작하세요.',
    bg: 'https://images.unsplash.com/photo-1492619339914-5d5276f72e39?auto=format&fit=crop&q=80&w=1500' 
};

// 2. DOM Elements
const grids = {
    nature: document.getElementById('nature-grid'),
    tech: document.getElementById('tech-grid'),
    knowledge: document.getElementById('knowledge-grid'),
    lofi: document.getElementById('lofi-grid')
};
const modal = document.getElementById('video-modal');
const closeModal = document.querySelector('.close-modal');
const heroTitle = document.getElementById('hero-title');
const heroDesc = document.getElementById('hero-desc');
const heroSection = document.getElementById('hero');

// 3. Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initHero();
    populateGrids();
    setupEventListeners();
});

function initHero() {
    heroTitle.textContent = HERO_VIDEO.title;
    heroDesc.textContent = HERO_VIDEO.desc;
    heroSection.style.backgroundImage = `url('${HERO_VIDEO.bg}')`;
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `
        <div class="thumbnail-container">
            <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="${video.title}" loading="lazy">
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

function populateGrids() {
    // Nature
    if (grids.nature) MOCK_DATA.nature.forEach(v => grids.nature.appendChild(createVideoCard(v)));
    // Tech
    if (grids.tech) MOCK_DATA.tech.forEach(v => grids.tech.appendChild(createVideoCard(v)));
    // Knowledge
    if (grids.knowledge) MOCK_DATA.knowledge.forEach(v => grids.knowledge.appendChild(createVideoCard(v)));
    // Lofi
    if (grids.lofi) MOCK_DATA.lofi.forEach(v => grids.lofi.appendChild(createVideoCard(v)));
}

// 4. Modal & Player Logic
let player;
function openVideo(videoId, title, channel) {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-desc').textContent = `${channel} 채널의 엄선된 콘텐츠입니다.`;

    if (player) {
        player.loadVideoById(videoId);
    } else {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
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
        };
    }
}

function closeVideoModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    if (player) player.stopVideo();
}

function setupEventListeners() {
    closeModal.onclick = closeVideoModal;
    window.onclick = (event) => {
        if (event.target == modal) closeVideoModal();
    };

    document.getElementById('hero-play-btn').onclick = () => {
        openVideo(HERO_VIDEO.id, HERO_VIDEO.title, 'YOUFLIX');
    };
}
