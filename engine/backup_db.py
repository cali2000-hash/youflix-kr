import os
import json
import datetime
import firebase_admin
from firebase_admin import credentials, firestore

try:
    from config import CONFIG
except ImportError:
    from engine.config import CONFIG

def backup_firestore():
    """Firestore의 주요 컬렉션들을 JSON 파일로 백업합니다."""
    
    # 1. Firebase 초기화
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cred_path = os.path.join(base_dir, 'service-account.json')
    
    if not firebase_admin._apps:
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print("🚨 Firebase 자격 증명이 없습니다.")
            return
    
    db = firestore.client()
    print("✅ Firestore 연결 완료. 백업을 시작합니다.")

    # 2. 백업 디렉토리 생성
    backup_dir = os.path.join(base_dir, 'backups')
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # 3. 데이터 시리얼라이저 정의 (Datetime 처리)
    def json_serial(obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        # Firestore의 DatetimeWithNanoseconds 등 특수 객체 대응
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")
    
    # 4. 대상 컬렉션
    collections = ['kpop', 'kvariety', 'trending', 'kdrama', 'tvlit', 'kclassic', 'kmovie', 'dramagame']
    
    for collection_name in collections:
        print(f"📦 [{collection_name}] 백업 중...")
        docs = db.collection(collection_name).stream()
        data = {}
        for doc in docs:
            data[doc.id] = doc.to_dict()
        
        if data:
            file_path = os.path.join(backup_dir, f"{collection_name}_{timestamp}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, default=json_serial, ensure_ascii=False, indent=2)
            print(f"✅ [{collection_name}] {len(data)}개 문서 백업 완료: {os.path.basename(file_path)}")
        else:
            print(f"⚠️ [{collection_name}] 작업할 데이터가 없어 건너뜁니다.")

    print(f"\n🏁 모든 백업 작업이 완료되었습니다. (위치: {backup_dir})")

if __name__ == "__main__":
    backup_firestore()
