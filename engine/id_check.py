import os
from googleapiclient.discovery import build
try:
    from config import CONFIG
except ImportError:
    from engine.config import CONFIG

def lookup_ids():
    youtube = build('youtube', 'v3', developerKey=CONFIG['youtube_api_key'])
    handles = ['@KBSArchive', '@KoreanFilm']
    for handle in handles:
        try:
            res = youtube.search().list(part="snippet", q=handle, type="channel").execute()
            items = res.get('items', [])
            if items:
                print(f"Handle: {handle} | ID: {items[0]['id']['channelId']} | Title: {items[0]['snippet']['title']}")
        except Exception as e:
            print(f"Error for {handle}: {e}")

if __name__ == "__main__":
    lookup_ids()
