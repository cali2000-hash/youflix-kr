import os
import json
import datetime
from googleapiclient.discovery import build
import firebase_admin
from firebase_admin import credentials, firestore
try:
    from config import CONFIG
except ImportError:
    from engine.config import CONFIG

class YouflixEngine:
    def __init__(self):
        # 1. YouTube API 초기화
        self.youtube = build('youtube', 'v3', developerKey=CONFIG['youtube_api_key'])
        
        # 2. Firebase/Firestore 초기화
        # 스크립트 위치 기준 또는 현재 디렉토리 기준 탐색
        base_dir = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(base_dir, 'service-account.json')
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # 환경 변수 기반 초기화 (GitHub Actions용)
            env_cred = os.environ.get('FIREBASE_CREDENTIALS')
            if env_cred:
                cred_info = json.loads(env_cred)
                cred = credentials.Certificate(cred_info)
                firebase_admin.initialize_app(cred)
            else:
                print("🚨 Firebase 자격 증명이 없습니다. 'service-account.json' 파일이나 'FIREBASE_CREDENTIALS' 환경 변수가 필요합니다.")
                self.db = None
                return
        
        self.db = firestore.client()
        print("✅ 유플릭스 엔진 활성화 완료 (Firestore 연결됨)")

    def fetch_trending(self, limit=10):
        """인기 급상승 영상 수집"""
        try:
            request = self.youtube.videos().list(
                part="snippet,statistics",
                chart="mostPopular",
                regionCode="KR",
                maxResults=limit
            )
            response = request.execute()
            return self._parse_items(response.get('items', []), 'trending')
        except Exception as e:
            print(f"❌ Trending 수집 실패: {e}")
            return []

    def fetch_by_search(self, category, keywords, max_total=50, channel_id=None):
        """키워드 기반 수집 (v21.3: 페이징 지원)"""
        results = []
        for kw in keywords:
            print(f"🔍 [{category}] 검색 수집 시작 (Max {max_total}): {kw}")
            next_page_token = None
            kw_results = []
            
            while len(kw_results) < max_total:
                try:
                    params = {
                        "part": "snippet",
                        "q": kw,
                        "type": "video",
                        "maxResults": min(50, max_total - len(kw_results)),
                        "relevanceLanguage": "ko",
                        "regionCode": "KR", # 한국 지역 검색 강제
                        "order": "date",
                        "pageToken": next_page_token
                    }
                    if channel_id:
                        params["channelId"] = channel_id
                    
                    request = self.youtube.search().list(**params)
                    response = request.execute()
                    items = response.get('items', [])
                    kw_results.extend(self._parse_items(items, category))
                    
                    next_page_token = response.get('nextPageToken')
                    if not next_page_token or not items: break
                except Exception as e:
                    print(f"❌ '{kw}' 검색 실패: {e}")
                    break
            results.extend(kw_results)
        return results

    def fetch_by_playlist(self, category, playlist_ids):
        """특정 재생목록 내의 모든 영상 소환 (v19.2)"""
        results = []
        for pid in playlist_ids:
            print(f"🔍 [{category}] 재생목록 전수 수집 시작: {pid}")
            next_page_token = None
            while True:
                try:
                    request = self.youtube.playlistItems().list(
                        part="snippet",
                        playlistId=pid,
                        maxResults=50,
                        pageToken=next_page_token
                    )
                    response = request.execute()
                    items = response.get('items', [])
                    results.extend(self._parse_items(items, category))
                    
                    next_page_token = response.get('nextPageToken')
                    if not next_page_token: break
                except Exception as e:
                    print(f"❌ 재생목록 '{pid}' 수집 실패: {e}")
                    break
        print(f"✅ [{category}] 총 {len(results)}개 영상 수집 완료.")
        return results

    def _parse_items(self, items, category):
        parsed = []
        today = datetime.datetime.now().strftime("%Y. %m. %d.")
        for item in items:
            # 1. Video ID 추출 (Search API vs Playlist API 차이 대응)
            vid_id = None
            if isinstance(item['id'], str):
                # Playlist API는 item['id']가 playlistItemId임. 실제 영상 ID는 resourceId에 있음.
                vid_id = item['snippet'].get('resourceId', {}).get('videoId')
            else:
                # Search API는 item['id']가 dict이며 videoId를 포함함.
                vid_id = item['id'].get('videoId')
            
            # fallback: 정 안되면 item['id'] 사용
            if not vid_id and isinstance(item['id'], str): vid_id = item['id']
            if not vid_id: continue
            
            snippet = item['snippet']
            # 썸네일 고화질 우선 선택
            thumb_url = snippet.get('thumbnails', {}).get('high', {}).get('url', 
                        snippet.get('thumbnails', {}).get('default', {}).get('url', 
                        f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"))

            # kpop 카테고리: 공식 채널 전용 필터링 (v4.5)
            if category == 'kpop':
                channel_name = snippet['channelTitle'].lower()
                official_keywords = [
                    'official', 'mnet', 'sbs', 'kbs', 'jyp', 'smtown', 'hybe', 'yg', 
                    'stone', 'starship', 'woollim', 'tv', 'radio', 'entertainment', 
                    'labels', 'music', 'artist', 'kpop', 'mbc', 'jtbc'
                ]
                if not any(okw in channel_name for okw in official_keywords):
                    print(f"🚫 Filtering non-official channel: {snippet['channelTitle']}")
                    continue

            video_data = {
                'id': vid_id,
                'title': snippet['title'],
                'channel': snippet['channelTitle'],
                'thumbnail': thumb_url,
                'date': today,
                'category': category,
                'timestamp': firestore.SERVER_TIMESTAMP # 정렬용
            }

            # TV문학관 & 드라마게임 화수 추출 (v21.5)
            if category in ['tvlit', 'dramagame'] or '드라마게임' in snippet['title'] or 'TV문학관' in snippet['title']:
                import re
                match = re.search(r'(\d+)화', snippet['title'])
                video_data['sort_idx'] = int(match.group(1)) if match else 9999

            parsed.append(video_data)
        return parsed

    def save_to_db(self, category, videos):
        if not self.db: return
        count = 0
        for video in videos:
            doc_ref = self.db.collection(category).document(video['id'])
            # 이미 존재하는지 확인 후 업서트
            doc = doc_ref.get()
            if not doc.exists:
                doc_ref.set(video)
                count += 1
                print(f"✨ New: {video['title']}")
            else:
                # 기존 항목의 썸네일 새로고침 (v17.2)
                doc_ref.update({'thumbnail': video['thumbnail']})
        print(f"📦 [{category}] {count}개 신규 등록 완료.")

    def run_daily_update(self):
        if not self.db: return
        print(f"🚀 유플릭스 {datetime.datetime.now()} 정기 업데이트 시작")
        
        for cat, setting in CONFIG['categories'].items():
            print(f"🔍 [{cat}] 수집 전략 실행 중...")
            videos = []
            if setting['strategy'] == 'trending':
                videos = self.fetch_trending(setting['maxResults'])
            elif setting['strategy'] == 'playlist':
                videos = self.fetch_by_playlist(cat, setting['playlists'])
            elif setting['strategy'] == 'search':
                videos = self.fetch_by_search(
                    cat, 
                    setting['keywords'], 
                    setting['maxResults'], 
                    channel_id=setting.get('channelId')
                )
            
            # DB 저장
            if videos:
                self.save_to_db(cat, videos)
        
        print("🏁 모든 아카이브 업데이트 종료.")

if __name__ == "__main__":
    engine = YouflixEngine()
    if engine.db:
        engine.run_daily_update()
