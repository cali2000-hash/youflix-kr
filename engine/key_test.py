from googleapiclient.discovery import build
import os

# 신심풀이 테스트 (bak 폴더의 제미나이 키가 유튜브 권한도 있는지 확인)
TEST_KEY = "AIzaSyD0sN7skLFkm__ZCYQoTGKfjtKnaXxbvKU"

def test_key():
    try:
        yt = build('youtube', 'v3', developerKey=TEST_KEY)
        res = yt.search().list(part="snippet", q="test", maxResults=1).execute()
        print("✅ SUCCESS: This key works for YouTube too!")
    except Exception as e:
        print(f"❌ FAIL: {e}")

if __name__ == "__main__":
    test_key()
