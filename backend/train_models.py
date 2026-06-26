import os
import json
import numpy as np
import xgboost as xgb
import torch
import torch.nn as nn
import torch.nn.functional as F
from sentence_transformers import SentenceTransformer

# Try importing advanced libraries
try:
    from torch_geometric.nn import GCNConv
    from torch_geometric.data import Data
    import gymnasium as gym
    from stable_baselines3 import PPO
    ADVANCED_MODE = True
except ImportError:
    print("Advanced libraries not found, skipping GNN and RL training.")
    ADVANCED_MODE = False

print("Loading SentenceTransformer...")
encoder = SentenceTransformer("all-MiniLM-L6-v2")

# --- Synthetic Data Generation ---
print("Generating synthetic data...")
domains = [
    ("github.com", "Programming", "Developer"),
    ("stackoverflow.com", "Programming", "Developer"),
    ("leetcode.com", "Programming", "Student"),
    ("python.org", "Programming", "Developer"),
    ("openai.com", "AI / ML", "TechBuyer"),
    ("huggingface.co", "AI / ML", "Developer"),
    ("steampowered.com", "Gaming", "Gamer"),
    ("twitch.tv", "Gaming", "Gamer"),
    ("espn.com", "Sports", "LifestyleBuyer"),
    ("amazon.com", "Shopping", "LifestyleBuyer"),
    ("robinhood.com", "Finance", "CryptoEnthusiast"),
    ("coinbase.com", "Finance", "CryptoEnthusiast"),
]

interest_classes = list(set([d[1] for d in domains]))
profile_classes = ["Developer", "Gamer", "Student", "TechBuyer", "CryptoEnthusiast", "LifestyleBuyer"]

interest_to_id = {c: i for i, c in enumerate(interest_classes)}
profile_to_id = {c: i for i, c in enumerate(profile_classes)}

X_xgb, y_interest, y_profile, X_lstm, y_lstm = [], [], [], [], []

import random
np.random.seed(42)
random.seed(42)

for _ in range(1000):
    session_len = random.randint(3, 10)
    session_domains = random.choices(domains, k=session_len)
    
    profiles = [d[2] for d in session_domains]
    interests = [d[1] for d in session_domains]
    primary_profile = max(set(profiles), key=profiles.count)
    primary_interest = max(set(interests), key=interests.count)
    
    domain_texts = [d[0] for d in session_domains]
    embeddings = encoder.encode(domain_texts)
    
    X_xgb.append(np.mean(embeddings, axis=0))
    y_interest.append(interest_to_id[primary_interest])
    y_profile.append(profile_to_id[primary_profile])
    
    pad_len = 10 - session_len
    padded_emb = np.pad(embeddings, ((0, pad_len), (0, 0)), mode='constant')
    X_lstm.append(padded_emb)
    y_lstm.append(profile_to_id[primary_profile])

X_xgb = np.array(X_xgb)
y_interest = np.array(y_interest)
y_profile = np.array(y_profile)
X_lstm_t = torch.FloatTensor(np.array(X_lstm))
y_lstm_t = torch.LongTensor(np.array(y_lstm))

# --- Train XGBoost Models ---
print("Training XGBoost Models...")
xgb_interest = xgb.XGBClassifier(objective='multi:softprob', num_class=len(interest_classes), eval_metric='mlogloss')
xgb_interest.fit(X_xgb, y_interest)
xgb_interest.save_model("interest_model.json")

xgb_profile = xgb.XGBClassifier(objective='multi:softprob', num_class=len(profile_classes), eval_metric='mlogloss')
xgb_profile.fit(X_xgb, y_profile)
xgb_profile.save_model("profile_model.json")

with open("classes.json", "w") as f:
    json.dump({"interest_classes": interest_classes, "profile_classes": profile_classes}, f)

# --- Train PyTorch LSTM Model ---
print("Training PyTorch LSTM...")
class TemporalProfiler(nn.Module):
    def __init__(self, input_dim=384, hidden_dim=128, output_dim=len(profile_classes)):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, output_dim)
    def forward(self, x):
        out, (hn, cn) = self.lstm(x)
        return self.fc(hn[-1])

