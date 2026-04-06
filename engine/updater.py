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
        # 1. 유튜브 API 초기화 (v4.7 로테이션 시스템)
        self.api_keys = CONFIG.get('youtube_api_keys', [])
        if not self.api_keys:
            # 하위 호환성 유지
            single_key = CONFIG.get('youtube_api_key')
            self.api_keys = [single_key] if single_key else []
            
        self.current_key_index = 0
        self._init_youtube_client()
        
        # 2. Firebase/Firestore 초기화
        base_dir = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(base_dir, 'service-account.json')
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            env_cred = os.environ.get('FIREBASE_CREDENTIALS')
            if env_cred:
                cred_info = json.loads(env_cred)
                cred = credentials.Certificate(cred_info)
                firebase_admin.initialize_app(cred)
            else:
                self.db = None
                return
        
        self.db = firestore.client()
        print("✅ 유플릭스 엔진 활성화 완료 (Firestore 연결됨)")

    def _init_youtube_client(self):
        """현재 인덱스의 API 키로 유튜브 클라이언트 초기화"""
        if not self.api_keys:
            print("🚨 사용 가능한 유튜브 API 키가 없습니다.")
            self.youtube = None
            return
        
        current_key = self.api_keys[self.current_key_index]
        self.youtube = build('youtube', 'v3', developerKey=current_key)
        print(f"📡 유튜브 API 클라이언트 초기화 (Key Index: {self.current_key_index})")

    def _rotate_key(self):
        """쿼터 소진 시 다음 키로 로테이트"""
        if len(self.api_keys) > self.current_key_index + 1:
            self.current_key_index += 1
            self._init_youtube_client()
            print(f"🔄 API 키 교체 완료: Index {self.current_key_index}로 재시도합니다.")
            return True
        print("🚨 모든 유튜브 API 키의 쿼터가 소진되었습니다.")
        return False

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
            if "quota" in str(e).lower() or "forbidden" in str(e).lower() or "403" in str(e):
                if self._rotate_key():
                    return self.fetch_trending(limit)
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
                    if "quota" in str(e).lower() or "forbidden" in str(e).lower() or "403" in str(e):
                        if self._rotate_key():
                            # 키 교체 후 바로 루프의 다음 시도에서 새 키 사용
                            continue
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
                    if "quota" in str(e).lower() or "forbidden" in str(e).lower() or "403" in str(e):
                        if self._rotate_key():
                            continue
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

            # kpop 카테고리: 프리미엄 공식 채널 전용 필터링 (v5.0)
            if category == 'kpop':
                channel_name = snippet['channelTitle'].lower()
                video_title_lc = snippet['title'].lower()
                
                whitelist = [
                    'hybe labels', 'smtown', 'jyp entertainment', 'yg entertainment', 
                    'starship tv', 'woolliment', 'cjenm music', 'mnet k-pop', 'sbs kpop', 
                    'kbs world', 'mbckpop', '1thek', 'stone music', 'official',
                    'genie music', 'warner music korea', 'sony music korea', 
                    'universal music korea', 'm2', 'it\'s live', 'studio choom', 'dingo music',
                    'cube entertainment', 'fnc entertainment', 'rbw', 'kq entertainment',
                    'ist entertainment', 'wm entertainment', 'dreamcatcher official', 'p nation',
                    'jellyfish entertainment', 'wakeone', 'edam entertainment', 'antenna',
                    'top media', 'brave entertainment', 'maroo entertainment', 'dsp media',
                    'fantagio', 'brand new music', 'mystic story', 'around us entertainment',
                    'c9 entertainment', 'yuehua entertainment', 'oui entertainment', 'rain company',
                    'konnect entertainment', 'bpm entertainment', 'abyss company', 'more vision',
                    'at area', 'mirrorball music', 'fluxus music', 'interpark music', 'chrome entertainment',
                    'kakao entertainment', 'hello82', 'glance tv', 'sbs kpop zoom', 'kbs kpop',
                    'mbckpop live', 'all the k-pop', 'arirang k-pop', 'ador', 'belift lab',
                    'source music', 'pledis entertainment', 'koz entertainment', 'sm station',
                    'studio j', 'eighteen official', 'the mukorea', 'bts', 'blackpink', 'twice',
                    'stray kids', 'seventeen', 'newjeans', 'ive', 'le sserafim', 'aespa', 'itzy',
                    '(g)i-dle', 'red velvet', 'nct', 'ateez', 'txt', 'enhypen', 'treasure',
                    'babymonster', 'nmixx', 'stayc', 'kep1er', 'zerobaseone', 'riize', 'tws', 'illit'
                ]
                blacklist = [
                    'reaction', '리액션', 'cover', '커버', 'fanmade', '팬메이드', 
                    'fake', 'lyrics', '가사', 'parody', 'review', '리뷰'
                ]
                
                has_whitelist_channel = any(okw in channel_name for okw in whitelist)
                has_blacklist_title = any(bkw in video_title_lc for bkw in blacklist)
                
                if not has_whitelist_channel or has_blacklist_title:
                    print(f"🚫 Filtering non-official or reaction: {snippet['channelTitle']} | {snippet['title'][:30]}")
                    continue

            elif category == 'kvariety':
                channel_name = snippet['channelTitle'].lower()
                video_title_lc = snippet['title'].lower()
                
                whitelist = [
                    'sbs entertainment', 'kbs entertain', 'mbcentertainment', 'tvn', 'jtbc entertainment',
                    'mnet tv', 'channel a', 'tvchosun joy', 'e채널', 'kbs n', '채널십오야', '뜬뜬 ddeunddeun',
                    '문명특급 mmtg', '워크맨 workman', '살롱드립 teo', '노빠꾸탁재훈', '짠한형 신동엽',
                    '짐종국 gym jong kook', '비보티비 vivo tv', '할명수', '조현아의 목요일 밤', '흥마늘 스튜디오',
                    '디글 diggle', '사피엔스 스튜디오', '스튜디오 와플', '테오 teo', '어바웃트리', 'ootb studio',
                    '런닝맨 running man', '무학도전 infinite challenge', '1박 2일 2 days 1 night',
                    '나 혼자 산다 i live alone', '놀면 뭐하니 hangout with yoo', '전지적 참견 시점',
                    '아는 형님 knowing bros', '유 퀴즈 온 더 블럭', '딩고 뮤직 dingo music', 'it\'s live',
                    '1thek originals', '스튜디오 룰루랄라', '픽프 studio', 'm2 youtube', '스튜디오 훕훕',
                    '고독한 미식가', '맛있는 녀석들', '코미디빅리그', '신서유기', '삼시세끼', '윤식당', '환승연애', 'official'
                ]
                blacklist = ['reaction', '리액션', 'parody', '패러디', 'cover', '커버', 'fake']
                
                has_whitelist_channel = any(okw in channel_name for okw in whitelist)
                has_blacklist_title = any(bkw in video_title_lc for bkw in blacklist)
                
                if not has_whitelist_channel or has_blacklist_title:
                    print(f"🚫 Filtering non-official variety: {snippet['channelTitle']} | {snippet['title'][:30]}")
                    continue

            elif category == 'trending':
                channel_name = snippet['channelTitle'].lower()
                # KPOP + Variety 통합 공식 화이트리스트 (v19.16)
                total_whitelist = [
                    'hybe labels', 'smtown', 'jyp entertainment', 'yg entertainment', 'starship tv', 
                    'sbs kpop', 'mbckpop', 'kbs kpop', 'mnet k-pop', 'stone music', '1thek', 'official',
                    'sbs entertainment', 'kbs entertain', 'mbcentertainment', 'tvn', 'jtbc entertainment',
                    '채널십오야', '뜬뜬 ddeunddeun', '문명특급 mmtg', '워크맨 workman', '살롱드립 teo', 'dingo music'
                ]
                
                has_whitelist_channel = any(okw in channel_name for okw in total_whitelist)
                if not has_whitelist_channel:
                    print(f"🚫 Filtering non-official trending: {snippet['channelTitle']} | {snippet['title'][:30]}")
                    continue

            video_data = {
                'id': vid_id,
                'title': snippet['title'],
                'channel': snippet['channelTitle'],
                'description': snippet.get('description', '')[:300], # AdSense 컨텐츠 가치 보강 (v4.6)
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
            # 💡 읽기(Read) 없이 바로 업서트(Upsert) 수행하여 할당량 절약
            # 존재하면 썸네일 등만 업데이트, 없으면 신규 생성
            doc_ref.set(video, merge=True)
            count += 1
            # print(f"✨ Syncing: {video['title'][:40]}...") # 로그 폭주 방지
        print(f"📦 [{category}] {count}개 항목 동기화 완료 (Read: 0회).")

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
