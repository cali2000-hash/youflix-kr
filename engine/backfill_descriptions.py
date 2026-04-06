import os
import json
import logging
import time
from googleapiclient.discovery import build
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

try:
    from config import CONFIG
    from gemini_rotator import call_gemini_with_retry
    from google.genai import types # (v19.18) 추가
except ImportError:
    from engine.config import CONFIG
    from engine.gemini_rotator import call_gemini_with_retry
    from google.genai import types # (v19.18) 추가

# 로컬 .env 로드
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(base_dir, ".env")
load_dotenv(env_path)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("youflix_backfill")

class YouflixAIBackfiller:
    def __init__(self):
        # 1. YouTube API 초기화 (로테이션 적용)
        self.api_keys = CONFIG.get('youtube_api_keys', [])
        self.current_key_idx = 0
        self.youtube = self._get_youtube_client()
        
        # 2. Firebase 초기화
        engine_dir = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(engine_dir, 'service-account.json')
        
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            # 중복 초기화 방지
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            logger.info("✅ 유플릭스 AI 백필러 엔진 활성화")
        else:
            logger.error("🚨 Firebase 자격 증명이 없습니다.")
            self.db = None

    def _get_youtube_client(self):
        key = self.api_keys[self.current_key_idx]
        return build('youtube', 'v3', developerKey=key)

    def rotate_youtube_key(self):
        if len(self.api_keys) > 1:
            self.current_key_idx = (self.current_key_idx + 1) % len(self.api_keys)
            self.youtube = self._get_youtube_client()
            logger.info(f"🔄 YouTube API 키 교체 ({self.current_key_idx + 1}번)")
            return True
        return False

    def generate_ai_description(self, client, title, category):
        """Gemini를 사용하여 고품질 한/영 이중 영상 설명을 생성합니다. (v19.18)"""
        cat_labels = {
            'kpop': 'K-POP Legends',
            'kdrama': 'K-Drama Masterpieces',
            'tvlit': 'TV Literature Hall (Anthology)',
            'kclassic': 'Korean Classic Cinema',
            'kmovie': 'Korean Movie Trailers',
            'kvariety': 'K-Variety Show Classics',
            'trending': 'Trending Now in Korea',
            'dramagame': 'Drama Game (Life Theatre)'
        }
        
        cat_name = cat_labels.get(category, category)
        
        # JSON 응답을 강제하기 위한 프롬프트 (v19.18)
        prompt = f"""
        Role: Premium Curator for YOUFLIX.KR official archive.
        Task: Write high-quality, professional video descriptions in both Korean and English.
        
        Video Title: {title}
        Category: {cat_name}
        
        [Instructions]
        1. Write a premium description for people who love classic culture.
        2. 'ko': Professional and warm tone in Korean (approx 400-500 chars).
        3. 'en': Elegant and informative tone in English (approx 300-400 chars).
        4. Include historical/cultural significance of the work or artists.
        5. Return ONLY a valid JSON object.
        
        [Response Format]
        {{
            "ko": "Korean description here...",
            "en": "English description here..."
        }}
        """
        
        model_name = os.getenv("GEMINI_MODEL", "models/gemini-1.5-flash") # v19.18: 1.5-flash is reliable for JSON
        
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text.strip())
        except Exception as e:
            logger.error(f"⚠️ JSON 생성 오류: {e}")
            return None

    def backfill_all_categories(self, limit_per_cat=10, overwrite=False):
        if not self.db: return
        categories = ['tvlit', 'kclassic', 'dramagame', 'kpop', 'kdrama', 'kvariety']
        
        for cat in categories:
            logger.info(f"🔍 [{cat}] 카테고리 AI 백필 분석 시작...")
            try:
                docs = self.db.collection(cat).limit(limit_per_cat * 2).stream()
                
                count = 0
                for doc in docs:
                    if count >= limit_per_cat: break
                    
                    data = doc.to_dict()
                    title = data.get('title', '')
                    
                    # (v19.18) 다국어 필드 존재 여부 확인
                    if not overwrite and data.get('description_ko') and data.get('description_en'):
                        continue

                    logger.info(f"✍️ [{cat}] 이중 언어(KR/EN) 설명 생성 중: {title[:30]}...")
                    
                    try:
                        # Gemini 호출 (로테이션 적용)
                        ai_data = call_gemini_with_retry(self.generate_ai_description, title, cat)
                        
                        if ai_data and isinstance(ai_data, dict):
                            doc.reference.update({
                                'description_ko': ai_data.get('ko', ''),
                                'description_en': ai_data.get('en', ''),
                                'description': ai_data.get('ko', ''), # 하위 호환용
                                'ai_generated': True,
                                'last_updated': firestore.SERVER_TIMESTAMP
                            })
                            count += 1
                            logger.info(f"✅ [{cat}] {count}/{limit_per_cat} 완료 (KR/EN)")
                            # API 속도 조절
                            time.sleep(5)
                            
                    except Exception as ge:
                        logger.error(f"❌ Gemini 실패: {ge}")
                        continue

                logger.info(f"📦 [{cat}] 총 {count}개 항목 AI 백필 완료.")
                
            except Exception as e:
                import traceback
                logger.error(f"❌ [{cat}] 카테고리 치명적 오류: {e}")
                logger.error(traceback.format_exc())

if __name__ == "__main__":
    backfiller = YouflixAIBackfiller()
    if backfiller.db:
        # 🚀 2단계: 대규모 아카이브 강화 (카테고리당 100개 목표)
        # 이미 설명이 있는 것은 건너뛰고 신규/부실한 것만 생성
        backfiller.backfill_all_categories(limit_per_cat=100, overwrite=False)
