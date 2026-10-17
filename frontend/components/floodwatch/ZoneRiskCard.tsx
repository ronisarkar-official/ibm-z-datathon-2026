"use client"

import Link from "next/link"
import { Droplets, Waves, Thermometer, Sprout, ArrowUpRight, ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Prediction } from "@/lib/supabase"
import { RiskFactorBreakdown } from "./RiskFactorBreakdown"

interface ZoneRiskCardProps {
  prediction: Prediction
  onOpenProtocol?: (prediction: Prediction) => void
  isEvacuationActive?: boolean
  isIngestingTelemetry?: boolean
}

const riskStyles: Record<
  Prediction["risk_level"],
  { border: string; badge: string; bar: string }
> = {
  Critical: {
    border: "border-[#dc2626]/40 hover:border-[#dc2626] hover:shadow-[0_0_30px_rgba(220,38,38,0.15)]",
    badge: "bg-[#dc2626] text-white hover:bg-[#b91c1c]",
    bar: "bg-[#dc2626]",
  },
  Warning: {
    border: "border-amber-600/40 hover:border-amber-600",
    badge: "bg-amber-600 text-white hover:bg-amber-500",
    bar: "bg-amber-500",
  },
  Advisory: {
    border: "border-[#232338] hover:border-gray-500",
    badge: "bg-[#1c1c2b] text-gray-300 border border-[#2e2e42]",
    bar: "bg-yellow-500",
  },
  Safe: {
    border: "border-emerald-600/30 hover:border-emerald-600",
    badge: "bg-emerald-600 text-white hover:bg-emerald-500",
    bar: "bg-emerald-500",
  },
}

export function ZoneRiskCard({
  prediction,
  onOpenProtocol,
  isEvacuationActive,
  isIngestingTelemetry,
}: ZoneRiskCardProps) {
  const style = riskStyles[prediction.risk_level] || riskStyles.Safe
  const zoneName = prediction.zones?.name || `Zone ${prediction.zone_id.slice(0, 8)}`
  const district = prediction.zones?.district || prediction.zones?.state || "Monitored Basin"
  const isActionRequired = prediction.risk_level === "Critical" || prediction.risk_level === "Warning" || isEvacuationActive

  return (
    <Link
      href={`/floodwatch/zone/${prediction.zone_id}`}
      className="block group outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-xl"
    >
      <Card
        className={cn(
          "transition-all duration-200 border bg-[#0f0f1a] text-white rounded-xl hover:shadow-lg relative overflow-hidden",
          isIngestingTelemetry
            ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
            : style.border
        )}
      >
        <CardHeader className="p-6 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-bold tracking-tight text-white group-hover:text-gray-200 transition-colors">
                  {zoneName}
                </h3>
                <ArrowUpRight className="size-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-gray-400">{district}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {isIngestingTelemetry && (
                <Badge className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 font-mono text-[10px] px-2 py-0.5 animate-pulse uppercase tracking-wider shadow-none">
                  ⚡ Live Telemetry Ingested
                </Badge>
              )}
              {isEvacuationActive && (
                <Badge className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] px-2 py-0.5 animate-pulse uppercase tracking-wider border-transparent shadow-none">
                  Evacuation Active
                </Badge>
              )}
              <Badge className={cn("rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border-transparent shadow-none", style.badge)}>
                {prediction.risk_level}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-white font-mono">
                {prediction.risk_score}
              </span>
              <span className="text-xs text-gray-400 font-mono font-medium uppercase tracking-wider">
                / 100 Risk Score
              </span>
            </div>

            {isActionRequired && onOpenProtocol && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onOpenProtocol(prediction)
                }}
                className={cn(
                  "h-7 text-xs font-semibold gap-1 px-3 rounded cursor-pointer shadow-xs border-0",
                  isEvacuationActive
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : prediction.risk_level === "Critical"
                    ? "bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                    : "bg-amber-600 hover:bg-amber-500 text-white"
                )}
              >
                {isEvacuationActive ? (
                  <ShieldCheck className="size-3.5 text-white" />
                ) : prediction.risk_level === "Critical" ? (
                  <ShieldAlert className="size-3.5 text-white" />
                ) : (
                  <AlertTriangle className="size-3.5 text-white" />
                )}
                <span>{isEvacuationActive ? "View Directive" : "Evacuation Plan"}</span>
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-[#080810] border border-[#1e1e30] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", style.bar)}
              style={{ width: `${prediction.risk_score}%` }}
            />
          </div>

          {/* Vitals Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2.5 rounded-lg bg-[#080810] px-3 py-2 border border-[#1e1e30]">
              <Droplets className="size-4 text-[#dc2626] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-mono uppercase">Rainfall</span>
                <span className="font-bold text-white font-mono">{prediction.rainfall} mm</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg bg-[#080810] px-3 py-2 border border-[#1e1e30]">
              <Waves className="size-4 text-[#dc2626] shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-mono uppercase">River Level</span>
                <span className="font-bold text-white font-mono">{prediction.river_level} m</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg bg-[#080810] px-3 py-2 border border-[#1e1e30]">
              <Sprout className="size-4 text-emerald-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-mono uppercase">Soil Moisture</span>
                <span className="font-bold text-white font-mono">{prediction.soil_moisture}%</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg bg-[#080810] px-3 py-2 border border-[#1e1e30]">
              <Thermometer className="size-4 text-amber-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-mono uppercase">Temperature</span>
                <span className="font-bold text-white font-mono">{prediction.temperature}°C</span>
              </div>
            </div>
          </div>

          {/* Compact Explainable AI (XAI) Attribution */}
          <RiskFactorBreakdown prediction={prediction} compact />

          <div className="rounded-lg bg-[#080810] border border-[#1e1e30] p-2.5">
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
              <span className="font-bold text-white font-mono">Action Directive: </span>
              {prediction.recommendation}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
