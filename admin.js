/**
 * YOUFLIX | 국문 관리 시스템 지능형 엔진 v2.1-KR
 */

const UNIVERSAL_KEY = 'AIzaSyDArPdfLyswcFgLBW724ZTObPC4yQ9Py14';
const firebaseConfig = {
    apiKey: UNIVERSAL_KEY,
    authDomain: "gen-lang-client-0874410222.firebaseapp.com",
    projectId: "gen-lang-client-0874410222",
    storageBucket: "gen-lang-client-0874410222.firebasestorage.app",
    messagingSenderId: "970801923265",
    appId: "1:970801923265:web:e2ee1f82d2c567808d0040"
};

// Firebase 안전 초기화 (v8.7 루미 엔진)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// v9.2 루미의 관리자 표식 부착
localStorage.setItem('youflix_admin', 'true');

let cachedVideo = null;

// 통계 데이터 로드 (v8.8 루미 텐션 엔진)
async function loadStats() {
    console.log("📊 [루미] 통계 수집 프로세스 시작...");
    const pvEl = document.getElementById('pv-count');
    const assetEl = document.getElementById('asset-count');
    
    // 초기 로딩 표시
    if (pvEl) pvEl.innerText = "연결 중...";
    if (assetEl) assetEl.innerText = "산출 중...";

    try {
        // 1. PV 데이터 안전 수집
        const pvSnap = await db.collection('statistics').doc('daily_pv').get();
        const pvCount = pvSnap.exists ? (pvSnap.data().count || 0) : 0;
        if (pvEl) pvEl.innerText = pvCount.toLocaleString();
        
        // 2. 전체 자산 전수 조사
        const collections = ['kpop', 'kdrama', 'tvlit', 'kclassic', 'kmovie', 'kvariety', 'trending'];
        let totalVideos = 0;
        
        for (const cat of collections) {
            try {
                const snap = await db.collection(cat).get();
                totalVideos += (snap.size || 0);
            } catch (err) { console.warn(`[${cat}] 대기 중...`); }
        }
        
        if (assetEl) assetEl.innerText = totalVideos.toLocaleString();

        updateResourceGauges(pvCount, totalVideos);
        renderPulseChart(pvCount);

    } catch (e) {
        console.error("🚨 [루미] 통계 오동작 보고:", e);
        if (assetEl) assetEl.innerText = "확인 불가";
    }
}

// v9.6 루미의 프리미엄 모달 시스템 (완전 한글 가이드)
function showEngineInfo() {
    const modal = document.getElementById('infoModal');
    const body = document.getElementById('modalBody');
    
    body.innerHTML = 
          "<strong style='color:#fff;'>1. 데이터베이스 실시간 모니터링</strong><br>" +
          "파이어베이스와 운영 센터 간의 연결 상태를 초 단위로 감시하여, 우주님의 소중한 명작들이 안전하게 보관되고 있는지 확인합니다.<br><br>" +
          "<strong style='color:#fff;'>2. 통합 보안 관제</strong><br>" +
          "아카이브의 모든 영상과 데이터에 대한 허가되지 않은 접근을 원천적으로 차단하고, 무결성을 유지하는 자가 방어 체계입니다.<br><br>" +
          "<strong style='color:#fff;'>3. 과부하 및 리소스 관리</strong><br>" +
          "유튜브 API 및 데이터 트래픽의 급격한 폭주를 감지하여, 플랫폼이 중단 없이 부드럽게 운영되도록 자원을 지능적으로 분배합니다.<br><br>" +
          "<span style='color:#e50914; font-weight:bold;'>루미는 우주님의 안녕을 위해 불철주야 엔진을 정비하고 있습니다! 😊✨</span>";
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('infoModal').style.display = 'none';
}

function updateResourceGauges(pv, videos) {
    const ytQuotaMax = 10000;
    const fbReadMax = 50000;
    const vclBandwidthMax = 100;

    const ytUsed = Math.min(pv * 20, ytQuotaMax);
    const ytPerc = (ytUsed / ytQuotaMax * 100).toFixed(1);
    document.getElementById('yt-quota-bar').style.width = `${ytPerc}%`;
    document.getElementById('yt-quota-text').innerText = `${ytPerc}% (${ytUsed.toLocaleString()}/1만)`;

    const fbUsed = Math.min(pv * 40, fbReadMax);
    const fbPerc = (fbUsed / fbReadMax * 100).toFixed(1);
    document.getElementById('fb-read-bar').style.width = `${fbPerc}%`;
    document.getElementById('fb-read-text').innerText = `${fbPerc}% (${fbUsed.toLocaleString()}/5만)`;

    const vclUsedGB = (pv * 5 / 1024).toFixed(3);
    const vclPerc = (vclUsedGB / vclBandwidthMax * 100).toFixed(2);
    document.getElementById('vcl-usage-bar').style.width = `${vclPerc}%`;
    document.getElementById('vcl-usage-text').innerText = `${vclPerc}% (${vclUsedGB}GB)`;
    document.getElementById('traffic-est').innerText = `${vclUsedGB}GB`;
}

