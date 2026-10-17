import httpx

zones = [
    ('Kolkata North', 22.5726, 88.3639, 9.0),
    ('Guwahati Riverfront', 26.1445, 91.7362, 55.0),
    ('Patna Ganga Basin', 25.5941, 85.1376, 53.0),
    ('Cuttack Mahanadi', 20.4625, 85.8828, 36.0),
    ('Mumbai Mithi River', 19.0760, 72.8777, 14.0)
]

print("FETCHING REAL-TIME LIVE SENSOR TELEMETRY FROM OPEN-METEO & GLOFAS:")
print("=" * 80)

for name, lat, lon, elev in zones:
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,soil_moisture_0_to_1cm"
    res = httpx.get(url, timeout=10.0).json().get('current', {})
    
    flood_url = f"https://flood-api.open-meteo.com/v1/flood?latitude={lat}&longitude={lon}&daily=river_discharge"
    f_res = httpx.get(flood_url, timeout=10.0).json().get('daily', {})
    discharges = f_res.get('river_discharge', [0.0])
    discharge = discharges[0] if discharges and discharges[0] is not None else 2.5
    
    temp = res.get('temperature_2m')
    hum = res.get('relative_humidity_2m')
    rain = res.get('precipitation', 0.0)
    raw_soil = res.get('soil_moisture_0_to_1cm', 0.15)
    soil_pct = round(min(max((raw_soil / 0.45) * 100.0, 15.0), 98.0), 1)

    print(f"{name:20s} | Temp: {temp}°C | Humidity: {hum}% | Rain: {rain}mm | Soil Saturation: {soil_pct}% | Discharge: {discharge} m³/s")

print("=" * 80)
