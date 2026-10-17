import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier
import joblib

df = pd.read_csv('dataset.csv')

features = ['rainfall', 'river_level', 'soil_moisture', 'temperature', 'humidity', 'elevation']
target = 'risk_level'

X = df[features]
y = df[target]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = XGBClassifier(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    eval_metric='mlogloss',
    random_state=42
)

model.fit(X_train, y_train)

y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"Test Accuracy: {acc:.4f}\n")
print("Hydrological Feature Importances:")
for f_name, imp in zip(features, model.feature_importances_):
    print(f"  - {f_name:14s}: {imp * 100:5.2f}%")

joblib.dump(model, 'model.pkl')
print("\nRetrained model saved to model.pkl successfully.")
