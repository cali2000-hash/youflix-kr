import os
import sys
import datetime

# 프로젝트 루트 및 엔진 디렉토리 경로 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

try:
    from updater import YouflixEngine
    from config import CONFIG
except ImportError:
    from engine.updater import YouflixEngine
    from engine.config import CONFIG

def bulk_ingest_variety(target_count=500):
    """
    K-Variety 카테고리에 타겟 수량만큼 고품질 공식 영상을 수집하여 Firestore에 저장합니다.
    """
    engine = YouflixEngine()
    if not engine.db:
        print("🚨 Firestore 연결에 실패했습니다. 설정을 확인하세요.")
        return

    category = 'kvariety'
    if category not in CONFIG['categories']:
        print(f"🚨 '{category}' 카테고리 설정을 config.py에서 찾을 수 없습니다.")
        return

    setting = CONFIG['categories'][category]
    keywords = setting.get('keywords', [])
    
    if not keywords:
        print("🚨 수집할 키워드가 없습니다.")
        return

    print(f"🚀 [유플릭스 예능 대량 수집] 카테고리: {category} | 목표 수량: {target_count}")
    print(f"📡 수집 전략: 검색 기반 (최신순)")
    
    all_collected_dict = {} # 중복 방지를 위해 dict 사용 (key: videoId)
    
    for kw in keywords:
        current_len = len(all_collected_dict)
        if current_len >= target_count:
            break
            
        remaining_needed = target_count - current_len
        per_kw_limit = min(50, remaining_needed) 
        
        print(f"\n🔍 키워드 탐색 중: '{kw}' (추가 필요: {remaining_needed})")
        
        # fetch_by_search는 내부적으로 화이트리스트/블랙리스트 필터링을 수행함
        videos = engine.fetch_by_search(
            category, 
            [kw], 
            max_total=per_kw_limit
        )
        
        if videos:
            new_added = 0
            for v in videos:
                if v['id'] not in all_collected_dict:
                    all_collected_dict[v['id']] = v
                    new_added += 1
            print(f"✅ '{kw}'에서 {new_added}개의 신규 공식 예능 영상 확보 (현재 총계: {len(all_collected_dict)})")
        else:
            print(f"⚠️ '{kw}'에서 필터링을 통과한 공식 영상을 찾지 못했습니다.")
        
    final_videos = list(all_collected_dict.values())
    print(f"\n📊 [수집 결과 요약]")
    print(f"   - 최종 중복 제거 수량: {len(final_videos)} / {target_count}")
    
    # DB 저장 실행
    if final_videos:
        print(f"📦 Firestore 동기화 시작...")
        engine.save_to_db(category, final_videos)
        print(f"🏁 대량 수집 및 동기화 작업이 성공적으로 종료되었습니다.")
    else:
        print("⚠️ 수집된 영상이 없어 DB 동기화를 생략합니다.")

if __name__ == "__main__":
    target = 500
    if len(sys.argv) > 1:
        try:
            target = int(sys.argv[1])
        except ValueError:
            print(f"⚠️ 인자 '{sys.argv[1]}'가 숫자가 아닙니다. 기본값 {target}을 사용합니다.")
            
    bulk_ingest_variety(target)
