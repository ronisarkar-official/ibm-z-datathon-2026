# FloodWatch — Frontend Architecture Document

**Version:** 1.0
**Date:** October 2026
**Author:** Roni Sarkar
**Event:** IBM Z Datathon 2026

---

## 1. System Position

The frontend is one isolated layer in the full FloodWatch system. It never touches the ML model or data pipeline directly. It only reads from Supabase and calls the FastAPI backend health endpoint.

```
┌─────────────────────────────────────────┐
│         FastAPI Backend (Render)        │
│    Writes predictions → Supabase        │
└────────────────────┬────────────────────┘
                     │ writes
                     ▼
┌─────────────────────────────────────────┐
│            Supabase                     │
│  PostgreSQL + Realtime broadcasts       │
└────────────────────┬────────────────────┘
                     │ realtime push
                     ▼
┌─────────────────────────────────────────┐
│         Next.js Frontend (Vercel)       │
│  Receives updates, renders dashboard    │
└─────────────────────────────────────────┘
```

The frontend is read-only. It never writes to Supabase directly.

---

## 2. Boilerplate Integration

The FloodWatch feature is built as an isolated module on top of an existing boilerplate. The boilerplate already provides:

- Authentication (Better Auth — login, signup, OTP, 2FA)
- Dashboard shell with sidebar and layout
- Full shadcn/ui component library
- Navbar, theme provider, session provider
- Mailer, ImageKit, rate limiting

FloodWatch adds exactly 7 new files and modifies zero existing files.

---

## 3. Folder Structure — New Files Only

```
frontend/
├── lib/
│   └── supabase.ts                        ← NEW: Supabase client
│
├── app/
│   └── floodwatch/
│       ├── page.tsx                       ← NEW: Main dashboard
│       └── zone/
│           └── [id]/
│               └── page.tsx               ← NEW: Zone detail
│
└── components/
    └── floodwatch/
        ├── ZoneRiskCard.tsx               ← NEW
        ├── AlertFeed.tsx                  ← NEW
        ├── RiskTrendChart.tsx             ← NEW
        └── StatusBar.tsx                  ← NEW
```

---

## 4. Data Flow

### Initial Page Load
```
User opens /floodwatch
        ↓
page.tsx mounts
        ↓
Fetch latest prediction per zone from Supabase
(SELECT * FROM predictions ORDER BY recorded_at DESC — one per zone)
        ↓
Sort zones by risk_score descending
        ↓
Render ZoneRiskCard for each zone
        ↓
Subscribe to Supabase Realtime on predictions table
Subscribe to Supabase Realtime on alert_log table
```

### Live Update Cycle
```
Backend writes new prediction to Supabase
        ↓
Supabase Realtime detects INSERT on predictions table
        ↓
Broadcasts event to all subscribed frontend clients
        ↓
Frontend receives event
        ↓
Re-fetches latest prediction per zone
        ↓
Re-sorts by risk_score
        ↓
React state updates
        ↓
UI re-renders — affected zone card updates instantly
        ↓
If risk_level is Warning or Critical →
Supabase also fires INSERT on alert_log →
AlertFeed prepends new alert at top
```

### Zone Detail Page Load
```
User opens /floodwatch/zone/[id]
        ↓
Fetch zone metadata from zones table
        ↓
Fetch last 20 predictions for this zone_id
        ↓
Render current vitals from most recent prediction
        ↓
Pass last 20 predictions to RiskTrendChart
        ↓
Render predictions table with timestamps
```

---

## 5. Supabase Client

**File: `lib/supabase.ts`**

Two separate clients:
- `supabaseClient` — uses NEXT_PUBLIC_SUPABASE_ANON_KEY, used in client components for reads and realtime subscriptions
- No server client needed — frontend is read-only

Realtime is enabled on:
- `predictions` table — INSERT events
- `alert_log` table — INSERT events

---

## 6. Component Architecture

```
app/floodwatch/page.tsx
├── StatusBar
│   └── Fetches /health from FastAPI on mount
│   └── Shows: zones count, critical count, warning count, last updated
│
├── AlertFeed
│   └── Subscribes to alert_log Realtime
│   └── Prepends new alerts as they arrive
│   └── Shows last 10 alerts max
│
└── Zone Grid
    └── ZoneRiskCard (one per zone)
        └── Sorted by risk_score descending
        └── Updates when Realtime event fires
        └── Clickable → navigates to /floodwatch/zone/[id]

app/floodwatch/zone/[id]/page.tsx
├── Zone Header (name, district, risk badge)
├── Current Vitals Panel
│   └── rainfall, river_level, soil_moisture
│   └── temperature, humidity, elevation
├── RiskTrendChart
│   └── recharts LineChart
│   └── Last 20 predictions for this zone
└── Recent Predictions Table
    └── Last 10 rows with timestamps
```

---

## 7. Type Definitions

```typescript
type Zone = {
  id: string
  name: string
  latitude: number
  longitude: number
  elevation: number
  district: string
  state: string
  created_at: string
}

type Prediction = {
  id: string
  zone_id: string
  rainfall: number
  river_level: number
  soil_moisture: number
  temperature: number
  humidity: number
  risk_level: "Safe" | "Advisory" | "Warning" | "Critical"
  risk_score: number
  recommendation: string
  recorded_at: string
  zones?: Zone
}

type Alert = {
  id: string
  zone_id: string
  risk_level: string
  message: string
  triggered_at: string
  acknowledged: boolean
  zones?: Zone
}
```

---

## 8. Risk Level System

| Risk Level | Tailwind Border | Tailwind Badge | Tailwind Background |
|---|---|---|---|
| Critical | border-red-600 | bg-red-600 | bg-red-950/30 |
| Warning | border-orange-500 | bg-orange-500 | bg-orange-950/30 |
| Advisory | border-yellow-400 | bg-yellow-400 text-black | bg-yellow-950/30 |
| Safe | border-green-500 | bg-green-600 | bg-green-950/30 |

---

## 9. Realtime Subscription Pattern

```typescript
const channel = supabase
  .channel("floodwatch-live")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "predictions" },
    () => fetchLatestPredictions()
  )
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "alert_log" },
    (payload) => prependAlert(payload.new)
  )
  .subscribe()

return () => {
  supabase.removeChannel(channel)
}
```

---

## 10. API Calls

| Call | Where | What |
|---|---|---|
| GET /health | StatusBar on mount | Check backend is alive |
| Supabase SELECT predictions | page.tsx on mount | Get latest per zone |
| Supabase SELECT predictions | zone/[id] on mount | Get last 20 for zone |
| Supabase SELECT zones | zone/[id] on mount | Get zone metadata |
| Supabase Realtime | page.tsx subscription | Live prediction updates |
| Supabase Realtime | page.tsx subscription | Live alert updates |

Frontend never calls `/predict` directly. That is the backend's job.

---

## 11. Deployment

| What | Where |
|---|---|
| Frontend | Vercel (free tier) |
| Environment variables | Vercel dashboard → project settings |
| Build command | `next build` |
| Output directory | `.next` |
| Node version | 18+ |

---

## 12. Package Changes From Boilerplate

**Remove:**
```
mongodb (or mongoose) — check package.json
```

**Add:**
```
@supabase/supabase-js
recharts
```

Commands:
```
npm uninstall mongodb
npm install @supabase/supabase-js recharts
```
