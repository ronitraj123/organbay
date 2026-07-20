"""
train_model.py

Trains a GradientBoostingRegressor to predict organ-transport ETA
(in minutes) from logistics features, using the self-generated synthetic
dataset from generate_synthetic_data.py.

This is intentionally the ONE piece of "real ML" in the OrganBay
project, and it is scoped narrowly to a logistics-prediction problem
(transport time), not any clinical prediction. Run this script whenever
you want to regenerate/retrain the model:

    python generate_synthetic_data.py
    python train_model.py
"""

import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

FEATURES = ["distance_km", "hour_of_day", "is_peak_hour", "organ_priority_weight"]
TARGET = "eta_minutes"


def main():
    df = pd.read_csv("data/synthetic_transport_data.csv")
    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=3,
        learning_rate=0.05,
        random_state=42
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    print(f"Test MAE: {mae:.2f} minutes")
    print(f"Test R^2: {r2:.3f}")

    importances = dict(zip(FEATURES, model.feature_importances_))
    print("Feature importances:", {k: round(v, 3) for k, v in importances.items()})

    joblib.dump({"model": model, "features": FEATURES}, "model/eta_model.joblib")
    print("Saved trained model -> model/eta_model.joblib")


if __name__ == "__main__":
    main()
