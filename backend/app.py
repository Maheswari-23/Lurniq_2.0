from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from datetime import datetime, timezone
import pickle
import os
import re
import math
import json
import string
import random
from bson.objectid import ObjectId
from groq import Groq
from youtube_transcript_api import YouTubeTranscriptApi
import fitz  # PyMuPDF

# Initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
try:
    groq_client = Groq(api_key=GROQ_API_KEY)
except Exception as e:
    print("Failed to initialize Groq client:", e)
    groq_client = None

# ── Auth / DB dependencies ─────────────────────────────────────────
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
import bcrypt

load_dotenv()  # loads backend/.env

# Import the enhanced model
from vark_ml_model import HybridVARKPredictor, engineer_features, generate_synthetic_data

app = Flask(__name__)

# Allow requests from local dev and the deployed Render frontend
_frontend_url = os.getenv("FRONTEND_URL", "")
_allowed_origins = ["http://localhost:5173", "http://localhost:3000"]
if _frontend_url:
    _allowed_origins.append(_frontend_url)

CORS(app,
     resources={r"/api/*": {"origins": _allowed_origins}},
     supports_credentials=True)

# ── JWT configuration ──────────────────────────────────────────────
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "lurniq-default-secret")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False   # tokens don't expire (use refresh in prod)
jwt = JWTManager(app)

# ── MongoDB connection (lazy — initialised on first use) ───────────
_mongo_client = None
_db           = None

def get_db():
    """Return the lurniq database, connecting on first call."""
    global _mongo_client, _db
    if _db is None:
        uri = os.getenv("MONGO_URI")
        if not uri:
            raise RuntimeError("MONGO_URI not set in environment")
        _mongo_client = MongoClient(uri, server_api=ServerApi('1'))
        _db = _mongo_client["lurniq"]
        # Create unique index on email (safe to call repeatedly)
        _db["users"].create_index("email", unique=True)
    return _db

# ──────────────────────────────────────────────────────────────────
# AUTH ENDPOINTS
# ──────────────────────────────────────────────────────────────────

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """Register a new user.

    Body JSON:
        name       str   required
        email      str   required
        password   str   required
        age_group  str   optional
    Returns:
        { success, token, user: { id, name, email, age_group, vark_profile } }
    """
    data = request.get_json(silent=True) or {}
    name      = (data.get('name')      or '').strip()
    email     = (data.get('email')     or '').strip().lower()
    password  = (data.get('password')  or '').strip()
    age_group = (data.get('age_group') or '').strip()

    # Basic validation
    if not name or not email or not password:
        return jsonify({'success': False, 'error': 'name, email, and password are required'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400

    db = get_db()

    # Check for existing account
    if db['users'].find_one({'email': email}):
        return jsonify({'success': False, 'error': 'An account with this email already exists'}), 409

    # Hash password
    pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Build user document
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        'name':           name,
        'email':          email,
        'password_hash':  pw_hash,
        'age_group':      age_group,
        'vark_profile':   None,          # populated after questionnaire
        'session_history': [],
        'created_at':     now,
        'updated_at':     now,
    }

    result   = db['users'].insert_one(user_doc)
    user_id  = str(result.inserted_id)

    # Issue JWT
    token = create_access_token(identity=user_id)

    return jsonify({
        'success': True,
        'token':   token,
        'user': {
            'id':          user_id,
            'name':        name,
            'email':       email,
            'age_group':   age_group,
            'vark_profile': None,
        }
    }), 201


@app.route('/api/auth/signin', methods=['POST'])
def signin():
    """Authenticate an existing user.

    Body JSON:
        email     str  required
        password  str  required
    Returns:
        { success, token, user: { id, name, email, age_group, vark_profile } }
    """
    data     = request.get_json(silent=True) or {}
    email    = (data.get('email')    or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not email or not password:
        return jsonify({'success': False, 'error': 'email and password are required'}), 400

    db   = get_db()
    user = db['users'].find_one({'email': email})

    # Generic error — do not reveal whether email exists
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

    user_id = str(user['_id'])
    token   = create_access_token(identity=user_id)

    return jsonify({
        'success': True,
        'token':   token,
        'user': {
            'id':           user_id,
            'name':         user.get('name'),
            'email':        user.get('email'),
            'age_group':    user.get('age_group'),
            'vark_profile': user.get('vark_profile'),
        }
    }), 200


@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Return the current user's profile + VARK data (JWT required)."""
    from bson import ObjectId
    user_id = get_jwt_identity()

    db   = get_db()
    user = db['users'].find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    return jsonify({
        'success': True,
        'user': {
            'id':           str(user['_id']),
            'name':         user.get('name'),
            'email':        user.get('email'),
            'age_group':    user.get('age_group'),
            'vark_profile': user.get('vark_profile'),
            'created_at':   user.get('created_at'),
        }
    }), 200


@app.route('/api/user/vark', methods=['PUT'])
@jwt_required()
def update_vark():
    """Persist the user's VARK profile to MongoDB (JWT required).

    Body JSON:
        style      str   dominant style  e.g. 'Visual'
        allScores  dict  { Visual, Auditory, Reading, Kinesthetic }
    """
    from bson import ObjectId
    user_id = get_jwt_identity()
    data    = request.get_json(silent=True) or {}

    style      = data.get('style')
    all_scores = data.get('allScores')

    if not style or not all_scores:
        return jsonify({'success': False, 'error': 'style and allScores are required'}), 400

    now = datetime.now(timezone.utc).isoformat()
    vark_profile = {
        'style':        style,
        'allScores':    all_scores,
        'last_updated': now,
    }

    db = get_db()
    db['users'].update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'vark_profile': vark_profile, 'updated_at': now}}
    )

    return jsonify({
        'success':      True,
        'vark_profile': vark_profile,
    }), 200

# ── profile / password endpoints ───────────────────────────────────

