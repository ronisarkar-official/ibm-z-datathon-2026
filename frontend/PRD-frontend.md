# FloodWatch — Frontend Product Requirements Document

**Version:** 1.0
**Date:** October 2026
**Author:** Roni Sarkar
**Event:** IBM Z Datathon 2026
**Theme:** Real-Time AI for Critical Decisions

---

## 1. Overview

FloodWatch frontend is a real-time flood risk monitoring dashboard built on top of an existing Next.js 15 boilerplate. It displays live zone-level flood risk data, AI-generated risk scores, and actionable alerts for disaster management authorities. The frontend connects to a FastAPI backend on Render and uses Supabase Realtime for instant UI updates.

---

## 2. Scope

This document covers only the frontend layer. The frontend is built as an isolated feature module on top of an existing boilerplate that already handles authentication, user settings, dashboard shell, and email notifications. No existing files are modified.

---

## 3. Goals

- Display real-time flood risk levels across all monitored zones
- Auto-update the UI instantly when new predictions arrive via Supabase Realtime
- Sort zones by risk severity automatically — Critical always at the top
- Show recommended actions per zone so authorities know exactly what to do
- Provide a zone detail view with historical risk trend chart
- Maintain a live alert feed for Warning and Critical events
- Work seamlessly within the existing boilerplate without breaking any existing functionality

---

## 4. Non-Goals

- No authentication changes — existing auth system is untouched
- No mobile app — web only
- No map view — zone cards are sufficient for the hackathon scope
- No user role management — single authority view
- No push notifications — dashboard alerts are sufficient

---

## 5. Target Users

| User | Need |
|---|---|
| Disaster Management Authority | See all zones ranked by risk in real time |
| Emergency Response Team | Know which zones need immediate action |
| Municipal Officers | Monitor specific zones they are responsible for |

---

## 6. Pages

### 6.1 `/floodwatch` — Main Dashboard
The primary page. Shows all monitored zones sorted by risk score descending. Updates live via Supabase Realtime. Includes a status bar at the top showing system health and active alert count.

**Elements:**
- Status bar — zones monitored, active alerts, last updated time, system status
- Alert feed — scrolling list of latest Warning/Critical events
- Zone grid — all zones as risk cards, sorted Critical → High → Advisory → Safe
- Each card shows zone name, district, current vitals, risk badge, risk score, recommendation

### 6.2 `/floodwatch/zone/[id]` — Zone Detail
Individual zone page. Shows current readings, full vitals breakdown, and a line chart of risk score over the last 20 predictions.

**Elements:**
- Zone header — name, district, state, current risk badge
- Current vitals panel — rainfall, river level, soil moisture, temperature, humidity, elevation
- Risk trend chart — line chart of risk score over last 20 readings
- Recent predictions table — last 10 predictions with timestamps

---

## 7. Components

### ZoneRiskCard
Displays a single zone's current status. Props: zone name, district, risk level, risk score, rainfall, river level, spo2, temperature, recommendation, last updated. Color coded border by risk level.

### AlertFeed
Live scrolling feed. Subscribes to Supabase alert_log table. Shows zone name, risk level badge, message, and time. New alerts slide in from top.

### RiskTrendChart
Line chart using recharts. X axis: time. Y axis: risk score 0–100. Color changes based on score range. Shows last 20 data points per zone.

### StatusBar
Top bar on main dashboard. Shows: total zones monitored, count of active critical alerts, count of active warnings, last data refresh time, backend health status (calls /health endpoint).

---

## 8. Real-Time Behavior

- On page load: fetch latest prediction per zone from Supabase
- Subscribe to Supabase Realtime channel on `predictions` table INSERT
- On new INSERT: re-fetch latest predictions, re-sort by risk score, update UI
- Subscribe to Supabase Realtime on `alert_log` table INSERT
- On new alert INSERT: prepend to alert feed
- On page unmount: unsubscribe all channels

---

## 9. Risk Level Visual System

| Risk Level | Badge Color | Card Border | Background Tint |
|---|---|---|---|
| Critical | Red | Red | Red/5 opacity |
| Warning | Orange | Orange | Orange/5 opacity |
| Advisory | Yellow | Yellow | Yellow/5 opacity |
| Safe | Green | Green | Green/5 opacity |

---

## 10. Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 15 | Framework |
| TypeScript | Language |
| Tailwind CSS v4 | Styling |
| shadcn/ui (radix-nova) | UI components |
| lucide-react | Icons |
| Supabase JS client | Database + Realtime |
| recharts | Risk trend chart |
| @supabase/supabase-js | Supabase client |

---

## 11. Environment Variables Needed

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL
```

---

## 12. What Is Not Touched

| Existing File/Folder | Status |
|---|---|
| app/(auth)/ | Untouched |
| app/dashboard/ | Untouched |
| app/api/ | Untouched |
| components/ui/ | Untouched |
| components/settings/ | Untouched |
| components/navbar.tsx | Untouched |
| lib/mailer/ | Untouched |
| lib/auth-client.ts | Untouched |
| All other existing files | Untouched |

---

## 13. New Files Created

```
lib/supabase.ts
app/floodwatch/page.tsx
app/floodwatch/zone/[id]/page.tsx
components/floodwatch/ZoneRiskCard.tsx
components/floodwatch/AlertFeed.tsx
components/floodwatch/RiskTrendChart.tsx
components/floodwatch/StatusBar.tsx
```

Total: 7 new files. Zero existing files modified.
