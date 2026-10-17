import os
import sys
from dotenv import load_dotenv
import httpx
from supabase import create_client

def test_supabase_connection():
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    print("=" * 60)
    print("SUPABASE DATABASE DIAGNOSTIC")
    print("=" * 60)
    print(f"Target URL: {url}")
    print(f"Key configured: {'YES (starts with ' + key[:12] + '...)' if key else 'NO'}")
    print("-" * 60)

    if not url or not key:
        print("[FAIL] SUPABASE_URL or SUPABASE_SERVICE_KEY is missing in backend/.env")
        return False

    # 1. Test basic HTTP Reachability and PostgREST endpoint
    try:
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}"
        }
        resp = httpx.get(f"{url}/rest/v1/", headers=headers, timeout=10.0)
        if resp.status_code == 200:
            print("[PASS] 1. Network & Authentication: Connected successfully (HTTP 200)")
            spec = resp.json()
            definitions = list(spec.get("definitions", {}).keys())
            print(f"       Tables detected in schema: {definitions if definitions else 'NONE (0 tables)'}")
        else:
            print(f"[FAIL] 1. Authentication / Endpoint error: HTTP {resp.status_code}")
            print(f"       Response: {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"[FAIL] 1. Network Connection Failed: {e}")
        return False

    # 2. Test Supabase Client queries
    try:
        client = create_client(url, key)
    except Exception as e:
        print(f"[FAIL] 2. Client Initialization Failed: {e}")
        return False

    tables_to_check = ["zones", "predictions", "alert_log"]
    existing_tables = []
    missing_tables = []

    for table in tables_to_check:
        try:
            res = client.table(table).select("*").limit(5).execute()
            count = len(res.data) if res.data is not None else 0
            print(f"[PASS] 2. Table '{table}' exists: found {count} sample row(s)")
            existing_tables.append(table)
        except Exception as e:
            err_msg = str(e)
            if "PGRST205" in err_msg or "Could not find the table" in err_msg:
                print(f"[FAIL] 2. Table '{table}' DOES NOT EXIST in the database")
            else:
                print(f"[FAIL] 2. Table '{table}' query failed: {err_msg[:120]}")
            missing_tables.append(table)

    print("-" * 60)
    if missing_tables:
        print(f"[SUMMARY] Connected to Supabase, but {len(missing_tables)} required table(s) are MISSING: {missing_tables}")
        print("          Action required: Run 'backend/schema.sql' in the Supabase SQL Editor.")
        return False
    else:
        print("[SUMMARY] All tables exist and database is fully operational!")
        return True

if __name__ == "__main__":
    success = test_supabase_connection()
    sys.exit(0 if success else 1)
