import os
import json
from googleapiclient.discovery import build
import firebase_admin
from firebase_admin import credentials, firestore
try:
    from config import CONFIG
except ImportError:
    from engine.config import CONFIG

class YouflixCleaner:
    def __init__(self):
        # 1. 유튜브 API 초기화 (v4.7 로테이션 시스템 대응)
        self.api_keys = CONFIG.get('youtube_api_keys', [])
        if not self.api_keys:
            single_key = CONFIG.get('youtube_api_key')
            self.api_keys = [single_key] if single_key else []
            
        if not self.api_keys:
            print("🚨 사용 가능한 유튜브 API 키가 없습니다.")
            self.youtube = None
        else:
            self.youtube = build('youtube', 'v3', developerKey=self.api_keys[0])
            print(f"📡 유튜브 API 클라이언트 초기화 완료 (Key Index 0)")

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
                print("🚨 Firebase 자격 증명이 없습니다.")
                self.db = None
                return
        
        self.db = firestore.client()
        print("✅ 클리너 활성화 완료 (Firestore 연결됨)")

    def clean_category(self, category, official_id):
        if not self.db: return
        print(f"🧹 [{category}] 정밀 클리닝 시작 (공통 ID: {official_id})")
        
        docs = self.db.collection(category).stream()
        delete_count = 0
        total_count = 0
        
        video_ids = []
        doc_map = {}
        for doc in docs:
            video_ids.append(doc.id)
            doc_map[doc.id] = doc.reference
            total_count += 1
            
        # YouTube API는 한 번에 50개까지 조회 가능
        for i in range(0, len(video_ids), 50):
            chunk = video_ids[i:i+50]
            try:
                response = self.youtube.videos().list(
                    part="snippet",
                    id=",".join(chunk)
                ).execute()
                
                valid_ids = []
                for item in response.get('items', []):
                    channel_title = item['snippet']['channelTitle']
                    channel_id = item['snippet']['channelId']
                    
                    is_official = False
                    video_title = item['snippet']['title'].lower()
                    
                    if category == 'kpop':
                        # kpop은 엄격한 기획사/방송사 화이트리스트 + 블랙워드 필터링 (v5.0)
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
                        
                        has_whitelist_channel = any(okw in channel_title.lower() for okw in whitelist)
                        has_blacklist_title = any(bkw in video_title for bkw in blacklist)
                        
                        if has_whitelist_channel and not has_blacklist_title:
                            is_official = True

                    elif category == 'kvariety':
                        # 예능 공식 채널 화이트리스트 (v19.16)
                        whitelist = [
                            'sbs entertainment', 'kbs entertain', 'mbcentertainment', 'tvn', 'jtbc entertainment',
                            'mnet tv', 'channel a', 'tvchosun joy', 'e채널', 'kbs n', '채널십오야', '뜬뜬 ddeunddeun',
                            '문명특급 mmtg', '워크맨 workman', '살롱드립 teo', '노빠꾸탁재훈', '짠한형 신동엽',
                            '짐종국 gym jong kook', '비보티비 vivo tv', '할명수', '조현아의 목요일 밤', '흥마늘 스튜디오',
                            '디글 diggle', '사피엔스 스튜디오', '스튜디오 와플', '테오 teo', '어바웃트리', 'ootb studio',
                            '런닝맨 running man', '무한도전 infinite challenge', '1박 2일 2 days 1 night',
                            '나 혼자 산다 i live alone', '놀면 뭐하니 hangout with yoo', '전지적 참견 시점',
                            '아는 형님 knowing bros', '유 퀴즈 온 더 블럭', '딩고 뮤직 dingo music', 'it\'s live',
                            '1thek originals', '스튜디오 룰루랄라', '픽프 studio', 'm2 youtube', '스튜디오 훕훕',
                            '고독한 미식가', '맛있는 녀석들', '코미디빅리그', '신서유기', '삼시세끼', '윤식당', '환승연애', 'official'
                        ]
                        blacklist = ['reaction', '리액션', 'parody', '패러디', 'cover', '커버', 'fake']
                        
                        has_whitelist_channel = any(okw in channel_title.lower() for okw in whitelist)
                        has_blacklist_title = any(bkw in video_title for bkw in blacklist)
                        
                        if has_whitelist_channel and not has_blacklist_title:
                            is_official = True

                    elif category == 'trending':
                        # 인기 급상승도 공식 채널(KPOP + Variety)만 허용 (v19.16)
                        total_whitelist = [
                            'hybe labels', 'smtown', 'jyp entertainment', 'yg entertainment', 'starship tv', 
                            'sbs kpop', 'mbckpop', 'kbs kpop', 'mnet k-pop', 'stone music', '1thek', 'official',
                            'sbs entertainment', 'kbs entertain', 'mbcentertainment', 'tvn', 'jtbc entertainment',
                            '채널십오야', '뜬뜬 ddeunddeun', '문명특급 mmtg', '워크맨 workman', '살롱드립 teo', 'dingo music'
                        ] # 대표 채널들만 우선 적용 (필요시 도 확장)
                        
                        has_whitelist_channel = any(okw in channel_title.lower() for okw in total_whitelist)
                        if has_whitelist_channel:
                            is_official = True
                    
                    elif channel_id == official_id:
                        is_official = True
                        
                    if is_official:
                        valid_ids.append(item['id'])
                
                # 비공식 영상 삭제
                for vid_id in chunk:
                    if vid_id not in valid_ids:
                        doc_map[vid_id].delete()
                        delete_count += 1
                        print(f"🗑️ Deleted Non-Official: {vid_id}")
            except Exception as e:
                print(f"❌ API 오류: {e}")
                
        print(f"🏁 [{category}] 작업 완료: {total_count}개 중 {delete_count}개 삭제됨.")

    def run_cleaning(self):
        targets = {
            'tvlit': CONFIG['categories']['tvlit'].get('channelId'),
            'kclassic': CONFIG['categories']['kclassic'].get('channelId'),
            'kpop': 'INTERNAL_WHITELIST',
            'kvariety': 'INTERNAL_WHITELIST',
            'trending': 'INTERNAL_WHITELIST'
        }
        
        for cat, official_id in targets.items():
            if official_id:
                self.clean_category(cat, official_id)
            else:
                print(f"⚠️ [{cat}] 공식 채널 ID가 설정되어 있지 않아 건너뜁니다.")

if __name__ == "__main__":
    cleaner = YouflixCleaner()
    if cleaner.db:
        cleaner.run_cleaning()
