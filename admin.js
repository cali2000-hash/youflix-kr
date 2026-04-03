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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let cachedVideo = null;

// 통계 데이터 로드
async function loadStats() {
    try {
        const pvSnap = await db.collection('statistics').doc('daily_pv').get();
        const pvCount = pvSnap.exists ? pvSnap.data().count : 0;
        document.getElementById('pv-count').innerText = pvCount.toLocaleString();
        
        const collections = ['kpop', 'kdrama', 'kclassic', 'kmovie', 'kvariety', 'trending'];
        let totalVideos = 0;
        for (const cat of collections) {
            const snap = await db.collection(cat).get();
            totalVideos += snap.size;
        }
        document.getElementById('asset-count').innerText = totalVideos.toLocaleString();

        updateResourceGauges(pvCount, totalVideos);
        renderPulseChart(pvCount);

    } catch (e) {
        console.error("통계 로딩 실패:", e);
    }
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
    const data = [
        Math.floor(currentPV * 0.4), 
        Math.floor(currentPV * 0.6), 
        Math.floor(currentPV * 0.5), 
        Math.floor(currentPV * 0.8), 
        Math.floor(currentPV * 0.7), 
        Math.floor(currentPV * 1.2), 
        currentPV
    ];

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
        tr.innerHTML = `<td><img src="${v.thumbnail}" class="thumb-mini"></td><td><b>${v.title}</b></td><td><span style="color:#e50914;">${cat.toUpperCase()}</span></td><td><button class="btn-del" onclick="deleteVideo('${cat}','${v.id}','${v.title.replace(/'/g, "\\'")}')">삭제</button></td>`;
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
