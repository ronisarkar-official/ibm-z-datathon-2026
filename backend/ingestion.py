import os
import time
import httpx
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
PORT = os.getenv("PORT", "8000")
API_URL = f"http://localhost:{PORT}"

SAMPLE_ZONES = [
    {"id": "7f8b9c1d-1111-4444-8888-abcdef000001", "name": "Kolkata North", "latitude": 22.5726, "longitude": 88.3639, "elevation": 9.0},
    {"id": "7f8b9c1d-2222-4444-8888-abcdef000002", "name": "Guwahati Riverfront", "latitude": 26.1445, "longitude": 91.7362, "elevation": 55.0},
    {"id": "7f8b9c1d-3333-4444-8888-abcdef000003", "name": "Patna Ganga Basin", "latitude": 25.5941, "longitude": 85.1376, "elevation": 53.0},
    {"id": "7f8b9c1d-4444-4444-8888-abcdef000004", "name": "Cuttack Mahanadi", "latitude": 20.4625, "longitude": 85.8828, "elevation": 36.0},
    {"id": "7f8b9c1d-5555-4444-8888-abcdef000005", "name": "Mumbai Mithi River", "latitude": 19.0760, "longitude": 72.8777, "elevation": 14.0}
]

supabase_client: Client | None = None
if SUPABASE_URL.startswith("http://") or SUPABASE_URL.startswith("https://"):
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    except Exception:
        supabase_client = None

def get_zones():
    if supabase_client:
        try:
            res = supabase_client.table("zones").select("*").execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception:
            pass
    try:
        res = httpx.get(f"{API_URL}/zones", timeout=5.0)
        data = res.json()
        if data and len(data) > 0:
            return data
    except Exception:
        pass
    return SAMPLE_ZONES

def run_ingestion_cycle():
    zones = get_zones()
    for zone in zones:
        lat = zone.get("latitude", 0.0)
        lon = zone.get("longitude", 0.0)
        elevation = zone.get("elevation", 10.0)
        zone_id = zone.get("id")

        try:
            response = httpx.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "precipitation,temperature_2m,relative_humidity_2m,rain"
                },
                timeout=10.0
            )
            data = response.json()
            current = data.get("current", {})

            rainfall = float(current.get("precipitation", current.get("rain", 0.0)))
            temperature = float(current.get("temperature_2m", 25.0))
            humidity = float(current.get("relative_humidity_2m", 60.0))

            # Hydrological river stage: base gauge height + rainfall runoff surge
            # Clamped within physical sensor bounds (0.5m - 14.0m)
            base_river_stage = 2.2 + (float(zone_id[-1], 16) % 3) * 0.6 if isinstance(zone_id, str) and zone_id else 2.5
            river_level = min(max(base_river_stage + (rainfall * 0.07), 0.5), 13.5)
            soil_moisture = min(max((humidity * 0.45) + (rainfall * 0.4) + 15.0, 20.0), 99.0)

            payload = {
                "zone_id": str(zone_id),
                "rainfall": round(rainfall, 2),
                "river_level": round(river_level, 2),
                "soil_moisture": round(soil_moisture, 2),
                "temperature": round(temperature, 2),
                "humidity": round(humidity, 2),
                "elevation": round(float(elevation), 2)
            }

            predict_res = httpx.post(f"{API_URL}/predict", json=payload, timeout=10.0)
            print(f"Zone {zone.get('name', zone_id)}: {predict_res.json()}")
        except Exception as e:
            print(f"Error ingesting zone {zone_id}: {e}")

def main():
    while True:
        run_ingestion_cycle()
        time.sleep(60)

if __name__ == "__main__":
    main()
