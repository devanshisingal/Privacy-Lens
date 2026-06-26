import os
import torch
import torch.nn as nn
import flwr as fl
from collections import OrderedDict
from train_models import TemporalProfiler, X_lstm_t, y_lstm_t

# Ensure models are imported correctly
num_classes = 6

# 1. Define Flower Client
class PrivacyClient(fl.client.NumPyClient):
    def __init__(self, model, data, target):
        self.model = model
        self.data = data
        self.target = target
        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=0.01)

    def get_parameters(self, config):
        return [val.cpu().numpy() for _, val in self.model.state_dict().items()]

    def set_parameters(self, parameters):
        params_dict = zip(self.model.state_dict().keys(), parameters)
        state_dict = OrderedDict({k: torch.tensor(v) for k, v in params_dict})
        self.model.load_state_dict(state_dict, strict=True)

    def fit(self, parameters, config):
        self.set_parameters(parameters)
        self.model.train()
        for _ in range(5): # local epochs
            self.optimizer.zero_grad()
            outputs = self.model(self.data)
            loss = self.criterion(outputs, self.target)
            loss.backward()
            self.optimizer.step()
        return self.get_parameters(config={}), len(self.data), {}

    def evaluate(self, parameters, config):
        self.set_parameters(parameters)
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(self.data)
            loss = self.criterion(outputs, self.target)
        return float(loss), len(self.data), {}

def client_fn(cid: str):
    # Simulate splitting data for clients
    split = len(X_lstm_t) // 2
    if cid == "0":
        return PrivacyClient(TemporalProfiler(), X_lstm_t[:split], y_lstm_t[:split]).to_client()
    else:
        return PrivacyClient(TemporalProfiler(), X_lstm_t[split:], y_lstm_t[split:]).to_client()

# 2. Run Simulated Federated Learning
print("Starting Federated Learning Simulation (2 clients, 3 rounds)...")

strategy = fl.server.strategy.FedAvg(
    fraction_fit=1.0,
    fraction_evaluate=1.0,
    min_fit_clients=2,
    min_evaluate_clients=2,
    min_available_clients=2,
)

history = fl.simulation.start_simulation(
    client_fn=client_fn,
    num_clients=2,
    config=fl.server.ServerConfig(num_rounds=3),
    strategy=strategy,
)

print("Federated Learning complete.")
print("Global model represents aggregated privacy-preserving knowledge without centralizing user history.")
