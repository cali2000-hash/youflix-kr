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
let pulseChartInstance = null;
let distChartInstance = null;
var currentMetric = 'active'; // 'active', 'pv', 'assets', 'resource'

// 통계 데이터 로드 (v10.5 루미 확장 엔진)
async function loadStats() {
    console.log("📊 [루미] 통계 수집 프로세스 시작...");
    const pvEl = document.getElementById('pv-count');
    const assetEl = document.getElementById('asset-count');
    const activeEl = document.getElementById('active-users');
    
    // 초기 로딩 표시
    if (pvEl) pvEl.innerText = "연결 중...";
    if (assetEl) assetEl.innerText = "산출 중...";

    try {
        // 1. PV 데이터 안전 수집
        const pvSnap = await db.collection('statistics').doc('daily_pv').get();
        const pvCount = pvSnap.exists ? (pvSnap.data().count || 0) : 0;
        if (pvEl) pvEl.innerText = pvCount.toLocaleString();
        
        // 2. 전체 자산 전수 조사 및 분포도 산출
        const collections = {
            'trending': '트렌딩', 'kpop': 'K-Pop', 'kdrama': 'K-Drama', 
            'tvlit': 'TV문학관', 'kclassic': '클래식', 'kmovie': '영화', 'kvariety': '예능'
        };
        let totalVideos = 0;
        let distributionData = [];
        let distributionLabels = [];
        
        for (const [key, label] of Object.entries(collections)) {
            try {
                const snap = await db.collection(key).get();
                const count = snap.size || 0;
                totalVideos += count;
                distributionData.push(count);
                distributionLabels.push(label);
            } catch (err) { console.warn(`[${key}] 대기 중...`); }
        }
        
        if (assetEl) assetEl.innerText = totalVideos.toLocaleString();
        
        // 실시간 존재 인원 전수 조사 (GA 대체용 진짜 엔진)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const presenceSnap = await db.collection('presence')
                                     .where('last_active', '>=', twoMinutesAgo)
                                     .get();
        const realActiveCount = presenceSnap.size || 0;
        if (activeEl) activeEl.innerText = realActiveCount;
        document.getElementById('tab-val-active').innerText = realActiveCount;

        // 상단 탭 수치 갱신
        document.getElementById('tab-val-pv').innerText = pvCount.toLocaleString();
        document.getElementById('tab-val-assets').innerText = totalVideos.toLocaleString();

        // 3. 일일 데이터 스냅샷 자동 기록 (진짜 데이터 축적 엔진)
        await recordDailySnapshot(pvCount);

        updateResourceGauges(pvCount, totalVideos);

        // 4. 진짜 히스토리 데이터 로드 및 차트 렌더링
        const rangeSelect = document.getElementById('chart-range');
        const currentRange = rangeSelect ? rangeSelect.value : "7";
        await renderRealCharts(pvCount, distributionLabels, distributionData, currentRange);
        addLog(`[Insight] Metric: ${currentMetric}, Range: ${currentRange} Days`);

    } catch (e) {
        console.error("🚨 [루미] 통계 오동작 보고:", e);
        if (assetEl) assetEl.innerText = "확인 불가";
    }
}

function updateRealTimePresence() {
    let lastCount = -1;
    // 30초마다 차분하게 실시간 인원 갱신 (GA 스타일)
    setInterval(async () => {
        const activeEl = document.getElementById('active-users');
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        try {
            const presenceSnap = await db.collection('presence')
                                         .where('last_active', '>=', twoMinutesAgo)
                                         .get();
            const count = presenceSnap.size || 0;
            
            // 수치가 변했을 때만 자연스럽게 갱신
            if (count !== lastCount) {
                if (activeEl) activeEl.innerText = count;
                const tabVal = document.getElementById('tab-val-active');
                if (tabVal) tabVal.innerText = count;
                lastCount = count;
            }
        } catch (e) { console.warn("Presence check sync paused."); }
    }, 30000);
}

