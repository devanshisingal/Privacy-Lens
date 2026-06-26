import sys
import json
import joblib

model = joblib.load(
    "backend/risk_model.pkl"
)

confidence=float(sys.argv[1])
uniqueness=float(sys.argv[2])
exposure=float(sys.argv[3])

risk=model.predict([[
    confidence,
    uniqueness,
    exposure
]])[0]

print(
 json.dumps({
   "risk":round(
       float(risk),
       2
   )
 })
)