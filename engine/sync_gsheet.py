import os
import csv
import logging
import requests
import datetime
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("youflix_sync")

# .env 로드
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(base_dir, ".env"))

class YouflixSheetSync:
    def __init__(self):
        self.sheet_id = os.getenv("GOOGLE_SHEET_ID")
        self.project_id = os.getenv("FIREBASE_PROJECT_ID")
        self.db = None
        self._init_firebase()

    def _init_firebase(self):
        try:
            # 기존 앱이 있으면 가져오고, 없으면 새로 초기화
            if not firebase_admin._apps:
                cred_path = os.path.join(os.path.dirname(__file__), 'service-account.json')
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                else:
                    firebase_admin.initialize_app() # 기본 인증 권한 시도
            self.db = firestore.client()
            logger.info("✅ Firebase Connection Established")
        except Exception as e:
            logger.error(f"❌ Firebase Init Error: {e}")

    def fetch_csv(self):
        if not self.sheet_id:
            logger.error("❌ GOOGLE_SHEET_ID not found in .env")
            return None
        
        csv_url = f"https://docs.google.com/spreadsheets/d/{self.sheet_id}/export?format=csv"
        try:
            response = requests.get(csv_url)
            response.raise_for_status()
            logger.info("✅ Google Sheet CSV Fetched Successfully")
            return response.text.splitlines()
        except Exception as e:
            logger.error(f"❌ Failed to fetch Google Sheet: {e}")
            return None

    def sync(self):
        lines = self.fetch_csv()
        if not lines: return

        reader = csv.DictReader(lines)
        today = datetime.datetime.now().strftime("%Y. %m. %d.")
        
        sync_count = 0
        for row in reader:
            vid_id = row.get('videoId')
            category = row.get('카테고리') or row.get('category')
            
            if not vid_id or not category:
                logger.warning(f"⚠️ Skipping row: Missing videoId or category ({row.get('제목')})")
                continue

            # 데이터 정규화
            video_data = {
                'id': vid_id,
                'title': row.get('제목') or row.get('title', 'Unknown Title'),
                'episode': row.get('회차', ''),
                'air_date': row.get('방송일자', ''),
                'original_work': row.get('원작', ''),
                'screenplay': row.get('극본', ''),
                'director': row.get('연출', ''),
                'cast': row.get('출연진', ''),
                'description_kr': row.get('설명') or row.get('description', ''),
                'category': category,
                'thumbnail': f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'addedAt': today
            }

            # Firestore 저장 (Upsert)
            try:
                doc_ref = self.db.collection(category).document(vid_id)
                doc_ref.set(video_data, merge=True)
                sync_count += 1
                logger.info(f"🚀 Synced: [{category}] {video_data['episode']} {video_data['title']}")
            except Exception as e:
                logger.error(f"❌ Sync Error for {vid_id}: {e}")

        logger.info(f"✨ Total {sync_count} items synchronized.")

if __name__ == "__main__":
    syncer = YouflixSheetSync()
    syncer.sync()