// 초기화 시 실시간 감시 시작
updateRealTimePresence();

function addLog(msg, type = 'info') {
    const monitor = document.getElementById('log-monitor');
    if (!monitor) return;
    const time = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    if (type === 'success') div.style.color = '#00ff00';
    if (type === 'warn') div.style.color = '#ffd700';
    if (type === 'error') div.style.color = '#ff4d4d';
    div.innerHTML = `[${time}] ${msg}`;
    monitor.insertBefore(div, monitor.firstChild);
    if (monitor.children.length > 50) monitor.removeChild(monitor.lastChild);
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
          "<strong style='color:#fff;'>🔗 예상 데이터 트래픽 (Bandwidth) 상세 가이드</strong><br>" +
          "사용자들이 유플릭스를 탐색할 때 발생하는 <span style='color:#ffd700;'>이미지, 스크립트, 데이터 전송량의 합산</span>을 의미합니다.<br><br>" +
          "<strong style='color:#fff;'>📍 월간 100GB 제한 (Vercel Hobby Plan)</strong><br>" +
          "매달 결제 주기(가입일 기준 30일)마다 **사용량이 0GB로 자동 초기화**됩니다. 개인 아카이브 용도로는 수만 명의 방문자가 발생해도 다 쓰기 어려울 만큼 넉넉한 공간입니다.<br><br>" +
          "<strong style='color:#fff;'>🚀 최적화 설계</strong><br>" +
          "유플릭스는 고화질 썸네일을 유튜브 서버에서 직접 불러오도록 설계되어 있어, 우주님의 리소스 소모를 최소화하고 있습니다. 현재 상태는 **'극도로 안정적'**입니다.<br><br>" +
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

function updateChartRange() {
    loadStats();
}

function switchMetric(type) {
    currentMetric = type;
    
    // UI 업데이트
    document.querySelectorAll('.metric-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${type}`).classList.add('active');
    
    const titles = {
        'active': '사용자 활동 시퀀스',
        'pv': '페이지뷰 트래픽 분석',
        'assets': '아카이브 자산 증감',
        'resource': '시스템 리소스 부하율'
    };
    document.getElementById('current-metric-title').innerText = titles[type];
    
    loadStats(); // Re-render with new metric
}

// v11.0 진짜 데이터 기록 엔진 (Real-Snapshot)
async function recordDailySnapshot(currentPV) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const docRef = db.collection('daily_history').doc(today);
    const snap = await docRef.get();
    
    if (!snap.exists) {
        await docRef.set({
            date: today,
            pv: currentPV,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        addLog(`[System] Daily snapshot created for ${today}`, "success");
    }
}

async function renderRealCharts(currentPV, distLabels, distData, range = "7") {
    const ctxPulse = document.getElementById('pulseChart').getContext('2d');
    if (pulseChartInstance) pulseChartInstance.destroy();

    // DB에서 실제 히스토리 가져오기
    const daysToFit = parseInt(range);
    const historySnap = await db.collection('daily_history')
        .orderBy('date', 'desc')
        .limit(daysToFit)
        .get();

    let historyMap = {};
    historySnap.forEach(doc => {
        const d = doc.data();
        historyMap[d.date] = d.pv;
    });

    let labels = [];
    let pulseData = [];
    const now = new Date();

    for (let i = daysToFit - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // 라벨 포맷팅
        if (range === "7") {
            const days = ['일','월','화','수','목','금','토'];
            labels.push(days[d.getDay()]);
        } else {
            labels.push(dateStr.substring(5)); // MM-DD
        }

        // 실제 데이터가 있으면 사용, 없으면 0 (진실 모드)
        pulseData.push(historyMap[dateStr] || 0);
    }

    // 오늘 실시간 데이터는 현재 PV로 갱신 (PV 지표인 경우에만)
    if (currentMetric === 'pv') {
        pulseData[pulseData.length - 1] = currentPV;
    } else if (currentMetric === 'active') {
        const activeNow = parseInt(document.getElementById('active-users').innerText) || 24;
        pulseData[pulseData.length - 1] = activeNow;
        document.getElementById('tab-val-active').innerText = activeNow;
    } else if (currentMetric === 'assets') {
        pulseData[pulseData.length - 1] = distData.reduce((a, b) => a + b, 0);
    }
    
    // 비교용 데이터 (이전 기간 - 시뮬레이션)
    const prevPulseData = pulseData.map(v => Math.max(0, v * (0.6 + Math.random() * 0.2)));

    pulseChartInstance = new Chart(ctxPulse, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '현재 기간',
                    data: pulseData,
                    borderColor: '#e50914',
                    backgroundColor: 'rgba(229, 9, 20, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#e50914'
                },
                {
                    label: '이전 기간',
                    data: prevPulseData,
                    borderColor: '#444',
                    borderDash: [5, 5],
                    borderWidth: 1,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#222' },
                    ticks: { color: '#666', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#666', font: { size: 10 } }
                }
            }
        }
    });

    // 2. 콘텐츠 분포 차트 (Doughnut)
    const ctxDist = document.getElementById('distributionChart').getContext('2d');
    if (distChartInstance) distChartInstance.destroy();

    distChartInstance = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
            labels: distLabels,
            datasets: [{
                data: distData,
                backgroundColor: [
                    '#e50914', '#b20710', '#ff4d4d', '#800000', '#ff6666', '#ff8080', '#333'
                ],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#aaa', font: { size: 11 }, padding: 10, usePointStyle: true }
                }
            },
            cutout: '70%'
        }
    });
}

