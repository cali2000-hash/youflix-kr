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
                "HYBE LABELS Official", "SMTOWN Music", "JYP Entertainment Official", "YG ENTERTAINMENT MV", 
                "Stone Music Entertainment", "1theK World", "Genie Music Official", "THEBLACKLABEL MV",
                "Mnet K-POP Stage", "KBS WORLD TV Music", "MBCkpop Full", "SBS KPOP Official",
                "M2 Official Video", "it's Live Music Video", "STUDIO CHOOM Performance", "Dingo Music Live",
                "StarshipTV Official", "United CUBE Official", "FNC Entertainment Official", "RBW_OFFICIAL MV",
                "KQ ENTERTAINMENT Official", "IST Entertainment Official", "woolliment Music", "WM Entertainment Official",
                "Dreamcatcher Official", "P NATION Official", "Jellyfish Entertainment Official", "WakeOne Official",
                "EDAM Entertainment Official", "Antenna Official Music", "TOP MEDIA Official", "Brave Entertainment Official",
                "Maroo Entertainment Official", "DSP Media Official", "Fantagio Official", "Brand New Music Official",
                "Mystic Story Official", "Around US Entertainment Official", "C9 Entertainment Official", "Yuehua Entertainment Official",
                "OUI Entertainment Official", "Rain Company Official", "Konnect Entertainment Official", "BPM Entertainment Official",
                "ABYSS Company Official", "MORE VISION Official", "AT AREA Official", "Warner Music Korea Official",
                "Sony Music Korea Official", "Universal Music Korea Official", "NHN Bugs Official", "Danal Entertainment Official",
                "Mirrorball Music Official", "Fluxus Music Official", "Interpark Music Official", "Chrome Entertainment Official",
                "Kakao Entertainment Official", "CJ ENM_KPOP", "Hello82 Performance", "GLANCE TV Official",
                "SBS KPOP ZOOM", "KBS Kpop Original", "MBCkpop Live", "ALL THE K-POP", "Arirang K-Pop",
                "ADOR Official", "BELIFT LAB Official", "Source Music Official", "Pledis Entertainment Official", "KOZ Entertainment Official",
                "SM Station MV", "Studio J Official", "Eighteen official", "The MuKorea", "1theK (원더케이)",
                "BTS Official MV", "BLACKPINK Official MV", "TWICE Official MV", "Stray Kids Official MV", "Seventeen Official MV",
                "NewJeans Official MV", "IVE Official MV", "LE SSERAFIM Official MV", "aespa Official MV", "ITZY Official MV",
                "(G)I-DLE Official MV", "Red Velvet Official MV", "NCT Official MV", "ATEEZ Official MV", "TXT Official MV",
                "ENHYPEN Official MV", "TREASURE Official MV", "BABYMONSTER Official MV", "NMIXX Official MV", "STAYC Official MV",
                "Kep1er Official MV", "ZEROBASEONE Official MV", "RIIZE Official MV", "TWS Official MV", "ILLIT Official MV"
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
            "keywords": [
                "SBS Entertainment Official", "KBS Entertain Music Show", "MBCentertainment Official", "tvN Official Variety",
                "JTBC Entertainment Official", "Mnet TV Showcase", "Channel A Entertainment", "TVCHOSUN JOY Official",
                "E채널 Official", "KBS N Official", "채널십오야 Fullmoon Official", "뜬뜬 DdeunDdeun Official",
                "문명특급 MMTG Official", "워크맨 Workman Official", "살롱드립 TEO Official", "노빠꾸탁재훈 Official",
                "짠한형 신동엽 Official", "짐종국 Gym Jong Kook Official", "비보티비 VIVO TV Official", "할명수 Official",
                "조현아의 목요일 밤 Official", "흥마늘 스튜디오 Official", "디글 Diggle Variety", "사피엔스 스튜디오 Official",
                "스튜디오 와플 Official", "테오 TEO Official", "어바웃트리 Official", "OOTB STUDIO Official",
                "런닝맨 Running Man Official", "무한도전 Infinite Challenge Official", "1박 2일 2 Days 1 Night Official",
                "나 혼자 산다 I Live Alone Official", "놀면 뭐하니 Hangout with Yoo Official", "전지적 참견 시점 Official",
                "아는 형님 Knowing Bros Official", "유 퀴즈 온 더 블럭 Official", "딩고 뮤직 Dingo Music Original",
                "it's Live Variety Official", "1theK Originals Entertainment", "스튜디오 룰루랄라 Official", "픽프 STUDIO Official",
                "M2 YouTube Original", "스튜디오 훕훕 Official", "고독한 미식가 한국 공식", "맛있는 녀석들 Official",
                "코미디빅리그 Official", "신서유기 신기한 공식", "삼시세끼 공식", "윤식당 공식", "환승연애 공식"
            ],
            "maxResults": 50
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
