import pandas as pd
import numpy as np

rows=[]

for _ in range(5000):

    confidence=np.random.uniform(0,100)
    uniqueness=np.random.uniform(0,100)
    exposure=np.random.uniform(0,100)

    risk=(
        confidence*0.4+
        uniqueness*0.3+
        exposure*0.3
    )

    rows.append([
        confidence,
        uniqueness,
        exposure,
        risk
    ])

df=pd.DataFrame(
    rows,
    columns=[
        "confidence",
        "uniqueness",
        "exposure",
        "risk"
    ]
)

df.to_csv(
    "backend/risk_data.csv",
    index=False
)

print("risk_data.csv created")