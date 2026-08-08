import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# Read fertilizer dataset
data = pd.read_csv(
    "C://Users//Admin//OneDrive//Desktop//Smart-Agriculture-Assistant-old//datasets//Fertilizer Prediction.csv"
)

# Show first 5 rows
print(data.head())

# Show number of rows and columns
print(data.shape)

# Show all column names
print(data.columns)

# Show information about dataset
print(data.info())

soil_encoder = LabelEncoder()
crop_encoder = LabelEncoder()
fertilizer_encoder = LabelEncoder()

data["Soil Type"] = soil_encoder.fit_transform(data["Soil Type"])
data["Crop Type"] = crop_encoder.fit_transform(data["Crop Type"])
data["Fertilizer Name"] = fertilizer_encoder.fit_transform(data["Fertilizer Name"])

print(data.head())

# Features
X = data.drop("Fertilizer Name", axis=1)

# Target
y = data["Fertilizer Name"]

print("\nFeatures (X):")
print(X.head())

print("\nTarget (y):")
print(y.head())

# Split the dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print("Training Features Shape :", X_train.shape)
print("Testing Features Shape  :", X_test.shape)
print("Training Target Shape   :", y_train.shape)
print("Testing Target Shape    :", y_test.shape)

# --- FIX 1: cap n_estimators and set max_depth so trees don't grow unbounded ---
# --- FIX 2: min_samples_leaf prevents tiny, memory-heavy leaf nodes ---
model = RandomForestClassifier(
    n_estimators=100,       # reduced from 200
    max_depth=15,           # was unset (unlimited) - this was the main cause of bloat
    min_samples_leaf=2,     # avoids overly specific, deep splits
    random_state=42,
    n_jobs=-1                # uses all CPU cores, trains faster
)

# Train the model
model.fit(X_train, y_train)
print("Model trained successfully!")

# Predict on testing data
predictions = model.predict(X_test)

print("Predictions:")
print(predictions[:10])
print("\nActual Values:")
print(y_test[:10].values)
print("\nPredicted Values:")
print(predictions[:10])

accuracy = accuracy_score(y_test, predictions)
print(f"\nAccuracy : {accuracy:.2f}")

# --- FIX 3: compress=3 shrinks file size significantly with no accuracy loss ---
joblib.dump(model, "../models/fertilizer_model.pkl", compress=3)
print("Model saved successfully!")

joblib.dump(soil_encoder, "../models/soil_encoder.pkl", compress=3)
joblib.dump(crop_encoder, "../models/crop_encoder.pkl", compress=3)
joblib.dump(fertilizer_encoder, "../models/fertilizer_encoder.pkl", compress=3)
print("Encoders saved successfully!")

# Print final file size so you can confirm the fix worked
import os
size_mb = os.path.getsize("../models/fertilizer_model.pkl") / (1024 * 1024)
print(f"\nFinal model file size: {size_mb:.2f} MB")