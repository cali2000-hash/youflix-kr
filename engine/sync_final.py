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
logger = logging.getLogger("firestore_final_sync")

class FirestoreFinalSync:
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

    def get_sheet_data(self, range_name):
        result = self.sheets_service.spreadsheets().values().get(
            spreadsheetId=self.sheet_id, range=range_name).execute()
        return result.get('values', [])

    def load_video_id_to_col_map(self):
        # Load mapping from local backups
        backup_dir = os.path.join(os.getcwd(), 'engine', 'backups')
        logger.info(f"📂 Searching for backups in: {backup_dir}")
        vid_map = {}
        if os.path.exists(backup_dir):
            files = [f for f in os.listdir(backup_dir) if f.endswith('.json')]
            logger.info(f"📁 Found {len(files)} backup files.")
            for file in files:
                try:
                    with open(os.path.join(backup_dir, file), 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        logger.info(f"📖 Loaded {len(data)} records from {file}")
                        for vid_id, info in data.items():
                            if isinstance(info, dict):
                                cat = info.get('category') or info.get('Firestore_Collection')
                                if cat:
                                    vid_map[vid_id] = cat
                except Exception as e:
                    logger.warning(f"⏩ Skipping backup {file}: {e}")
        else:
            logger.error(f"❌ Backup directory not found: {backup_dir}")
        
        logger.info(f"🔑 Total unique Video IDs in map: {len(vid_map)}")
        if vid_map:
            logger.info(f"💡 Sample Map: {list(vid_map.keys())[:5]}")
        return vid_map

    def run(self):
        logger.info("📑 Reading translated data from 시트2...")
        rows_en = self.get_sheet_data("'시트2'!A1:Z500")
        if not rows_en:
            logger.error("❌ Data missing in 시트2.")
            return

        headers = rows_en[0]
        data = rows_en[1:]
        
        # Build vid -> col map
        logger.info("💾 Loading VideoID -> Collection mapping from backups...")
        vid_map = self.load_video_id_to_col_map()
        
        logger.info(f"📊 Starting sync for {len(data)} rows...")

        success_count = 0
        error_count = 0
        
        for i, row in enumerate(data):
            if not row: continue
            
            vid_id = row[0].strip()
            if i < 5:
                logger.info(f"🔍 Row {i+1} vid_id: {repr(vid_id)} (In map? {vid_id in vid_map})")
            
            if not vid_id or vid_id == '#REF!' or vid_id == 'videoId' or vid_id == 'ERROR': continue
            
            # Find collection
            col_name = vid_map.get(vid_id)
            if not col_name:
                if i < 10:
                    logger.warning(f"⏩ Collection not found for {repr(vid_id)}")
                continue

            # Metadata object
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
                # Direct Update
                self.db.collection(col_name).document(vid_id).update(metadata)
                success_count += 1
                if success_count % 20 == 0:
                    logger.info(f"✅ Sync Progress: {success_count} docs...")
                time.sleep(0.02) # Fast pace
            except Exception as e:
                logger.error(f"❌ Failed to update {vid_id} in {col_name}: {e}")
                error_count += 1

        logger.info(f"✨ Final Sync Completed! Success: {success_count}, Errors: {error_count}")

if __name__ == "__main__":
    syncer = FirestoreFinalSync()
    syncer.run()
