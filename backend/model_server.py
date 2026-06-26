import json
import os
import numpy as np
import xgboost as xgb
import torch
import torch.nn as nn
import torch.nn.functional as F
import shap
from sentence_transformers import SentenceTransformer
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    from torch_geometric.nn import GCNConv
    from stable_baselines3 import PPO
    ADVANCED_MODE = True
except ImportError:
    ADVANCED_MODE = False

def get_path(filename):
    if os.path.exists(filename):
        return filename
    elif os.path.exists(os.path.join("backend", filename)):
        return os.path.join("backend", filename)
    return filename

print("Loading ML models (Embeddings, XGBoost, LSTM, GNN, RL)...")
try:
    encoder = SentenceTransformer("all-MiniLM-L6-v2")
    
    with open(get_path("classes.json"), "r") as f:
        classes_data = json.load(f)
        interest_classes = classes_data["interest_classes"]
        profile_classes = classes_data["profile_classes"]

    xgb_interest = xgb.XGBClassifier()
    xgb_interest.load_model(get_path("interest_model.json"))
    
    xgb_profile = xgb.XGBClassifier()
    xgb_profile.load_model(get_path("profile_model.json"))
    explainer = shap.TreeExplainer(xgb_profile)

    class TemporalProfiler(nn.Module):
        def __init__(self, input_dim=384, hidden_dim=128, output_dim=len(profile_classes)):
            super().__init__()
            self.lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True)
            self.fc = nn.Linear(hidden_dim, output_dim)
        def forward(self, x):
            out, (hn, cn) = self.lstm(x)
            return self.fc(hn[-1])

    lstm_model = TemporalProfiler()
    lstm_model.load_state_dict(torch.load(get_path("temporal_model.pth")))
    lstm_model.eval()

    if ADVANCED_MODE:
        class GNNRiskModel(nn.Module):
            def __init__(self, num_node_features, hidden_channels):
                super(GNNRiskModel, self).__init__()
                self.conv1 = GCNConv(num_node_features, hidden_channels)
                self.conv2 = GCNConv(hidden_channels, hidden_channels)
                self.fc = nn.Linear(hidden_channels, 1)
            def forward(self, x, edge_index):
                x = F.relu(self.conv1(x, edge_index))
                x = F.relu(self.conv2(x, edge_index))
                x = torch.mean(x, dim=0)
                return self.fc(x)

        gnn_model = GNNRiskModel(384, 64)
        gnn_model.load_state_dict(torch.load(get_path("gnn_risk_model.pth")))
        gnn_model.eval()

        rl_agent = PPO.load(get_path("ppo_antitracking_agent"))
    else:
        gnn_model = None
        rl_agent = None

    print("All advanced ML models loaded successfully.")
except Exception as e:
    print(f"Error loading advanced models: {e}")
    encoder = None

class ModelServerHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/predict":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            history_seq = data.get("historySequence", [])
            confidence = float(data.get("confidence", 0.0))
            uniqueness = float(data.get("uniqueness", 0.0))
            exposure = float(data.get("exposure", 0.0))

            if not history_seq:
                history_seq = ["wikipedia.org"]

            embeddings = encoder.encode(history_seq)
            mean_emb = np.mean(embeddings, axis=0).reshape(1, -1)

            # Interests
            probs = xgb_interest.predict_proba(mean_emb)[0]
            interests = {cls: round(float(p), 4) for cls, p in zip(interest_classes, probs)}

            # Profiles (LSTM)
            seq_t = torch.FloatTensor(embeddings).unsqueeze(0)
            with torch.no_grad():
                logits = lstm_model(seq_t)
                probs = torch.softmax(logits, dim=1)[0].numpy()
            profiles = {cls: round(float(p), 4) for cls, p in zip(profile_classes, probs)}

            # Risk (GNN)
            if ADVANCED_MODE and gnn_model:
                num_domains = len(history_seq)
                user_feat = torch.randn(1, 384)
                domain_feats = torch.tensor(embeddings)
                x = torch.cat([user_feat, domain_feats], dim=0)
                
                # Edges from user (0) to all domains
                edges_u_v = [0] * num_domains
                edges_v_u = list(range(1, num_domains + 1))
                edge_index = torch.tensor([edges_u_v + edges_v_u, edges_v_u + edges_u_v], dtype=torch.long)
                
                with torch.no_grad():
                    risk_val = gnn_model(x, edge_index).item()
                risk = min(99.0, max(10.0, risk_val))
            else:
                risk = min(99.0, max(10.0, (exposure * 0.5) + (uniqueness * 0.3) + (confidence * 0.2)))

            # SHAP
            shap_values_out = {}
            sv = explainer.shap_values(mean_emb)
            if isinstance(sv, list):
                for c_idx, cls_name in enumerate(profile_classes):
                    class_shap = sv[c_idx][0]
                    impacts = [{"feature": d, "impact": float(np.dot(embeddings[i], class_shap))} for i, d in enumerate(history_seq)]
                    impacts.sort(key=lambda x: x["impact"], reverse=True)
                    shap_values_out[cls_name] = impacts
            elif len(sv.shape) == 3:
                for c_idx, cls_name in enumerate(profile_classes):
                    class_shap = sv[0, :, c_idx]
                    impacts = [{"feature": d, "impact": float(np.dot(embeddings[i], class_shap))} for i, d in enumerate(history_seq)]
                    impacts.sort(key=lambda x: x["impact"], reverse=True)
                    shap_values_out[cls_name] = impacts
            else:
                for cls in profile_classes:
                    shap_values_out[cls] = [{"feature": d, "impact": 0.1} for d in history_seq]

            # RL Agent Recommendations
            recommended_decoy = ""
            if ADVANCED_MODE and rl_agent:
                state = np.array(list(profiles.values()), dtype=np.float32)
                if state.shape[0] == 6:
                    action, _ = rl_agent.predict(state, deterministic=True)
                    recommended_decoy = profile_classes[int(action)]

            response = {
                "interests": interests,
                "profiles": profiles,
                "risk": risk,
                "shapValues": shap_values_out,
                "rlRecommendation": recommended_decoy
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

    def log_message(self, format, *args):
        return

def run(port=5001):
    server_address = ('', port)
    httpd = HTTPServer(server_address, ModelServerHandler)
    print(f"GNN/RL Python server running on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run()
