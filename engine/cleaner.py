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
        self.youtube = build('youtube', 'v3', developerKey=CONFIG['youtube_api_key'])
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
                    if item['snippet']['channelId'] == official_id:
                        valid_ids.append(item['id'])
                
                # 비공식 영상 삭제
                for vid_id in chunk:
                    if vid_id not in valid_ids:
                        doc_map[vid_id].delete()
                        delete_count += 1
                        print(f"🗑️ Deleted Official-Mismatch: {vid_id}")
            except Exception as e:
                print(f"❌ API 오류: {e}")
                
        print(f"🏁 [{category}] 작업 완료: {total_count}개 중 {delete_count}개 삭제됨.")

    def run_cleaning(self):
        targets = {
            'tvlit': CONFIG['categories']['tvlit'].get('channelId'),
            'kclassic': CONFIG['categories']['kclassic'].get('channelId')
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
