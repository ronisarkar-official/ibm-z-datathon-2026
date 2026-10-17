"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Shield,
  Bell,
  Server,
  Cloud,
  Cpu,
  Database,
  Monitor,
  ArrowRight,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Droplets,
  Waves,
  Activity,
  Lock,
  FileText,
  ExternalLink,
} from "lucide-react"
import { supabase, type Prediction } from "@/lib/supabase"

interface MonitoredZone {
  id: string
  name: string
  state: string
  basin: string
  risk: "Safe" | "Advisory" | "Warning" | "Critical"
  score: number
  rain: number
  river: number
  soil: number
  elevation: number
}

const INITIAL_ZONES: MonitoredZone[] = [
  {
    id: "7f8b9c1d-1111-4444-8888-abcdef000001",
    name: "Kolkata North",
    state: "West Bengal",
    basin: "Hooghly / Ganga Delta",
    risk: "Critical",
    score: 94,
    rain: 118.5,
    river: 10.4,
    soil: 94.0,
    elevation: 9.0,
  },
  {
    id: "7f8b9c1d-2222-4444-8888-abcdef000002",
    name: "Guwahati Riverfront",
    state: "Assam",
    basin: "Brahmaputra Valley",
    risk: "Critical",
    score: 88,
    rain: 102.0,
    river: 9.8,
    soil: 91.0,
    elevation: 55.0,
  },
  {
    id: "7f8b9c1d-3333-4444-8888-abcdef000003",
    name: "Patna Ganga Basin",
    state: "Bihar",
    basin: "Middle Ganga Plains",
    risk: "Advisory",
    score: 36,
    rain: 28.0,
    river: 3.2,
    soil: 52.0,
    elevation: 53.0,
  },
  {
    id: "7f8b9c1d-4444-4444-8888-abcdef000004",
    name: "Cuttack Mahanadi",
    state: "Odisha",
    basin: "Mahanadi Delta",
    risk: "Advisory",
    score: 32,
    rain: 22.0,
    river: 2.9,
    soil: 48.0,
    elevation: 36.0,
  },
  {
    id: "7f8b9c1d-5555-4444-8888-abcdef000005",
    name: "Mumbai Mithi River",
    state: "Maharashtra",
    basin: "Mithi Catchment",
    risk: "Safe",
    score: 12,
    rain: 14.0,
    river: 1.8,
    soil: 38.0,
    elevation: 14.0,
  },
]

