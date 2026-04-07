import os
import sys
from googleapiclient.discovery import build

# 부모 디렉토리를 path에 추가하여 config 임포트 가능하게 함
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from engine.config import CONFIG

keys = CONFIG.get("youtube_api_keys", [])

def test_keys():
    for i, key in enumerate(keys):
        print(f"Testing Key {i+1}: {key[:10]}...")
        try:
            youtube = build('youtube', 'v3', developerKey=key)
            request = youtube.search().list(
                part="snippet",
                q="test",
                maxResults=1
            )
            request.execute()
            print(f"✅ Key {i+1} is VALID and has quota.")
        except Exception as e:
            print(f"❌ Key {i+1} FAILED: {e}")

if __name__ == "__main__":
    test_keys()
