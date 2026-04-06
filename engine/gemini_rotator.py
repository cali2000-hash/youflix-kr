import logging
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 유플릭스 엔진 전용 로거
logger = logging.getLogger("youflix_engine")

# 로컬 .env 로드
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(base_dir, ".env")
load_dotenv(env_path)

KEY_POOLS = [k.strip() for k in os.getenv("GEMINI_KEYS", "").split(",") if k.strip()]
CURRENT_KEY_INDEX = 0

def get_gemini_client():
    global CURRENT_KEY_INDEX
    if not KEY_POOLS:
        key = os.getenv("GEMINI_API_KEY")
        if key:
            logger.info(f"🔑 단일 키 사용 시도 (앞 5자리): {key[:5]}...")
        return genai.Client(api_key=key)
    
    key = KEY_POOLS[CURRENT_KEY_INDEX]
    logger.info(f"🔑 {CURRENT_KEY_INDEX + 1}번 키 사용 시도 (앞 5자리): {key[:5]}...")
    return genai.Client(api_key=key)

def rotate_key():
    global CURRENT_KEY_INDEX
    if not KEY_POOLS: return False
    
    old_index = CURRENT_KEY_INDEX
    CURRENT_KEY_INDEX = (CURRENT_KEY_INDEX + 1) % len(KEY_POOLS)
    logger.info(f"🔄 API 키 교체: {old_index + 1}번 -> {CURRENT_KEY_INDEX + 1}번 키로 변경합니다.")
    return True

def call_gemini_with_retry(func, *args, **kwargs):
    max_retries = len(KEY_POOLS) if KEY_POOLS else 2
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            client = get_gemini_client()
            return func(client, *args, **kwargs)
        except Exception as e:
            last_exception = e
            err_str = str(e).upper()
            
            # 로테이션 대상 에러 코드 확인
            if any(code in err_str for code in ["429", "RESOURCE_EXHAUSTED", "400", "INVALID_ARGUMENT", "403", "PERMISSION_DENIED", "API_KEY_INVALID"]):
                logger.warning(f"⚠️ {CURRENT_KEY_INDEX + 1}번 키 오류 발생: {err_str[:100]}")
                if rotate_key():
                    continue
            
            # 로테이션 대상이 아니거나 더 이상 시도할 키가 없으면 중단
            logger.error(f"❌ Gemini 호출 실패 (최종): {err_str[:200]}")
            raise e
            
    if last_exception:
        raise last_exception
