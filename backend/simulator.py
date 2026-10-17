import os
import random
import time
import httpx
from dotenv import load_dotenv

load_dotenv()

PORT = os.getenv("PORT", "8000")
API_URL = f"http://localhost:{PORT}"

ZONES = [
    {"id": "7f8b9c1d-1111-4444-8888-abcdef000001", "name": "Kolkata North", "elevation": 9.0},
    {"id": "7f8b9c1d-2222-4444-8888-abcdef000002", "name": "Guwahati Riverfront", "elevation": 55.0},
    {"id": "7f8b9c1d-3333-4444-8888-abcdef000003", "name": "Patna Ganga Basin", "elevation": 53.0},
    {"id": "7f8b9c1d-4444-4444-8888-abcdef000004", "name": "Cuttack Mahanadi", "elevation": 36.0},
    {"id": "7f8b9c1d-5555-4444-8888-abcdef000005", "name": "Mumbai Mithi River", "elevation": 14.0}
]

def get_active_zones():
    try:
        res = httpx.get(f"{API_URL}/zones", timeout=3.0)
        data = res.json()
        if data and len(data) > 0:
            return data
    except Exception:
        pass
    return ZONES

def generate_vitals(elevation, is_critical):
    if is_critical:
        rainfall = round(random.uniform(85.0, 140.0), 2)
        river_level = round(random.uniform(8.5, 13.0), 2)
        soil_moisture = round(random.uniform(85.0, 98.0), 2)
        temperature = round(random.uniform(22.0, 30.0), 2)
        humidity = round(random.uniform(85.0, 99.0), 2)
    else:
        rainfall = round(random.uniform(1.0, 45.0), 2)
        river_level = round(random.uniform(1.0, 5.5), 2)
        soil_moisture = round(random.uniform(30.0, 75.0), 2)
        temperature = round(random.uniform(25.0, 36.0), 2)
        humidity = round(random.uniform(40.0, 80.0), 2)

    return {
        "rainfall": rainfall,
        "river_level": river_level,
        "soil_moisture": soil_moisture,
        "temperature": temperature,
        "humidity": humidity,
        "elevation": round(float(elevation), 2)
    }

def main():
    zones = get_active_zones()
    zone_index = 0

    while True:
        zone = zones[zone_index]
        zone_index = (zone_index + 1) % len(zones)

        is_critical = random.random() < 0.15
        vitals = generate_vitals(zone.get("elevation", 10.0), is_critical)

        payload = {
            "zone_id": str(zone.get("id")),
            **vitals
        }

        try:
            res = httpx.post(f"{API_URL}/predict", json=payload, timeout=5.0)
            result = res.json()
            zone_name = zone.get('name', zone.get('id'))
            print(f"[{zone_name}] Risk: {result.get('risk_level')} (Score: {result.get('risk_score')}/100, Conf: {result.get('confidence', 99)}%) | Action: {result.get('recommendation')}", flush=True)
        except Exception as e:
            print(f"Error simulating for {zone.get('name')}: {e}", flush=True)

        time.sleep(4)

if __name__ == "__main__":
    main()
