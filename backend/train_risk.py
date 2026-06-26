import pandas as pd
import joblib

from xgboost import XGBRegressor

df=pd.read_csv(
    "backend/risk_data.csv"
)

X=df[
[
"confidence",
"uniqueness",
"exposure"
]
]

y=df["risk"]

model=XGBRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X,y)

joblib.dump(
    model,
    "backend/risk_model.pkl"
)

print("Risk model trained")