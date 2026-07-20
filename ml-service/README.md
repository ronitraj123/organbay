# OrganBay ML Service

FastAPI microservice that predicts organ transport ETA (in minutes) from
logistics features. See the root project README.md for full context,
disclaimers, and deployment instructions.

## Local setup

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# (Re)generate synthetic data and train the model -- already included
# pre-trained in model/eta_model.joblib, but you can retrain any time:
python generate_synthetic_data.py
python train_model.py

# Run the API
uvicorn main:app --reload --port 8000
```

Test it:
```bash
curl -X POST http://localhost:8000/predict-eta \
  -H "Content-Type: application/json" \
  -d '{"origin_lat":28.5665,"origin_lng":77.21,"dest_lat":19.0296,"dest_lng":72.8437,"organ_type":"Heart"}'
```

## Model details

- **Algorithm**: Gradient Boosting Regressor (scikit-learn)
- **Features**: distance_km, hour_of_day, is_peak_hour, organ_priority_weight
- **Training data**: 6,000 self-generated synthetic samples modeling
  Indian metro road traffic (city driving) and flight transport
  (long-distance, with ground-handling overhead) -- see
  `generate_synthetic_data.py` for the full simulation logic and
  rationale for why synthetic data was used instead of a sourced dataset.
- **Test performance**: MAE ≈ 7.3 minutes, R² ≈ 0.98 (on synthetic
  held-out data -- this reflects how well the model learned the
  synthetic simulation, not real-world transport accuracy)

## Why synthetic data?

Real transplant logistics data is not publicly available (and
shouldn't be, for privacy reasons). Rather than using an unrelated
proxy dataset and overstating its relevance, this service is trained
on data we explicitly generated to model realistic Indian transport
conditions (metro traffic speeds, peak-hour slowdowns, flight-mode
transport with ground-handling overhead for long distances). This is
disclosed openly rather than presented as real-world validated data.
