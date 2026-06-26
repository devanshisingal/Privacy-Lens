import pandas as pd
import joblib

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier

data = [

["github leetcode stackoverflow python", "Developer"],
["react nodejs express docker", "Developer"],
["openai huggingface transformers llm", "Developer"],

["steam valorant csgo twitch", "Gamer"],
["playstation xbox esports gaming", "Gamer"],

["instagram tiktok snapchat reels", "Student"],
["youtube netflix spotify memes", "Student"],

["coinbase robinhood crypto stocks", "CryptoEnthusiast"],
["bitcoin ethereum trading defi", "CryptoEnthusiast"],

["amazon shopping gadgets ecommerce", "TechBuyer"],
["apple samsung laptop reviews", "TechBuyer"],

["travel hotels flights booking", "LifestyleBuyer"],
["cooking recipes fitness wellness", "LifestyleBuyer"]

]

df = pd.DataFrame(
    data,
    columns=["history","profile"]
)

model = Pipeline([
    ("tfidf",TfidfVectorizer()),
    ("rf",RandomForestClassifier(
        n_estimators=100,
        random_state=42
    ))
])

model.fit(
    df["history"],
    df["profile"]
)

joblib.dump(
    model,
    "backend/profile_model.pkl"
)

print("Profile model trained")