import firebase_admin
from firebase_admin import credentials, firestore
import os
import re

base_dir = os.path.dirname(os.path.abspath(__file__))
cred = credentials.Certificate(os.path.join(base_dir, 'service-account.json'))
firebase_admin.initialize_app(cred)
db = firestore.client()

print("🚀 TV문학관 정렬 순서 보정 시작...")
docs = db.collection('tvlit').get()
count = 0

for d in docs:
    title = d.to_dict().get('title', '')
    # '94화' 같은 패턴 추출
    match = re.search(r'(\d+)화', title)
    if match:
        idx = int(match.group(1))
        d.reference.update({'sort_idx': idx})
        count += 1
    else:
        # 번호가 없으면 아주 큰 숫자로 뒤로 보냄
        d.reference.update({'sort_idx': 9999})

print(f"✅ {count}개 항목에 sort_idx 주입 완료.")
