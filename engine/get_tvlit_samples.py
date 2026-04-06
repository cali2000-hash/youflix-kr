import os
import firebase_admin
from firebase_admin import credentials, firestore

def get_samples():
    engine_dir = os.path.dirname(os.path.abspath(__file__))
    cred_path = os.path.join(engine_dir, 'service-account.json')
    
    if not os.path.exists(cred_path):
        print("Error: service-account.json not found")
        return

    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Get docs from 'tvlit' collection where ai_generated is true
    docs = db.collection('tvlit').where('ai_generated', '==', True).limit(3).stream()
    
    samples = []
    for doc in docs:
        data = doc.to_dict()
        samples.append({
            'title': data.get('title', 'No Title'),
            'description': data.get('description', 'No Description')
        })
    
    if not samples:
        # If no ai_generated docs found, just take any with long description
        docs = db.collection('tvlit').limit(10).stream()
        for doc in docs:
            data = doc.to_dict()
            desc = data.get('description', '')
            if desc and len(desc) > 100 and "Special curation" not in desc:
                samples.append({
                    'title': data.get('title', 'No Title'),
                    'description': data.get('description', 'No Description')
                })
                if len(samples) >= 3: break

    for i, s in enumerate(samples, 1):
        print(f"--- Sample {i} ---")
        print(f"Title: {s['title']}")
        print(f"Description:\n{s['description']}\n")

if __name__ == "__main__":
    get_samples()
