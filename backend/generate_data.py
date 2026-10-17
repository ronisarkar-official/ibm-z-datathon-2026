import numpy as np
import pandas as pd

np.random.seed(42)
n_samples = 5000

rainfall = np.concatenate([
    np.random.uniform(0, 20, int(n_samples * 0.40)),
    np.random.uniform(20.1, 50, int(n_samples * 0.25)),
    np.random.uniform(50.1, 80, int(n_samples * 0.20)),
    np.random.uniform(80.1, 150, int(n_samples * 0.15))
])
np.random.shuffle(rainfall)

river_level = np.clip(
    rainfall * 0.08 + np.random.uniform(1.0, 5.0, n_samples) + np.random.normal(0, 0.5, n_samples),
    0.5,
    14.0
)

humidity = np.clip(np.random.uniform(40, 95, n_samples) + (rainfall > 30) * 5, 30.0, 100.0)
soil_moisture = np.clip(humidity * 0.5 + rainfall * 0.4 + np.random.normal(0, 3, n_samples), 10.0, 100.0)
temperature = np.clip(np.random.uniform(20, 38, n_samples) - (rainfall > 50) * 4 + np.random.normal(0, 1.5, n_samples), 15.0, 45.0)
elevation = np.clip(np.random.exponential(scale=40, size=n_samples) + 2.0, 2.0, 500.0)

# Realistic Hydrological Risk Index modeling
# Rain & river stage represent primary drivers (~70% weight)
rain_score = np.clip((rainfall / 120.0) * 36.0, 0, 45)
river_score = np.clip((river_level / 10.0) * 34.0, 0, 40)

# Soil saturation factor: saturated soil (>75%) cannot absorb runoff, elevating risk
soil_factor = np.where(soil_moisture > 75, (soil_moisture - 75) * 0.35, 0)

# Topographic elevation factor: low-lying valleys and plains (<25m) are flood-prone
elevation_factor = np.where(elevation < 25, (25 - elevation) * 0.45, np.where(elevation > 80, -6, 0))

composite = rain_score + river_score + soil_factor + elevation_factor + np.random.normal(0, 2, n_samples)

# Classification thresholds
labels = np.where(composite >= 62, 3, np.where(composite >= 42, 2, np.where(composite >= 22, 1, 0)))

df = pd.DataFrame({
    'rainfall': np.round(rainfall, 2),
    'river_level': np.round(river_level, 2),
    'soil_moisture': np.round(soil_moisture, 2),
    'temperature': np.round(temperature, 2),
    'humidity': np.round(humidity, 2),
    'elevation': np.round(elevation, 2),
    'risk_level': labels
})

df.to_csv('dataset.csv', index=False)
print(f"Generated {len(df)} rows. Class distribution:")
print(df['risk_level'].value_counts())
