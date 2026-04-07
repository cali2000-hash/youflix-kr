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
logger = logging.getLogger("firestore_full_automation")

class FirestoreAutomation:
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

    def update_sheet_values(self, range_name, values):
        body = {'values': values}
        self.sheets_service.spreadsheets().values().update(
            spreadsheetId=self.sheet_id, range=range_name,
            valueInputOption='USER_ENTERED', body=body).execute()

    def get_sheet_data(self, range_name):
        result = self.sheets_service.spreadsheets().values().get(
            spreadsheetId=self.sheet_id, range=range_name).execute()
        return result.get('values', [])

    def load_video_id_to_col_map(self):
        backup_dir = '/Users/cali/Dropbox/01 주요작업/00 유투브/블로그앱/engine/backups'
        logger.info(f"📂 Searching for backups in absolute path: {backup_dir}")
        vid_map = {}
        if os.path.exists(backup_dir):
            files = [f for f in os.listdir(backup_dir) if f.endswith('.json')]
            logger.info(f"📁 Found {len(files)} backup files.")
            for file in files:
                try:
                    with open(os.path.join(backup_dir, file), 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        for vid_id, info in data.items():
                            if isinstance(info, dict):
                                cat = info.get('category') or info.get('Firestore_Collection')
                                if cat: vid_map[vid_id] = cat
                except: pass
        else:
            logger.error(f"❌ Backup Dir Not Found: {backup_dir}")
        logger.info(f"🔑 Loaded {len(vid_map)} mappings.")
        return vid_map

    def run(self):
        import unicodedata
        def normalize(s):
            return unicodedata.normalize('NFC', s.strip())

        target_sheet_name = normalize('시트2')
        logger.info(f"📑 Reading back translated values from {target_sheet_name}...")
        
        # We read the entire range including headers to be safe
        rows_all = self.get_sheet_data(f"'{target_sheet_name}'!A1:F350")
        
        if not rows_all or len(rows_all) < 2:
            logger.error(f"❌ Failed to read back data from {target_sheet_name}. Found {len(rows_all) if rows_all else 0} rows.")
            return

        headers = rows_all[0]
        rows_en = rows_all[1:]
        logger.info(f"📋 Read {len(rows_en)} data rows from {target_sheet_name}.")
        logger.info(f"💡 Sample Row 1: {repr(rows_en[0])}")

        # 4. Sync to Firestore
        vid_map = self.load_video_id_to_col_map()
        success_count = 0
        error_count = 0
        skip_count = 0
        
        for i, row in enumerate(rows_en):
            if not row or len(row) == 0: 
                skip_count += 1
                continue
            
            vid_id = row[0].strip()
            
            if not vid_id or vid_id in ['#REF!', 'videoId', 'ERROR', '#N/A', '#VALUE!', 'Loading...']:
                skip_count += 1
                continue
            
            col_name = vid_map.get(vid_id)
            if not col_name:
                if i < 10:
                    logger.warning(f"⏩ VideoID {repr(vid_id)} not found in backup map. Skipping.")
                skip_count += 1
                continue

            metadata = {
                'title_en': row[1] if len(row) > 1 else '',
                'description_en': row[2] if len(row) > 2 else '',
                'cast_en': row[3] if len(row) > 3 else '',
                'original_work_en': row[4] if len(row) > 4 else '',
                'director_en': row[5] if len(row) > 5 else '',
                'metadata_translated': True,
                'last_synced_en': firestore.SERVER_TIMESTAMP
            }

            try:
                self.db.collection(col_name).document(vid_id).update(metadata)
                success_count += 1
                if success_count % 50 == 0:
                    logger.info(f"✅ Sync Progress: {success_count} docs...")
            except Exception as e:
                error_count += 1

        logger.info(f"✨ Final Sync Completed! Success: {success_count}, Errors: {error_count}, Skipped: {skip_count}")

if __name__ == "__main__":
    automation = FirestoreAutomation()
    automation.run()
