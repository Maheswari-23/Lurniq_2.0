import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

np.random.seed(42)

# TensorFlow is optional — the app runs without it (auth routes stay fully functional).
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers, regularizers
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    tf.random.set_seed(42)
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    tf = keras = layers = regularizers = EarlyStopping = ReduceLROnPlateau = None


# ============================================
# 1. ENHANCED DATA GENERATION
# ============================================

def generate_synthetic_data(n_samples=5000):
    """Generate synthetic training data with ALL tracked metrics"""
    data = []
    
    for _ in range(n_samples):
        true_style = np.random.choice(['Visual', 'Auditory', 'Reading', 'Kinesthetic'])
        
        if true_style == 'Visual':
            # Visual metrics (high engagement)
            visual_clicks = np.random.randint(8, 25)
            visual_time = np.random.randint(120, 600)
            video_plays = np.random.randint(3, 10)
            video_pauses = np.random.randint(1, 5)
            video_completion = np.random.randint(60, 100)
            visual_hover = np.random.randint(10, 60)
            visual_revisits = np.random.randint(0, 3)
            
            # Other metrics (low engagement)
            auditory_clicks = np.random.randint(0, 8)
            auditory_time = np.random.randint(0, 120)
            audio_plays = np.random.randint(0, 3)
            audio_pauses = np.random.randint(0, 2)
            audio_completion = np.random.randint(0, 40)
            audio_seeks = np.random.randint(0, 2)
            auditory_hover = np.random.randint(0, 20)
            auditory_revisits = np.random.randint(0, 1)
            
            reading_clicks = np.random.randint(0, 10)
            reading_time = np.random.randint(0, 180)
            scroll_depth = np.random.randint(0, 50)
            max_scroll = np.random.randint(0, 60)
            text_selections = np.random.randint(0, 3)
            reading_hover = np.random.randint(0, 20)
            reading_revisits = np.random.randint(0, 1)
            
            kinesthetic_clicks = np.random.randint(0, 8)
            kinesthetic_time = np.random.randint(0, 120)
            drag_attempts = np.random.randint(0, 5)
            incorrect_drops = np.random.randint(0, 3)
            correct_drops = np.random.randint(0, 2)
            completion_time = np.random.randint(0, 60)
            first_success = np.random.choice([0, 1], p=[0.7, 0.3])
            reset_clicks = np.random.randint(0, 2)
            kinesthetic_hover = np.random.randint(0, 20)
            kinesthetic_revisits = np.random.randint(0, 1)
            
        elif true_style == 'Auditory':
            visual_clicks = np.random.randint(0, 10)
            visual_time = np.random.randint(0, 180)
            video_plays = np.random.randint(0, 3)
            video_pauses = np.random.randint(0, 2)
            video_completion = np.random.randint(0, 40)
            visual_hover = np.random.randint(0, 20)
            visual_revisits = np.random.randint(0, 1)
            
            auditory_clicks = np.random.randint(8, 25)
            auditory_time = np.random.randint(120, 600)
            audio_plays = np.random.randint(3, 10)
            audio_pauses = np.random.randint(1, 5)
            audio_completion = np.random.randint(60, 100)
            audio_seeks = np.random.randint(1, 5)
            auditory_hover = np.random.randint(10, 60)
            auditory_revisits = np.random.randint(0, 3)
            
            reading_clicks = np.random.randint(0, 8)
            reading_time = np.random.randint(0, 120)
            scroll_depth = np.random.randint(0, 40)
            max_scroll = np.random.randint(0, 50)
            text_selections = np.random.randint(0, 2)
            reading_hover = np.random.randint(0, 20)
            reading_revisits = np.random.randint(0, 1)
            
            kinesthetic_clicks = np.random.randint(0, 8)
            kinesthetic_time = np.random.randint(0, 120)
            drag_attempts = np.random.randint(0, 5)
            incorrect_drops = np.random.randint(0, 3)
            correct_drops = np.random.randint(0, 2)
            completion_time = np.random.randint(0, 60)
            first_success = np.random.choice([0, 1], p=[0.7, 0.3])
            reset_clicks = np.random.randint(0, 2)
            kinesthetic_hover = np.random.randint(0, 20)
            kinesthetic_revisits = np.random.randint(0, 1)
            
        elif true_style == 'Reading':
            visual_clicks = np.random.randint(0, 8)
            visual_time = np.random.randint(0, 120)
            video_plays = np.random.randint(0, 3)
            video_pauses = np.random.randint(0, 2)
            video_completion = np.random.randint(0, 40)
            visual_hover = np.random.randint(0, 20)
            visual_revisits = np.random.randint(0, 1)
            
            auditory_clicks = np.random.randint(0, 8)
            auditory_time = np.random.randint(0, 120)
            audio_plays = np.random.randint(0, 3)
            audio_pauses = np.random.randint(0, 2)
            audio_completion = np.random.randint(0, 40)
            audio_seeks = np.random.randint(0, 2)
            auditory_hover = np.random.randint(0, 20)
            auditory_revisits = np.random.randint(0, 1)
            
            reading_clicks = np.random.randint(8, 25)
            reading_time = np.random.randint(120, 600)
            scroll_depth = np.random.randint(60, 100)
            max_scroll = np.random.randint(70, 100)
            text_selections = np.random.randint(2, 8)
            reading_hover = np.random.randint(10, 60)
            reading_revisits = np.random.randint(0, 3)
            
            kinesthetic_clicks = np.random.randint(0, 10)
            kinesthetic_time = np.random.randint(0, 180)
            drag_attempts = np.random.randint(0, 6)
            incorrect_drops = np.random.randint(0, 3)
            correct_drops = np.random.randint(0, 3)
            completion_time = np.random.randint(0, 80)
            first_success = np.random.choice([0, 1], p=[0.6, 0.4])
            reset_clicks = np.random.randint(0, 3)
            kinesthetic_hover = np.random.randint(0, 30)
            kinesthetic_revisits = np.random.randint(0, 2)
            
        else:  # Kinesthetic
            visual_clicks = np.random.randint(0, 8)
            visual_time = np.random.randint(0, 120)
            video_plays = np.random.randint(0, 3)
            video_pauses = np.random.randint(0, 2)
            video_completion = np.random.randint(0, 40)
            visual_hover = np.random.randint(0, 20)
            visual_revisits = np.random.randint(0, 1)
            
            auditory_clicks = np.random.randint(0, 8)
            auditory_time = np.random.randint(0, 120)
            audio_plays = np.random.randint(0, 3)
            audio_pauses = np.random.randint(0, 2)
            audio_completion = np.random.randint(0, 40)
            audio_seeks = np.random.randint(0, 2)
            auditory_hover = np.random.randint(0, 20)
            auditory_revisits = np.random.randint(0, 1)
            
            reading_clicks = np.random.randint(0, 8)
            reading_time = np.random.randint(0, 120)
            scroll_depth = np.random.randint(0, 40)
            max_scroll = np.random.randint(0, 50)
            text_selections = np.random.randint(0, 2)
            reading_hover = np.random.randint(0, 20)
            reading_revisits = np.random.randint(0, 1)
            
            kinesthetic_clicks = np.random.randint(8, 25)
            kinesthetic_time = np.random.randint(120, 600)
            drag_attempts = np.random.randint(5, 15)
            incorrect_drops = np.random.randint(1, 5)
            correct_drops = np.random.randint(2, 4)
            completion_time = np.random.randint(30, 180)
            first_success = np.random.choice([0, 1], p=[0.4, 0.6])
            reset_clicks = np.random.randint(0, 4)
            kinesthetic_hover = np.random.randint(10, 60)
            kinesthetic_revisits = np.random.randint(0, 3)
        
        # Generate questionnaire responses
        style_map = {'Visual': 0, 'Auditory': 1, 'Reading': 2, 'Kinesthetic': 3}
        preferred_answer = style_map[true_style]
        questionnaire = []
        for _ in range(10):
            if np.random.random() < 0.7:
                questionnaire.append(preferred_answer)
            else:
                questionnaire.append(np.random.choice([0, 1, 2, 3]))
        
        # Compile row
        row = {
            'visual_clicks': visual_clicks,
            'visual_time': visual_time,
            'video_plays': video_plays,
            'video_pauses': video_pauses,
            'video_completion': video_completion,
            'visual_hover': visual_hover,
            'visual_revisits': visual_revisits,
            
            'auditory_clicks': auditory_clicks,
            'auditory_time': auditory_time,
            'audio_plays': audio_plays,
            'audio_pauses': audio_pauses,
            'audio_completion': audio_completion,
            'audio_seeks': audio_seeks,
            'auditory_hover': auditory_hover,
            'auditory_revisits': auditory_revisits,
            
            'reading_clicks': reading_clicks,
            'reading_time': reading_time,
            'scroll_depth': scroll_depth,
            'max_scroll': max_scroll,
            'text_selections': text_selections,
            'reading_hover': reading_hover,
            'reading_revisits': reading_revisits,
            
            'kinesthetic_clicks': kinesthetic_clicks,
            'kinesthetic_time': kinesthetic_time,
            'drag_attempts': drag_attempts,
            'incorrect_drops': incorrect_drops,
            'correct_drops': correct_drops,
            'completion_time': completion_time,
            'first_success': first_success,
            'reset_clicks': reset_clicks,
            'kinesthetic_hover': kinesthetic_hover,
            'kinesthetic_revisits': kinesthetic_revisits,
            
            'label': true_style
        }
        
        for i, ans in enumerate(questionnaire):
            row[f'q{i+1}'] = ans
            
        data.append(row)
    
    return pd.DataFrame(data)

