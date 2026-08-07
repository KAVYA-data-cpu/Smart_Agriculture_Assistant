import pandas as pd

data = pd.read_csv("../datasets/Fertilizer Prediction.csv")

print("Soil Types:")
print(data["Soil Type"].unique())

print("\nCrop Types:")
print(data["Crop Type"].unique())