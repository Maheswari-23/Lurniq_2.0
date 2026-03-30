import sys
import os

# Import xgboost and vark_ml_model
try:
    import xgboost as xgb
except ImportError:
    print("xgboost not installed")
    sys.exit(1)

from vark_ml_model import generate_synthetic_data, engineer_features, HybridVARKPredictor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import numpy as np

def test_xgb():
    print("Generating data...")
    df = generate_synthetic_data(n_samples=5000)
    df_featured = engineer_features(df)
    
    feature_cols = [col for col in df_featured.columns if col != 'label']
    X = df_featured[feature_cols]
    y = df_featured['label']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    print("Training XGBoost Predictor...")
    predictor = HybridVARKPredictor()
    predictor.fit(X_train, y_train, epochs=20, batch_size=32)

    # transform train/test
    X_test_scaled = predictor.scaler.transform(X_test)
    y_test_encoded = predictor.label_encoder.transform(y_test)
    
    # Evaluate Predictor
    y_pred = predictor.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print("-" * 50)
    print(f"XGBoost Predictor Accuracy: {acc:.4f}")
    print("-" * 50)

if __name__ == "__main__":
    test_xgb()
