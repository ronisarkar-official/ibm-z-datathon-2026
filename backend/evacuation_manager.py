import json
import os
import uuid
from datetime import datetime, timezone
from supabase import Client

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "evacuation_data.json")

INITIAL_DATA = {
    "zones_meta": {
        "7f8b9c1d-1111-4444-8888-abcdef000001": {
            "name": "Kolkata North",
            "district": "Kolkata",
            "state": "West Bengal",
            "river_basin": "Hooghly / Ganga Delta",
            "population": "142,500 residents",
            "coordinator": {"name": "S. K. Mukherjee, IAS", "title": "District Disaster Incident Commander", "phone": "+91 33 2214-5555"}
        },
        "7f8b9c1d-2222-4444-8888-abcdef000002": {
            "name": "Guwahati Riverfront",
            "district": "Kamrup Metropolitan",
            "state": "Assam",
            "river_basin": "Brahmaputra Valley",
            "population": "96,000 residents",
            "coordinator": {"name": "D. H. Saikia, ACS", "title": "State Disaster Response Liaison", "phone": "+91 361 223-7000"}
        },
        "7f8b9c1d-3333-4444-8888-abcdef000003": {
            "name": "Patna Ganga Basin",
            "district": "Patna",
            "state": "Bihar",
            "river_basin": "Middle Ganga Plains",
            "population": "115,000 residents",
            "coordinator": {"name": "R. K. Verma, IAS", "title": "Regional Mitigation Director", "phone": "+91 612 221-5000"}
        },
        "7f8b9c1d-4444-4444-8888-abcdef000004": {
            "name": "Cuttack Mahanadi",
            "district": "Cuttack",
            "state": "Odisha",
            "river_basin": "Mahanadi Delta",
            "population": "78,000 residents",
            "coordinator": {"name": "P. K. Mohapatra, OAS", "title": "Coastal Hazard Response Chief", "phone": "+91 671 250-8000"}
        },
        "7f8b9c1d-5555-4444-8888-abcdef000005": {
            "name": "Mumbai Mithi River",
            "district": "Mumbai Suburban",
            "state": "Maharashtra",
            "river_basin": "Mithi Catchment",
            "population": "185,000 residents",
            "coordinator": {"name": "A. S. Chahal, IAS", "title": "Municipal Disaster Operations Head", "phone": "+91 22 2262-0200"}
        }
    },
    "orders": {},
    "shelters": {
        "7f8b9c1d-1111-4444-8888-abcdef000001": [
            {"id": "sh-kol-1", "name": "Salt Lake Central Indoor Stadium", "capacity": "3,500 evacuees", "occupancy": 420, "status": "Open", "address": "Sector III, Bidhannagar, Kolkata"},
            {"id": "sh-kol-2", "name": "North 24 Parganas District College", "capacity": "2,200 evacuees", "occupancy": 180, "status": "Open", "address": "Jessore Road, Kolkata"},
            {"id": "sh-kol-3", "name": "Bagbazar Multi-Purpose Relief Shelter", "capacity": "1,800 evacuees", "occupancy": 1450, "status": "Filling", "address": "Bagbazar Circular Road, Kolkata"}
        ],
        "7f8b9c1d-2222-4444-8888-abcdef000002": [
            {"id": "sh-guw-1", "name": "Sarusajai Stadium Evacuation Hub", "capacity": "4,000 evacuees", "occupancy": 600, "status": "Open", "address": "Lokhra Road, Guwahati"},
            {"id": "sh-guw-2", "name": "Kamrup Metro Disaster Transit Center", "capacity": "2,000 evacuees", "occupancy": 310, "status": "Open", "address": "Panbazar, Guwahati"}
        ],
        "7f8b9c1d-3333-4444-8888-abcdef000003": [
            {"id": "sh-pat-1", "name": "Patliputra Sports Complex Shelter", "capacity": "3,000 evacuees", "occupancy": 450, "status": "Open", "address": "Kankarbagh, Patna"},
            {"id": "sh-pat-2", "name": "Danapur Multi-Purpose Relief Hall", "capacity": "1,800 evacuees", "occupancy": 200, "status": "Open", "address": "Danapur Cantonment, Patna"}
        ],
        "7f8b9c1d-4444-4444-8888-abcdef000004": [
            {"id": "sh-cut-1", "name": "Barabati Indoor Relief Center", "capacity": "2,800 evacuees", "occupancy": 350, "status": "Open", "address": "Stadium Road, Cuttack"},
            {"id": "sh-cut-2", "name": "Mahanadi Barrage Emergency Camp", "capacity": "1,600 evacuees", "occupancy": 120, "status": "Open", "address": "Jobra, Cuttack"}
        ],
        "7f8b9c1d-5555-4444-8888-abcdef000005": [
            {"id": "sh-mum-1", "name": "Bandra Kurla Complex Transit Hub", "capacity": "5,000 evacuees", "occupancy": 850, "status": "Open", "address": "BKC MMRDA Ground, Mumbai"},
            {"id": "sh-mum-2", "name": "Kurla Municipal High School Shelter", "capacity": "2,000 evacuees", "occupancy": 400, "status": "Open", "address": "LBS Marg, Kurla West, Mumbai"}
        ]
    },
    "routes": {
        "7f8b9c1d-1111-4444-8888-abcdef000001": [
            {"id": "rt-kol-1", "name": "VIP Road Arterial Highway", "status": "Clear", "eta": "15 min"},
            {"id": "rt-kol-2", "name": "Belghoria Elevated Expressway", "status": "Clear", "eta": "12 min"},
            {"id": "rt-kol-3", "name": "Strand Road Riverfront Access", "status": "Flooded", "eta": "CLOSED"}
        ],
        "7f8b9c1d-2222-4444-8888-abcdef000002": [
            {"id": "rt-guw-1", "name": "GS Road Elevated Corridor", "status": "Clear", "eta": "10 min"},
            {"id": "rt-guw-2", "name": "Brahmaputra Embankment Road", "status": "Flooded", "eta": "CLOSED"}
        ],
        "7f8b9c1d-3333-4444-8888-abcdef000003": [
            {"id": "rt-pat-1", "name": "Bailey Road Flyover Corridor", "status": "Clear", "eta": "14 min"},
            {"id": "rt-pat-2", "name": "Ganga Pathway Ring Route", "status": "Restricted", "eta": "25 min"}
        ],
        "7f8b9c1d-4444-4444-8888-abcdef000004": [
            {"id": "rt-cut-1", "name": "NH-16 Bhubaneswar Expressway", "status": "Clear", "eta": "18 min"},
            {"id": "rt-cut-2", "name": "Ring Road Embankment Route", "status": "Restricted", "eta": "22 min"}
        ],
        "7f8b9c1d-5555-4444-8888-abcdef000005": [
            {"id": "rt-mum-1", "name": "Western Express Highway Elevated", "status": "Clear", "eta": "15 min"},
            {"id": "rt-mum-2", "name": "SCLR East-West Corridor", "status": "Clear", "eta": "12 min"},
            {"id": "rt-mum-3", "name": "Mithi River Low-Level Service Lane", "status": "Flooded", "eta": "CLOSED"}
        ]
    },
    "broadcasts": []
}

