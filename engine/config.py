"""
YOUFLIX.KR | 하이엔드 수집 엔진 설정 v4.3
TV문학관 공식 재생목록 ID 정밀 검증 및 쿼터 리셋 완료 🚀
"""

CONFIG = {
    "categories": {
        "trending": {
            "strategy": "trending",
            "regionCode": "KR",
            "maxResults": 30,
            "minViews": 5000
        },
        "kpop": {
            "strategy": "search",
            "keywords": ["SBS KPOP Official", "Mnet K-POP Stage", "KBS WORLD TV Music", "HYBE LABELS Official", "SMTOWN Music", "JYP Entertainment Official", "Stone Music Entertainment"],
            "regionCode": "KR",
            "maxResults": 100
        },
        "kdrama": {
            "strategy": "search",
            "keywords": ["K-Drama Highlight", "tvN 드라마", "SBS Drama Official"],
            "maxResults": 20
        },
        "tvlit": {
            "strategy": "playlist",
            "playlists": ["PLN47-pAnbHKRedyCrPkkthd3axgsFRLLe"], # [최종 검증] 옛날티비 : KBS Archive - TV문학관
            "maxResults": 50 # 대폭 상향 (작품 수가 많음)
        },
        "kclassic": {
            "strategy": "search",
            "keywords": ["한국고전영화 본편", "Korean Classic Movie", "KOFA"],
            "channelId": "UCvH6u_Qzn5RQdz9W198umDw", # KOFA 공식
            "maxResults": 300 # 대폭 상향 (고전영화 전수 수집용)
        },
        "kmovie": {
            "strategy": "search",
            "keywords": ["한국 영화 예고편", "K-Movie Trailer Official"],
            "maxResults": 20
        },
        "kvariety": {
            "strategy": "search",
            "keywords": ["무한도전 레전드 명장면", "런닝맨 명장면", "예능 레전드"],
            "maxResults": 30
        },
        "dramagame": {
            "strategy": "playlist",
            "playlists": ["PLN47-pAnbHKRd3AWteraUorO1RC9VYtH9"],
            "maxResults": 50 
        }
    },
    "db_project_id": "gen-lang-client-0874410222",
    "youtube_api_key": "AIzaSyD0sN7skLFkm__ZCYQoTGKfjtKnaXxbvKU" # 백업 프로젝트 키 (Fresh Quota)
}
