"""
generate_synthetic_data.py

Generates a SELF-GENERATED SYNTHETIC training dataset for the transport
ETA model. This is a deliberate design choice: rather than sourcing a
real medical/logistics dataset (which would raise legitimate "where did
this data come from and how representative is it?" questions), we
explicitly simulate realistic Indian urban/inter-city transport
conditions ourselves and are upfront about that in the README.

The simulation logic:
  - Origin/destination points are sampled from (and around) real Indian
    metro coordinates, matching the hospital seed data.
  - Effective travel speed depends on time of day (rush-hour congestion
    is modeled as meaningfully slower than off-peak), reflecting typical
    Indian metro traffic patterns rather than highway-speed assumptions.
  - Organ priority (e.g. heart/lung vs cornea) is modeled as shaving a
    little time off ETA, representing ambulance/green-corridor priority
    routing that Indian metros do use for organ transport in practice.
  - Gaussian noise is added to avoid a deterministic, easily-overfit
    signal.
"""

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

# Roughly the same metro areas as backend/seed/hospitalSeedData.js
CITY_CENTERS = [
    (28.60, 77.20),   # Delhi
    (19.07, 72.85),   # Mumbai
    (12.95, 77.65),   # Bengaluru
    (13.02, 80.24),   # Chennai
    (12.92, 79.13),   # Vellore
    (17.41, 78.44),   # Hyderabad
    (30.73, 76.78),   # Chandigarh
    (22.58, 88.39),   # Kolkata
    (23.04, 72.57),   # Ahmedabad
    (18.55, 73.88),   # Pune
    (26.85, 80.95),   # Lucknow
    (26.91, 75.79),   # Jaipur
    (9.93, 76.27),    # Kochi
]

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


def sample_point_near(center, jitter_deg=0.35):
    lat = center[0] + RNG.uniform(-jitter_deg, jitter_deg)
    lng = center[1] + RNG.uniform(-jitter_deg, jitter_deg)
    return lat, lng


def generate(n_samples=6000):
    rows = []
    organ_types = list(ORGAN_PRIORITY_WEIGHT.keys())

    for _ in range(n_samples):
        # ~70% of trips are within-city (both points near the same
        # center); ~30% are inter-city transfers between two different
        # metro areas -- both realistic scenarios for organ transport.
        if RNG.random() < 0.7:
            center = CITY_CENTERS[RNG.integers(0, len(CITY_CENTERS))]
            olat, olng = sample_point_near(center, jitter_deg=0.15)
            dlat, dlng = sample_point_near(center, jitter_deg=0.15)
        else:
            c1, c2 = RNG.choice(len(CITY_CENTERS), size=2, replace=False)
            olat, olng = sample_point_near(CITY_CENTERS[c1], jitter_deg=0.1)
            dlat, dlng = sample_point_near(CITY_CENTERS[c2], jitter_deg=0.1)

        distance_km = haversine_km(olat, olng, dlat, dlng)

        hour = RNG.integers(0, 24)
        is_peak_hour = 1 if (8 <= hour <= 11 or 17 <= hour <= 21) else 0

        organ_type = organ_types[RNG.integers(0, len(organ_types))]
        priority_weight = ORGAN_PRIORITY_WEIGHT[organ_type]
        priority_speed_bonus = 1 + (priority_weight - 0.3) * 0.25

        # Real Indian organ transport uses road transport with police
        # "green corridor" escorts for short/intra-city distances, and
        # chartered/commercial flights (again with green-corridor road
        # legs on both ends) for longer inter-city distances -- road
        # alone would exceed viable cold-ischemia windows. We model both
        # modes so the ETA stays physically plausible at all distances.
        if distance_km <= 60:
            base_speed = 18 if is_peak_hour else 28
            effective_speed = base_speed * priority_speed_bonus
            overhead_minutes = RNG.uniform(8, 18)
        else:
            effective_speed = 480 * priority_speed_bonus
            overhead_minutes = RNG.uniform(60, 110)

        base_eta_minutes = (distance_km / effective_speed) * 60
        noise = RNG.normal(0, base_eta_minutes * 0.08)

        eta_minutes = max(base_eta_minutes + overhead_minutes + noise, 5)

        rows.append(
            {
                "distance_km": round(distance_km, 3),
                "hour_of_day": hour,
                "is_peak_hour": is_peak_hour,
                "organ_priority_weight": priority_weight,
                "eta_minutes": round(eta_minutes, 2),
            }
        )

    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = generate()
    df.to_csv("data/synthetic_transport_data.csv", index=False)
    print(f"Generated {len(df)} synthetic training rows -> data/synthetic_transport_data.csv")
    print(df.describe())
