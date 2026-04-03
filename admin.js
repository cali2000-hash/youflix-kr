/**
 * YOUFLIX | ADMIN INTELLIGENCE ENGINE v1.0
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

// Parse Video ID from various URL formats
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
            cachedVideo = {
                id: id,
                title: snip.title,
                channel: snip.channelTitle,
                thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
                date: new Date().toLocaleDateString()
            };
            document.getElementById('preview-img').src = cachedVideo.thumbnail;
            document.getElementById('preview-info').innerHTML = `<b>${snip.title}</b><br>${snip.channelTitle}`;
            box.style.display = 'block';
        }
    } catch (e) { console.error("YT API Error:", e); }
}

async function pushToArchive() {
    if (!cachedVideo) { alert("유튜브 링크가 올바르지 않습니다."); return; }
    
    const cat = document.getElementById('category-select').value;
    const customTitle = document.getElementById('custom-title').value.trim();
    if (customTitle) cachedVideo.title = customTitle;
    
    toggleLoading(true);
    try {
        await db.collection(cat).doc(cachedVideo.id).set(cachedVideo);
        alert(`성공! [${cat}] 카테고리에 등록되었습니다.`);
        document.getElementById('yt-input').value = '';
        document.getElementById('preview-box').style.display = 'none';
        cachedVideo = null;
        loadList(); // Refresh list
    } catch (e) {
        alert("등록 실패: " + e.message);
    }
    toggleLoading(false);
}

async function loadList() {
    const cat = document.getElementById('filter-select').value;
    const tbody = document.getElementById('archive-list');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">Loading Archive List...</td></tr>';
    
    try {
        const snap = await db.collection(cat).orderBy('date', 'desc').get();
        tbody.innerHTML = '';
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#555;">No records found in this category.</td></tr>';
            return;
        }
        
        snap.forEach(doc => {
            const v = doc.data();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${v.thumbnail}" class="thumb-mini"></td>
                <td><b style="color:#fff;">${v.title}</b><br><small style="color:#666;">${v.channel}</small></td>
                <td><span style="color:#e50914; font-weight:bold; font-size:0.8rem;">${cat.toUpperCase()}</span></td>
                <td style="color:#888;">${v.date}</td>
                <td><button class="btn-del" onclick="deleteVideo('${cat}', '${v.id}', '${v.title.replace(/'/g, "\\'")}')">DELETE</button></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:red;">Error: ' + e.message + '</td></tr>';
    }
}

async function deleteVideo(cat, id, title) {
    if (!confirm(`[${title}] 영상을 아카이브에서 영구 삭제하시겠습니까?`)) return;
    
    toggleLoading(true);
    try {
        await db.collection(cat).doc(id).delete();
        alert("삭제 완료되었습니다.");
        loadList();
    } catch (e) {
        alert("삭제 실패: " + e.message);
    }
    toggleLoading(false);
}

function toggleLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    loadList();
});
