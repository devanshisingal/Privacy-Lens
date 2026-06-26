import json
import os
import joblib
from http.server import BaseHTTPRequestHandler, HTTPServer

def get_model_path(filename):
    if os.path.exists(filename):
        return filename
    elif os.path.exists(os.path.join("backend", filename)):
        return os.path.join("backend", filename)
    else:
        return filename

# Load all models at startup
print("Loading models into memory...")
try:
    interest_model = joblib.load(get_model_path("interest_model.pkl"))
    print("Interest model loaded.")
except Exception as e:
    print(f"Error loading interest model: {e}")
    interest_model = None

try:
    profile_model = joblib.load(get_model_path("profile_model.pkl"))
    print("Profile model loaded.")
except Exception as e:
    print(f"Error loading profile model: {e}")
    profile_model = None

try:
    risk_model = joblib.load(get_model_path("risk_model.pkl"))
    print("Risk model loaded.")
except Exception as e:
    print(f"Error loading risk model: {e}")
    risk_model = None

class ModelServerHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/predict":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Invalid JSON")
                return

            history_text = data.get("historyText", "").strip()
            confidence = float(data.get("confidence", 0.0))
            uniqueness = float(data.get("uniqueness", 0.0))
            exposure = float(data.get("exposure", 0.0))

            # 1. Predict Interests
            interests = {}
            if interest_model:
                try:
                    # If history_text is empty, we can provide a default/uniform prior
                    if not history_text:
                        interests = {cls: 1.0 / len(interest_model.classes_) for cls in interest_model.classes_}
                    else:
                        probs = interest_model.predict_proba([history_text])[0]
                        interests = {cls: round(float(p), 4) for cls, p in zip(interest_model.classes_, probs)}
                except Exception as e:
                    print(f"Error predicting interests: {e}")
            
            if not interests:
                interests = {
                    "Programming": 0.05, "AI / ML": 0.05, "Gaming": 0.05, "Social Media": 0.05,
                    "Finance": 0.05, "Entertainment": 0.05, "Sports": 0.05, "Shopping": 0.05,
                    "Cooking": 0.05, "Travel": 0.05, "Photography": 0.05, "Gardening": 0.05,
                    "General Search & News": 0.05
                }

            # 2. Predict Profiles
            profiles = {}
            if profile_model:
                try:
                    if not history_text:
                        profiles = {cls: 1.0 / len(profile_model.classes_) for cls in profile_model.classes_}
                    else:
                        probs = profile_model.predict_proba([history_text])[0]
                        profiles = {cls: round(float(p), 4) for cls, p in zip(profile_model.classes_, probs)}
                except Exception as e:
                    print(f"Error predicting profiles: {e}")
            
            if not profiles:
                profiles = {
                    "Developer": 0.2, "Gamer": 0.2, "Student": 0.2,
                    "TechBuyer": 0.2, "CryptoEnthusiast": 0.1, "LifestyleBuyer": 0.1
                }

            # 3. Predict Risk
            risk = 50.0
            calculated_confidence = 10
            if profiles:
                profile_scores = sorted(list(profiles.values()), reverse=True)
                max_profile_score = profile_scores[0] if len(profile_scores) > 0 else 0.1
                runner_profile_score = profile_scores[1] if len(profile_scores) > 1 else 0.05
                calculated_confidence = int(round(((max_profile_score + runner_profile_score) / 2) * 100))
            
            if risk_model:
                try:
                    risk_val = risk_model.predict([[calculated_confidence, uniqueness, exposure]])[0]
                    risk = round(float(risk_val), 2)
                except Exception as e:
                    print(f"Error predicting risk: {e}")

            # 4. Predict SHAP (local attribution lookup)
            shap_values = {}
            if profile_model:
                try:
                    tfidf = profile_model.named_steps["tfidf"]
                    rf = profile_model.named_steps["rf"]
                    features = tfidf.get_feature_names_out()
                    importances = rf.feature_importances_
                    
                    # Compute feature impacts (same as shap_profile.py)
                    feature_impacts = []
                    for idx, feature in enumerate(features):
                        if idx < len(importances):
                            feature_impacts.append({
                                "feature": feature,
                                "impact": round(float(importances[idx]), 4)
                            })
                    
                    sorted_features = sorted(feature_impacts, key=lambda x: x["impact"], reverse=True)[:10]
                    
                    # Populate it for the profile classes
                    for cls in profile_model.classes_:
                        shap_values[cls] = sorted_features
                except Exception as e:
                    print(f"Error computing SHAP values: {e}")
            
            # Fallback for SHAP values if empty
            if not shap_values:
                for cls in ["Developer", "Gamer", "Student", "TechBuyer", "CryptoEnthusiast", "LifestyleBuyer"]:
                    shap_values[cls] = []

            response = {
                "interests": interests,
                "profiles": profiles,
                "risk": risk,
                "shapValues": shap_values
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            # Enable CORS for ease of local debugging if needed
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def log_message(self, format, *args):
        # Suppress request log outputs to keep Node console clean
        return

def run(port=5001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, ModelServerHandler)
    print(f"Python model server running on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
