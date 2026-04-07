import os
import json
import logging
import time
from google.oauth2 import service_account
from googleapiclient.discovery import build
import firebase_admin
from firebase_admin import credentials, firestore

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("firestore_syncer")

class FirestoreSyncer:
    def __init__(self):
        self.sheet_id = "1vkNNNuZm00PQPmbmXleYMDH3ftKI8ytt_s4wKctb5ds"
        self.cred_path = os.path.join(os.path.dirname(__file__), 'service-account.json')
        self._init_services()

    def _init_services(self):
        # 1. Sheets API
        creds = service_account.Credentials.from_service_account_file(
            self.cred_path, scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        self.sheets_service = build('sheets', 'v4', credentials=creds)

        # 2. Firestore API
        if not firebase_admin._apps:
            cred = credentials.Certificate(self.cred_path)
            firebase_admin.initialize_app(cred)
        self.db = firestore.client()

    def get_sheet_all(self, range_name):
        result = self.sheets_service.spreadsheets().values().get(
            spreadsheetId=self.sheet_id, range=range_name).execute()
        return result.get('values', [])

    def run(self):
        logger.info("📑 Scanning all sheets for source data...")
        spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=self.sheet_id).execute()
        
        import unicodedata
        def normalize(s):
            return unicodedata.normalize('NFC', s.strip())

        source_title = None
        headers_kr = None
        
        for sheet in spreadsheet['sheets']:
            title = sheet['properties']['title']
            res = self.get_sheet_all(f"'{title}'!A1:Z1")
            if not res: continue
            
            headers = [normalize(h) for h in res[0]]
            logger.info(f"🔎 Checking sheet '{title}': {headers[:3]}...")
            
            if normalize('유튜브_ID') in headers and normalize('Firestore_Collection') in headers:
                source_title = title
                headers_kr = headers
                logger.info(f"✅ Found source sheet: {source_title}")
                break
        
        if not source_title:
            logger.error("❌ Could not find the source sheet with ID/Collection headers.")
            return

        en_title = "시트2" # Static translation sheet
        rows_kr = self.get_sheet_all(f"'{source_title}'!A1:Z1000")
        rows_en = self.get_sheet_all(f"'{en_title}'!A1:F1000")
        
        if not rows_kr or not rows_en:
            logger.error(f"❌ Data missing in {source_title} or {en_title}.")
            return

        data_kr = rows_kr[1:]
        data_en = rows_en[1:] # Skip headers

        logger.info(f"📊 Processing {len(data_en)} translated rows...")

        success_count = 0
        error_count = 0
        
        # Mapping indices
        try:
            kr_title_idx = headers_kr.index(normalize('제목'))
            vid_id_idx = headers_kr.index(normalize('유튜브_ID'))
            col_idx = headers_kr.index(normalize('Firestore_Collection'))
        except ValueError as e:
            logger.error(f"❌ Header missing in {source_title}: {e}")
            return

        for i, en_row in enumerate(data_en):
            if not any(en_row): continue
            
            # Match with KR row to get ID/Collection
            kr_row = data_kr[i] if i < len(data_kr) else None
            if not kr_row or len(kr_row) <= max(vid_id_idx, col_idx): 
                continue
            
            kr_title = kr_row[kr_title_idx]
            vid_id = kr_row[vid_id_idx]
            col_name = kr_row[col_idx]
            
            if not vid_id or not col_name:
                logger.warning(f"⏩ Skipping {kr_title}: Missing ID or Collection mapping.")
                continue

            logger.info(f"[{i+1}/{len(data_en)}] Updating Firestore: {kr_title} ({vid_id})")

            # Prepare EN Metadata
            en_metadata = {
                'title_en': en_row[0] if len(en_row) > 0 else '',
                'description_en': en_row[1] if len(en_row) > 1 else '',
                'cast_en': en_row[2] if len(en_row) > 2 else '',
                'original_work_en': en_row[3] if len(en_row) > 3 else '',
                'director_en': en_row[4] if len(en_row) > 4 else '',
                'screenplay_en': en_row[5] if len(en_row) > 5 else '',
                'last_synced_en': firestore.SERVER_TIMESTAMP
            }

            try:
                # Direct Document Update (No Query!)
                doc_ref = self.db.collection(col_name).document(vid_id)
                doc_ref.update(en_metadata)
                success_count += 1
                
                # Small pause to be safe (50ms)
                time.sleep(0.05)
            except Exception as e:
                logger.error(f"❌ Failed to update {vid_id}: {e}")
                error_count += 1

        logger.info(f"✨ Finished! Updated: {success_count}, Errors: {error_count}")

if __name__ == "__main__":
    syncer = FirestoreSyncer()
    syncer.run()
