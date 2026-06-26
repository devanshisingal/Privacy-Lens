import pandas as pd
import joblib

from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
 
data = [
["github leetcode stackoverflow python", "Programming"],
["react nodejs typescript express", "Programming"],
["openai huggingface llm transformer", "AI / ML"],
["gemini claude anthropic ai", "AI / ML"],
["steam valorant csgo twitch", "Gaming"],
["xbox playstation esports gaming", "Gaming"],
["instagram facebook twitter tiktok", "Social Media"],
["amazon flipkart shopping ecommerce", "Shopping"],
["expedia airbnb booking hotels", "Travel"],
["nba espn football cricket", "Sports"],
["netflix spotify youtube movies", "Entertainment"],
["coinbase robinhood stocks crypto", "Finance"],
["recipes cooking food kitchen", "Cooking"],
["camera photography lens dpreview", "Photography"],
["gardening plants flowers backyard", "Gardening"]
] 

df = pd.DataFrame(data,columns=["history","label"])

model = Pipeline([
    ("tfidf",TfidfVectorizer()),
    ("clf",LogisticRegression())
])

model.fit(df["history"],df["label"])

joblib.dump(model,"interest_model.pkl")