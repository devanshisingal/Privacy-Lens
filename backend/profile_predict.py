import joblib
import sys
import json

model = joblib.load(
    "backend/profile_model.pkl"
)

text = sys.argv[1]

probs = model.predict_proba([text])[0]

result = {}

for cls,p in zip(
    model.classes_,
    probs
):
    result[cls] = round(
        float(p),
        4
    )

print(json.dumps(result))