# ============================================
# 2. ENHANCED FEATURE ENGINEERING
# ============================================

def engineer_features(df):
    """Create advanced features from all tracked metrics"""
    df_featured = df.copy()
    
    # Total engagement
    df_featured['total_clicks'] = (df['visual_clicks'] + df['auditory_clicks'] + 
                                   df['reading_clicks'] + df['kinesthetic_clicks'])
    df_featured['total_time'] = (df['visual_time'] + df['auditory_time'] + 
                                 df['reading_time'] + df['kinesthetic_time'])
    df_featured['total_hover'] = (df['visual_hover'] + df['auditory_hover'] + 
                                  df['reading_hover'] + df['kinesthetic_hover'])
    df_featured['total_revisits'] = (df['visual_revisits'] + df['auditory_revisits'] + 
                                     df['reading_revisits'] + df['kinesthetic_revisits'])
    
    # Engagement ratios
    df_featured['visual_click_ratio'] = df['visual_clicks'] / (df_featured['total_clicks'] + 1)
    df_featured['auditory_click_ratio'] = df['auditory_clicks'] / (df_featured['total_clicks'] + 1)
    df_featured['reading_click_ratio'] = df['reading_clicks'] / (df_featured['total_clicks'] + 1)
    df_featured['kinesthetic_click_ratio'] = df['kinesthetic_clicks'] / (df_featured['total_clicks'] + 1)
    
    df_featured['visual_time_ratio'] = df['visual_time'] / (df_featured['total_time'] + 1)
    df_featured['auditory_time_ratio'] = df['auditory_time'] / (df_featured['total_time'] + 1)
    df_featured['reading_time_ratio'] = df['reading_time'] / (df_featured['total_time'] + 1)
    df_featured['kinesthetic_time_ratio'] = df['kinesthetic_time'] / (df_featured['total_time'] + 1)
    
    # Media completion scores (weighted)
    df_featured['visual_engagement_score'] = (
        df['video_plays'] * 2 + 
        df['video_completion'] / 100 * 5 + 
        df['video_pauses'] * 0.5
    )
    
    df_featured['auditory_engagement_score'] = (
        df['audio_plays'] * 2 + 
        df['audio_completion'] / 100 * 5 + 
        df['audio_seeks'] * 1.5 +
        df['audio_pauses'] * 0.5
    )
    
    df_featured['reading_engagement_score'] = (
        df['max_scroll'] / 100 * 5 + 
        df['text_selections'] * 2
    )
    
    df_featured['kinesthetic_engagement_score'] = (
        df['drag_attempts'] * 0.5 + 
        df['correct_drops'] * 3 - 
        df['incorrect_drops'] * 0.5 +
        df['first_success'] * 5
    )
    
    # Average time per click
    df_featured['visual_avg_time'] = df['visual_time'] / (df['visual_clicks'] + 1)
    df_featured['auditory_avg_time'] = df['auditory_time'] / (df['auditory_clicks'] + 1)
    df_featured['reading_avg_time'] = df['reading_time'] / (df['reading_clicks'] + 1)
    df_featured['kinesthetic_avg_time'] = df['kinesthetic_time'] / (df['kinesthetic_clicks'] + 1)
    
    # Questionnaire analysis
    questionnaire_cols = [f'q{i+1}' for i in range(10)]
    for i in range(4):
        df_featured[f'answer_{i}_count'] = df[questionnaire_cols].apply(
            lambda row: (row == i).sum(), axis=1
        )
    
    df_featured['dominant_answer'] = df[questionnaire_cols].mode(axis=1)[0]
    df_featured['answer_consistency'] = df[questionnaire_cols].apply(
        lambda row: row.value_counts().max() / len(row), axis=1
    )
    
    # Interaction quality metrics
    df_featured['visual_quality'] = (df['video_completion'] * df['visual_time']) / 1000
    df_featured['auditory_quality'] = (df['audio_completion'] * df['auditory_time']) / 1000
    df_featured['reading_quality'] = (df['max_scroll'] * df['text_selections']) / 10
    df_featured['kinesthetic_quality'] = (df['correct_drops'] / (df['drag_attempts'] + 1)) * 100
    
    return df_featured

