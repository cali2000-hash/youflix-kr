
import os
import json
from googleapiclient.discovery import build
try:
    from config import CONFIG
except ImportError:
    from engine.config import CONFIG

def preview_kpop():
    youtube = build('youtube', 'v3', developerKey=CONFIG['youtube_api_key'])
    category = 'kpop'
    setting = CONFIG['categories'][category]
    
    print(f"🎬 [PREVIEW] {category} 공식 채널 필터링 테스트 시작")
    print(f"🔍 검색 키워드: {setting['keywords']}")
    
    results = []
    official_keywords = [
        'official', 'mnet', 'sbs', 'kbs', 'jyp', 'smtown', 'hybe', 'yg', 
        'stone', 'starship', 'woollim', 'tv', 'radio', 'entertainment', 
        'labels', 'music', 'artist', 'kpop', 'mbc', 'jtbc'
    ]

    for kw in setting['keywords']:
        print(f"-> 검색 중: {kw}")
        try:
            request = youtube.search().list(
                part="snippet",
                q=kw,
                type="video",
                maxResults=10,
                relevanceLanguage="ko",
                regionCode="KR"
            )
            response = request.execute()
            
            for item in response.get('items', []):
                snippet = item['snippet']
                channel_title = snippet['channelTitle']
                video_title = snippet['title']
                
                is_official = any(okw in channel_title.lower() for okw in official_keywords)
                
                status = "✅ PASS (Official)" if is_official else "🚫 SKIP (Personal/Other)"
                print(f"   [{status}] {channel_title} | {video_title[:40]}...")
                
                if is_official:
                    results.append({
                        'title': video_title,
                        'channel': channel_title
                    })
        except Exception as e:
            print(f"❌ '{kw}' 검색 실패: {e}")

    print(f"\n✨ 필터링 결과: 총 {len(results)}개 영상이 공식 컨텐츠로 분류되었습니다.")

if __name__ == "__main__":
    preview_kpop()
