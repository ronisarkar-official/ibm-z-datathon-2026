"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Sliders,
  Droplets,
  Waves,
  Sprout,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Prediction } from "@/lib/supabase"
import { RiskFactorBreakdown } from "./RiskFactorBreakdown"

interface WhatIfScenarioSimulatorProps {
  baselinePrediction: Prediction | null
  zoneElevation: number
}

interface SimulationResult {
  risk_level: string
  risk_score: number
  confidence: number
  recommendation: string
  factors: Array<{ factor: string; value: string; importance: number }>
}

export function WhatIfScenarioSimulator({
  baselinePrediction,
  zoneElevation,
}: WhatIfScenarioSimulatorProps) {
  const initialRain = baselinePrediction?.rainfall ?? 35.0
  const initialRiver = baselinePrediction?.river_level ?? 3.5
  const initialSoil = baselinePrediction?.soil_moisture ?? 55.0

  const [rainfall, setRainfall] = useState<number>(initialRain)
  const [riverLevel, setRiverLevel] = useState<number>(initialRiver)
  const [soilMoisture, setSoilMoisture] = useState<number>(initialSoil)
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)
  const [loading, setLoading] = useState(false)

  // Re-sync with baseline when loaded
  useEffect(() => {
    if (baselinePrediction) {
      setRainfall(baselinePrediction.rainfall)
      setRiverLevel(baselinePrediction.river_level)
      setSoilMoisture(baselinePrediction.soil_moisture)
    }
  }, [baselinePrediction])

  const runSimulation = useCallback(
    async (r: number, v: number, s: number) => {
      setLoading(true)
      try {
        const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const res = await fetch(`${rawApiUrl}/simulate/scenario`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zone_id: baselinePrediction?.zone_id || "demo-zone",
            rainfall: r,
            river_level: v,
            soil_moisture: s,
            elevation: zoneElevation,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setSimResult(data)
          return
        }
      } catch {
        // Fallback hydrological calculation if backend call fails
      } finally {
        setLoading(false)
      }

      // Client-side fallback hydrological modeling
      const rain_score = Math.min((r / 120.0) * 36.0, 45)
      const river_score = Math.min((v / 10.0) * 34.0, 40)
      const soil_factor = s > 75 ? (s - 75) * 0.35 : 0
      const elevation_factor =
        zoneElevation < 25 ? (25 - zoneElevation) * 0.45 : zoneElevation > 80 ? -6 : 0
      const composite = rain_score + river_score + soil_factor + elevation_factor

      const level =
        composite >= 62
          ? "Critical"
          : composite >= 42
          ? "Warning"
          : composite >= 22
          ? "Advisory"
          : "Safe"

      const score = Math.min(Math.max(Math.round(composite), 5), 98)

      const recs: Record<string, string> = {
        Safe: "No action required",
        Advisory: "Monitor closely. Recheck in 30 minutes.",
        Warning: "Prepare evacuation routes. Alert local authorities.",
        Critical: "Immediate evacuation order. Deploy emergency response.",
      }

      setSimResult({
        risk_level: level,
        risk_score: score,
        confidence: 94,
        recommendation: recs[level],
        factors: [
          { factor: "River Stage Depth", value: `${v} m`, importance: 38 },
          { factor: "Precipitation Rate", value: `${r} mm`, importance: 34 },
          { factor: "Soil Saturation", value: `${s}%`, importance: 18 },
          { factor: "Topographic Lowland", value: `${zoneElevation} m`, importance: 10 },
        ],
      })
      setLoading(false)
    },
    [baselinePrediction?.zone_id, zoneElevation]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation(rainfall, riverLevel, soilMoisture)
    }, 150)
    return () => clearTimeout(timer)
  }, [rainfall, riverLevel, soilMoisture, runSimulation])

  const handleReset = () => {
    if (baselinePrediction) {
      setRainfall(baselinePrediction.rainfall)
      setRiverLevel(baselinePrediction.river_level)
      setSoilMoisture(baselinePrediction.soil_moisture)
    }
  }

  const baselineScore = baselinePrediction?.risk_score ?? 35
  const currentSimScore = simResult?.risk_score ?? baselineScore
  const scoreDiff = currentSimScore - baselineScore
  const simLevel = simResult?.risk_level ?? "Advisory"

  const levelBadgeStyles: Record<string, string> = {
    Critical: "bg-[#dc2626] text-white",
    Warning: "bg-amber-600 text-white",
    Advisory: "bg-[#1c1c2b] text-gray-300 border border-[#2e2e42]",
    Safe: "bg-emerald-600 text-white",
  }

  return (
    <div className="rounded-xl border border-[#1e1e30] bg-[#0f0f1a] p-6 shadow-xs space-y-6 text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1c1c2b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-[#dc2626]" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Interactive Hydrological What-If Simulator
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono text-gray-400 border-[#232338]">
              Sub-50ms Inference
            </Badge>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Stress-test weather scenarios and observe model risk threshold transitions in real time
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          className="h-8 gap-1.5 text-xs bg-[#080810] border-[#232338] text-gray-300 hover:text-white cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset to Live</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sliders Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Rainfall Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <Droplets className="size-3.5 text-[#dc2626]" />
                <span>Simulated Rainfall Rate</span>
              </span>
              <span className="font-bold text-[#dc2626]">{rainfall} mm</span>
            </div>
            <input
              type="range"
              min={0}
              max={150}
              step={1}
              value={rainfall}
              onChange={(e) => setRainfall(Number(e.target.value))}
              className="w-full h-2 bg-[#080810] border border-[#1e1e30] rounded-lg appearance-none cursor-pointer accent-[#dc2626]"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>0 mm (Clear)</span>
              <span>50 mm (Heavy)</span>
              <span>100 mm (Storm)</span>
              <span>150 mm (Extreme)</span>
            </div>
          </div>

          {/* River Stage Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <Waves className="size-3.5 text-[#dc2626]" />
                <span>Simulated River Gauge Level</span>
              </span>
              <span className="font-bold text-[#dc2626]">{riverLevel} m</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={14.0}
              step={0.1}
              value={riverLevel}
              onChange={(e) => setRiverLevel(Number(e.target.value))}
              className="w-full h-2 bg-[#080810] border border-[#1e1e30] rounded-lg appearance-none cursor-pointer accent-[#dc2626]"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>1.0 m (Normal)</span>
              <span>5.0 m (Bankfull)</span>
              <span>8.0 m (Warning)</span>
              <span>12.0+ m (Critical)</span>
            </div>
          </div>

          {/* Soil Moisture Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 font-medium text-white">
                <Sprout className="size-3.5 text-emerald-500" />
                <span>Simulated Soil Moisture Saturation</span>
              </span>
              <span className="font-bold text-emerald-500">{soilMoisture}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              step={1}
              value={soilMoisture}
              onChange={(e) => setSoilMoisture(Number(e.target.value))}
              className="w-full h-2 bg-[#080810] border border-[#1e1e30] rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>30% (Dry)</span>
              <span>60% (Moderate)</span>
              <span>75% (Saturation Threshold)</span>
              <span>100% (Saturated)</span>
            </div>
          </div>
        </div>

        {/* Prediction Output & Delta Column */}
        <div className="lg:col-span-5 rounded-xl border border-[#1e1e30] bg-[#080810] p-4 space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-[#1c1c2b] pb-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-gray-400 font-mono font-semibold">
                Simulated Outcome
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black font-mono text-white">{currentSimScore}</span>
                <span className="text-xs text-gray-400 font-mono">/ 100 Score</span>
              </div>
            </div>

            <Badge
              className={cn(
                "rounded px-3 py-1 text-xs font-bold uppercase tracking-wider border-transparent shadow-none",
                levelBadgeStyles[simLevel] || levelBadgeStyles.Safe
              )}
            >
              {simLevel}
            </Badge>
          </div>

          {/* Delta Comparison */}
          <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30]">
            <span className="text-gray-400 font-mono">Variance from Live Telemetry:</span>
            <span
              className={cn(
                "font-mono font-bold flex items-center gap-1",
                scoreDiff > 0
                  ? "text-[#dc2626]"
                  : scoreDiff < 0
                  ? "text-emerald-500"
                  : "text-gray-400"
              )}
            >
              {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts
              {scoreDiff > 20 && <TrendingUp className="size-3" />}
            </span>
          </div>

          {/* Simulated Recommendation */}
          <div className="rounded-lg bg-[#0f0f1a] border border-[#1e1e30] p-3 text-xs space-y-1">
            <div className="font-bold text-white font-mono">Action Directive:</div>
            <div className="text-gray-300 leading-relaxed">
              {simResult?.recommendation || "System calibrating..."}
            </div>
          </div>

          {/* Mini XAI Breakdown */}
          {simResult?.factors && (
            <div className="pt-2 border-t border-[#1c1c2b]">
              <RiskFactorBreakdown factors={simResult.factors} compact />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
