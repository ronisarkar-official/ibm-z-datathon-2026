import os
from dotenv import load_dotenv
from supabase import create_client

def clean_stale_scores():
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        print("[FAIL] Missing Supabase credentials")
        return

    client = create_client(url, key)

    bracket_ranges = {
        "Safe": (6, 24),
        "Advisory": (26, 49),
        "Warning": (52, 74),
        "Critical": (77, 98),
    }

    # Fetch all predictions
    res = client.table("predictions").select("id,zone_id,risk_level,risk_score,rainfall,river_level,soil_moisture").execute()
    rows = res.data or []
    print(f"Total predictions fetched: {len(rows)}")

    updated_count = 0
    for row in rows:
        risk_level = row.get("risk_level", "Safe")
        current_score = row.get("risk_score", 0)

        # Recalibrate if score is 100 for non-critical, or if score is out of bracket
        low, high = bracket_ranges.get(risk_level, (10, 50))
        if (risk_level != "Critical" and current_score == 100) or (current_score > high or current_score < low):
            rainfall = float(row.get("rainfall", 10.0))
            river_level = float(row.get("river_level", 2.0))
            soil_moisture = float(row.get("soil_moisture", 50.0))

            rain_norm = min(max(rainfall / 120.0, 0.0), 1.0)
            river_norm = min(max(river_level / 12.0, 0.0), 1.0)
            soil_norm = min(max(soil_moisture / 100.0, 0.0), 1.0)
            vital_factor = (rain_norm * 0.45) + (river_norm * 0.40) + (soil_norm * 0.15)

            new_score = int(round(low + (high - low) * vital_factor))
            new_score = max(low, min(high, new_score))

            client.table("predictions").update({"risk_score": new_score}).eq("id", row["id"]).execute()
            updated_count += 1

    print(f"[SUCCESS] Recalibrated and updated {updated_count} prediction rows in Supabase.")

if __name__ == "__main__":
    clean_stale_scores()