class EvacuationManager:
    def __init__(self, supabase: Client | None):
        self.supabase = supabase
        self._ensure_storage()

    def _ensure_storage(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(DATA_FILE):
            with open(DATA_FILE, "w", encoding="utf-8") as f:
                json.dump(INITIAL_DATA, f, indent=2)

    def _load_data(self) -> dict:
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return INITIAL_DATA

    def _save_data(self, data: dict):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_zone_status(self, zone_id: str) -> dict:
        data = self._load_data()
        meta = data["zones_meta"].get(zone_id, {
            "name": f"Zone {zone_id[:8]}",
            "district": "Monitored District",
            "state": "Hazard Area",
            "river_basin": "Monitored Basin",
            "population": "85,000 residents",
            "coordinator": {"name": "Disaster Mitigation Chief", "title": "Regional Incident Commander", "phone": "1077 (Disaster Toll-Free)"}
        })

        # Try fetching from Supabase if table exists
        supabase_order = None
        if self.supabase:
            try:
                res = self.supabase.table("evacuation_orders").select("*").eq("zone_id", zone_id).order("authorized_at", desc=True).limit(1).execute()
                if res.data and len(res.data) > 0:
                    cand = res.data[0]
                    if cand.get("status") not in ["StoodDown", "Cancelled", "Resolved"]:
                        supabase_order = cand
            except Exception:
                pass

        order = supabase_order if supabase_order is not None else data["orders"].get(zone_id)
        if order and order.get("status") in ["StoodDown", "Cancelled", "Resolved"]:
            order = None

        shelters = data["shelters"].get(zone_id, [])
        routes = data["routes"].get(zone_id, [])

        return {
            "zone_id": zone_id,
            "metadata": meta,
            "active_order": order,
            "shelters": shelters,
            "routes": routes
        }

    def get_all_active_orders(self) -> dict:
        data = self._load_data()
        orders = {
            k: v for k, v in data.get("orders", {}).items()
            if v and v.get("status") not in ["StoodDown", "Cancelled", "Resolved"]
        }

        # Augment with Supabase orders if available
        if self.supabase:
            try:
                res = self.supabase.table("evacuation_orders").select("*").order("authorized_at", desc=True).execute()
                seen_zones = set()
                for o in res.data or []:
                    zid = o.get("zone_id")
                    if zid and zid not in seen_zones:
                        seen_zones.add(zid)
                        status = o.get("status")
                        if status in ["Dispatched", "Active"]:
                            orders[zid] = o
                        elif zid in orders and status in ["StoodDown", "Cancelled", "Resolved"]:
                            orders.pop(zid, None)
            except Exception:
                pass

        return orders

    def stand_down_evacuation(self, zone_id: str, reason: str = "Flood waters receded to safe threshold") -> dict:
        now_iso = datetime.now(timezone.utc).isoformat()
        data = self._load_data()
        existing_order = data.get("orders", {}).pop(zone_id, None)

        updated_order = existing_order or {"zone_id": zone_id}
        updated_order["status"] = "StoodDown"
        updated_order["stood_down_at"] = now_iso
        updated_order["stand_down_reason"] = reason
        self._save_data(data)

        if self.supabase:
            try:
                self.supabase.table("evacuation_orders").update({
                    "status": "StoodDown",
                    "stood_down_at": now_iso
                }).eq("zone_id", zone_id).execute()
            except Exception as e:
                print(f"[Supabase Notice] evacuation_orders update: {e}")

            try:
                meta = data.get("zones_meta", {}).get(zone_id, {})
                zone_name = meta.get("name", f"Zone {zone_id[:8]}")
                alert_entry = {
                    "zone_id": zone_id,
                    "risk_level": "Safe",
                    "message": f"🟢 [EVACUATION STOOD DOWN] Directive for {zone_name} stood down ({reason}). Area declared safe to repopulate.",
                    "triggered_at": now_iso,
                    "acknowledged": True
                }
                self.supabase.table("alert_log").insert(alert_entry).execute()
            except Exception as e:
                print(f"[Supabase Error] alert_log insert failed: {e}")

        return {"status": "success", "zone_id": zone_id, "order": updated_order}

    def reset_all_evacuations(self) -> dict:
        data = self._load_data()
        data["orders"] = {}
        self._save_data(data)

        if self.supabase:
            try:
                self.supabase.table("evacuation_orders").update({
                    "status": "StoodDown"
                }).neq("status", "StoodDown").execute()
            except Exception as e:
                print(f"[Supabase Notice] reset_all_evacuations: {e}")

        return {"status": "success", "message": "All evacuation orders stood down"}

    def authorize_evacuation(self, zone_id: str, risk_level: str, authorized_by: str, commander_phone: str, units: list, notes: str) -> dict:
        now_iso = datetime.now(timezone.utc).isoformat()
        short_id = zone_id.split("-")[1] if "-" in zone_id else zone_id[:4]
        code = f"EAP-{short_id.upper()}-{datetime.now().strftime('%Y%m%d%H%M')}"

        order = {
            "id": str(uuid.uuid4()),
            "zone_id": zone_id,
            "risk_level": risk_level,
            "status": "Dispatched",
            "authorized_by": authorized_by,
            "commander_phone": commander_phone,
            "authorization_code": code,
            "deployed_units": units,
            "incident_notes": notes,
            "authorized_at": now_iso
        }

        # 1. Save in local durable store
        data = self._load_data()
        data["orders"][zone_id] = order
        self._save_data(data)

        # 2. Persist in Supabase evacuation_orders
        if self.supabase:
            try:
                self.supabase.table("evacuation_orders").insert(order).execute()
            except Exception as e:
                print(f"[Supabase Notice] evacuation_orders table insert: {e}")

            # 3. Write urgent emergency log to Supabase alert_log table (guaranteed table)
            try:
                alert_entry = {
                    "zone_id": zone_id,
                    "risk_level": "Critical",
                    "message": f"🚨 [EVACUATION AUTHORIZED] Direct incident dispatch {code} signed by {authorized_by}. Emergency units deployed.",
                    "triggered_at": now_iso,
                    "acknowledged": False
                }
                self.supabase.table("alert_log").insert(alert_entry).execute()
            except Exception as e:
                print(f"[Supabase Error] alert_log insert failed: {e}")

        return order

    def broadcast_alert(self, zone_id: str, message: str, channel: str) -> dict:
        now_iso = datetime.now(timezone.utc).isoformat()
        broadcast_record = {
            "id": str(uuid.uuid4()),
            "zone_id": zone_id,
            "message": message,
            "channel": channel,
            "timestamp": now_iso
        }

        # Local save
        data = self._load_data()
        data.setdefault("broadcasts", []).append(broadcast_record)
        self._save_data(data)

        # Supabase broadcast_logs
        if self.supabase:
            try:
                self.supabase.table("broadcast_logs").insert({
                    "zone_id": zone_id,
                    "message": message,
                    "channel": channel,
                    "broadcast_at": now_iso
                }).execute()
            except Exception:
                pass

            # Also publish into alert_log so it surfaces immediately on the live feed
            try:
                self.supabase.table("alert_log").insert({
                    "zone_id": zone_id,
                    "risk_level": "Critical",
                    "message": f"📢 [CITIZEN BROADCAST via {channel}]: {message}",
                    "triggered_at": now_iso,
                    "acknowledged": False
                }).execute()
            except Exception:
                pass

        return broadcast_record

    def update_route_status(self, zone_id: str, route_id: str, new_status: str) -> bool:
        data = self._load_data()
        routes = data["routes"].get(zone_id, [])
        found = False
        for r in routes:
            if r["id"] == route_id:
                r["status"] = new_status
                if new_status == "Flooded":
                    r["eta"] = "CLOSED"
                elif r["eta"] == "CLOSED":
                    r["eta"] = "15 min"
                found = True
                break
        if found:
            self._save_data(data)

        if self.supabase:
            try:
                self.supabase.table("evacuation_routes").update({"status": new_status}).eq("id", route_id).execute()
            except Exception:
                pass

        return found

    def update_shelter_status(self, zone_id: str, shelter_id: str, new_status: str, occupancy: int | None = None) -> bool:
        data = self._load_data()
        shelters = data["shelters"].get(zone_id, [])
        found = False
        for s in shelters:
            if s["id"] == shelter_id:
                s["status"] = new_status
                if occupancy is not None:
                    s["occupancy"] = occupancy
                found = True
                break
        if found:
            self._save_data(data)

        if self.supabase:
            try:
                payload = {"status": new_status}
                if occupancy is not None:
                    payload["current_occupancy"] = occupancy
                self.supabase.table("shelters").update(payload).eq("id", shelter_id).execute()
            except Exception:
                pass

        return found
