import os
import logging
import datetime
import re
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from google.oauth2 import service_account
from googleapiclient.discovery import build

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("youflix_sync_pro_v2")

# .env 로드
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(base_dir, ".env"))

class YouflixSheetSync:
    def __init__(self):
        self.sheet_id = os.getenv("GOOGLE_SHEET_ID")
        self.db = None
        self.firestore_cache = {} # { "title_key": "videoId" }
        self._init_firebase()
        self._init_sheets()

    def _init_firebase(self):
        try:
            if not firebase_admin._apps:
                cred_path = os.path.join(os.path.dirname(__file__), 'service-account.json')
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            logger.info("✅ Firebase Connection Established")
            self._load_firestore_cache()
        except Exception as e:
            logger.error(f"❌ Firebase Init Error: {e}")

    def _load_firestore_cache(self):
        """제목 기반 매칭을 위해 Firestore의 모든 데이터를 캐싱 (TV문학관, 영화 등)"""
        logger.info("📦 Loading Firestore cache for title matching...")
        # 주요 카테고리만 우선 로드
        collections = ['tvlit', 'kmovie', 'drama'] 
        for col_name in collections:
            docs = self.db.collection(col_name).stream()
            for doc in docs:
                data = doc.to_dict()
                title = data.get('title', '')
                if title:
                    clean_title = self._normalize_title(title)
                    self.firestore_cache[clean_title] = {
                        'id': doc.id,
                        'category': col_name
                    }
        logger.info(f"✅ Cached {len(self.firestore_cache)} titles from Firestore.")

    def _normalize_title(self, title):
        """제목 매칭 정확도를 높이기 위해 공백 제거 및 소문자화, 특수문자 제거"""
        if not title: return ""
        # 괄호 안 내용 제거 및 공백/특수문자 제거
        title = re.sub(r'\(.*?\)', '', title)
        title = re.sub(r'\[.*?\]', '', title)
        return re.sub(r'[^a-zA-Z0-9가-힣]', '', title).lower()

    def _init_sheets(self):
        try:
            cred_path = os.path.join(os.path.dirname(__file__), 'service-account.json')
            creds = service_account.Credentials.from_service_account_file(
                cred_path, scopes=['https://www.googleapis.com/auth/spreadsheets.readonly']
            )
            self.sheets_service = build('sheets', 'v4', credentials=creds)
            logger.info("✅ Google Sheets API Connected")
        except Exception as e:
            logger.error(f"❌ Sheets API Init Error: {e}")

    def fetch_data(self):
        if not self.sheet_id: return None
        try:
            # Sheet1 조회
            result = self.sheets_service.spreadsheets().values().get(
                spreadsheetId=self.sheet_id, range='Sheet1!A1:Z1000').execute()
            return result.get('values', [])
        except Exception as e:
            logger.error(f"❌ Failed to fetch Google Sheet data: {e}")
            return None

    def sync(self):
        values = self.fetch_data()
        if not values: return

        headers = values[0]
        data_rows = values[1:]
        sync_count = 0
        match_fail_count = 0
        
        for row in data_rows:
            if not row or not any(row): continue
            row_dict = dict(zip(headers, row))

            sheet_title = row_dict.get('제목', '').strip()
            if not sheet_title: continue

            # 제목 매칭 실시
            clean_sheet_title = self._normalize_title(sheet_title)
            match_info = self.firestore_cache.get(clean_sheet_title)

            # 정확한 매칭이 안될 경우 부분 일치 시도
            if not match_info:
                for cached_title, info in self.firestore_cache.items():
                    if clean_sheet_title in cached_title or cached_title in clean_sheet_title:
                        match_info = info
                        break

            if not match_info:
                logger.warning(f"⏩ No match found for: '{sheet_title}'")
                match_fail_count += 1
                continue

            vid_id = match_info['id']
            category = match_info['category']

            # 데이터 업데이트 객체 구성
            video_data = {
                'episode': row_dict.get('회차', ''),
                'air_date': row_dict.get('방송일자', ''),
                'original_work': row_dict.get('원작', ''),
                'screenplay': row_dict.get('극본', ''),
                'director': row_dict.get('연출', ''),
                'cast': row_dict.get('출연진', ''),
                'description_kr': row_dict.get('설명', ''),
                'syncSource': 'google_sheet_matched'
            }

            # Firestore 업데이트 (merge=True)
            try:
                self.db.collection(category).document(vid_id).set(video_data, merge=True)
                sync_count += 1
                logger.info(f"✨ Matched & Updated: [{category}] {sheet_title} -> {vid_id}")
            except Exception as e:
                logger.error(f"❌ Firestore Update Error for {vid_id}: {e}")

        logger.info(f"🔥 Sync Complete: {sync_count} updated, {match_fail_count} failed to match.")

if __name__ == "__main__":
    syncer = YouflixSheetSync()
    syncer.sync()
