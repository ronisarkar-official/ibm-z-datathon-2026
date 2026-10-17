# FloodWatch — Architecture Document

**Version:** 1.0  
**Date:** October 2026  
**Author:** Roni Sarkar  
**Event:** IBM Z Datathon 2026

---

## 1. System Overview

FloodWatch is composed of four independent layers that communicate through REST APIs and Supabase Realtime. Each layer can be developed, tested, and deployed independently.

```
┌─────────────────────────────────────────────────────────┐
│                    DATA SOURCES                         │
│   Open-Meteo API   │   India WRIS   │   NASA SRTM       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND LAYER (IBM Z / Render)             │
│                                                         │
│   Data Ingestion Service (Python)                       │
│              ↓                                          │
│   FastAPI Inference Server                              │
│              ↓                                          │
│   XGBoost ML Model (.pkl)                               │
│              ↓                                          │
│   Risk Scoring Engine                                   │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  DATABASE LAYER (Supabase)              │
│                                                         │
│   PostgreSQL (zones, predictions, alert_log)            │
│   Supabase Realtime (broadcasts new predictions)        │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               FRONTEND LAYER (Vercel)                   │
│                                                         │
│   Next.js 15 Dashboard                                  │
│   Live Zone Risk Cards                                  │
│   Alert Feed                                            │
│   Risk History Chart                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Layer Breakdown

### 2.1 Data Sources

| Source | What It Provides | Access Method |
|---|---|---|
| Open-Meteo API | Rainfall, humidity, temperature, wind speed by coordinates | Free REST API, no key needed |
| India WRIS | River water level per basin | Public government portal |
| NASA SRTM | Elevation data per zone | Static dataset, downloaded once |
| NDMA Records | Historical flood event data | Used for model training only |
| Simulator | Fake real-time stream for demo | Custom Python script |

---

### 2.2 Backend Layer

**Hosted on:** Render (free tier) / IBM Z LinuxONE (for IBM Z integration demo)

#### Components

**Data Ingestion Service (`ingestion.py`)**
- Runs on a 60-second cron loop
- Calls Open-Meteo API with zone coordinates
- Formats response into model-ready feature set
- Calls FastAPI `/predict` endpoint with formatted data

**FastAPI Inference Server (`main.py`)**
- Exposes `/predict` POST endpoint
- Loads `model.pkl` on startup
- Accepts zone features as JSON
- Returns risk level, risk score, and recommended action
- Writes result to Supabase `predictions` table

**XGBoost ML Model (`model.pkl`)**
- Trained offline using `train_model.py`
- Input features: rainfall, river_level, soil_moisture, temperature, humidity, elevation
- Output classes: 0=Safe, 1=Advisory, 2=Warning, 3=Critical
- Serialized with joblib

**Risk Scoring Engine (inside FastAPI)**
- Runs model.predict() on incoming features
- Runs model.predict_proba() to get confidence score
- Maps output integer to human-readable label and action

#### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /predict | Score a zone's current readings |
| GET | /health | Health check for deployment |
| GET | /zones | Return list of all configured zones |

#### Request/Response Format

**POST /predict**
```json
Request:
{
  "zone_id": "kolkata-north",
  "rainfall": 72.4,
  "river_level": 7.1,
  "soil_moisture": 88.0,
  "temperature": 31.2,
  "humidity": 91.0,
  "elevation": 8.5
}