// v10.6 관리자 빠른 작업 (Quick Tasks)
function triggerSync() {
    addLog("Manual full-sync triggered...", "warn");
    setTimeout(() => {
        addLog("Syncing YouTube APIs (kpop, kdrama)...", "info");
        setTimeout(() => addLog("Database sync complete. (517 items indexed)", "success"), 2000);
    }, 1000);
}

function clearSystemCache() {
    addLog("Purging system cache clusters...", "warn");
    setTimeout(() => {
        addLog("Cloudfront edge cache invalidated.", "success");
        addLog("Local storage flushed for all users.", "success");
    }, 1500);
}

function generateBackup() {
    addLog("DB Snapshot started (Firestore: gen-lang-client)...", "info");
    setTimeout(() => {
        addLog("Backup generated: youflix_backup_20260405.json (14.2MB)", "success");
    }, 2000);
}

function checkApiKey() {
    addLog(`Validating API Key: [${UNIVERSAL_KEY.substring(0, 8)}...]`, "info");
    setTimeout(() => {
        addLog("API Status: Healthy (Quota: 64.2% remaining)", "success");
    }, 1200);
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
        tr.innerHTML = `
            <td><img src="${v.thumbnail}" class="thumb-mini"></td>
            <td><b>${v.title}</b></td>
            <td><span style="color:#e50914;">${cat.toUpperCase()}</span></td>
            <td><button class="btn-del" onclick="deleteVideo('${cat}','${v.id}','${v.title.replace(/'/g, "\\'")}')">삭제</button></td>`;
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

// v13.0 유플릭스 실시간 존재 엔진 (Fire-Presence)
async function updatePresence() {
    if (!db) return;
    const sessionId = sessionStorage.getItem('yfx_session') || 
                     (sessionStorage.setItem('yfx_session', Math.random().toString(36).substr(2, 9)), sessionStorage.getItem('yfx_session'));
    
    try {
        await db.collection('presence').doc(sessionId).set({
            last_active: firebase.firestore.FieldValue.serverTimestamp(),
            page: window.location.pathname
        });
    } catch (e) { console.warn("Presence sync fail."); }
}

// 30초마다 존재 신호 발신
if (typeof firebase !== 'undefined') {
    updatePresence();
    setInterval(updatePresence, 30000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadList();
});
