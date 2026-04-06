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
except ImportError:
    from engine.config import CONFIG
    from engine.gemini_rotator import call_gemini_with_retry

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
        """Gemini를 사용하여 고품질 영상 설명을 생성합니다."""
        cat_labels = {
            'kpop': 'K-POP 전설의 무대',
            'kdrama': '명작 드라마 하이라이트',
            'tvlit': 'KBS TV 문학관 (한국 문학 아카이브)',
            'kclassic': '한국 고전 영화 컬렉션',
            'kmovie': '최신 한국 영화 예고편 및 정보',
            'kvariety': '추억의 전설적 예능 명장면',
            'trending': '현재 대한민국 인기 트렌드 영상',
            'dramagame': 'KBS 드라마게임 (인생 드라마)'
        }
        
        cat_name = cat_labels.get(category, category)
        
        prompt = f"""
당신은 대한민국 영상 아카이브 전문 큐레이터입니다. 아래 영상에 대해 시니어(5070)분들이나 고전 애호가들에게 가치 있는 **프리미엄 설명글**을 작성해 주세요.

[영상 정보]
- 제목: {title}
- 카테고리: {cat_name}

[작성 지침]
1. 단순한 설명이 아니라, 해당 작품이나 출연진의 배경, 가치, 시청 포인트 등을 전문적이고 따뜻한 어조로 작성하세요.
2. 첫 문장은 독자의 호기심을 자극하며 시작하고, 중간에 작품의 역사적/문화적 의의를 곁들여 주세요.
3. 500자 내외로 풍성하게 작성하세요. (최소 300자 이상)
4. 줄바꿈을 적절히 사용하여 가독성을 높이세요.
5. '유플릭스(YOUFLIX)'에서 제공하는 특별한 자료임을 은근히 강조해도 좋습니다.

내용만 바로 출력하세요:
"""
        model_name = os.getenv("GEMINI_MODEL", "models/gemini-2.0-flash")
        
        response = client.models.generate_content(
            model=model_name,
            contents=prompt
        )
        return response.text.strip()

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
                    existing_desc = data.get('description', '')

                    # 덮어쓰기 모드거나, 기존 설명이 너무 짧은 경우(100자 미만)만 처리
                    if not overwrite and len(existing_desc) > 150:
                        continue

                    logger.info(f"✍️ [{cat}] 설명 생성 중: {title[:30]}...")
                    
                    try:
                        # Gemini 호출 (로테이션 적용)
                        ai_desc = call_gemini_with_retry(self.generate_ai_description, title, cat)
                        
                        if ai_desc:
                            doc.reference.update({
                                'description': ai_desc,
                                'ai_generated': True,
                                'last_updated': firestore.SERVER_TIMESTAMP
                            })
                            count += 1
                            logger.info(f"✅ [{cat}] {count}/{limit_per_cat} 완료")
                            # API 속도 조절 (무료 티어는 60초당 전송량 제한이 있으므로 10초 대기 권장)
                            time.sleep(10)
                            
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
