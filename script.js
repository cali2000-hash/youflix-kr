/**
 * YOUFLIX.KR Premium Archive Engine (v18.0 - Quota Optimizer Edition) 🚀
 * Features: LocalStorage Caching, Row-level Lazy Loading, and Firestore Optimization
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

// 💎 Quota Optimization State (v18.0)
const lastDocMap = {};
const loadingMap = {};
const reachedEndMap = {};
const CACHE_TTL = 60 * 60 * 1000; // 60분 간 유효

const ARTIST_ALIASES = {
    "에스파": "aespa", "aespa": "에스파",
    "뉴진스": "NewJeans", "newjeans": "뉴진스",
    "아이브": "IVE", "ive": "아이브",
    "르세라핌": "LE SSERAFIM", "lesserafim": "르세라핌",
    "방탄소년단": "BTS", "bts": "방탄소년단",
    "블랙핑크": "BLACKPINK", "blackpink": "블랙핑크",
    "트와이스": "TWICE", "twice": "트와이스",
    "스테이씨": "STAYC", "stayc": "스테이씨",
    "세븐틴": "SEVENTEEN", "seventeen": "세븐틴",
    "스트레이키즈": "Stray Kids", "straykids": "스트레이키즈"
};

// 🌎 i18n Language Manager (v19.18)
const currentLang = (function() {
    const saved = localStorage.getItem('yfx_lang');
    if (saved) return saved;
    const browserLang = navigator.language.split('-')[0];
    return (browserLang === 'ko') ? 'ko' : 'en';
})();

function setLanguage(lang) {
    localStorage.setItem('yfx_lang', lang);
    window.location.reload();
}

function t(key) {
    if (!window.TRANSLATIONS) return key;
    return window.TRANSLATIONS[currentLang][key] || window.TRANSLATIONS['en'][key] || key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translated = t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = translated;
        } else {
            el.innerText = translated;
        }
    });

    // 언어 토글 버튼 활성화 상태 표시
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
}

// --- [Utility] Smart Caching Engine ---
function decodeHTMLEntities(text) {
    if (!text) return '';
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
}

function getCache(key) {
    const isAdmin = localStorage.getItem('youflix_admin') === 'true';
    if (isAdmin) return null;

    const cached = localStorage.getItem(`yfx_cache_${key}_${currentLang}`);
    if (!cached) return null;
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(`yfx_cache_${key}_${currentLang}`);
        return null;
    }
    return data;
}

function setCache(key, data) {
    localStorage.setItem(`yfx_cache_${key}_${currentLang}`, JSON.stringify({
        timestamp: Date.now(),
        data: data
    }));
}

// --- [Feature] Presence & Access Control ---
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
    setInterval(updatePresence, 60000); // 주기 연장 (30s -> 60s)
})();

function trackPV() {
    const isAdmin = localStorage.getItem('youflix_admin') === 'true';
    if (isAdmin) return;
    db.collection('statistics').doc('daily_pv').set({ 
        count: firebase.firestore.FieldValue.increment(1), 
        lastUpdate: new Date().toLocaleDateString() 
    }, { merge: true });
}

// --- [Core] Data Rendering Engine ---
function renderVideos(grid, vList, categoryId) {
    vList.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-card animate-in';
        card.innerHTML = `
            <div class="thumbnail-container">
                <img src="${v.thumbnail}" alt="${v.title}">
                <div class="play-overlay"><span class="play-icon">▶</span></div>
            </div>
            <div class="video-info"><h4>${v.title}</h4><p class="video-meta">${v.channel} • ${v.date}</p></div>
        `;
        card.querySelector('.thumbnail-container').onclick = () => {
            window.location.href = `watch.html?v=${v.id}&c=${categoryId}`;
        };
        card.querySelector('.video-info').onclick = () => {
            window.location.href = `watch.html?v=${v.id}&c=${categoryId}`;
        };
        grid.appendChild(card);
    });
}

// --- [Core] Smart Load Engine (Caching & Paging) ---
async function load(key, config = {}, isAppend = false) {
    const gridId = config.elementId || 'category-grid';
    const grid = document.getElementById(gridId);
    if (!grid) return;
    if (loadingMap[key] || reachedEndMap[key]) return;
    
    // 💎 캐시 확인 (백업 로드 시 제외)
    if (!isAppend) {
        const cachedData = getCache(key);
        if (cachedData) {
            console.log(`💎 Cache Hit: ${key}`);
            grid.innerHTML = '';
            renderVideos(grid, cachedData, key);
            return;
        }
    }

    loadingMap[key] = true;
    const sentinel = document.getElementById('scroll-sentinel');
    if (sentinel && isAppend) sentinel.classList.add('loading');

    try {
        if (!isAppend) grid.innerHTML = '';
        
        let orderField = 'timestamp';
        let orderDirection = 'desc';
        if (key === 'tvlit' || key === 'dramagame') {
            orderField = 'sort_idx';
            orderDirection = 'asc';
        }
        
        let query = db.collection(key).orderBy(orderField, orderDirection).limit(20);
        if (isAppend && lastDocMap[key]) query = query.startAfter(lastDocMap[key]);

        const snap = await query.get();
        
        if (snap.empty) {
            if (!isAppend) grid.innerHTML = `<p class="loading-msg">${t('loading_empty')}</p>`;
            reachedEndMap[key] = true;
        } else {
            lastDocMap[key] = snap.docs[snap.docs.length - 1];
            const batchData = [];
            snap.forEach(doc => {
                const v = doc.data(); v.category = key;
                v.id = doc.id; // ID 명시적 할당
                batchData.push(v);
            });
            
            renderVideos(grid, batchData, key);
            
            // 캐시 저장 (첫 페이지만)
            if (!isAppend) setCache(key, batchData);
            
            if (snap.docs.length < 20) reachedEndMap[key] = true;
        }
    } catch (e) { 
        console.error("Load Error: " + key, e); 
    } finally {
        loadingMap[key] = false;
        if (sentinel) sentinel.classList.remove('loading');
    }
}

// --- [Feature] Row-Level Lazy Loading (IntersectionObserver) ---
function setupRowLazyLoading() {
    const rows = ['kpop', 'kdrama', 'tvlit', 'dramagame', 'kclassic', 'kmovie', 'kvariety', 'trending'];
    const rowObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const rowKey = entry.target.dataset.row;
                const gridId = rowKey + '-grid';
                if (document.getElementById(gridId)) load(rowKey, { elementId: gridId });
                rowObserver.unobserve(entry.target); // 한 번 로드 후 감시 종료
            }
        });
    }, { threshold: 0.1 });

    rows.forEach(row => {
        const grid = document.getElementById(row + '-grid');
        if (grid) {
            grid.dataset.row = row;
            // K-Pop 섹션은 첫 화면이므로 즉시 로드, 나머지는 지연 로드
            if (row === 'kpop') {
                load(row, { elementId: row + '-grid' });
            } else {
                rowObserver.observe(grid);
            }
        }
    });
}

function setupInfiniteScroll(key) {
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !loadingMap[key] && !reachedEndMap[key]) {
            load(key, { elementId: 'category-grid' }, true);
        }
    }, { threshold: 0.01 });
    observer.observe(sentinel);
}

// --- [UI] Modal ---
function openModal(v) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('player');
    if (!modal || !player) return;
    
    // (v19.18) 다국어 해설 선택 루틴
    const desc = (currentLang === 'ko') 
        ? (v.description_ko || v.description) 
        : (v.description_en || v.description);

    document.getElementById('modal-title').innerText = decodeHTMLEntities(v.title);
    document.getElementById('modal-desc').innerText = decodeHTMLEntities(desc) || t('modal_curation_msg');
    
    // 유튜브 플레이어 파라미터 최적화 (Error 153 완화 및 안정성 향상)
    const origin = window.location.origin === 'null' ? '*' : window.location.origin;
    player.innerHTML = `<iframe width="100%" height="100%" 
        src="https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0&enablejsapi=1&origin=${origin}&widget_referrer=${origin}" 
        frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    
    // (v19.20) 모달 하단 액션 버튼 추가 (유튜브 바로가기 폴백)
    let actions = document.querySelector('.modal-actions');
    if (!actions) {
        actions = document.createElement('div');
        actions.className = 'modal-actions';
        document.querySelector('.modal-content').appendChild(actions);
    }
    actions.innerHTML = `
        <a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" class="yt-fallback-btn">
            <span class="yt-icon">📺</span> ${t('btn_watch_on_yt')}
        </a>
        <button class="modal-close-btn" onclick="closeModal()">${t('btn_close_modal')}</button>
    `;

    modal.style.display = 'block'; document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('video-modal').style.display = 'none';
    document.getElementById('player').innerHTML = '';
    document.body.style.overflow = 'auto';
}

// --- [Feature] Search Engine (v19.1 - Multi-Alias Mapping) ---
async function handleSearch(query) {
    if (!query || query.trim().length < 2) return;
    
    const resultsContainer = document.getElementById('search-results-section') || createSearchResultsSection();
    const grid = resultsContainer.querySelector('.video-grid');
    grid.innerHTML = '<div class="loading-state" style="padding: 40px; text-align: center; width: 100%;"><p style="color: #888;">Searching across all archives...</p></div>';
    resultsContainer.style.display = 'block';

    // Hide original rows
    const mainContent = document.querySelector('.category-grid-container') || document.querySelector('.category-page');
    if (mainContent) {
        Array.from(mainContent.children).forEach(child => {
            if (child !== resultsContainer) child.style.display = 'none';
        });
    }

    const categories = ['kpop', 'kdrama', 'tvlit', 'dramagame', 'kclassic', 'kmovie', 'kvariety', 'trending'];
    
    // Check for alias (e.g. '에스파' -> 'aespa')
    const queryTrim = query.trim();
    const alias = ARTIST_ALIASES[queryTrim.toLowerCase()] || ARTIST_ALIASES[queryTrim];
    const searchTerms = [queryTrim];
    if (alias) searchTerms.push(alias);

    try {
        const promises = categories.map(async (cat) => {
            const termPromises = [];
            searchTerms.forEach(term => {
                termPromises.push(db.collection(cat).where('title', '>=', term).where('title', '<=', term + '\uf8ff').limit(15).get());
                if (cat === 'tvlit') {
                    termPromises.push(db.collection(cat).where('title', '>=', '[TV문학관] ' + term).where('title', '<=', '[TV문학관] ' + term + '\uf8ff').limit(15).get());
                }
            });

            const snaps = await Promise.all(termPromises);
            const results = [];
            snaps.forEach(snap => {
                if (!snap.empty) {
                    snap.forEach(doc => {
                        const data = doc.data(); data.category = cat; data.id = doc.id;
                        if (!results.find(v => v.id === data.id)) results.push(data);
                    });
                }
            });
            return results;
        });

        const nestedResults = await Promise.all(promises);
        const allResults = nestedResults.flat();

        grid.innerHTML = '';
        if (allResults.length === 0) {
            grid.innerHTML = `
                <div class="no-results" style="padding: 60px 20px; text-align: center; color: #888; width: 100%;">
                    <h3 style="color: #fff; margin-bottom: 10px;">No results found for "${query}"</h3>
                    <p style="margin-bottom: 25px;">Try different terms or browse our categories:</p>
                    <div class="suggestion-chips" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <span onclick="document.getElementById('search-input').value='K-Pop M/V'; handleSearch('K-Pop M/V')" style="padding: 8px 16px; background: #333; border-radius: 20px; cursor: pointer; color: #fff;">#K-Pop M/V</span>
                        <span onclick="document.getElementById('search-input').value='Drama'; handleSearch('Drama')" style="padding: 8px 16px; background: #333; border-radius: 20px; cursor: pointer; color: #fff;">#Drama</span>
                        <span onclick="document.getElementById('search-input').value='Eternal Cinema'; handleSearch('Eternal Cinema')" style="padding: 8px 16px; background: #333; border-radius: 20px; cursor: pointer; color: #fff;">#Eternal Cinema</span>
                        <span onclick="document.getElementById('search-input').value='Movie'; handleSearch('Movie')" style="padding: 8px 16px; background: #333; border-radius: 20px; cursor: pointer; color: #fff;">#Movie</span>
                    </div>
                </div>`;
        } else {
            renderVideos(grid, allResults, 'search');
        }
    } catch (e) {
        grid.innerHTML = '<div style="padding: 40px; text-align: center; width: 100%;"><p class="error-msg" style="color: #ff4d4d;">Search unavailable right now. Please try again later.</p></div>';
        console.error("Search Error: ", e);
    }
}

function createSearchResultsSection() {
    const section = document.createElement('div');
    section.id = 'search-results-section';
    section.className = 'row';
    section.innerHTML = `
        <div class="container">
            <div class="row-header" style="border-left: 6px solid #fff;">
                <h2 class="row-title">Search Results</h2>
                <button class="view-all-link" onclick="window.location.reload()" style="cursor:pointer; border: none; background: #333;">Close Search</button>
            </div>
            <div class="video-grid" style="flex-wrap: wrap; overflow-x: hidden;"></div>
        </div>
    `;
    const mainContent = document.querySelector('.category-grid-container') || document.querySelector('.category-page');
    if (mainContent) mainContent.prepend(section);
    return section;
}

// --- [Init] App Entry Point ---
async function initApp() {
    console.log("🌐 Initializing App Language:", currentLang);

    // translations.js가 로드된 후 실행되도록 보장 (window 객체 명시적 확인)
    if (!window.TRANSLATIONS) {
        console.warn("⚠️ Translations not loaded yet. Retrying in 100ms...");
        setTimeout(initApp, 100);
        return;
    }

    applyTranslations();
    try { trackPV(); } catch (e) { console.warn("PV Track deferred."); }
    
    // (v19.18) 언어 토글 리스너 설치
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const lang = e.target.dataset.lang;
            console.log("🔄 Switching Language to:", lang);
            setLanguage(lang);
        });
    });

    // (v19.0) Search Listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch(e.target.value);
        });
    }

    // (v18.0) Lazy Load Main Page Rows
    setupRowLazyLoading();

    // Category Page
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('c');
    if (cat && document.getElementById('category-grid')) {
        const titles = { 
            'kpop': t('row_kpop_title'), 
            'kdrama': t('row_kdrama_title'), 
            'tvlit': t('row_tvlit_title'), 
            'dramagame': t('row_dramagame_title'), 
            'kclassic': t('row_classic_title'), 
            'kmovie': t('nav_classic'), 
            'kvariety': t('nav_variety'), 
            'trending': t('nav_trending')
        };
        const titleEl = document.getElementById('category-title');
        if (titleEl) titleEl.innerText = titles[cat] || cat;
        
        load(cat, { elementId: 'category-grid' }).then(() => setupInfiniteScroll(cat));
    }
    
    // (v20.0) Initialize Premium UI Components
    initPremiumUI();

    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
}

// 💎 Premium UI Logic Center (v20.0)
function initPremiumUI() {
    // 1. Hamburger Menu Toggle
    const trigger = document.getElementById('hamburger-trigger');
    const sideMenu = document.getElementById('side-menu');
    
    if (trigger && sideMenu) {
        trigger.addEventListener('click', () => {
            trigger.classList.toggle('active');
            sideMenu.classList.toggle('active');
            document.body.style.overflow = sideMenu.classList.contains('active') ? 'hidden' : 'auto';
        });
    }

    // 2. Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('navbar');
        if (nav) {
            if (window.scrollY > 50) {
                nav.style.background = 'rgba(8, 8, 8, 0.98)';
                nav.style.padding = '10px 4%';
            } else {
                nav.style.background = 'transparent';
                nav.style.padding = '15px 4%';
            }
        }
    });

    // 3. Premium Carousel Slider
    initHeroSlider();
}

// 🎢 Hero Slider Engine (v20.0 - Premium Cycle)
function initHeroSlider() {
    const hero = document.getElementById('hero-carousel');
    if (!hero) return;

    const slides = [
        {
            image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=2000',
            title: t('hero_slide_1_title') || 'Midnight<br>in Seoul',
            desc: t('hero_slide_1_desc') || 'A cinematic masterpiece.'
        },
        {
            image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=2000',
            title: t('hero_slide_2_title') || 'Music<br>Revolution',
            desc: t('hero_slide_2_desc') || 'K-Pop like you have never seen.'
        },
        {
            image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&q=80&w=2000',
            title: t('hero_slide_3_title') || 'Eternal<br>Cinema',
            desc: t('hero_slide_3_desc') || 'Classic masterpieces restored.'
        }
    ];

    let idx = 0;
    const slideTitle = document.querySelector('.hero-title');
    const slideDesc = document.querySelector('.hero-desc');
    const heroSection = document.querySelector('.hero-slide');
    const previewCards = document.querySelectorAll('.preview-card');

    function updateSlide() {
        idx = (idx + 1) % slides.length;
        const nextIdx = (idx + 1) % slides.length;
        const upNextIdx = (idx + 2) % slides.length;

        // Transition Effect (CSS handles basic transition, JS updates content)
        if (heroSection) heroSection.style.backgroundImage = `url('${slides[idx].image}')`;
        if (slideTitle) slideTitle.innerHTML = slides[idx].title;
        if (slideDesc) slideDesc.innerText = slides[idx].desc;

        // Update Watch Button to link to Trending Category or First Slide
        const watchBtn = document.getElementById('hero-watch-btn');
        if (watchBtn) watchBtn.href = `category.html?c=trending`;
    }

    setInterval(updateSlide, 6000); // 6초 간격 (조금 더 여유 있게)
}

document.addEventListener('DOMContentLoaded', initApp);
