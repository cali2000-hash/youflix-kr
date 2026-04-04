import firebase_admin
from firebase_admin import credentials, firestore
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
cred = credentials.Certificate(os.path.join(base_dir, 'service-account.json'))
firebase_admin.initialize_app(cred)
db = firestore.client()

categories = ['kpop', 'kdrama', 'tvlit', 'kclassic', 'kmovie', 'kvariety', 'trending']

print("🚀 타임스탬프 백필(Backfill) 시작...")
for cat in categories:
    docs = db.collection(cat).get()
    count = 0
    for d in docs:
        if 'timestamp' not in d.to_dict():
            d.reference.update({'timestamp': firestore.SERVER_TIMESTAMP})
            count += 1
    if count > 0:
        print(f"📦 [{cat}] {count}개 항목에 타임스탬프 추가 완료.")

print("🏁 모든 작업 종료.")
