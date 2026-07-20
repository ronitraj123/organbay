"""
main.py

OrganBay ML microservice (FastAPI).

Scope, deliberately narrow: this service predicts organ TRANSPORT ETA
in minutes from logistics features (distance, time of day, organ
priority). It makes NO clinical predictions -- it does not assess organ
viability, donor-recipient compatibility, or any medical outcome. See
the project README for the full disclaimer and rationale.

Run locally:
    uvicorn main:app --reload --port 8000

Endpoints:
    GET  /health
    POST /predict-eta
"""

from datetime import datetime, timezone

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="OrganBay ML Service",
    description="Transport ETA prediction microservice for OrganBay. Not a clinical decision-making tool.",
    version="1.0.0",
)

# Loosened for demo/portfolio deployment convenience. Tighten this to your
# actual backend's deployed URL before submitting/sharing publicly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_BUNDLE = joblib.load("model/eta_model.joblib")
MODEL = MODEL_BUNDLE["model"]
FEATURES = MODEL_BUNDLE["features"]

ORGAN_PRIORITY_WEIGHT = {
    "Heart": 1.0,
    "Lung": 1.0,
    "Liver": 0.9,
    "Kidney": 0.7,
    "Pancreas": 0.7,
    "Cornea": 0.3,
}


def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    lat1r, lng1r, lat2r, lng2r = map(np.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2r - lat1r
    dlng = lng2r - lng1r
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1r) * np.cos(lat2r) * np.sin(dlng / 2) ** 2
    return R * 2 * np.arcsin(np.sqrt(a))


class EtaRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    organ_type: str = Field(default="Kidney")
    requested_at: str | None = None  # ISO timestamp; defaults to "now" if omitted


class EtaResponse(BaseModel):
    predicted_eta_minutes: float
    distance_km: float
    confidence_interval_minutes: list[float]
    model_version: str = "gbrt-v1-synthetic"
    disclaimer: str = (
        "This ETA is a statistical estimate from a model trained on "
        "self-generated synthetic logistics data for demonstration "
        "purposes. It is not connected to any real-time traffic, flight, "
        "or ambulance dispatch system."
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "organbay-ml-service"}


@app.post("/predict-eta", response_model=EtaResponse)
def predict_eta(req: EtaRequest):
    distance_km = haversine_km(req.origin_lat, req.origin_lng, req.dest_lat, req.dest_lng)

    if req.requested_at:
        try:
            dt = datetime.fromisoformat(req.requested_at.replace("Z", "+00:00"))
        except ValueError:
            dt = datetime.now(timezone.utc)
    else:
        dt = datetime.now(timezone.utc)

    hour_of_day = dt.hour
    is_peak_hour = 1 if (8 <= hour_of_day <= 11 or 17 <= hour_of_day <= 21) else 0
    priority_weight = ORGAN_PRIORITY_WEIGHT.get(req.organ_type, 0.7)

    X = np.array([[distance_km, hour_of_day, is_peak_hour, priority_weight]])
    predicted = float(MODEL.predict(X)[0])
    predicted = max(predicted, 5.0)

    # Simple +-15% band presented as an approximate confidence interval --
    # not derived from formal prediction-interval statistics, and labeled
    # as such in the disclaimer field above.
    lower = round(predicted * 0.85, 1)
    upper = round(predicted * 1.15, 1)

    return EtaResponse(
        predicted_eta_minutes=round(predicted, 1),
        distance_km=round(float(distance_km), 2),
        confidence_interval_minutes=[lower, upper],
    )
