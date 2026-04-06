import os
import firebase_admin
from firebase_admin import credentials, firestore

def check_status():
    engine_dir = os.path.dirname(os.path.abspath(__file__))
    cred_path = os.path.join(engine_dir, 'service-account.json')
    
    if not os.path.exists(cred_path):
        print("Error: service-account.json not found")
        return

    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    categories = ['trending', 'kpop', 'kdrama', 'tvlit', 'kclassic', 'kmovie', 'kvariety', 'dramagame']
    
    print(f"{'Category':<15} | {'Total':<6} | {'With Desc':<10} | {'AI Generated':<12}")
    print("-" * 55)
    
    for cat in categories:
        docs = db.collection(cat).stream()
        total = 0
        with_desc = 0
        ai_gen = 0
        
        for doc in docs:
            total += 1
            data = doc.to_dict()
            desc = data.get('description', '')
            # Check if desc is not the default placeholder and has some length
            if desc and len(desc) > 100 and "Special curation" not in desc:
                with_desc += 1
            if data.get('ai_generated') is True:
                ai_gen += 1
        
        print(f"{cat:<15} | {total:<6} | {with_desc:<10} | {ai_gen:<12}")

if __name__ == "__main__":
    check_status()