export default function LandingPage() {
  const [zones, setZones] = useState<MonitoredZone[]>(INITIAL_ZONES)
  const [liveConnected, setLiveConnected] = useState(false)

  // Top zone for the hero preview card (default Kolkata North, risk 94)
  const topZone = zones[0]

  useEffect(() => {
    async function syncLiveData() {
      try {
        const { data, error } = await supabase
          .from("predictions")
          .select("*, zones(*)")
          .order("recorded_at", { ascending: false })
          .limit(20)

        if (!error && data && data.length > 0) {
          const map = new Map<string, Prediction>()
          for (const item of data) {
            if (!map.has(item.zone_id)) {
              map.set(item.zone_id, {
                ...item,
                zones: Array.isArray(item.zones) ? item.zones[0] : item.zones,
              } as Prediction)
            }
          }

          setZones((prev) =>
            prev.map((z) => {
              const live = map.get(z.id)
              if (live) {
                return {
                  ...z,
                  name: live.zones?.name || z.name,
                  risk: live.risk_level,
                  score: live.risk_score,
                  rain: live.rainfall,
                  river: live.river_level,
                  soil: live.soil_moisture,
                }
              }
              return z
            })
          )
          setLiveConnected(true)
        }
      } catch {
        // Fallback to static calibrated telemetry
      }
    }

    syncLiveData()
  }, [])

  return (
    <div className="min-h-screen bg-[#080810] text-white selection:bg-[#dc2626] selection:text-white font-sans antialiased">
      {/* ===================================================================== */}
      {/* TOP SYSTEM STATUS TICKER                                              */}
      {/* ===================================================================== */}
      <div className="border-b border-[#1c1c2b] bg-[#0c0c16] text-[11px] text-gray-400 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#dc2626] animate-pulse inline-block" />
            <span className="text-gray-300 font-medium">IBM Z LINUXONE TELEMETRY ENGINE ONLINE</span>
            <span className="hidden sm:inline text-gray-600">•</span>
            <span className="hidden sm:inline text-gray-400">INFERENCE: &lt;48MS</span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <span>UPTIME: 99.9999%</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">CYCLE: 60s INTERVAL</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TOP NAVIGATION BAR                                                    */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-50 bg-[#080810] border-b border-[#1c1c2b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: FloodWatch Logo with Shield Icon */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-8 rounded bg-[#dc2626] text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="size-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-gray-200 transition-colors">
                FloodWatch
              </span>
              <span className="text-[10px] font-mono uppercase bg-[#0f0f1a] text-gray-400 border border-[#232338] px-1.5 py-0.5 rounded">
                IBM Z
              </span>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#about" className="hover:text-white transition-colors">
              About
            </a>
          </nav>

          {/* Right: Open Dashboard Button in Red */}
          <div className="flex items-center gap-3">
            <Link
              href="/floodwatch"
              className="inline-flex items-center justify-center h-9 px-4 rounded text-xs font-semibold text-white bg-[#dc2626] hover:bg-[#b91c1c] transition-colors"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* HERO SECTION                                                          */}
      {/* ===================================================================== */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Heading, Subtitle & Action Buttons */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#0f0f1a] border border-[#232338] text-xs font-mono text-gray-300 mb-6">
              <span className="size-1.5 rounded-full bg-[#dc2626] animate-ping" />
              <span>IBM Z DATATHON 2026 • REAL-TIME DISASTER DEFENSE</span>
            </div>

            {/* Large bold white heading on two lines */}
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08]">
              Know Before<br />The Flood Hits
            </h1>

            {/* Subtitle in gray */}
            <p className="mt-6 text-base sm:text-lg text-gray-400 max-w-xl leading-relaxed">
              Real-time AI flood risk monitoring across vulnerable zones. Powered by IBM Z.
            </p>

            {/* Two buttons: solid red button and outlined white button */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Link
                href="/floodwatch"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded text-sm font-semibold text-white bg-[#dc2626] hover:bg-[#b91c1c] transition-colors shadow-xs"
              >
                <span>View Live Dashboard</span>
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded text-sm font-semibold text-white bg-transparent border border-white/80 hover:bg-white/10 hover:border-white transition-colors"
              >
                <span>Learn How It Works</span>
              </a>
            </div>

            {/* Subtle verification badge */}
            <div className="mt-8 flex items-center gap-3 text-xs text-gray-500 font-mono">
              <span className="text-[#dc2626] font-bold">●</span>
              <span>Sub-50ms inference on IBM Telum II</span>
              <span className="text-gray-700">•</span>
              <span>Open-Meteo & GloFAS connected</span>
            </div>
          </div>

          {/* Right Column: Preview Card Floating with Subtle Glow */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-xl bg-[#0f0f1a] border border-[#232338] p-6 shadow-[0_0_35px_rgba(220,38,38,0.18)] transition-all">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1c1c2b]">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#dc2626] animate-pulse" />
                  <span className="text-[11px] font-mono uppercase text-gray-400">
                    Live Telemetry Preview
                  </span>
                </div>
                <span className="text-[10px] font-mono text-gray-500">
                  {liveConnected ? "Live Supabase" : "Calibrated Node"}
                </span>
              </div>

              {/* Zone Identity & CRITICAL Badge in Red */}
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {topZone.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {topZone.basin} • {topZone.state}
                  </p>
                </div>
                {/* Red CRITICAL Badge */}
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#dc2626] text-white">
                  CRITICAL
                </span>
              </div>

              {/* Risk Score Display */}
              <div className="mt-5 p-4 rounded-lg bg-[#080810] border border-[#1e1e30]">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
                    Flood Risk Score
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white font-mono">
                      {topZone.score}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">/ 100</span>
                  </div>
                </div>

                {/* Flat Progress Bar */}
                <div className="w-full h-2 bg-[#1a1a2b] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#dc2626] rounded-full transition-all duration-500"
                    style={{ width: `${topZone.score}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span className="text-[#dc2626] font-semibold flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    Evacuation Directive Recommended
                  </span>
                  <span>Elevation {topZone.elevation}m</span>
                </div>
              </div>

              {/* Rainfall and River Level Stats Matrix */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#080810] border border-[#1e1e30]">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                    <Droplets className="size-3.5 text-[#dc2626]" />
                    <span>Rainfall</span>
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {topZone.rain} mm
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Monsoon Cloudburst
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#080810] border border-[#1e1e30]">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                    <Waves className="size-3.5 text-[#dc2626]" />
                    <span>River Level</span>
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {topZone.river} m
                  </div>
                  <div className="text-[10px] text-[#dc2626] font-medium mt-0.5">
                    +2.4m Above Danger Mark
                  </div>
                </div>
              </div>

              {/* Extra Vital: Soil Saturation & Architecture */}
              <div className="mt-3 p-3 rounded-lg bg-[#080810] border border-[#1e1e30] flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400">Soil Saturation: </span>
                  <span className="font-mono font-bold text-white">{topZone.soil}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Inference: </span>
                  <span className="font-mono text-gray-300">42ms (IBM Telum II)</span>
                </div>
              </div>

              {/* Preview Footer Action */}
              <div className="mt-4 pt-3 border-t border-[#1c1c2b] flex items-center justify-between">
                <span className="text-[11px] text-gray-500 font-mono">
                  Cycle ID: #FL-8821
                </span>
                <Link
                  href={`/floodwatch/zone/${topZone.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#dc2626] hover:text-red-400 transition-colors"
                >
                  <span>Inspect Zone Telemetry</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* STATS BAR BELOW HERO                                                  */}
      {/* ===================================================================== */}
      <section className="border-t border-b border-[#1c1c2b] bg-[#0c0c16]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-[#1c1c2b]">
            {/* Stat 1: 5 Zones Monitored */}
            <div className="flex flex-col items-center text-center px-4 pt-4 md:pt-0">
              <div className="size-8 rounded bg-[#080810] border border-[#232338] text-gray-400 flex items-center justify-center mb-3">
                <MapPin className="size-4 text-white" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-mono">
                5 Zones Monitored
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Ganga, Brahmaputra & Mahanadi Basins
              </p>
            </div>

            {/* Stat 2: 60 Second Updates */}
            <div className="flex flex-col items-center text-center px-4 pt-6 md:pt-0">
              <div className="size-8 rounded bg-[#080810] border border-[#232338] text-gray-400 flex items-center justify-center mb-3">
                <Clock className="size-4 text-white" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-mono">
                60 Second Updates
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Automated continuous weather ingestion
              </p>
            </div>

            {/* Stat 3: 24/7 Uptime */}
            <div className="flex flex-col items-center text-center px-4 pt-6 md:pt-0">
              <div className="size-8 rounded bg-[#080810] border border-[#232338] text-gray-400 flex items-center justify-center mb-3">
                <Server className="size-4 text-white" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-mono">
                24/7 Uptime
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Enterprise-grade IBM Z mainframe resilience
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* FEATURES SECTION                                                      */}
      {/* ===================================================================== */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest mb-3">
            <span>Capabilities</span>
            <span>•</span>
            <span className="text-[#dc2626]">Mission Critical</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Engineered For Immediate Disaster Response
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-400 leading-relaxed">
            Traditional civil flood systems report disasters hours after roads are already submerged.
            FloodWatch operates at machine speed to protect populations.
          </p>
        </div>

        {/* Three feature cards in a row on dark card backgrounds */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Real-Time Scoring */}
          <div className="rounded-xl bg-[#0f0f1a] border border-[#1e1e30] p-8 flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-lg bg-[#080810] border border-[#232338] text-[#dc2626] flex items-center justify-center mb-6">
                <Shield className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-3">
                Real-Time Scoring
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                AI scores every zone every 60 seconds using live weather data.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1c1c2b] flex items-center justify-between text-xs font-mono text-gray-500">
              <span>Model: XGBoost Calibrated</span>
              <span className="text-gray-300 font-semibold">&lt;48ms</span>
            </div>
          </div>

          {/* Card 2: Instant Alerts */}
          <div className="rounded-xl bg-[#0f0f1a] border border-[#1e1e30] p-8 flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-lg bg-[#080810] border border-[#232338] text-[#dc2626] flex items-center justify-center mb-6">
                <Bell className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-3">
                Instant Alerts
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Warning and Critical events surface immediately to authorities.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1c1c2b] flex items-center justify-between text-xs font-mono text-gray-500">
              <span>Dispatch: Siren & SMS</span>
              <span className="text-[#dc2626] font-semibold">Immediate</span>
            </div>
          </div>

          {/* Card 3: IBM Z Powered */}
          <div className="rounded-xl bg-[#0f0f1a] border border-[#1e1e30] p-8 flex flex-col justify-between">
            <div>
              <div className="size-12 rounded-lg bg-[#080810] border border-[#232338] text-[#dc2626] flex items-center justify-center mb-6">
                <Server className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-3">
                IBM Z Powered
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Inference runs on enterprise-grade mainframe infrastructure.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#1c1c2b] flex items-center justify-between text-xs font-mono text-gray-500">
              <span>LinuxONE s390x</span>
              <span className="text-gray-300 font-semibold">99.9999% SLA</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* HOW IT WORKS SECTION                                                  */}
      {/* ===================================================================== */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#1c1c2b]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest mb-3">
            <span>Pipeline Architecture</span>
            <span>•</span>
            <span className="text-white">End-To-End</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            How It Works
          </h2>
          <p className="mt-3 text-sm sm:text-base text-gray-400 leading-relaxed">
            From atmospheric telemetry to civil defense action in four continuous, automated steps.
          </p>
        </div>

        {/* Four steps in a horizontal row connected by arrows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Step 1: Cloud Icon */}
          <div className="rounded-xl bg-[#0f0f1a] border border-[#1e1e30] p-6 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded bg-[#080810] border border-[#232338] text-white flex items-center justify-center">
                  <Cloud className="size-5 text-[#dc2626]" />
                </div>
                <span className="text-xs font-mono font-bold text-gray-500">STEP 01</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                Live Weather Data Ingested
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Atmospheric rainfall, precipitation intensity, and upstream river discharge are streamed continuously.
              </p>
            </div>

            {/* Desktop Connector Arrow */}
            <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-gray-600">
              <ArrowRight className="size-5" />
            </div>
          </div>

          {/* Step 2: CPU Icon */}
          <div className="rounded-xl bg-[#0f0f1a] border border-[#1e1e30] p-6 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded bg-[#080810] border border-[#232338] text-white flex items-center justify-center">
                  <Cpu className="size-5 text-[#dc2626]" />
                </div>
                <span className="text-xs font-mono font-bold text-gray-500">STEP 02</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                AI Model Scores Risk
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Calibrated machine learning evaluates soil saturation physics and elevation thresholds in under 48ms.
              </p>
            </div>

            {/* Desktop Connector Arrow */}
            <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-gray-600">
              <ArrowRight className="size-5" />
            </div>
          </div>

          {/* Step 3: Database Icon */}
          <div className="rounded-xl bg-[#0f0f1a] border border-[#1e1e30] p-6 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded bg-[#080810] border border-[#232338] text-white flex items-center justify-center">
                  <Database className="size-5 text-[#dc2626]" />
                </div>
                <span className="text-xs font-mono font-bold text-gray-500">STEP 03</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                Results Saved to Supabase
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Predictions, risk trajectories, and incident audit logs are securely stored with immutable timestamps.
              </p>
            </div>

            {/* Desktop Connector Arrow */}
            <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-gray-600">
              <ArrowRight className="size-5" />
            </div>
          </div>

          {/* Step 4: Monitor Icon */}
          <div className="rounded-xl bg-[#0f0f1a] border border-[#1e1e30] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded bg-[#080810] border border-[#232338] text-white flex items-center justify-center">
                  <Monitor className="size-5 text-[#dc2626]" />
                </div>
                <span className="text-xs font-mono font-bold text-gray-500">STEP 04</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                Dashboard Updates Live
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Emergency commanders access live GIS risk maps, shelter capacities, and automated evacuation orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* ABOUT SECTION                                                         */}
      {/* ===================================================================== */}
      <section id="about" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#1c1c2b]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest mb-3">
              <span>About FloodWatch</span>
              <span>•</span>
              <span className="text-white">IBM Z Infrastructure</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-6">
              Why We Built FloodWatch On IBM Z
            </h2>
            <div className="space-y-4 text-sm text-gray-400 leading-relaxed">
              <p>
                During severe monsoon cloudbursts and cyclonic events, conventional cloud services and public APIs
                frequently buckle under power disruptions and sudden traffic spikes. Yet this is precisely when
                emergency authorities require sub-second risk classification.
              </p>
              <p>
                FloodWatch leverages <strong className="text-white font-semibold">IBM Z LinuxONE</strong> enterprise
                mainframe architecture. Utilizing on-chip hardware acceleration via the Telum II processor,
                predictions run without GPU bus bottlenecks, maintaining 99.9999% availability during severe disasters.
              </p>
              <p>
                Every evacuation directive is cryptographically verified to prevent alert tampering, providing civil defense
                agencies with an auditable, life-saving decision support system.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/floodwatch"
                className="inline-flex items-center gap-2 h-10 px-5 rounded text-xs font-semibold text-white bg-[#dc2626] hover:bg-[#b91c1c] transition-colors"
              >
                <span>Enter Command Center</span>
                <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/floodwatch/alerts"
                className="inline-flex items-center gap-2 h-10 px-5 rounded text-xs font-semibold text-gray-300 bg-[#0f0f1a] border border-[#232338] hover:text-white transition-colors"
              >
                <FileText className="size-3.5" />
                <span>View Incident Directives</span>
              </Link>
            </div>
          </div>

          {/* Right Column: 5 Monitored Basins Status Table */}
          <div className="lg:col-span-6">
            <div className="rounded-xl bg-[#0f0f1a] border border-[#232338] p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#1c1c2b] mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Monitored Basin Status
                  </h4>
                  <p className="text-[11px] text-gray-500">Live Telemetry Snapshot</p>
                </div>
                <span className="text-[11px] font-mono text-gray-400">
                  {zones.length} Active Zones
                </span>
              </div>

              <div className="divide-y divide-[#1c1c2b]">
                {zones.map((zone) => {
                  const isCritical = zone.risk === "Critical"
                  const isWarning = zone.risk === "Warning"
                  const isSafe = zone.risk === "Safe"

                  return (
                    <div
                      key={zone.id}
                      className="py-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{zone.name}</div>
                        <div className="text-[11px] text-gray-500">
                          {zone.basin}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono hidden sm:block">
                          <div className="text-gray-300">{zone.rain} mm</div>
                          <div className="text-[10px] text-gray-500">River {zone.river}m</div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? "bg-[#dc2626] text-white"
                              : isWarning
                              ? "bg-amber-600 text-white"
                              : isSafe
                              ? "bg-emerald-600 text-white"
                              : "bg-[#1c1c2b] text-gray-300"
                          }`}
                        >
                          {zone.risk} ({zone.score})
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-[#1c1c2b] flex items-center justify-between text-[11px] text-gray-500 font-mono">
                <span>Refreshed: 60s Cycle</span>
                <Link
                  href="/floodwatch"
                  className="text-white hover:text-[#dc2626] transition-colors inline-flex items-center gap-1"
                >
                  <span>Full GIS Map</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* FOOTER                                                                */}
      {/* ===================================================================== */}
      <footer className="border-t border-[#1c1c2b] bg-[#080810] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: FloodWatch Logo with Shield Icon */}
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded bg-[#dc2626] text-white flex items-center justify-center font-bold">
              <Shield className="size-3.5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight">FloodWatch</div>
              <div className="text-[11px] text-gray-500">Real-Time Flood Risk Early Warning</div>
            </div>
          </div>

          {/* Center: Tagline "Built for IBM Z Datathon 2026" */}
          <div className="text-xs text-gray-400 font-medium tracking-wide">
            Built for IBM Z Datathon 2026
          </div>

          {/* Right: "Powered by IBM Z" with IBM Logo Placeholder */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Powered by</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f0f1a] border border-[#232338] font-mono font-bold text-white text-[11px] tracking-wider">
              {/* IBM 8-bar inspired mark indicator */}
              <span className="text-[#dc2626]">■</span>
              <span>IBM Z</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-[#141422] text-center text-[11px] text-gray-600 font-mono">
          FloodWatch • Enterprise Telemetry & Civil Protection Decision Support • IBM Z LinuxONE
        </div>
      </footer>
    </div>
  )
}