# ============================================
# 3. DEEP LEARNING MODEL
# ============================================

def create_deep_model(input_dim, num_classes=4):
    """Create deep neural network (requires TensorFlow)"""
    if not TF_AVAILABLE:
        raise RuntimeError("TensorFlow is not installed; cannot build deep model.")
    inputs = keras.Input(shape=(input_dim,))

    
    x = layers.Dense(256, kernel_regularizer=regularizers.l2(0.001))(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.4)(x)
    
    x = layers.Dense(128, kernel_regularizer=regularizers.l2(0.001))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.3)(x)
    
    x = layers.Dense(64, kernel_regularizer=regularizers.l2(0.001))(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    x = layers.Dropout(0.2)(x)
    
    x = layers.Dense(32)(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation('relu')(x)
    
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = keras.Model(inputs=inputs, outputs=outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

# ============================================
# 4. ENSEMBLE MODEL
# ============================================

def create_ensemble_model():
    """Create ensemble of ML models"""
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    gb = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=7,
        random_state=42
    )
    
    ensemble = VotingClassifier(
        estimators=[('rf', rf), ('gb', gb)],
        voting='soft'
    )
    
    return ensemble

# ============================================
# 5. HYBRID PREDICTOR
# ============================================

class HybridVARKPredictor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.dl_model = None
        self.ensemble_model = None
        self.feature_columns = None
        
    def fit(self, X, y, epochs=100, batch_size=32, validation_split=0.2):
        """Train both models"""
        y_encoded = self.label_encoder.fit_transform(y)
        X_scaled = self.scaler.fit_transform(X)
        self.feature_columns = X.columns.tolist()
        
        X_train, X_val, y_train, y_val = train_test_split(
            X_scaled, y_encoded, test_size=validation_split, 
            random_state=42, stratify=y_encoded
        )
        
        print("Training Deep Learning Model...")
        self.dl_model = create_deep_model(X.shape[1])
        
        early_stop = EarlyStopping(monitor='val_accuracy', patience=15, restore_best_weights=True)
        reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=0.00001)
        
        history = self.dl_model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stop, reduce_lr],
            verbose=1
        )
        
        print("\nTraining Ensemble Model...")
        self.ensemble_model = create_ensemble_model()
        self.ensemble_model.fit(X_train, y_train)
        
        dl_pred = np.argmax(self.dl_model.predict(X_val, verbose=0), axis=1)
        ensemble_pred = self.ensemble_model.predict(X_val)
        
        print(f"\nValidation Accuracy:")
        print(f"Deep Learning: {accuracy_score(y_val, dl_pred):.4f}")
        print(f"Ensemble: {accuracy_score(y_val, ensemble_pred):.4f}")
        
        return history
    
    def predict(self, X, use_voting=True):
        """Make predictions"""
        X_scaled = self.scaler.transform(X)
        
        dl_probs = self.dl_model.predict(X_scaled, verbose=0)
        ensemble_probs = self.ensemble_model.predict_proba(X_scaled)
        
        if use_voting:
            combined_probs = 0.6 * dl_probs + 0.4 * ensemble_probs
            predictions = np.argmax(combined_probs, axis=1)
        else:
            predictions = np.argmax(dl_probs, axis=1)
        
        return self.label_encoder.inverse_transform(predictions)
    
    def predict_proba(self, X):
        """Get probability predictions"""
        X_scaled = self.scaler.transform(X)
        dl_probs = self.dl_model.predict(X_scaled, verbose=0)
        ensemble_probs = self.ensemble_model.predict_proba(X_scaled)
        combined_probs = 0.6 * dl_probs + 0.4 * ensemble_probs
        return combined_probs

# ============================================
# 6. TRAINING
# ============================================

def main():
    print("=" * 60)
    print("VARK LEARNING STYLE PREDICTION SYSTEM")
    print("=" * 60)
    
    print("\n1. Generating synthetic training data...")
    df = generate_synthetic_data(n_samples=5000)
    print(f"Generated {len(df)} samples")
    
    print("\n2. Engineering features...")
    df_featured = engineer_features(df)
    
    feature_cols = [col for col in df_featured.columns if col != 'label']
    X = df_featured[feature_cols]
    y = df_featured['label']
    
    print(f"Total features: {len(feature_cols)}")
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    
    print(f"\nTraining samples: {len(X_train)}")
    print(f"Testing samples: {len(X_test)}")
    
    print("\n3. Training Hybrid Model...")
    predictor = HybridVARKPredictor()
    predictor.fit(X_train, y_train, epochs=100, batch_size=32)
    
    print("\n4. Final Evaluation...")
    y_pred = predictor.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\nFINAL TEST ACCURACY: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    print("\n5. Saving model...")
    predictor.dl_model.save('vark_dl_model.h5')
    print("Model saved!")
    
    return predictor

if __name__ == "__main__":
    predictor = main()