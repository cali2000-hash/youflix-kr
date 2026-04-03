/**
 * YOUFLIX | ADMIN MONITORING ENGINE v2.0
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

// Initialize Statistics
async function loadStats() {
    try {
        // 1. Fetch PV Count
        const pvSnap = await db.collection('statistics').doc('daily_pv').get();
        const pvCount = pvSnap.exists ? pvSnap.data().count : 0;
        document.getElementById('pv-count').innerText = pvCount.toLocaleString();
        
        // 2. Fetch Total Assets
        const collections = ['kpop', 'kdrama', 'kclassic', 'kmovie', 'kvariety', 'trending'];
        let totalVideos = 0;
        for (const cat of collections) {
            const snap = await db.collection(cat).get();
            totalVideos += snap.size;
        }
        document.getElementById('asset-count').innerText = totalVideos.toLocaleString();

        // 3. Estimate Resource Usage
        updateResourceGauges(pvCount, totalVideos);

        // 4. Render Pulse Chart
        renderPulseChart(pvCount);

    } catch (e) {
        console.error("Stats Load Error:", e);
    }
}

function updateResourceGauges(pv, videos) {
    // Estimations based on average load weights
    const ytQuotaMax = 10000;
    const fbReadMax = 50000;
    const vclBandwidthMax = 100; // GB

    // YouTube API: Approx 1 unit per snippet fetch. Let's assume 1 load = 20 units
    const ytUsed = Math.min(pv * 20, ytQuotaMax);
    const ytPerc = (ytUsed / ytQuotaMax * 100).toFixed(1);
    document.getElementById('yt-quota-bar').style.width = `${ytPerc}%`;
    document.getElementById('yt-quota-text').innerText = `${ytPerc}% (${ytUsed.toLocaleString()}/10k)`;

    // Firebase Reads: pv * 2 collections * 20 docs each
    const fbUsed = Math.min(pv * 40, fbReadMax);
    const fbPerc = (fbUsed / fbReadMax * 100).toFixed(1);
    document.getElementById('fb-read-bar').style.width = `${fbPerc}%`;
    document.getElementById('fb-read-text').innerText = `${fbPerc}% (${fbUsed.toLocaleString()}/50k)`;

    // Bandwidth: pv * 5MB per load
    const vclUsedGB = (pv * 5 / 1024).toFixed(3);
    const vclPerc = (vclUsedGB / vclBandwidthMax * 100).toFixed(2);
    document.getElementById('vcl-usage-bar').style.width = `${vclPerc}%`;
    document.getElementById('vcl-usage-text').innerText = `${vclPerc}% (${vclUsedGB}GB)`;
    document.getElementById('traffic-est').innerText = `${vclUsedGB}GB`;
}

function renderPulseChart(currentPV) {
    const ctx = document.getElementById('pulseChart').getContext('2d');
    
    // Simulate historical data based on current PV for visualization
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
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
                label: 'Interactions',
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

// Existing Admin Functions
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
            cachedVideo = { id: id, title: snip.title, channel: snip.channelTitle, thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, date: new Date().toLocaleDateString() };
            document.getElementById('preview-img').src = cachedVideo.thumbnail;
            document.getElementById('preview-info').innerHTML = `<b>${snip.title}</b><br>${snip.channelTitle}`;
            box.style.display = 'block';
        }
    } catch (e) { }
}

async function pushToArchive() {
    if (!cachedVideo) return;
    const cat = document.getElementById('category-select').value;
    try {
        await db.collection(cat).doc(cachedVideo.id).set(cachedVideo);
        alert(`Successfully archived to [${cat}]!`);
        location.reload(); 
    } catch (e) { alert(e.message); }
}

async function loadList() {
    const cat = document.getElementById('filter-select').value;
    const tbody = document.getElementById('archive-list');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>';
    const snap = await db.collection(cat).orderBy('date', 'desc').limit(20).get();
    tbody.innerHTML = '';
    snap.forEach(doc => {
        const v = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><img src="${v.thumbnail}" class="thumb-mini"></td><td>${v.title}</td><td>${cat}</td><td><button class="btn-del" onclick="deleteVideo('${cat}','${v.id}')">DEL</button></td>`;
        tbody.appendChild(tr);
    });
}

async function deleteVideo(cat, id) {
    if (!confirm("Are you sure?")) return;
    await db.collection(cat).doc(id).delete();
    loadList();
}

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadList();
});
