from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from datetime import datetime, timezone
import pickle
import os
import re
import math

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
    if not bcrypt.checkpw(current_pw.encode('utf-8'), user['password']):
        return jsonify({'success': False, 'error': 'Current password is incorrect'}), 401
    hashed = bcrypt.hashpw(new_pw.encode('utf-8'), bcrypt.gensalt())
    db['users'].update_one({'_id': ObjectId(user_id)}, {'$set': {'password': hashed}})
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
    hashed = bcrypt.hashpw(new_pw.encode('utf-8'), bcrypt.gensalt())
    db['users'].update_one({'email': email}, {'$set': {'password': hashed}})
    return jsonify({'success': True, 'message': 'Password reset successfully'}), 200


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
        topic      = data.get("topic", "").lower().strip()
        modality   = data.get("modality", "Visual").strip()
        difficulty = int(data.get("difficulty", 1))

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