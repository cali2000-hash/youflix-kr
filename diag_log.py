import os
import datetime

log_path = "/Users/cali/Dropbox/01 주요작업/00 유투브/자동화/blog-automation/blog_automation.log"
try:
    stat = os.stat(log_path)
    last_mod = datetime.datetime.fromtimestamp(stat.st_mtime)
    print(f"로그 파일 크기: {stat.st_size} bytes")
    print(f"마지막 수정 시간: {last_mod}")
    
    # Try reading the last line
    with open(log_path, 'rb') as f:
        f.seek(-512, os.SEEK_END)
        last_block = f.read().decode('utf-8', errors='ignore')
        print("최근 로그 내용:")
        print(last_block.splitlines()[-5:])
except Exception as e:
    print(f"Error: {e}")