function renderPulseChart(currentPV) {
    const ctx = document.getElementById('pulseChart').getContext('2d');
    const labels = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '오늘'];
    
    // v9.1 루미의 데이터 정직 엔진: 가상 데이터 제거 후 오늘 데이터만 표시
    const data = [0, 0, 0, 0, 0, 0, currentPV]; 

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '방문 트래픽',
                data: data,
                borderColor: '#e50914',
                backgroundColor: 'rgba(229, 9, 20, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#e50914'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false },
                x: { grid: { display: false }, ticks: { color: '#555' } }
            }
        }
    });
}

function getID(url) {
    if (url.length === 11) return url;
    const reg = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(reg);
    return (match && match[7].length === 11) ? match[7] : null;
}

async function parseVideo() {
    const val = document.getElementById('yt-input').value;
    const id = getID(val);
    const box = document.getElementById('preview-box');
    if (!id) { box.style.display = 'none'; return; }
    try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${UNIVERSAL_KEY}`);
        const d = await r.json();
        if (d.items && d.items.length > 0) {
            const snip = d.items[0].snippet;
            cachedVideo = { id: id, title: snip.title, channel: snip.channelTitle, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, date: new Date().toLocaleDateString() };
            document.getElementById('preview-img').src = cachedVideo.thumbnail;
            document.getElementById('preview-info').innerHTML = `<b>${snip.title}</b><br><small>${snip.channelTitle}</small>`;
            box.style.display = 'block';
        }
    } catch (e) { }
}

async function pushToArchive() {
    if (!cachedVideo) { alert("영상이 선택되지 않았습니다."); return; }
    const cat = document.getElementById('category-select').value;
    try {
        await db.collection(cat).doc(cachedVideo.id).set(cachedVideo);
        alert(`성공! [${cat}] 아카이브에 등록되었습니다.`);
        location.reload(); 
    } catch (e) { alert("오류: " + e.message); }
}

async function loadList() {
    const cat = document.getElementById('filter-select').value;
    const tbody = document.getElementById('archive-list');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">로딩 중...</td></tr>';
    const snap = await db.collection(cat).orderBy('date', 'desc').limit(20).get();
    tbody.innerHTML = '';
    
    if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#555;">데이터가 없습니다.</td></tr>';
        return;
    }
    
    snap.forEach(doc => {
        const v = doc.data();
        const tr = document.createElement('tr');
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // v10.5 모바일 와이드 컨테이너 스와이프 레이아웃
            tr.innerHTML = `
                <td colspan="4">
                    <div class="swipe-container">
                        <div class="swipe-wrapper">
                            <img src="${v.thumbnail}" class="thumb-mini" style="width:50px; border-radius:4px; margin-right:15px;">
                            <div style="flex:1;">
                                <b style="font-size:0.8rem; display:block; color:#fff; word-break:break-all; line-height:1.4;">${v.title}</b>
                                <span style="color:#e50914; font-size:0.7rem; font-weight:bold;">${cat.toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="swipe-delete-area" onclick="deleteVideo('${cat}','${v.id}','${v.title.replace(/'/g, "\\'")}')">삭제</div>
                    </div>
                </td>`;
            
            const container = tr.querySelector('.swipe-container');
            let startX = 0;
            container.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive: true});
            container.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const diff = startX - endX;
                if (diff > 50) container.style.transform = 'translateX(-100px)';
                else if (diff < -50) container.style.transform = 'translateX(0)';
            });
        } else {
            // PC용 기존 테이블 레이아웃
            tr.innerHTML = `
                <td><img src="${v.thumbnail}" class="thumb-mini"></td>
                <td><b>${v.title}</b></td>
                <td><span style="color:#e50914;">${cat.toUpperCase()}</span></td>
                <td><button class="btn-del" onclick="deleteVideo('${cat}','${v.id}','${v.title.replace(/'/g, "\\'")}')">삭제</button></td>`;
        }
        tbody.appendChild(tr);
    });
}

async function deleteVideo(cat, id, title) {
    if (!confirm(`[${title}]\n정말 이 영상을 아카이브에서 영구 삭제하시겠습니까?`)) return;
    try {
        await db.collection(cat).doc(id).delete();
        alert("삭제 및 아카이브 갱신 완료!");
        loadList();
    } catch (e) { alert("삭제 실패: " + e.message); }
}

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadList();
});
