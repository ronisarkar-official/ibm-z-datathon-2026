# FloodWatch — Frontend Command Center

Next.js 16 (App Router) + React 19 real-time command center interface for **FloodWatch**, built for the **IBM Z Datathon 2026**.

## Core Pages & Components

- `/` — High-impact landing page with system benchmarks and river basin directory
- `/floodwatch` — Main Command Center featuring MapLibre GIS, severity-ranked triage queue, and live alert feed
- `/floodwatch/zone/[id]` — Individual river basin detail, Explainable AI (XAI) feature attribution, What-If scenario simulator, and risk trend charts
- `/floodwatch/alerts` — Official incident dispatch audit log with severity filters and CSV audit export

## Tech Stack

- **Framework:** Next.js 16 (Turbopack) & React 19
- **GIS Engine:** MapLibre GL with self-hosted CORS-safe raster tile proxy (`/api/tiles/v2/*`)
- **Realtime Database:** Supabase PostgreSQL + Supabase Realtime WebSocket listeners
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **Audio Synthesizer:** Web Audio API 2-tone alarm engine

## Development

```bash
# Run standalone frontend
npm run dev

# Run full stack with backend
npm run dev:all
```
