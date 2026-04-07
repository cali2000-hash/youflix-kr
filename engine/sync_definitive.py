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
logger = logging.getLogger("firestore_definitive_sync")

class FirestoreDefinitiveSync:
    def __init__(self):
        self.sheet_id = "1vkNNNuZm00PQPmbmXleYMDH3ftKI8ytt_s4wKctb5ds"
        self.cred_path = os.path.join(os.path.dirname(__file__), 'service-account.json')
        self._init_services()

    def _init_services(self):
        creds = service_account.Credentials.from_service_account_file(
            self.cred_path, scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        self.sheets_service = build('sheets', 'v4', credentials=creds)

        if not firebase_admin._apps:
            cred = credentials.Certificate(self.cred_path)
            firebase_admin.initialize_app(cred)
        self.db = firestore.client()

    def get_sheet_data(self, range_name):
        result = self.sheets_service.spreadsheets().values().get(
            spreadsheetId=self.sheet_id, range=range_name).execute()
        return result.get('values', [])

    def run(self):
        logger.info("📑 Reading Source (Sheet1) and Translations (시트2)...")
        # Reading both sheets (A-M columns)
        rows_kr = self.get_sheet_data("'Sheet1'!A2:M350")
        rows_en = self.get_sheet_data("'시트2'!A2:F350")
        
        if not rows_kr or not rows_en:
            logger.error("❌ Data missing in Sheets.")
            return

        success_count = 0
        error_count = 0
        skip_count = 0
        
        # Parallel iterate
        for i in range(min(len(rows_kr), len(rows_en))):
            kr = rows_kr[i]
            en = rows_en[i]
            
            if not kr or len(kr) < 12: 
                skip_count += 1
                continue
            
            # YouTube ID is at index 11 (Column L)
            vid_id = kr[11].strip()
            # Collection is at index 12 (Column M)
            col_name = kr[12].strip() if len(kr) > 12 else None
            
            if not vid_id or vid_id == '유튜브_ID':
                skip_count += 1
                continue
                
            if not col_name:
                # Fallback to Title match if possible? No, we need collection.
                # Try to find collection in backup or skip
                skip_count += 1
                continue

            # Metadata object (using translations from 시트2)
            # Note: 시트2 headers were videoId, title_en, description_en, cast_en, original_en, director_en
            metadata = {
                'title_en': en[1] if len(en) > 1 else '',
                'description_en': en[2] if len(en) > 2 else '',
                'cast_en': en[3] if len(en) > 3 else '',
                'original_work_en': en[4] if len(en) > 4 else '',
                'director_en': en[5] if len(en) > 5 else '',
                'metadata_translated': True,
                'last_synced_en': firestore.SERVER_TIMESTAMP
            }

            try:
                self.db.collection(col_name).document(vid_id).update(metadata)
                success_count += 1
                if success_count % 50 == 0:
                    logger.info(f"✅ Sync Progress: {success_count} docs...")
            except Exception as e:
                # logger.error(f"❌ Error updating {vid_id}: {e}")
                error_count += 1

        logger.info(f"✨ Definitive Sync Completed! Success: {success_count}, Errors: {error_count}, Skipped: {skip_count}")

if __name__ == "__main__":
    syncer = FirestoreDefinitiveSync()
    syncer.run()
