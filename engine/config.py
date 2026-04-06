"""
YOUFLIX.KR | 하이엔드 수집 엔진 설정 v4.6 💎
구글 애드센스 승인 최적화 및 광고 레이아웃 대응 완료
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
            "keywords": [
                "SBS KPOP Official", "Mnet K-POP Stage", "KBS WORLD TV Music", 
                "HYBE LABELS Official", "SMTOWN Music", "JYP Entertainment Official", 
                "Stone Music Entertainment", "1theK World", "Genie Music Official",
                "M2 Official Video", "it's Live Music Video", "CJENM_KPOP"
            ],
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
    # 유투브 API 키 로테이션 (두 개를 번갈아 사용)
    "youtube_api_keys": [
        "AIzaSyD0sN7skLFkm__ZCYQoTGKfjtKnaXxbvKU",
        "AIzaSyDArPdfLyswcFgLBW724ZTObPC4yQ9Py14"
    ],
    "db_project_id": "gen-lang-client-0874410222",
}
