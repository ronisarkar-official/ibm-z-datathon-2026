# FloodWatch — Product Requirements Document

**Version:** 1.0  
**Date:** October 2026  
**Author:** Roni Sarkar  
**Event:** IBM Z Datathon 2026  
**Theme:** Real-Time AI for Critical Decisions

---

## 1. Overview

FloodWatch is a real-time flood risk early warning system that ingests live weather and river data, scores flood risk per geographic zone using a trained ML model, and pushes instant alerts to a live dashboard accessible by disaster management authorities — all running on IBM Z / LinuxONE.

---

## 2. Problem Statement

Floods are among the most destructive natural disasters globally, displacing millions annually. The core issue is not lack of data — it is lack of real-time intelligence. Authorities currently rely on manual assessment, delayed reports, and reactive decision-making. By the time a flood risk is confirmed, the window for safe evacuation has often closed.

**Key pain points:**
- No centralized real-time visibility across multiple geographic zones
- Risk assessment is manual, slow, and inconsistent
- Alerts reach authorities too late for effective preventive action
- Existing systems do not integrate AI-driven prediction with live data streams

---

## 3. Goals

- Ingest real-time weather and river level data continuously
- Classify each zone into one of four risk levels: Safe, Advisory, Warning, Critical
- Surface alerts to authorities through a live, auto-updating dashboard
- Ensure the system remains operational during extreme conditions via IBM Z reliability
- Demonstrate IBM Z Transactional AI integration for real-time inference

---

## 4. Non-Goals

- This is not a consumer-facing mobile app
- This does not replace meteorological department forecasting
- This does not handle post-flood relief coordination
- This does not process satellite imagery or video feeds

---

## 5. Target Audience

| Audience | Need |
|---|---|
| District Disaster Management Authorities | Real-time zone-level risk visibility to coordinate evacuations |
| State Emergency Response Teams | Multi-district overview to prioritize resource deployment |
| Municipal Corporations | Drainage and infrastructure decisions based on saturation data |
| Meteorological Departments | Downstream decision layer converting raw data to risk classifications |
| Common Citizens (indirect) | Timely evacuation alerts issued by authorities using this system |

---

## 6. Core Features

### 6.1 Real-Time Data Ingestion
- Pull live rainfall, temperature, humidity, and wind data from Open-Meteo API
- Ingest river water level data per zone
- Run ingestion on a scheduled interval (every 60 seconds)

### 6.2 ML Risk Scoring Engine
- Trained XGBoost classification model
- Input features: rainfall (mm), river level (m), soil moisture (%), temperature (°C), humidity (%), elevation (m)
- Output: risk label (Safe / Advisory / Warning / Critical) + confidence score (0–100)
- Model served via FastAPI REST endpoint

### 6.3 Zone Management
- Pre-configured zones with coordinates, elevation, and historical flood frequency
- Each zone independently scored on every data cycle
- Zones stored and managed in Supabase PostgreSQL

### 6.4 Live Alert Dashboard
- Real-time updating dashboard built in Next.js 15
- Zones sorted by risk level (Critical first)
- Color-coded risk cards per zone
- Recommended action displayed per zone
- Powered by Supabase Realtime for instant push updates

### 6.5 Alert History & Audit Log
- Every prediction stored with timestamp
- Historical risk trend per zone viewable
- Useful for post-event analysis and authority accountability

---

## 7. Risk Classification Logic

| Risk Level | Color | Trigger Condition | Recommended Action |
|---|---|---|---|
| Safe | Green | All readings within normal range | No action required |
| Advisory | Yellow | Rainfall > 20mm or river level elevated | Monitor closely |
| Warning | Orange | Rainfall > 50mm and river level > 6m | Prepare evacuation routes |
| Critical | Red | Rainfall > 80mm and river level > 8m | Immediate evacuation order |

---

## 8. Technical Requirements

- **Backend:** Python + FastAPI deployed on Render
- **ML Model:** XGBoost trained on synthetic + NDMA historical data, served as .pkl
- **Database:** Supabase PostgreSQL + Realtime
- **Frontend:** Next.js 15, Tailwind CSS v4, shadcn/ui
- **IBM Z Integration:** FastAPI inference engine deployed on LinuxONE container
- **Data Sources:** Open-Meteo API, India WRIS, NASA SRTM, NDMA records

---

## 9. Success Metrics

- System ingests and scores data within 5 seconds of new readings
- Dashboard reflects updated risk levels within 3 seconds of scoring
- Model achieves minimum 85% classification accuracy on validation set
- System maintains uptime during simulated high-load demo scenario

---

## 10. Constraints

- 24-hour build window
- Solo development
- Free-tier infrastructure only (Render free, Supabase free, Vercel free)
- No real hospital or government API access — synthetic + public datasets only

---

## 11. Milestones

| Hour | Milestone |
|---|---|
| 0–3 | Project scaffold, Supabase schema, environment setup |
| 4–7 | Synthetic dataset generation, ML model training |
| 8–12 | FastAPI backend with /predict endpoint |
| 13–17 | Data simulator, Supabase integration, real-time pipeline |
| 18–22 | Next.js dashboard, Supabase Realtime, alert UI |
| 23–24 | Testing, deployment, pitch preparation |
