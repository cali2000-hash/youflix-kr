import os
from google import genai
from dotenv import load_dotenv

# 로드
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(base_dir, ".env")
load_dotenv(env_path)

keys = os.getenv("GEMINI_KEYS", "").split(",")

def test_gemini():
    for i, key in enumerate(keys):
        key = key.strip()
        if not key: continue
        print(f"Testing Gemini Key {i+1}: {key[:10]}...")
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model="gemini-1.5-flash",
                contents="test"
            )
            print(f"✅ Gemini Key {i+1} is VALID and has quota. Response: {response.text[:20]}...")
        except Exception as e:
            print(f"❌ Gemini Key {i+1} FAILED: {e}")

if __name__ == "__main__":
    test_gemini()