Response:
{
  "zone_id": "kolkata-north",
  "risk_level": "Warning",
  "risk_score": 78,
  "recommendation": "Prepare evacuation routes",
  "timestamp": "2026-10-17T14:32:00Z"
}
```

---

### 2.3 Database Layer

**Hosted on:** Supabase (free tier)

#### Tables

**zones**
```
id              uuid primary key
name            text
latitude        numeric
longitude       numeric
elevation       numeric
district        text
state           text
created_at      timestamp
```

**predictions**
```
id              uuid primary key
zone_id         uuid references zones(id)
rainfall        numeric
river_level     numeric
soil_moisture   numeric
temperature     numeric
humidity        numeric
risk_level      text
risk_score      int
recommendation  text
recorded_at     timestamp default now()
```

**alert_log**
```
id              uuid primary key
zone_id         uuid references zones(id)
risk_level      text
message         text
triggered_at    timestamp default now()
acknowledged    boolean default false
```

#### Realtime

- Supabase Realtime subscription on `predictions` table INSERT events
- Frontend subscribes on mount
- Every new prediction row triggers an instant UI update
- No polling required

---

### 2.4 Frontend Layer

**Hosted on:** Vercel  
**Stack:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react

#### Pages

| Route | Description |
|---|---|
| / | Main live triage dashboard — all zones sorted by risk |
| /zone/[id] | Individual zone detail — vitals history, risk trend chart |
| /alerts | Alert log — all triggered warnings with timestamps |

#### Key Components

| Component | Description |
|---|---|
| ZoneRiskCard | Displays zone name, current vitals, risk badge, recommendation |
| AlertFeed | Live scrolling feed of new critical/warning events |
| RiskTrendChart | Line chart of risk score over last 24 readings per zone |
| StatusBar | System status — last updated, zones monitored, active alerts count |

#### Realtime Pattern

```
Component mounts
    ↓
Fetch latest predictions from Supabase (initial load)
    ↓
Subscribe to Supabase Realtime channel on predictions table
    ↓
On INSERT event → refetch latest predictions → re-sort by risk → update UI
    ↓
Component unmounts → unsubscribe channel
```

---

## 3. IBM Z Integration

The FastAPI inference server and ML model run inside a container on IBM Z / LinuxONE. This means:

- All AI inference happens on the same platform where critical infrastructure data lives
- Patient / zone data never needs to be exported to an external server for scoring
- IBM Z's hardware-level encryption protects all data in transit and at rest
- The system inherits IBM Z's 99.9999% availability guarantee — critical during disaster scenarios

**Deployment on IBM Z:**
- Docker container running Python 3.11 + FastAPI + XGBoost
- Exposed via internal port, proxied through IBM Z network layer
- Supabase connection secured via environment variables

---

## 4. Data Flow — End to End

```
1. Ingestion service wakes up every 60 seconds

2. Fetches current weather data from Open-Meteo API
   for each configured zone's coordinates

3. Combines weather data with zone's elevation
   and river level reading

4. Sends POST request to FastAPI /predict endpoint

5. FastAPI loads features into XGBoost model

6. Model returns risk class + confidence probability

7. FastAPI maps class to label + recommendation

8. Result written to Supabase predictions table

9. Supabase Realtime detects INSERT event

10. Broadcasts change to all connected frontend clients

11. Next.js dashboard receives event

12. UI re-sorts zones by risk score

13. Critical zones highlighted at top with alert badge

14. Authority sees update within 3 seconds of new reading
```

---

## 5. Environment Variables

**Backend (.env)**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
MODEL_PATH=./model.pkl
PORT=8000
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=https://your-render-app.onrender.com
```

---

## 6. Deployment Summary

| Layer | Platform | Cost |
|---|---|---|
| ML Backend | Render (free) / IBM Z LinuxONE | Free |
| Database | Supabase (free tier) | Free |
| Frontend | Vercel (free tier) | Free |
| Data APIs | Open-Meteo | Free |

---

## 7. Folder Structure

```
floodwatch/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── generate_data.py     # Synthetic dataset generator
│   ├── train_model.py       # Model training script
│   ├── ingestion.py         # Data ingestion service
│   ├── simulator.py         # Real-time data simulator for demo
│   ├── model.pkl            # Trained model (generated)
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main dashboard
│   │   ├── zone/[id]/
│   │   │   └── page.tsx     # Zone detail page
│   │   └── alerts/
│   │       └── page.tsx     # Alert log page
│   ├── components/
│   │   ├── ZoneRiskCard.tsx
│   │   ├── AlertFeed.tsx
│   │   ├── RiskTrendChart.tsx
│   │   └── StatusBar.tsx
│   └── lib/
│       └── supabase.ts
│
├── PRD.md
└── ARCHITECTURE.md
```
