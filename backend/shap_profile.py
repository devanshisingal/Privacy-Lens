import joblib
import json
import sys

model = joblib.load(
    "backend/profile_model.pkl"
)

text = sys.argv[1]

tfidf = model.named_steps["tfidf"]
rf = model.named_steps["rf"]

X = tfidf.transform([text])

features = tfidf.get_feature_names_out()

importances = rf.feature_importances_

result = []

for idx, feature in enumerate(features):

    if idx < len(importances):

        result.append({
            "feature": feature,
            "impact": round(
                float(importances[idx]),
                4
            )
        })

result = sorted(
    result,
    key=lambda x: x["impact"],
    reverse=True
)[:10]

print(
    json.dumps(result)
)