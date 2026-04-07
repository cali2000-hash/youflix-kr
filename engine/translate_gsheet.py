import os
import json
import logging
import time
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from google.oauth2 import service_account
from googleapiclient.discovery import build
import vertexai
from vertexai.generative_models import GenerativeModel

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("youflix_translator")

# .env 로드
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(base_dir, ".env"))

class YouflixTranslator:
    def __init__(self):
        self.sheet_id = os.getenv("GOOGLE_SHEET_ID")
        self._init_firebase()
        self._init_sheets()
        self._init_gemini()

    def _init_firebase(self):
        if not firebase_admin._apps:
            cred_path = os.path.join(os.path.dirname(__file__), 'service-account.json')
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        self.db = firestore.client()

    def _init_sheets(self):
        cred_path = os.path.join(os.path.dirname(__file__), 'service-account.json')
        creds = service_account.Credentials.from_service_account_file(
            cred_path, scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        self.sheets_service = build('sheets', 'v4', credentials=creds)

    def _init_gemini(self):
        try:
            cred_path = os.path.join(os.path.dirname(__file__), 'service-account.json')
            with open(cred_path, 'r') as f:
                cred_data = json.load(f)
                project_id = cred_data.get('project_id')

            creds = service_account.Credentials.from_service_account_file(cred_path)
            vertexai.init(project=project_id, location="us-central1", credentials=creds)
            self.model = GenerativeModel("gemini-1.5-flash-002")
            logger.info(f"🚀 Vertex AI Initialized for project: {project_id}")
        except Exception as e:
            logger.error(f"❌ Failed to init Vertex AI: {e}")
            raise e

    def get_sheet_data(self, range_name):
        result = self.sheets_service.spreadsheets().values().get(
            spreadsheetId=self.sheet_id, range=range_name).execute()
        return result.get('values', [])

    def get_firestore_cache(self):
        logger.info("📦 Loading Firestore data from local backups...")
        cache = []
        backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
        
        if not os.path.exists(backup_dir):
            logger.warning("⚠️ No backups directory found.")
            return cache

        try:
            for filename in os.listdir(backup_dir):
                if filename.endswith('.json'):
                    col_name = filename.split('_')[0]
                    file_path = os.path.join(backup_dir, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            raw_data = json.load(f)
                            items = []
                            if isinstance(raw_data, list):
                                items = raw_data
                            elif isinstance(raw_data, dict):
                                # Dictionary of dicts: { "videoId": { ... }, ... }
                                items = list(raw_data.values())
                            
                            for item in items:
                                if not isinstance(item, dict): continue
                                v_id = item.get('id') or item.get('videoId')
                                cache.append({
                                    'id': v_id,
                                    'title': item.get('title', ''),
                                    'collection': col_name
                                })
                    except json.JSONDecodeError:
                        logger.warning(f"⏩ Skipping corrupted JSON file: {filename}")
            logger.info(f"✅ Loaded {len(cache)} video records from local backups.")
        except Exception as e:
            logger.error(f"Failed to load backups list: {e}")
        return cache

    def find_video_id(self, kr_title, cache):
        for item in cache:
            db_title = item['title']
            if kr_title in db_title or db_title in kr_title:
                return item['id'], item['collection']
        return None, None

    def translate_row(self, row_data, headers):
        row_dict = dict(zip(headers, row_data))
        title = row_dict.get('제목')
        if not title: return None
        
        prompt = f"""
        Translate the following Korean OTT content metadata to natural English for a premium archive site.
        Return ONLY a JSON object with the translated values.
        
        - title: {title}
        - description: {row_dict.get('설명')}
        - cast: {row_dict.get('출연진')}
        - original_work: {row_dict.get('원작')}
        - director: {row_dict.get('연출')}
        - screenplay: {row_dict.get('극본')}
        """
        
        try:
            response = self.model.generate_content(prompt)
            # Vertex AI response parsing
            json_text = response.text.replace('```json', '').replace('```', '').strip()
            return json.loads(json_text)
        except Exception as e:
            logger.warning(f"Translation Error for {title}: {e}")
            return None

    def run(self):
        # 0. 시트2 존재 확인 및 생성
        spreadsheet = self.sheets_service.spreadsheets().get(spreadsheetId=self.sheet_id).execute()
        sheet_titles = [s['properties']['title'] for s in spreadsheet['sheets']]
        if '시트2' not in sheet_titles:
            logger.info("➕ Creating 시트2 for English data...")
            self.sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=self.sheet_id,
                body={'requests': [{'addSheet': {'properties': {'title': '시트2'}}}]}
            ).execute()

        # 1. 한글 데이터 읽기 (전체 데이터 1000개 로드)
        rows = self.get_sheet_data('시트1!A1:Z1000')
        if not rows: return
        headers = rows[0]
        data_rows = rows[1:]

        # 2. Firestore 캐시 로드
        fs_cache = self.get_firestore_cache()

        new_rows = []
        success_count = 0
        for i, row in enumerate(data_rows):
            if not any(row): continue
            kr_title = row[headers.index('제목')]
            logger.info(f"[{i+1}/{len(data_rows)}] Processing: {kr_title}")
            
            vid_id, col_name = self.find_video_id(kr_title, fs_cache)
            translated = self.translate_row(row, headers)
            
            if not translated:
                logger.warning(f"⏩ Skipping {kr_title} due to translation failure.")
                continue

            new_row = []
            for h in headers:
                idx = headers.index(h)
                val = row[idx] if idx < len(row) else ''
                if h == '제목': val = translated.get('title', val)
                elif h == '설명': val = translated.get('description', val)
                elif h == '출연진': val = translated.get('cast', val)
                elif h == '원작': val = translated.get('original_work', val)
                elif h == '연출': val = translated.get('director', val)
                elif h == '극본': val = translated.get('screenplay', val)
                
                # Ensure all values are strings (Google Sheets doesn't accept lists)
                if isinstance(val, list):
                    val = ", ".join(map(str, val))
                new_row.append(val)
            
            new_row.append(vid_id or '')
            new_row.append(col_name or '')
            new_rows.append(new_row)
            success_count += 1
            
            # Quota 관리: Gemini Flash 무료 티어 (15 RPM) 준수를 위해 5초 대기
            time.sleep(5)

        # 3. 시트2에 일괄 쓰기
        if new_rows:
            en_headers = headers + ['videoId', 'Firestore_Collection']
            self.sheets_service.spreadsheets().values().clear(
                spreadsheetId=self.sheet_id, range='시트2!A1:Z1000').execute()
            self.sheets_service.spreadsheets().values().update(
                spreadsheetId=self.sheet_id, range='시트2!A1',
                valueInputOption='RAW', body={'values': [en_headers] + new_rows}).execute()
            logger.info(f"✨ Successfully translated and synced {success_count} items.")

if __name__ == "__main__":
    translator = YouflixTranslator()
    translator.run()
