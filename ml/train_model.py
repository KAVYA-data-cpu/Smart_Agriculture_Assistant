import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# Read dataset
data = pd.read_csv("../datasets/Crop_recommendation.csv")

# Display first five rows
print(data.head())

# Display dataset shape
print("\nDataset Shape:")
print(data.shape)

# Display column names
print("\nColumns:")
print(data.columns)

# Display dataset information
print("\nDataset Information:")
print(data.info())
# Features
X = data.drop("label", axis=1)

# Target
y = data["label"]

print("\nFeatures (X):")
print(X.head())

print("\nTarget (y):")
print(y.head())

from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("\nTraining Data Shape:")
print(X_train.shape)

print("\nTesting Data Shape:")
print(X_test.shape)
model = RandomForestClassifier(
    n_estimators=200,
    random_state=42
)
model.fit(X_train, y_train)
predictions = model.predict(X_test)
from sklearn.metrics import accuracy_score
accuracy = accuracy_score(y_test, predictions)

print(f"Accuracy: {accuracy:.2f}")
import joblib
joblib.dump(model, "../models/crop_model.pkl")