@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update name and age_group for the current user."""
    from bson import ObjectId
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    age_group = data.get('age_group', '').strip()
    if not name:
        return jsonify({'success': False, 'error': 'Name is required'}), 400
    db = get_db()
    db['users'].update_one(
        {'_id': ObjectId(user_id)},
        {'$set': {'name': name, 'age_group': age_group, 'updated_at': datetime.now(timezone.utc).isoformat()}}
    )
    return jsonify({'success': True, 'name': name, 'age_group': age_group}), 200


@app.route('/api/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change password for logged-in user. Requires current_password verification."""
    from bson import ObjectId
    import bcrypt
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    current_pw = data.get('current_password', '')
    new_pw = data.get('new_password', '')
    if not current_pw or not new_pw:
        return jsonify({'success': False, 'error': 'current_password and new_password are required'}), 400
    if len(new_pw) < 6:
        return jsonify({'success': False, 'error': 'New password must be at least 6 characters'}), 400
    db = get_db()
    user = db['users'].find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    if not bcrypt.checkpw(current_pw.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'success': False, 'error': 'Current password is incorrect'}), 401
    hashed = bcrypt.hashpw(new_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db['users'].update_one({'_id': ObjectId(user_id)}, {'$set': {'password_hash': hashed}})
    return jsonify({'success': True, 'message': 'Password changed successfully'}), 200


@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """Reset password by email — no email service, direct reset."""
    import bcrypt
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    new_pw = data.get('new_password', '')
    if not email or not new_pw:
        return jsonify({'success': False, 'error': 'email and new_password are required'}), 400
    if len(new_pw) < 6:
        return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
    db = get_db()
    user = db['users'].find_one({'email': email})
    if not user:
        return jsonify({'success': False, 'error': 'No account found with this email address'}), 404
    hashed = bcrypt.hashpw(new_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db['users'].update_one({'email': email}, {'$set': {'password_hash': hashed}})
    return jsonify({'success': True, 'message': 'Password reset successfully'}), 200



@app.route('/api/chatbot', methods=['POST'])
@jwt_required()
def chatbot():
    """AI Tutor chatbot — answers any CS/programming question with VARK-tailored explanation."""
    data = request.get_json(silent=True) or {}
    question = data.get('question', '').strip().lower()
    vark_style = data.get('vark_style', 'Visual')
    persona = data.get('persona', 'Default').strip()

    if groq_client:
        try:
            persona_prompt = "Explain in a standard educational format." if persona == 'Default' else f"Explain using {persona} analogies and terms."
            system_prompt = f"You are a helpful AI Computer Science tutor. The student is a '{vark_style}' learner. {persona_prompt} Keep your answer concise (under 150 words) and directly address the user's question without any markdown formatting."
            
            # Check for YouTube URL
            yt_match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', question)
            if yt_match:
                video_id = yt_match.group(1)
                try:
                    transcript = YouTubeTranscriptApi.get_transcript(video_id)
                    text = " ".join([t['text'] for t in transcript])
                    # truncate if too long (keep first ~3000 chars)
                    text_chunk = text[:3000]
                    question = f"Please summarize the following educational video transcript in 2 sentences. Transcript limit: {text_chunk}"
                except Exception as e:
                    print(f"Transcript error: {e}")
                    return jsonify({'answer': f"I detected a YouTube link, but couldn't fetch the transcript: {str(e)}", 'vark_style': vark_style, 'persona': persona}), 200

            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
            )
            answer = chat_completion.choices[0].message.content
            return jsonify({'answer': answer, 'vark_style': vark_style, 'persona': persona}), 200
        except Exception as e:
            print("Groq generated chatbot error:", e)

    # Curated VARK-tailored answer bank
    ANSWERS = {
        'closure': {
            'Visual':      'A closure is a function + its surrounding environment. Imagine a backpack 🎒: the inner function carries variables from the outer scope with it, even after the outer function finishes.',
            'Auditory':    'Think of closures as a "remember me" feature. When you call an outer function, it creates a private scope. The inner function says "I remember everything from when I was born!"',
            'Reading':     'A closure is formed when a nested function references variables from its enclosing scope. The inner function retains a reference to those variables even after the enclosing function has returned. This enables data encapsulation and factory functions.',
            'Kinesthetic': 'Try this: def counter():\n    count = 0\n    def inc(): nonlocal count; count += 1; return count\n    return inc\nc = counter(); print(c(), c(), c())  # 1 2 3\nThe inner function "closes over" count!',
        },
        'recursion': {
            'Visual':      'Recursion = a function calling itself in smaller steps.\nfact(4) → 4 × fact(3) → 4 × 3 × fact(2) → ... → 24\nBase case stops the chain. Visualise it as a shrinking Russian doll 🪆.',
            'Auditory':    'Recursion is like directions that say "go one step north, then follow the same directions from there." It keeps giving the same instruction until you hit a dead end (base case).',
            'Reading':     'Recursion: a function f calls itself with a strictly smaller input. Base case: terminates the chain. Recursive case: reduces the problem. Time complexity is often O(branches^depth).',
            'Kinesthetic': 'Write: def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\nprint([fib(i) for i in range(8)])\nTrace the call tree by hand to understand the execution.',
        },
        'sorting': {
            'Visual':      'Sorting algorithms compared:\nBubble  → O(n²) — swaps neighbours\nMerge   → O(n log n) — split, sort, merge\nQuick   → O(n log n) avg — pivot partitioning\nPython uses TimSort (hybrid merge+insertion).',
            'Auditory':    'Bubble sort: repeatedly compare adjacent items and swap if out of order — like bubbles rising to the top. Merge sort: "divide and conquer — split the list, sort each half, merge back together."',
            'Reading':     'Sorting algorithms: Bubble O(n²) in-place stable. Insertion O(n²) best O(n). Merge O(n log n) stable not in-place. Quick O(n log n) avg O(n²) worst in-place. Python`s sort uses TimSort — O(n log n) worst, O(n) best.',
            'Kinesthetic': 'Run this: lst = [5,3,8,1,9,2]\nlst.sort()  # in-place TimSort\nprint(lst)   # [1,2,3,5,8,9]\nAlso try: sorted(lst, reverse=True)',
        },
        'hashing': {
            'Visual':      'Hash map = array of buckets. A hash function converts your key to an index:\nkey → hash(key) % array_size → bucket index\nLike filing cabinets 🗄️ — the label tells you which drawer to open in O(1).',
            'Auditory':    'Hashing is a secret formula that converts any key into a number (the bucket index). Same key always gives the same index. Collisions happen when two keys hash to the same bucket.',
            'Reading':     'A hash function maps keys to indices in O(1) average. Collision resolution: chaining (linked list per bucket) or open addressing (linear/quadratic probing). Load factor = items / buckets; rehash when > 0.75.',
            'Kinesthetic': 'd = {}\nd["name"] = "Alice"\nd["age"] = 25\nprint(d["name"])  # O(1) lookup\nprint(hash("name"))  # see the actual hash value',
        },
        'big-o': {
            'Visual':      'Big-O growth rates (slowest to fastest growing):\nO(1) — constant    e.g. dict lookup\nO(log n) — binary search\nO(n) — single loop\nO(n log n) — merge sort\nO(n²) — nested loops\nO(2ⁿ) — recursive fibonacci',
            'Auditory':    'Big-O tells you "how does the runtime change as input doubles?" O(1): stays the same. O(n): doubles. O(n²): quadruples. O(log n): increases by just 1 step. Aim for as flat as possible.',
            'Reading':     'Big-O notation describes worst-case asymptotic growth. Definition: f(n) is O(g(n)) if ∃ c,n₀ such that f(n) ≤ c·g(n) for all n > n₀. Drop constants and lower terms. Common classes: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ).',
            'Kinesthetic': 'Count operations:\nfor i in range(n):         # O(n)\n    for j in range(n):     # O(n²) total\n        pass\nbinary_search([...], x)    # O(log n)',
        },
        'oop': {
            'Visual':      'OOP pillars visualised:\nClass = blueprint   Object = built instance\n┌─ Encapsulation: data + methods bundled\n├─ Inheritance:   Dog(Animal) → reuse\n├─ Polymorphism:  dog.speak() vs cat.speak()\n└─ Abstraction:   hide internals',
            'Auditory':    'OOP is about objects that know things (attributes) and can do things (methods). Inheritance is "is-a" (Dog is-an Animal). Encapsulation is bundling state with the behaviour that changes it.',
            'Reading':     'OOP: model software as classes (blueprints) and objects (instances). Four pillars: Encapsulation (bundle data + methods), Inheritance (subclass reuses parent), Polymorphism (same interface, different behaviour), Abstraction (expose interface, hide implementation).',
            'Kinesthetic': 'class Animal:\n    def __init__(self, name):\n        self.name = name\n    def speak(self): pass\n\nclass Dog(Animal):\n    def speak(self): return f"{self.name} says Woof!"\n\nprint(Dog("Rex").speak())',
        },
    }

    # Match question to answer key
    answer = None
    for key, responses in ANSWERS.items():
        if key in question:
            answer = responses.get(vark_style, responses.get('Reading', ''))
            break

    if not answer:
        style_tip = {'Visual': 'diagrams and visual examples', 'Auditory': 'spoken analogies', 'Reading': 'detailed definitions', 'Kinesthetic': 'hands-on code exercises'}
        answer = (
            f"Great question! As a {vark_style} learner, you'll benefit most from {style_tip.get(vark_style, 'practice')}. "
            f"For \"{data.get('question', 'this topic')}\", I recommend: searching MDN, Python docs, or GeeksForGeeks "
            f"and looking for {style_tip.get(vark_style, 'examples')} on the topic."
        )

    return jsonify({'answer': answer, 'vark_style': vark_style}), 200


@app.route('/api/upload_to_chat', methods=['POST'])
@jwt_required()
def upload_to_chat():
    """Handle PDF uploads, extract text, save to DB, and return a chatbot summary."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Read PDF using PyMuPDF (fitz)
        pdf_bytes = file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        
        # Limit text size to ~10,000 characters for Groq context window safety
        text_chunk = text[:10000]

        # Save to database
        db = get_db()
        doc_res = db.documents.insert_one({"filename": file.filename, "text": text_chunk, "created_at": datetime.now(timezone.utc)})
        doc_id = str(doc_res.inserted_id)

        vark_style = request.form.get('vark_style', 'Visual')
        persona = request.form.get('persona', 'Default')

        if groq_client:
            persona_prompt = "Explain in a standard educational format." if persona == 'Default' else f"Explain using {persona} analogies and terms."
            system_prompt = f"You are a helpful AI Computer Science tutor. The student is a '{vark_style}' learner. {persona_prompt} Read the following document text and concisely summarize its main educational concept in under 150 words without any markdown formatting. Document text: {text_chunk[:3000]}"
            
            chat_completion = groq_client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
            )
            answer = f"I've read '{file.filename}'. {chat_completion.choices[0].message.content}"
        else:
            answer = f"I've successfully processed the document '{file.filename}'. Click the + button to generate a full module from it!"

        return jsonify({'answer': answer, 'topic_id': f"doc:{doc_id}", 'vark_style': vark_style, 'persona': persona}), 200

    except Exception as e:
        print(f"Error processing upload: {e}")
        return jsonify({'error': str(e)}), 500


# ── end auth endpoints ─────────────────────────────────────────────

predictor = None
MODEL_PATH = 'vark_model.pkl'

def initialize_model():
    """Load or train the VARK ML model.

    This is best-effort: if TensorFlow or the pickle file is unavailable
    the server still starts and serves auth / Phase-2 endpoints.
    """
    global predictor
    try:
        if os.path.exists(MODEL_PATH):
            print("Loading existing model...")
            with open(MODEL_PATH, 'rb') as f:
                predictor = pickle.load(f)
            print("Model loaded successfully!")
        else:
            print("Training new model...")
            df = generate_synthetic_data(n_samples=5000)
            df_featured = engineer_features(df)

            feature_cols = [col for col in df_featured.columns if col != 'label']
            X = df_featured[feature_cols]
            y = df_featured['label']

            predictor = HybridVARKPredictor()
            predictor.fit(X, y, epochs=100, batch_size=32, validation_split=0.2)

            with open(MODEL_PATH, 'wb') as f:
                pickle.dump(predictor, f)
            print("Model trained and saved!")
    except Exception as exc:
        print(f"[WARN] Could not load ML model ({exc}). "
              "VARK-prediction endpoints will return 503 until model is available.")
        predictor = None

initialize_model()


@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if API is running"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'model_loaded': predictor is not None
    })

@app.route('/api/predict', methods=['POST'])
def predict_learning_style():
    """Predict learning style based on comprehensive engagement data."""
    try:
        data = request.get_json()

        if not data or 'engagement' not in data or 'questionnaire' not in data:
            return jsonify({
                'error': 'Missing required data. Need engagement and questionnaire fields.'
            }), 400

        engagement    = data['engagement']
        questionnaire = data['questionnaire']

        if len(questionnaire) != 10:
            return jsonify({'error': 'Questionnaire must have exactly 10 answers'}), 400

        # ── Graceful ML-unavailable fallback ───────────────────────────────────
        # When TensorFlow / the saved model is missing, derive VARK style directly
        # from the questionnaire answers so the front-end never receives a 500.
        if predictor is None:
            style_map = {0: 'Visual', 1: 'Auditory', 2: 'Reading', 3: 'Kinesthetic'}
            counts    = {s: 0 for s in style_map.values()}
            for ans in questionnaire:
                s = style_map.get(int(ans))
                if s:
                    counts[s] += 1

            total = len(questionnaire) or 1
            all_scores = {s: round(c / total, 4) for s, c in counts.items()}
            predicted  = max(all_scores, key=all_scores.get)

            visual    = engagement.get('visual',     {})
            auditory  = engagement.get('auditory',   {})
            reading   = engagement.get('reading',    {})
            kines     = engagement.get('kinesthetic',{})

            eng_scores = {
                'Visual':      visual.get('clicks', 0)    + visual.get('timeSpent', 0)    / 10,
                'Auditory':    auditory.get('clicks', 0)  + auditory.get('timeSpent', 0)  / 10,
                'Reading':     reading.get('clicks', 0)   + reading.get('timeSpent', 0)   / 10,
                'Kinesthetic': kines.get('clicks', 0)     + kines.get('timeSpent', 0)     / 10,
            }
            eng_total = sum(eng_scores.values()) or 1
            for s in eng_scores:
                all_scores[s] = round(0.6 * all_scores[s] + 0.4 * eng_scores[s] / eng_total, 4)
            predicted = max(all_scores, key=all_scores.get)

            return jsonify({
                'success':         True,
                'predicted_style': predicted,
                'confidence':      all_scores[predicted],
                'all_scores':      all_scores,
                'timestamp':       datetime.now().isoformat(),
                'description':     get_style_description(predicted),
                'insights':        [],
                'recommendations': [],
                'note':            'ML model unavailable — scores derived from questionnaire + engagement data.',
            }), 200
        # ── Full ML prediction path ────────────────────────────────────────────

        visual      = engagement['visual']
        auditory    = engagement['auditory']
        reading     = engagement['reading']
        kinesthetic = engagement['kinesthetic']

        user_data = {
            'visual_clicks': visual['clicks'],
            'visual_time': visual['timeSpent'],
            'video_plays': visual.get('videoPlays', 0),
            'video_pauses': visual.get('videoPauses', 0),
            'video_completion': visual.get('videoCompletionPercent', 0),
            'visual_hover': visual.get('hoverTime', 0),
            'visual_revisits': visual.get('revisits', 0),
            'auditory_clicks': auditory['clicks'],
            'auditory_time': auditory['timeSpent'],
            'audio_plays': auditory.get('audioPlays', 0),
            'audio_pauses': auditory.get('audioPauses', 0),
            'audio_completion': auditory.get('audioCompletionPercent', 0),
            'audio_seeks': auditory.get('seekEvents', 0),
            'auditory_hover': auditory.get('hoverTime', 0),
            'auditory_revisits': auditory.get('revisits', 0),
            'reading_clicks': reading['clicks'],
            'reading_time': reading['timeSpent'],
            'scroll_depth': reading.get('scrollDepth', 0),
            'max_scroll': reading.get('maxScrollDepth', 0),
            'text_selections': reading.get('textSelections', 0),
            'reading_hover': reading.get('hoverTime', 0),
            'reading_revisits': reading.get('revisits', 0),
            'kinesthetic_clicks': kinesthetic['clicks'],
            'kinesthetic_time': kinesthetic['timeSpent'],
            'drag_attempts': kinesthetic.get('dragAttempts', 0),
            'incorrect_drops': kinesthetic.get('incorrectDrops', 0),
            'correct_drops': kinesthetic.get('correctDrops', 0),
            'completion_time': kinesthetic.get('taskCompletionTime', 0),
            'first_success': 1 if kinesthetic.get('firstAttemptSuccess', False) else 0,
            'reset_clicks': kinesthetic.get('resetClicks', 0),
            'kinesthetic_hover': kinesthetic.get('hoverTime', 0),
            'kinesthetic_revisits': kinesthetic.get('revisits', 0),
        }

        for i, answer in enumerate(questionnaire):
            user_data[f'q{i+1}'] = answer

        df         = pd.DataFrame([user_data])
        df_featured = engineer_features(df)
        X          = df_featured[predictor.feature_columns]

        prediction    = predictor.predict(X)[0]
        probabilities = predictor.predict_proba(X)[0]

        confidence_scores = {
            'Visual':      float(probabilities[predictor.label_encoder.transform(['Visual'])[0]]),
            'Auditory':    float(probabilities[predictor.label_encoder.transform(['Auditory'])[0]]),
            'Reading':     float(probabilities[predictor.label_encoder.transform(['Reading'])[0]]),
            'Kinesthetic': float(probabilities[predictor.label_encoder.transform(['Kinesthetic'])[0]]),
        }
        max_confidence = max(confidence_scores.values())
        insights       = generate_insights(engagement, questionnaire, prediction)

        return jsonify({
            'success':         True,
            'predicted_style': prediction,
            'confidence':      max_confidence,
            'all_scores':      confidence_scores,
            'timestamp':       datetime.now().isoformat(),
            'description':     get_style_description(prediction),
            'insights':        insights,
            'recommendations': get_recommendations(prediction, engagement),
        }), 200

    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500


def generate_insights(engagement, questionnaire, predicted_style):
    """Generate personalized insights based on engagement patterns"""
    insights = []
    
    # Analyze engagement time distribution
    total_time = (engagement['visual']['timeSpent'] + 
                  engagement['auditory']['timeSpent'] + 
                  engagement['reading']['timeSpent'] + 
                  engagement['kinesthetic']['timeSpent'])
    
    if total_time > 0:
        visual_pct = (engagement['visual']['timeSpent'] / total_time) * 100
        auditory_pct = (engagement['auditory']['timeSpent'] / total_time) * 100
        reading_pct = (engagement['reading']['timeSpent'] / total_time) * 100
        kinesthetic_pct = (engagement['kinesthetic']['timeSpent'] / total_time) * 100
        
        max_time_style = max([
            ('Visual', visual_pct),
            ('Auditory', auditory_pct),
            ('Reading', reading_pct),
            ('Kinesthetic', kinesthetic_pct)
        ], key=lambda x: x[1])
        
        insights.append(f"You spent {max_time_style[1]:.1f}% of your time on {max_time_style[0]} content")
    
    # Video engagement
    if engagement['visual']['videoPlays'] > 3:
        insights.append(f"You played the video {engagement['visual']['videoPlays']} times, showing strong visual learning interest")
    
    if engagement['visual']['videoCompletionPercent'] > 80:
        insights.append("You watched most of the video content, indicating high visual engagement")
    
    # Audio engagement
    if engagement['auditory']['seekEvents'] > 2:
        insights.append("You frequently rewound the audio, suggesting you process information thoroughly through listening")
    
    if engagement['auditory']['audioCompletionPercent'] > 80:
        insights.append("You listened to most of the audio content, showing strong auditory preferences")
    
    # Reading engagement
    if engagement['reading']['maxScrollDepth'] > 80:
        insights.append("You thoroughly read the text content, scrolling through most of it")
    
    if engagement['reading']['textSelections'] > 3:
        insights.append(f"You highlighted text {engagement['reading']['textSelections']} times, showing active reading habits")
    
    # Kinesthetic engagement
    if engagement['kinesthetic']['dragAttempts'] > 5:
        insights.append("You actively engaged with the interactive activity, showing hands-on learning preference")
    
    if engagement['kinesthetic'].get('firstAttemptSuccess'):
        insights.append("You solved the interactive puzzle on your first try, demonstrating strong kinesthetic intuition")
    
    # Questionnaire consistency
    q_counts = [questionnaire.count(i) for i in range(4)]
    max_q = max(q_counts)
    if max_q >= 7:
        insights.append(f"Your questionnaire responses were highly consistent ({max_q}/10), reinforcing your {predicted_style} preference")
    
    return insights

def get_recommendations(style, engagement):
    """Generate personalized learning recommendations"""
    recommendations = {
        'Visual': [
            "Use mind maps and diagrams to organize information",
            "Watch educational videos and documentaries",
            "Color-code your notes and use highlighters",
            "Create flowcharts and infographics for complex topics",
            "Use visual aids like charts, graphs, and images when studying"
        ],
        'Auditory': [
            "Record lectures and listen to them while commuting",
            "Join study groups and discuss concepts out loud",
            "Use audiobooks and podcasts for learning",
            "Explain concepts to others or teach what you've learned",
            "Create mnemonic devices and verbal associations"
        ],
        'Reading': [
            "Take detailed written notes during lessons",
            "Read textbooks and articles thoroughly",
            "Create written summaries and outlines",
            "Make lists and write down key points",
            "Use flashcards with written definitions"
        ],
        'Kinesthetic': [
            "Take breaks to move around while studying",
            "Use hands-on experiments and simulations",
            "Create physical models or use manipulatives",
            "Act out scenarios or use role-playing",
            "Study while walking or doing light physical activity"
        ]
    }
    
    return recommendations.get(style, [])

def get_style_description(style):
    """Get detailed description for each learning style"""
    descriptions = {
        "Visual": "You learn best through visual aids such as diagrams, charts, videos, and spatial understanding. Visual learners often prefer to see information presented graphically and may think in pictures. To optimize your learning, use color-coding, mind maps, and visual cues when studying.",
        
        "Auditory": "You learn best through listening and verbal communication. Auditory learners benefit from discussions, lectures, and talking through concepts. To enhance your learning, consider reading aloud, participating in group discussions, and using voice recordings for review.",
        
        "Reading": "You learn best through written words and text-based input. Reading/writing learners excel when information is displayed as text and benefit from making lists, reading textbooks, and taking detailed notes. To maximize your learning, focus on text-based resources and writing summaries of information.",
        
        "Kinesthetic": "You learn best through physical activities and hands-on experiences. Kinesthetic learners need to touch, move, and do in order to understand concepts fully. To improve your learning, incorporate movement into study sessions, use hands-on experiments, and take frequent breaks for physical activity."
    }
    return descriptions.get(style, "")

@app.route('/api/save-engagement', methods=['POST'])
def save_engagement():
    """
    Save engagement data for analytics (optional)
    """
    try:
        data = request.get_json()
        # In production, you would save this to a database
        # For now, just log it
        print(f"Engagement data received at {datetime.now()}")
        print(f"Session data: {data.get('metadata', {})}")
        
        return jsonify({
            'success': True,
            'message': 'Engagement data received',
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

# =============================================================================
# PHASE 2: AIMC-BANDIT — Micro-Capsule Generation & Adaptive Sequencing
# =============================================================================

# --------------- Template Bank -----------------------------------------------
# Structured micro-capsule templates keyed by (topic, modality).
# Each section must not exceed 80 words (paper word_limit requirement).
# Future: replace with LLM call (OpenAI / local model) using Algorithm 1 prompt.

CAPSULE_TEMPLATES = {
    ("variables", "Visual"): {
        "learning_objective": "Understand variables as labeled containers that store data values.",
        "analogy": "Think of a variable like a sticky note — it has a name and holds a value.",
        "diagram": [
            "  ┌──────────────────────┐",
            "  │  name = \"Alice\"      │  ← String variable",
            "  └──────────────────────┘",
            "  ┌──────────────────────┐",
            "  │  age  =  25          │  ← Integer variable",
            "  └──────────────────────┘",
            "  ┌──────────────────────┐",
            "  │  score = 9.8         │  ← Float variable",
            "  └──────────────────────┘",
        ],
        "color_code": [
            {"label": "name",  "color": "#7B61FF", "value": "\"Alice\"",  "type": "str"},
            {"label": "age",   "color": "#F97AFE", "value": "25",        "type": "int"},
            {"label": "score", "color": "#10B981", "value": "9.8",       "type": "float"},
        ],
        "steps": [
            "1. Choose a descriptive name (e.g., age, not x).",
            "2. Use = to assign a value: age = 25",
            "3. The type is inferred automatically in Python.",
            "4. You can re-assign any time: age = 26",
        ],
        "required_labels": ["variable", "assign", "value", "type"],
    },
    ("variables", "Auditory"): {
        "learning_objective": "Understand variables through conversational explanation and spoken analogy.",
        "analogy": "Imagine someone saying: 'Hey, write this down — my name is Alice, I'm 25.' That's a variable. A label with a value attached.",
        "narrative": [
            "So here's the thing about variables — they're just nicknames for data.",
            "When you write name = 'Alice', you're telling Python: whenever I say name, I mean Alice.",
            "It's like saying 'let's call this box the score box' — and you can always open the box and change what's inside.",
            "The rhythm to remember: NAME equals VALUE. Three words. Always in that order.",
        ],
        "mnemonic": "N-A-V: Name → Assign (=) → Value. Say it out loud three times.",
        "analogy_spoken": "If a variable were a song, it would go: label, hold, change, repeat.",
        "required_labels": ["variable", "assign", "value"],
    },
    ("variables", "Reading"): {
        "learning_objective": "Understand variables through structured written definitions and examples.",
        "definition": "A variable is a named memory location that stores a value. In Python, variables are dynamically typed — the type is inferred from the assigned value.",
        "syntax": "variable_name = value",
        "notes": [
            "• Variable names must start with a letter or underscore.",
            "• Names are case-sensitive: Age ≠ age.",
            "• Use snake_case by convention: user_name, total_score.",
            "• Python is dynamically typed: x = 5 then x = 'hello' is valid.",
        ],
        "examples": [
            {"code": "name = 'Alice'",      "explanation": "Stores a string value."},
            {"code": "age = 25",            "explanation": "Stores an integer value."},
            {"code": "score = 9.8",         "explanation": "Stores a float value."},
            {"code": "is_active = True",    "explanation": "Stores a boolean value."},
        ],
        "key_terms": [
            {"term": "Variable",    "definition": "Named reference to a memory location."},
            {"term": "Assignment",  "definition": "Binding a name to a value using =."},
            {"term": "Data Type",   "definition": "Category of data: int, float, str, bool."},
            {"term": "Identifier",  "definition": "The name used to refer to a variable."},
        ],
        "required_labels": ["variable", "assignment", "data type", "identifier"],
    },
    ("variables", "Kinesthetic"): {
        "learning_objective": "Understand variables by writing and modifying them directly.",
        "analogy": "A variable is a box you can label and put anything in — then replace the contents anytime.",
        "challenge": {
            "instruction": "Try it! Fix the code below so it prints: Hello, Alice! You are 25 years old.",
            "starter": "name = \"??\"\nage = ??\nprint(f\"Hello, {name}! You are {age} years old.\")",
            "solution": "name = \"Alice\"\nage = 25\nprint(f\"Hello, {name}! You are {age} years old.\")",
            "hints": [
                "Replace ?? in the string with the actual name inside quotes.",
                "Replace ?? in the number with 25 — no quotes needed for integers.",
            ],
        },
        "required_labels": ["variable", "assign", "print", "f-string"],
    },

    # ---- LOOPS ----------------------------------------------------------------
    ("loops", "Visual"): {
        "learning_objective": "Understand loops as a repeated execution flow visualized as a cycle.",
        "analogy": "A loop is like a hamster wheel — it keeps spinning until a condition says stop.",
        "diagram": [
            "  START",
            "    │",
            "    ▼",
            "  ┌────────────────────┐",
            "  │  Condition True?   │◄──────────┐",
            "  └────────────────────┘           │",
            "    │ Yes          │ No            │",
            "    ▼             ▼               │",
            "  Execute       EXIT            (repeat)",
            "  body  ──────────────────────────┘",
        ],
        "color_code": [
            {"label": "for",    "color": "#7B61FF", "value": "for i in range(5):",    "type": "keyword"},
            {"label": "body",   "color": "#F97AFE", "value": "    print(i)",          "type": "statement"},
            {"label": "range",  "color": "#10B981", "value": "range(start, stop)",    "type": "function"},
        ],
        "steps": [
            "1. Write the for keyword.",
            "2. Name the loop variable (i, n, item…).",
            "3. Specify the iterable: range(5) → 0..4.",
            "4. Indent the body — it runs each iteration.",
        ],
        "required_labels": ["loop", "iteration", "range", "condition"],
    },
    ("loops", "Auditory"): {
        "learning_objective": "Understand loops through narrative explanation and spoken rhythm.",
        "analogy": "Imagine a teacher saying: 'Do this 5 times. Go.' That's a for loop in plain English.",
        "narrative": [
            "A loop is your program's way of saying: do this again, and again, and again — without you typing it again.",
            "The for loop has a beat: for — variable — in — sequence — colon. Then indent and do the thing.",
            "Think of range(5) as a playlist of 5 songs: 0, 1, 2, 3, 4. The loop plays each one.",
            "When the playlist ends, the loop ends. Simple, rhythmic, automatic.",
        ],
        "mnemonic": "FOR — EACH — ITEM — DO: say it like a chant to remember the for-loop structure.",
        "analogy_spoken": "If a loop had a voice, it would say: 'still going... still going... done!'",
        "required_labels": ["loop", "for", "iteration", "range"],
    },
    ("loops", "Reading"): {
        "learning_objective": "Understand loops through structured written notes and syntax reference.",
        "definition": "A loop is a control structure that repeats a block of code. Python has two loop types: for (iterate over a sequence) and while (repeat while a condition is True).",
        "syntax": "for variable in iterable:\n    # body (indented)",
        "notes": [
            "• range(n) generates integers from 0 to n-1.",
            "• range(start, stop, step) for custom sequences.",
            "• Use break to exit a loop early.",
            "• Use continue to skip the current iteration.",
            "• Avoid infinite loops: ensure the condition eventually becomes False.",
        ],
        "examples": [
            {"code": "for i in range(3):\n    print(i)",              "explanation": "Prints 0, 1, 2."},
            {"code": "for char in 'abc':\n    print(char)",          "explanation": "Iterates over a string."},
            {"code": "while x > 0:\n    x -= 1",                     "explanation": "Decrements until 0."},
        ],
        "key_terms": [
            {"term": "Iteration",   "definition": "One execution of the loop body."},
            {"term": "Iterable",    "definition": "Any object that can be looped over."},
            {"term": "range()",     "definition": "Built-in that generates a number sequence."},
            {"term": "break",       "definition": "Immediately exits the loop."},
        ],
        "required_labels": ["loop", "iteration", "range", "break", "continue"],
    },
    ("loops", "Kinesthetic"): {
        "learning_objective": "Understand loops by writing and debugging loop code hands-on.",
        "analogy": "A loop is a task you repeat — like printing your name 5 times without hitting copy-paste.",
        "challenge": {
            "instruction": "Fix the code so it prints the numbers 1, 2, 3, 4, 5 (one per line).",
            "starter": "for i in range(??, ??):\n    print(i)",
            "solution": "for i in range(1, 6):\n    print(i)",
            "hints": [
                "range(start, stop) — stop is exclusive, so to include 5, use 6.",
                "The first argument is the starting number (1, not 0).",
            ],
        },
        "required_labels": ["loop", "range", "print", "iteration"],
    },
}

# Fallback template for any unsupported topic/modality combo
DEFAULT_TEMPLATE = {
    "learning_objective": "Understand this programming concept through personalized content.",
    "notes": ["Content is being prepared for this topic and modality combination."],
    "required_labels": ["concept", "programming"],
}

# In-memory store for LinUCB context vectors and interaction logs
# Structure: { session_id: { context_vector: [...], interactions: [...] } }
# In production: replace with a database (MongoDB / PostgreSQL)
LEARNER_SESSIONS = {}


# --------------- Two-Stage Verification System --------------------------------

def stage1_verify(capsule_data, word_limit=80):
    """
    Stage 1: Structural Verification
    Checks:
      - Required labels are present in content text
      - Word count per section does not exceed word_limit
      - Banned phrases are absent
    Returns: (passed: bool, issues: list[str])
    """
    BANNED_PHRASES = ["as mentioned earlier", "it is important to note"]
    issues = []

    # Flatten all text from the template for inspection
    flat_text = _flatten_template_text(capsule_data)

    # Check banned phrases
    for phrase in BANNED_PHRASES:
        if phrase.lower() in flat_text.lower():
            issues.append(f"Banned phrase detected: '{phrase}'")

    # Check word count in narrative/notes fields
    word_counts = _get_section_word_counts(capsule_data)
    for section, count in word_counts.items():
        if count > word_limit:
            issues.append(f"Section '{section}' exceeds {word_limit} words ({count} words)")

    # Check required labels exist
    required = capsule_data.get("required_labels", [])
    for label in required:
        if label.lower() not in flat_text.lower():
            issues.append(f"Required label missing from content: '{label}'")

    return len(issues) == 0, issues


def stage2_verify(capsule_data, topic, modality):
    """
    Stage 2: Quality / Confidence Scoring
    Mock implementation of DistilBERT confidence scoring.
    Uses keyword density as a proxy for semantic relevance.
    Flags capsules with score < 0.7 for future ML review.
    Returns: (confidence_score: float, needs_ml_review: bool)
    """
    TOPIC_KEYWORDS = {
        "variables": ["variable", "assign", "value", "name", "type", "store", "data", "int", "str", "float"],
        "loops":     ["loop", "for", "while", "range", "iteration", "repeat", "iterate", "break", "continue"],
    }
    MODALITY_KEYWORDS = {
        "Visual":      ["diagram", "chart", "visual", "color", "flow", "step"],
        "Auditory":    ["listen", "spoken", "narrative", "rhythm", "mnemonic", "voice"],
        "Reading":     ["definition", "notes", "term", "example", "syntax", "key"],
        "Kinesthetic": ["try", "challenge", "hint", "fix", "code", "starter", "solution"],
    }

    flat_text = _flatten_template_text(capsule_data).lower()
    words = flat_text.split()
    n = max(len(words), 1)

    topic_hits = sum(1 for kw in TOPIC_KEYWORDS.get(topic, []) if kw in flat_text)
    modality_hits = sum(1 for kw in MODALITY_KEYWORDS.get(modality, []) if kw in flat_text)

    topic_score    = min(topic_hits    / max(len(TOPIC_KEYWORDS.get(topic, ["x"])), 1), 1.0)
    modality_score = min(modality_hits / max(len(MODALITY_KEYWORDS.get(modality, ["x"])), 1), 1.0)

    # Weighted confidence: 60% topic relevance, 40% modality alignment
    confidence = round(0.6 * topic_score + 0.4 * modality_score, 4)
    needs_ml_review = confidence < 0.7

    return confidence, needs_ml_review


def _flatten_template_text(data):
    """Recursively extract all string values from template dict/list."""
    texts = []
    if isinstance(data, str):
        texts.append(data)
    elif isinstance(data, list):
        for item in data:
            texts.extend([_flatten_template_text(item)])
    elif isinstance(data, dict):
        for v in data.values():
            texts.append(_flatten_template_text(v))
    return " ".join(texts)


def _get_section_word_counts(data):
    """Return word counts for narrative/notes-type string sections."""
    counts = {}
    text_fields = ["definition", "analogy", "mnemonic", "analogy_spoken"]
    for field in text_fields:
        if field in data and isinstance(data[field], str):
            counts[field] = len(data[field].split())
    if "narrative" in data and isinstance(data["narrative"], list):
        joined = " ".join(data["narrative"])
        counts["narrative"] = len(joined.split())
    if "notes" in data and isinstance(data["notes"], list):
        joined = " ".join(data["notes"])
        counts["notes"] = len(joined.split())
    return counts


# --------------- LinUCB Context Vector ----------------------------------------

def build_context_vector(vark_probs, session_data):
    """
    Build the LinUCB context vector from the paper:
      xt = [pV, pA, pR, pK, s_recent, t_norm, e_trend, m_success]

    Args:
      vark_probs  : dict { 'Visual': float, 'Auditory': float, 'Reading': float, 'Kinesthetic': float }
      session_data: dict with optional keys: recent_score, total_time, engagement_trend, modality_successes
    Returns: list[float] of length 8
    """
    pV = float(vark_probs.get("Visual",      0.25))
    pA = float(vark_probs.get("Auditory",    0.25))
    pR = float(vark_probs.get("Reading",     0.25))
    pK = float(vark_probs.get("Kinesthetic", 0.25))

    # s_recent : score from most recent interaction (0-1), default 0.5
    s_recent = float(session_data.get("recent_score", 0.5))

    # t_norm : normalized total engagement time (clamp to [0, 1] over 600s max)
    t_norm = min(float(session_data.get("total_time", 0)) / 600.0, 1.0)

    # e_trend : engagement trend — positive means improving, range [-1, 1]
    e_trend = float(session_data.get("engagement_trend", 0.0))

    # m_success : proportion of modality-specific successes
    m_success = float(session_data.get("modality_successes", 0.5))

    return [pV, pA, pR, pK, s_recent, t_norm, e_trend, m_success]


# --------------- Bayesian VARK Update -----------------------------------------

def bayesian_vark_update(current_probs, reward, modality, decay=0.9):
    """
    Bayesian update of VARK probabilities (Algorithm 1 from paper).
    Formula:  new_p[m] = decay * prior[m] + (1 - decay) * likelihood[m]
    The likelihood favours the modality that just received the reward.

    Args:
      current_probs : dict { 'Visual': float, ... }
      reward        : float in [0, 1]
      modality      : str — the modality that was used in this interaction
      decay (λ)     : float, default 0.9
    Returns: dict with updated (and renormalized) VARK probabilities
    """
    modalities = ["Visual", "Auditory", "Reading", "Kinesthetic"]
    updated = {}

    for m in modalities:
        prior = current_probs.get(m, 0.25)
        # Likelihood: reward for the active modality, uniform complement for others
        if m == modality:
            likelihood = reward
        else:
            likelihood = (1.0 - reward) / 3.0

        updated[m] = decay * prior + (1.0 - decay) * likelihood

    # Renormalize so probabilities sum to 1
    total = sum(updated.values())
    if total > 0:
        updated = {m: round(v / total, 6) for m, v in updated.items()}

    return updated


# =============================================================================
# PHASE 2 ROUTES
# =============================================================================

@app.route('/api/capsule/generate', methods=['POST'])
def generate_capsule():
    """
    Generate a personalized micro-capsule based on VARK modality and topic.

    Request JSON:
      { "topic": "variables", "modality": "Visual", "difficulty": 1 }

    Response JSON:
      {
        "success": true,
        "learning_objective": str,
        "modality": str,
        "difficulty": int,
        "content": dict,          # full template content
        "confidence_score": float,
        "needs_ml_review": bool,
        "verified": bool,
        "stage1_issues": list,
        "timestamp": str
      }
    """
    try:
        data = request.get_json()
        topic      = data.get("topic", "").strip()
        modality   = data.get("modality", "Visual").strip()
        difficulty = int(data.get("difficulty", 1))
        persona    = data.get("persona", "Default").strip()

        # Check for YouTube URL in the topic
        yt_match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', topic)
        topic_context = f"'{topic}'"
        
        if yt_match:
            try:
                transcript = YouTubeTranscriptApi.get_transcript(yt_match.group(1))
                text = " ".join([t['text'] for t in transcript])
                topic_context = f"the educational concepts covered in this video transcript: {text[:4000]}"
            except Exception as e:
                print("Transcript fetch failed during capsule generation:", e)
        elif topic.startswith("doc:"):
            # It's an uploaded PDF document
            try:
                doc_id = topic.split(":")[1]
                db = get_db()
                doc_record = db.documents.find_one({"_id": ObjectId(doc_id)})
                if doc_record:
                    topic_context = f"the educational concepts covered in this uploaded document: {doc_record['text'][:5000]}"
            except Exception as e:
                print("Failed to fetch document text for capsule:", e)

        template = None
        if groq_client:
            # Generate personalized template via Groq
            base_template = CAPSULE_TEMPLATES.get((topic, modality), DEFAULT_TEMPLATE.copy())
            
            mermaid_rules = ""
            if modality == "Visual":
                base_template["mermaid"] = "graph TD\n  A[Start] --> B[Generate full valid Mermaid.js flowchart code for this topic]"
                mermaid_rules = "RULE for 'mermaid': You MUST use safe, alphanumeric node labels. Do NOT use quotes (\"), parentheses (), brackets [] {}, or any special characters inside the node descriptions as they break the Mermaid parser. Example: A[Concept] --> B[Detail]."
            
            audio_rules = ""
            if modality == "Auditory":
                audio_rules = "RULE for 'narrative': Format the array as a 2-host engaging podcast dialogue (like NotebookLM). Alternate strings between 'Host 1: [text]' and 'Host 2: [text]'. Make it sound natural, conversational, and enthusiastic."

            # Request dynamic quizzes for all topics generated via AI
            base_template["quiz"] = [
                {"q": "Generate a multiple choice question about the topic", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": 0},
                {"q": "Generate another multiple choice question", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": 1},
                {"q": "Generate a third multiple choice question", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": 2}
            ]
            
            persona_instruction = "Use standard educational terms." if persona == 'Default' else f"You MUST strictly explain this using '{persona}' analogies and terms."
            
            system_prompt = f"""You are an educational AI. Generate a JSON response for a micro-learning capsule about {topic_context}. 
The learner style is '{modality}'.
{persona_instruction}
{mermaid_rules}
{audio_rules}

Your response MUST be raw JSON that matches this structure exactly, filling in the content with the appropriate theme:
{json.dumps(base_template, indent=2)}

Do NOT wrap the JSON in markdown blocks (e.g. ```json). Output ONLY the raw JSON object.
"""
            try:
                completion = groq_client.chat.completions.create(
                    messages=[{"role": "system", "content": system_prompt}],
                    model="llama-3.3-70b-versatile",
                    temperature=0.7,
                )
                raw_json = completion.choices[0].message.content.strip()
                if raw_json.startswith("```json"):
                    raw_json = raw_json[7:-3].strip()
                elif raw_json.startswith("```"):
                    raw_json = raw_json[3:-3].strip()
                template = json.loads(raw_json)
            except Exception as e:
                print("Groq generate_capsule error:", e)

        if not template:
            # Retrieve template from bank (fallback to default)
            template = CAPSULE_TEMPLATES.get((topic, modality), DEFAULT_TEMPLATE.copy())

        # --- Stage 1 Verification ---
        s1_passed, s1_issues = stage1_verify(template)

        # --- Stage 2 Verification ---
        confidence, needs_ml_review = stage2_verify(template, topic, modality)

        return jsonify({
            "success":          True,
            "learning_objective": template.get("learning_objective", ""),
            "modality":         modality,
            "difficulty":       difficulty,
            "content":          template,
            "confidence_score": confidence,
            "needs_ml_review":  needs_ml_review,
            "verified":         s1_passed,
            "stage1_issues":    s1_issues,
            "timestamp":        datetime.now().isoformat(),
        }), 200

    except Exception as e:
        print(f"[capsule/generate] Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/capsule/interaction', methods=['POST'])
def log_interaction():
    """
    Log a learner interaction and compute the reward signal.
    Also updates the LinUCB context vector for the session.

    Request JSON:
      {
        "topic":        str,
        "modality":     str,
        "time_spent":   float,   # seconds on content
        "quiz_results": { "correct": int, "total": int },
        "satisfaction": float,   # 0..1, derived from quiz score
        "vark_probs":   dict,    # current VARK probabilities
        "session_id":   str      # optional client-side session identifier
      }

    Reward formula (from paper):
      r = 0.6 * (correct/total) + 0.3 * (t_engage / t_expected) + 0.1 * satisfaction
    """
    try:
        data        = request.get_json()
        topic       = data.get("topic",      "")
        modality    = data.get("modality",   "Visual")
        time_spent  = float(data.get("time_spent",  0))
        quiz        = data.get("quiz_results", {"correct": 0, "total": 1})
        satisfaction = float(data.get("satisfaction", 0.5))
        vark_probs  = data.get("vark_probs",  {"Visual": 0.25, "Auditory": 0.25, "Reading": 0.25, "Kinesthetic": 0.25})
        session_id  = data.get("session_id",  "default")

        correct = int(quiz.get("correct", 0))
        total   = max(int(quiz.get("total", 1)), 1)

        # Expected engagement time per difficulty level (seconds)
        # Difficulty 1 → 120s, 2 → 180s, 3 → 240s
        t_expected = 120.0

        # Reward formula from paper
        acc_score = correct / total
        time_ratio = min(time_spent / t_expected, 1.0)
        reward = round(0.6 * acc_score + 0.3 * time_ratio + 0.1 * satisfaction, 6)

        # Build updated LinUCB context vector
        session_data = {
            "recent_score":       acc_score,
            "total_time":         time_spent,
            "engagement_trend":   (acc_score - 0.5) * 2,  # simple trend proxy
            "modality_successes": acc_score,
        }
        ctx_vector = build_context_vector(vark_probs, session_data)

        # Persist in-memory (replace with DB in production)
        if session_id not in LEARNER_SESSIONS:
            LEARNER_SESSIONS[session_id] = {"context_vector": ctx_vector, "interactions": []}
        else:
            LEARNER_SESSIONS[session_id]["context_vector"] = ctx_vector

        LEARNER_SESSIONS[session_id]["interactions"].append({
            "topic":      topic,
            "modality":   modality,
            "reward":     reward,
            "timestamp":  datetime.now().isoformat(),
        })

        return jsonify({
            "success":        True,
            "reward":         reward,
            "accuracy":       round(acc_score, 4),
            "time_ratio":     round(time_ratio, 4),
            "satisfaction":   satisfaction,
            "context_vector": ctx_vector,
            "timestamp":      datetime.now().isoformat(),
        }), 200

    except Exception as e:
        print(f"[capsule/interaction] Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/vark/update', methods=['POST'])
def update_vark_probabilities():
    """
    Bayesian update of VARK probabilities after a learner interaction.

    Request JSON:
      {
        "current_probs": { "Visual": float, "Auditory": float, "Reading": float, "Kinesthetic": float },
        "reward":   float,   # from /api/capsule/interaction
        "modality": str      # the modality just used
      }

    Returns updated and renormalized VARK probabilities.
    """
    try:
        data          = request.get_json()
        current_probs = data.get("current_probs", {"Visual": 0.25, "Auditory": 0.25, "Reading": 0.25, "Kinesthetic": 0.25})
        reward        = float(data.get("reward", 0.5))
        modality      = data.get("modality", "Visual")

        updated_probs = bayesian_vark_update(current_probs, reward, modality, decay=0.9)
        dominant      = max(updated_probs, key=updated_probs.get)

        return jsonify({
            "success":       True,
            "updated_probs": updated_probs,
            "dominant_style": dominant,
            "lambda":        0.9,
            "timestamp":     datetime.now().isoformat(),
        }), 200

    except Exception as e:
        print(f"[vark/update] Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    """
    Get aggregated analytics (placeholder for future implementation)
    """
    return jsonify({
        'message': 'Analytics endpoint - implement database queries here',
        'timestamp': datetime.now().isoformat()
    }), 200

# ──────────────────────────────────────────────────────────────────
# STUDY PODS ENDPOINTS
# ──────────────────────────────────────────────────────────────────

def generate_pod_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))

@app.route('/api/pods/create', methods=['POST'])
@jwt_required()
def create_pod():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    name = data.get('name', 'New Pod').strip()
    goals = data.get('goals', '').strip()
    weekly_challenge = data.get('weekly_challenge', '').strip()

    db = get_db()
    pod_code = generate_pod_code()
    # ensure uniqueness
    while db.pods.find_one({"pod_code": pod_code}):
        pod_code = generate_pod_code()

    pod_doc = {
        "name": name,
        "pod_code": pod_code,
        "creator_id": user_id,
        "members": [user_id],
        "goals": goals,
        "notes": "",
        "weekly_challenge": weekly_challenge,
        "daily_tasks": [],
        "task_completions": {}, # mapping task_id -> list of user_ids who completed it
        "chat_history": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    res = db.pods.insert_one(pod_doc)
    return jsonify({"success": True, "pod_code": pod_code, "pod_id": str(res.inserted_id)}), 201


@app.route('/api/pods/join', methods=['POST'])
@jwt_required()
def join_pod():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    pod_code = data.get('pod_code', '').strip().upper()

    db = get_db()
    pod = db.pods.find_one({"pod_code": pod_code})
    if not pod:
        return jsonify({"success": False, "error": "Invalid Pod Code"}), 404
        
    if user_id in pod.get("members", []):
        return jsonify({"success": True, "message": "Already a member", "pod_id": str(pod["_id"])}), 200

    db.pods.update_one({"_id": pod["_id"]}, {"$addToSet": {"members": user_id}})
    return jsonify({"success": True, "pod_id": str(pod["_id"])}), 200


@app.route('/api/pods/my', methods=['GET'])
@jwt_required()
def my_pods():
    user_id = get_jwt_identity()
    db = get_db()
    pods_cursor = db.pods.find({"members": user_id})
    pods = []
    for p in pods_cursor:
        pods.append({
            "id": str(p["_id"]),
            "name": p.get("name"),
            "pod_code": p.get("pod_code"),
            "member_count": len(p.get("members", []))
        })
    return jsonify({"success": True, "pods": pods}), 200


@app.route('/api/pods/<pod_id>', methods=['GET'])
@jwt_required()
def get_pod_details(pod_id):
    user_id = get_jwt_identity()
    db = get_db()
    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400

    if not pod or user_id not in pod.get("members", []):
        return jsonify({"success": False, "error": "Pod not found or access denied"}), 404

    # Fetch member names
    members_map = {}
    valid_object_ids = [ObjectId(m) for m in pod.get("members", []) if len(m) == 24]
    
    if valid_object_ids:
        members_cursor = db.users.find({"_id": {"$in": valid_object_ids}})
        for user in members_cursor:
            members_map[str(user["_id"])] = user.get("name", "Unknown")

    for m in pod.get("members", []):
        if m not in members_map:
            try:
                u = db.users.find_one({"_id": ObjectId(m)})
                if u: members_map[m] = u.get("name", "Unknown")
            except:
                members_map[m] = "Unknown"

    return jsonify({
        "success": True,
        "pod": {
            "id": str(pod["_id"]),
            "name": pod.get("name"),
            "pod_code": pod.get("pod_code"),
            "members": members_map,
            "goals": pod.get("goals"),
            "weekly_challenge": pod.get("weekly_challenge"),
            "daily_tasks": pod.get("daily_tasks", []),
            "task_completions": pod.get("task_completions", {}),
        }
    }), 200


@app.route('/api/pods/<pod_id>/chat', methods=['GET', 'POST'])
@jwt_required()
def pod_chat(pod_id):
    user_id = get_jwt_identity()
    db = get_db()
    
    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400

    if not pod or user_id not in pod.get("members", []):
        return jsonify({"success": False, "error": "Pod not found or access denied"}), 404

    if request.method == 'GET':
        return jsonify({"success": True, "chat_history": pod.get("chat_history", [])}), 200
        
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        message = data.get('message', '').strip()
        if not message:
            return jsonify({"success": False, "error": "Message required"}), 400
            
        user = db.users.find_one({"_id": ObjectId(user_id)})
        sender_name = user.get("name", "User") if user else "User"
        
        chat_msg = {
            "sender_id": user_id,
            "sender_name": sender_name,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        db.pods.update_one({"_id": pod["_id"]}, {"$push": {"chat_history": chat_msg}})
        return jsonify({"success": True, "message": chat_msg}), 200


@app.route('/api/pods/<pod_id>/tasks', methods=['PUT'])
@jwt_required()
def update_pod_task(pod_id):
    user_id = get_jwt_identity()
    db = get_db()
    data = request.get_json(silent=True) or {}
    task_id = data.get("task_id")
    completed = data.get("completed", True)
    
    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400

    if not pod or user_id not in pod.get("members", []):
        return jsonify({"success": False, "error": "Access denied"}), 404

    update_op = "$addToSet" if completed else "$pull"
    db.pods.update_one(
        {"_id": pod["_id"]},
        {update_op: {f"task_completions.{task_id}": user_id}}
    )
    
    return jsonify({"success": True}), 200


# ── Pod Task CRUD (Creator only) ──────────────────────────────────────────────

@app.route('/api/pods/<pod_id>/tasks/add', methods=['POST'])
@jwt_required()
def add_pod_task(pod_id):
    user_id = get_jwt_identity()
    db = get_db()
    data = request.get_json(silent=True) or {}
    task_text = data.get('task', '').strip()
    if not task_text:
        return jsonify({"success": False, "error": "Task text required"}), 400
    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400
    if not pod or user_id not in pod.get("members", []):
        return jsonify({"success": False, "error": "Access denied"}), 403
    new_task = {"id": f"t_{ObjectId()}", "task": task_text}
    db.pods.update_one({"_id": pod["_id"]}, {"$push": {"daily_tasks": new_task}})
    return jsonify({"success": True, "task": new_task}), 201


@app.route('/api/pods/<pod_id>/tasks/<task_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_pod_task(pod_id, task_id):
    user_id = get_jwt_identity()
    db = get_db()
    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400
    if not pod or user_id not in pod.get("members", []):
        return jsonify({"success": False, "error": "Access denied"}), 403

    if request.method == 'DELETE':
        db.pods.update_one({"_id": pod["_id"]}, {"$pull": {"daily_tasks": {"id": task_id}}})
        # Also clean up completions for the deleted task
        db.pods.update_one({"_id": pod["_id"]}, {"$unset": {f"task_completions.{task_id}": ""}})
        return jsonify({"success": True}), 200

    if request.method == 'PUT':
        data = request.get_json(silent=True) or {}
        new_text = data.get('task', '').strip()
        if not new_text:
            return jsonify({"success": False, "error": "Task text required"}), 400
        db.pods.update_one(
            {"_id": pod["_id"], "daily_tasks.id": task_id},
            {"$set": {"daily_tasks.$.task": new_text}}
        )
        return jsonify({"success": True}), 200


@app.route('/api/pods/<pod_id>/goals', methods=['PUT'])
@jwt_required()
def update_pod_goals(pod_id):
    user_id = get_jwt_identity()
    db = get_db()
    data = request.get_json(silent=True) or {}
    goals = data.get('goals', '').strip()
    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400
    if not pod or user_id not in pod.get("members", []):
        return jsonify({"success": False, "error": "Access denied"}), 403
    db.pods.update_one({"_id": pod["_id"]}, {"$set": {"goals": goals}})
    return jsonify({"success": True}), 200


@app.route('/api/pods/<pod_id>/notes', methods=['PUT'])
@jwt_required()
def update_pod_notes(pod_id):
    user_id = get_jwt_identity()
    db = get_db()
    data = request.get_json(silent=True) or {}
    notes = data.get('notes', '').strip()
    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400
    if not pod or user_id not in pod.get("members", []):
        return jsonify({"success": False, "error": "Access denied"}), 403
    db.pods.update_one({"_id": pod["_id"]}, {"$set": {"notes": notes}})
    return jsonify({"success": True}), 200

# ── Pod Boss Battles ─────────────────────────────────────────────────────────

@app.route('/api/pods/<pod_id>/battle/start', methods=['POST'])
@jwt_required()
def start_pod_battle(pod_id):
    """Start a competitive multiplayer boss battle in the pod."""
    user_id = get_jwt_identity()
    db = get_db()
    data = request.get_json(silent=True) or {}
    topic = data.get('topic', 'computer science basics').strip()

    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400

    if not pod or user_id not in pod.get("members", []):
        return jsonify({"success": False, "error": "Access denied"}), 403

    # Generate 5 questions via Groq
    questions = []
    if groq_client:
        system_prompt = f"Generate exactly 5 intermediate-level multiple choice questions about '{topic}'. Return ONLY a raw JSON array of objects. Format each object: {{\"q\": \"question text\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"answer\": integer_index_0_to_3}}. Do NOT include markdown blocks."
        try:
            comp = groq_client.chat.completions.create(
                messages=[{"role": "system", "content": system_prompt}],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
            )
            raw = comp.choices[0].message.content.strip()
            if raw.startswith("```json"): raw = raw[7:-3].strip()
            elif raw.startswith("```"): raw = raw[3:-3].strip()
            questions = json.loads(raw)
        except Exception as e:
            print("Failed to generate battle questions:", e)
            questions = [
                {"q": f"What is a key concept in {topic}?", "options": ["Abstraction", "Photosynthesis", "Gravity", "Combustion"], "answer": 0},
                {"q": "Which of these is generally fastest?", "options": ["O(n^2)", "O(n)", "O(1)", "O(n log n)"], "answer": 2},
                {"q": "What data structure uses LIFO?", "options": ["Queue", "Tree", "Graph", "Stack"], "answer": 3},
                {"q": "Which data structure uses FIFO?", "options": ["Stack", "Array", "Queue", "Heap"], "answer": 2},
                {"q": f"Why is {topic} important?", "options": ["It is not", "Efficiency", "Color", "Weight"], "answer": 1}
            ]

    battle_state = {
        "state": "active",
        "topic": topic,
        "started_by": user_id,
        "questions": questions,
        "scores": {},  # { user_id: int_score }
        "start_time": datetime.now(timezone.utc).isoformat()
    }
    
    db.pods.update_one({"_id": pod["_id"]}, {"$set": {"active_battle": battle_state}})
    return jsonify({"success": True}), 200


@app.route('/api/pods/<pod_id>/battle/submit', methods=['POST'])
@jwt_required()
def submit_pod_battle_answer(pod_id):
    """Submit an answer to the current battle and update score."""
    user_id = get_jwt_identity()
    db = get_db()
    data = request.get_json(silent=True) or {}
    q_index = data.get('q_index')
    ans_index = data.get('ans_index')

    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400

    if not pod or 'active_battle' not in pod:
        return jsonify({"success": False, "error": "No active battle found"}), 404

    battle = pod['active_battle']
    if battle.get('state') != "active" or not isinstance(q_index, int) or not isinstance(ans_index, int):
        return jsonify({"success": False}), 400

    if q_index >= len(battle['questions']):
        return jsonify({"success": False}), 400

    correct_ans = battle['questions'][q_index]['answer']
    is_correct = (ans_index == correct_ans)

    # Initialize score if not present
    scores = battle.get('scores', {})
    if user_id not in scores:
        scores[user_id] = 0

    if is_correct:
        scores[user_id] += 1
        db.pods.update_one(
            {"_id": pod["_id"]},
            {"$set": {f"active_battle.scores.{user_id}": scores[user_id]}}
        )

    return jsonify({"success": True, "correct": is_correct, "current_score": scores[user_id]}), 200


@app.route('/api/pods/<pod_id>/battle/state', methods=['GET'])
@jwt_required()
def get_pod_battle_state(pod_id):
    """Poll for the current battle state and live leaderboard."""
    user_id = get_jwt_identity()
    db = get_db()
    
    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400

    if not pod or user_id not in pod.get("members", []):
        return jsonify({"success": False, "error": "Access denied"}), 403

    battle = pod.get('active_battle', None)
    if not battle:
        return jsonify({"success": True, "battle": None}), 200

    # Hide true answers from the client
    safe_questions = []
    for q in battle.get("questions", []):
        safe_questions.append({
            "q": q["q"],
            "options": q["options"]
        })

    # Get names for the leaderboard
    scores = battle.get("scores", {})
    leaderboard = []
    if scores:
        member_ids = [ObjectId(uid) for uid in scores.keys() if len(uid) == 24]
        users = list(db.users.find({"_id": {"$in": member_ids}}))
        name_map = {str(u["_id"]): u.get("name", "User") for u in users}
        
        for uid, score in scores.items():
            leaderboard.append({"user_id": uid, "name": name_map.get(uid, "User"), "score": score})
    
    leaderboard.sort(key=lambda x: x["score"], reverse=True)

    safe_battle = {
        "state": battle.get("state"),
        "topic": battle.get("topic"),
        "questions": safe_questions,
        "leaderboard": leaderboard,
        "start_time": battle.get("start_time")
    }
    
    return jsonify({"success": True, "battle": safe_battle}), 200


@app.route('/api/pods/<pod_id>/battle/end', methods=['POST'])
@jwt_required()
def end_pod_battle(pod_id):
    user_id = get_jwt_identity()
    db = get_db()
    
    try:
        pod = db.pods.find_one({"_id": ObjectId(pod_id)})
    except:
        return jsonify({"success": False, "error": "Invalid Pod ID"}), 400

    if not pod or 'active_battle' not in pod:
        return jsonify({"success": True}), 200
        
    db.pods.update_one({"_id": pod["_id"]}, {"$set": {"active_battle.state": "ended"}})
    return jsonify({"success": True}), 200


# ── Concept Lens (Analogy Engine) ────────────────────────────────────────────

@app.route('/api/concept-lens', methods=['POST'])
@jwt_required()
def generate_concept_lens():
    if request.is_json:
        data = request.get_json(silent=True) or {}
        topic = data.get('topic', '').strip()
        complexity = data.get('complexity', 'student').strip().lower() # layman, student, developer
        link = data.get('link', '').strip()
        file = None
    else:
        topic = request.form.get('topic', '').strip()
        complexity = request.form.get('complexity', 'student').strip().lower()
        link = request.form.get('link', '').strip()
        file = request.files.get('file')

    context_text = ""
    
    # 1. Handle YouTube Link
    if link and ('youtube.com' in link or 'youtu.be' in link):
        try:
            if 'v=' in link:
                video_id = link.split('v=')[1][:11]
            else:
                video_id = link.split('/')[-1][:11]
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            full_transcript = " ".join([t['text'] for t in transcript_list])
            context_text = f"YouTube Transcript Content: {full_transcript[:8000]}"
            if not topic: topic = "YouTube Video Content"
        except Exception as e:
            return jsonify({"success": False, "error": f"Could not parse YouTube link: {str(e)}"}), 400
            
    # 2. Handle PDF File
    elif file and file.filename.endswith('.pdf'):
        try:
            doc = fitz.open(stream=file.read(), filetype="pdf")
            pdf_text = ""
            for i in range(min(5, doc.page_count)):  # parse up to 5 pages
                pdf_text += doc[i].get_text()
            context_text = f"Document Content: {pdf_text[:8000]}"
            if not topic: topic = file.filename
        except Exception as e:
            return jsonify({"success": False, "error": f"Could not parse PDF: {str(e)}"}), 400
            
    # 3. Handle General Link
    elif link:
        if not topic: topic = link
        context_text = f"Link provided: {link}"
        
    if not topic and not context_text:
        return jsonify({"success": False, "error": "Topic, Link, or File required"}), 400
         
    complexity_guidelines = {
        "layman": "You are explaining to an absolute beginner with zero technical background. Use extreme simplification, heavy use of real-world analogies (like cooking, driving, plumbing, etc.), avoid ALL jargon, and keep it fun and accessible.",
        "student": "You are explaining to a high school or early college student learning this for the first time. Use standard educational definitions, clear concepts, and practical but simple examples. Some jargon is okay if defined.",
        "developer": "You are explaining to a senior software developer. Be highly technical, concise, use industry-standard terminology, architecture details, and assume deep prerequisite knowledge. Use code and system design concepts."
    }
    
    guideline = complexity_guidelines.get(complexity, complexity_guidelines["student"])
    
    prompt = f"""You are Lurniq's 'Concept Lens' AI.
Topic: {topic}
Selected Complexity Level: {complexity.upper()}
Guideline: {guideline}
{f"Additional Source Content: {context_text}" if context_text else ""}

Generate a comprehensive explanation and exactly 4 VARK (Visual, Auditory, Reading, Kinesthetic) interactive modules for this topic (heavily utilizing the Additional Source Content if provided), STRICTLY adhering to the selected complexity level.
Ensure the returned format is VALID JSON exactly matching this structure:
{{
  "explanation": "A 2-3 paragraph main explanation of the topic matching the {complexity} complexity.",
  "vark": {{
    "Visual": {{
      "mermaid": "graph TD\\n  A[Start] --> B[End]",
      "diagram": ["Step 1: ...", "Step 2: ..."],
      "steps": ["Step 1", "Step 2"]
    }},
    "Auditory": {{
      "analogy": "A short script for a podcast or explainer video about this topic at {complexity} level.",
      "narrative": ["Dialogue line 1", "Dialogue line 2"],
      "mnemonic": "A clever mnemonic or memory trick"
    }},
    "Reading": {{
      "definition": "A formal or summary definition",
      "notes": ["Bullet point 1", "Bullet point 2"],
      "key_terms": [{{"term": "Term1", "definition": "Def1"}}]
    }},
    "Kinesthetic": {{
      "challenge": {{
        "instruction": "Interactive task instructions",
        "type": "match_pairs",
        "pairs": [
          {{"id": "1", "left": "Concept", "right": "Definition"}}
        ]
      }}
    }}
  }}
}}

For Kinesthetic: 
If {complexity} is 'developer', you MUST provide a Python coding challenge instead of match_pairs. For code challenges use EXACTLY this format:
"challenge": {{ "instruction": "Write a python script...", "starter": "def foo():\\n    pass", "solution": "...", "expected_output": "..." }}
If {complexity} is 'layman' or 'student', ONLY use "type": "match_pairs" with "pairs".
For Visual: The mermaid MUST be a syntactically perfect Mermaid.js flowchart. Use ONLY alphanumeric characters for node IDs (e.g. A1, B2) and label text. Do NOT use any special characters, quotes, or brackets inside node labels.

CRITICAL: Return ONLY the raw valid JSON object. Do not include markdown formatting or backticks around the JSON.
"""

    messages = [
        {"role": "system", "content": "You are an expert AI tutor API that strictly outputs JSON."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        response = groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2500,
            response_format={"type": "json_object"}
        )
        content_str = response.choices[0].message.content
        result = json.loads(content_str)
        return jsonify({"success": True, "data": result})
    except Exception as e:
        print("Error generating concept lens:", e)
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':

    print("\n" + "="*60)
    print("VARK LEARNING STYLE PREDICTOR API  (Phase 1 + Phase 2)")
    print("="*60)
    print("API running on http://localhost:5000")
    print("\nPhase 1 Endpoints:")
    print("  GET  /api/health              - Health check")
    print("  POST /api/predict             - Predict learning style")
    print("  POST /api/save-engagement     - Save engagement data")
    print("  GET  /api/analytics           - Get analytics")
    print("\nPhase 2 Endpoints (AIMC-Bandit):")
    print("  POST /api/capsule/generate    - Generate personalized micro-capsule")
    print("  POST /api/capsule/interaction - Log interaction + compute reward")
    print("  POST /api/vark/update         - Bayesian VARK probability update")
    print("="*60 + "\n")
    
    app.run(debug=False, host='0.0.0.0', port=5000)