lstm_model = TemporalProfiler()
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(lstm_model.parameters(), lr=0.01)

lstm_model.train()
for epoch in range(50):
    optimizer.zero_grad()
    outputs = lstm_model(X_lstm_t)
    loss = criterion(outputs, y_lstm_t)
    loss.backward()
    optimizer.step()
torch.save(lstm_model.state_dict(), "temporal_model.pth")

if ADVANCED_MODE:
    # --- Train GNN Risk Model ---
    print("Training GNN Risk Model...")
    class GNNRiskModel(nn.Module):
        def __init__(self, num_node_features, hidden_channels):
            super(GNNRiskModel, self).__init__()
            self.conv1 = GCNConv(num_node_features, hidden_channels)
            self.conv2 = GCNConv(hidden_channels, hidden_channels)
            self.fc = nn.Linear(hidden_channels, 1)

        def forward(self, x, edge_index):
            x = self.conv1(x, edge_index)
            x = F.relu(x)
            x = self.conv2(x, edge_index)
            x = F.relu(x)
            # Pool all nodes to predict graph-level risk
            x = torch.mean(x, dim=0)
            return self.fc(x)

    # Mock a simple tracking graph (3 domains + 1 user node)
    # Edge index: user(0) connected to domains (1, 2, 3)
    edge_index = torch.tensor([[0, 1, 0, 2, 0, 3],
                               [1, 0, 2, 0, 3, 0]], dtype=torch.long)
    # Mock node features (User + 3 domains encoded as 384d vectors)
    x = torch.randn(4, 384)
    gnn_model = GNNRiskModel(num_node_features=384, hidden_channels=64)
    gnn_optimizer = torch.optim.Adam(gnn_model.parameters(), lr=0.01)
    gnn_criterion = nn.MSELoss()
    target_risk = torch.tensor([75.0])
    
    gnn_model.train()
    for _ in range(50):
        gnn_optimizer.zero_grad()
        out = gnn_model(x, edge_index)
        loss = gnn_criterion(out, target_risk)
        loss.backward()
        gnn_optimizer.step()
    torch.save(gnn_model.state_dict(), "gnn_risk_model.pth")

    # --- Train RL Anti-Tracking Agent ---
    print("Training RL Agent for Anti-Tracking (Stable-Baselines3)...")
    class PrivacyEnv(gym.Env):
        def __init__(self):
            super(PrivacyEnv, self).__init__()
            # Action space: Recommend one of 6 profile categories as decoy
            self.action_space = gym.spaces.Discrete(6)
            # Observation space: Current probability distribution of the 6 profiles
            self.observation_space = gym.spaces.Box(low=0.0, high=1.0, shape=(6,), dtype=np.float32)
            self.state = np.array([0.8, 0.05, 0.05, 0.05, 0.025, 0.025], dtype=np.float32)
            self.step_count = 0

        def step(self, action):
            self.step_count += 1
            # If action matches highest prob index, penalty. If different, reward (dilutes profile)
            max_idx = np.argmax(self.state)
            if action == max_idx:
                reward = -1.0
            else:
                reward = 1.0
                # Dilute the state towards the action
                self.state[max_idx] -= 0.1
                self.state[action] += 0.1
                self.state = np.clip(self.state, 0, 1)
                self.state = self.state / np.sum(self.state)
            
            terminated = bool(self.state[max_idx] < 0.3 or self.step_count > 10)
            return self.state, reward, terminated, False, {}

        def reset(self, seed=None, options=None):
            super().reset(seed=seed)
            self.state = np.array([0.8, 0.05, 0.05, 0.05, 0.025, 0.025], dtype=np.float32)
            self.step_count = 0
            return self.state, {}

    env = PrivacyEnv()
    rl_model = PPO("MlpPolicy", env, verbose=0, n_steps=64)
    rl_model.learn(total_timesteps=1000)
    rl_model.save("ppo_antitracking_agent")

print("All models trained and saved successfully.")
