"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Droplets,
  Waves,
  Thermometer,
  Sprout,
  Wind,
  Mountain,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react"
import {
  supabase,
  type Zone,
  type Prediction,
  type EvacuationOrder,
  fetchZoneEvacuationStatus,
} from "@/lib/supabase"
import { RiskTrendChart } from "@/components/floodwatch/RiskTrendChart"
import { RiskFactorBreakdown } from "@/components/floodwatch/RiskFactorBreakdown"
import { WhatIfScenarioSimulator } from "@/components/floodwatch/WhatIfScenarioSimulator"
import { EvacuationProtocolModal } from "@/components/floodwatch/EvacuationProtocolModal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export default function ZoneDetailPage() {
  const params = useParams()
  const zoneId = params?.id as string

  const [zone, setZone] = useState<Zone | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [activeOrder, setActiveOrder] = useState<EvacuationOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [protocolModalOpen, setProtocolModalOpen] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [simNotice, setSimNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!zoneId) return

    async function loadData() {
      try {
        const { data: zoneData } = await supabase
          .from("zones")
          .select("*")
          .eq("id", zoneId)
          .single()

        if (zoneData) {
          setZone(zoneData as Zone)
        }

        const { data: predData } = await supabase
          .from("predictions")
          .select("*")
          .eq("zone_id", zoneId)
          .order("recorded_at", { ascending: false })
          .limit(20)

        if (predData) {
          setPredictions(predData as Prediction[])
        }

        const evacData = await fetchZoneEvacuationStatus(zoneId)
        if (evacData?.active_order) {
          setActiveOrder(evacData.active_order)
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()

    const channel = supabase
      .channel(`zone-${zoneId}-live`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "predictions",
          filter: `zone_id=eq.${zoneId}`,
        },
        (payload) => {
          setPredictions((prev) => [payload.new as Prediction, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [zoneId])

  const latestPrediction = predictions[0]
  const currentRisk = latestPrediction?.risk_level || "Safe"

  const handleSimulateZone = async (isCritical: boolean) => {
    try {
      setSimulating(true)
      const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const elevation = zone?.elevation ?? 12.0
      const payload = isCritical
        ? {
            zone_id: zoneId,
            rainfall: 122.5,
            river_level: 10.5,
            soil_moisture: 94.0,
            temperature: 24.0,
            humidity: 98.0,
            elevation,
          }
        : {
            zone_id: zoneId,
            rainfall: 9.2,
            river_level: 1.8,
            soil_moisture: 36.0,
            temperature: 28.5,
            humidity: 60.0,
            elevation,
          }

      const res = await fetch(`${rawApiUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const result = await res.json()
        setSimNotice(`Simulated: ${result.risk_level} (${result.risk_score}/100)`)
        setTimeout(() => setSimNotice(null), 4000)
        const { data: predData } = await supabase
          .from("predictions")
          .select("*")
          .eq("zone_id", zoneId)
          .order("recorded_at", { ascending: false })
          .limit(20)
        if (predData) setPredictions(predData as Prediction[])
      }
    } catch {
      setSimNotice("Backend unreachable")
      setTimeout(() => setSimNotice(null), 4000)
    } finally {
      setSimulating(false)
    }
  }

  const riskBadgeStyles: Record<string, string> = {
    Critical: "bg-[#dc2626] text-white",
    Warning: "bg-amber-600 text-white",
    Advisory: "bg-[#1c1c2b] text-gray-300 border border-[#2e2e42]",
    Safe: "bg-emerald-600 text-white",
  }

  const chartPredictions = [...predictions].reverse()
  const tablePredictions = predictions.slice(0, 10)

  function formatTime(timestamp: string) {
    const d = new Date(timestamp)
    if (Number.isNaN(d.getTime())) return "--:--"
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080810] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <Skeleton className="h-6 w-36 bg-[#0f0f1a]" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64 bg-[#0f0f1a]" />
            <Skeleton className="h-8 w-24 bg-[#0f0f1a]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-[280px] w-full rounded-xl bg-[#0f0f1a]" />
            <Skeleton className="h-[280px] w-full rounded-xl bg-[#0f0f1a]" />
          </div>
          <Skeleton className="h-[300px] w-full rounded-xl bg-[#0f0f1a]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white selection:bg-[#dc2626] selection:text-white font-sans antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <Link
            href="/floodwatch"
            className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors mb-4 px-3 py-1.5 rounded-lg border border-[#232338] bg-[#0f0f1a]"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1c1c2b]">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {zone?.name || `Zone ${zoneId?.slice(0, 8)}`}
              </h1>
              <p className="text-sm text-gray-400 mt-1 font-mono">
                {[zone?.district, zone?.state].filter(Boolean).join(", ") || "Monitored Flood Basin"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                disabled={simulating}
                onClick={() => handleSimulateZone(true)}
                className="h-8 gap-1.5 text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white border-0 font-semibold cursor-pointer shadow-xs"
                title="Inject critical surge telemetry into this basin"
              >
                <Zap className="size-3.5 fill-white text-white" />
                <span>Surge</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={simulating}
                onClick={() => handleSimulateZone(false)}
                className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-semibold cursor-pointer shadow-xs"
                title="Inject safe baseline telemetry into this basin"
              >
                <Sparkles className="size-3.5 text-white" />
                <span>Safe</span>
              </Button>

              {(currentRisk === "Critical" || currentRisk === "Warning") && latestPrediction && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setProtocolModalOpen(true)}
                  className={cn(
                    "h-8 gap-1.5 text-xs font-bold cursor-pointer shadow-xs border-0",
                    currentRisk === "Critical"
                      ? "bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                      : "bg-amber-600 hover:bg-amber-500 text-white"
                  )}
                >
                  <ShieldAlert className="size-3.5" />
                  <span>Evacuation Directive</span>
                </Button>
              )}

              <Badge className={cn("rounded px-3 py-1 text-xs font-bold uppercase tracking-wider border-transparent shadow-none", riskBadgeStyles[currentRisk] || riskBadgeStyles.Safe)}>
                {currentRisk} Risk
              </Badge>
            </div>
          </div>

          {simNotice && (
            <div className="text-xs font-mono text-gray-300 bg-[#0f0f1a] border border-[#232338] rounded-lg px-3 py-1.5 mt-3 animate-in fade-in">
              {simNotice}
            </div>
          )}

          {activeOrder && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs mt-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <span className="font-bold text-emerald-300">
                    Emergency Evacuation Directive Dispatched & Active
                  </span>
                  <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                    #{activeOrder.authorization_code}
                  </Badge>
                </div>
                <p className="text-gray-400 text-[11px] font-mono">
                  Authorized at {new Date(activeOrder.authorized_at).toLocaleTimeString()} by {activeOrder.authorized_by}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setProtocolModalOpen(true)}
                className="h-7 text-xs bg-[#0f0f1a] border-[#232338] text-gray-300 hover:text-white cursor-pointer"
              >
                Manage Evacuation Directive
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <Card className="bg-[#0f0f1a] border border-[#1e1e30] text-white rounded-xl shadow-xs">
            <CardHeader className="p-6 pb-3 border-b border-[#1c1c2b]">
              <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-white">
                Current Sensor Readings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-[#080810] p-3.5 border border-[#1e1e30]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1.5 font-mono">
                    <Droplets className="size-4 text-[#dc2626]" />
                    <span className="text-xs uppercase">Rainfall</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {latestPrediction ? `${latestPrediction.rainfall} mm` : "--"}
                  </div>
                </div>

                <div className="rounded-lg bg-[#080810] p-3.5 border border-[#1e1e30]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1.5 font-mono">
                    <Waves className="size-4 text-[#dc2626]" />
                    <span className="text-xs uppercase">River Level</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {latestPrediction ? `${latestPrediction.river_level} m` : "--"}
                  </div>
                </div>

                <div className="rounded-lg bg-[#080810] p-3.5 border border-[#1e1e30]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1.5 font-mono">
                    <Sprout className="size-4 text-emerald-500" />
                    <span className="text-xs uppercase">Soil Moisture</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {latestPrediction ? `${latestPrediction.soil_moisture}%` : "--"}
                  </div>
                </div>

                <div className="rounded-lg bg-[#080810] p-3.5 border border-[#1e1e30]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1.5 font-mono">
                    <Thermometer className="size-4 text-amber-500" />
                    <span className="text-xs uppercase">Temperature</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {latestPrediction ? `${latestPrediction.temperature}°C` : "--"}
                  </div>
                </div>

                <div className="rounded-lg bg-[#080810] p-3.5 border border-[#1e1e30]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1.5 font-mono">
                    <Wind className="size-4 text-gray-400" />
                    <span className="text-xs uppercase">Humidity</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {latestPrediction ? `${latestPrediction.humidity}%` : "--"}
                  </div>
                </div>

                <div className="rounded-lg bg-[#080810] p-3.5 border border-[#1e1e30]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1.5 font-mono">
                    <Mountain className="size-4 text-gray-400" />
                    <span className="text-xs uppercase">Elevation</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {zone ? `${zone.elevation} m` : "--"}
                  </div>
                </div>
              </div>

              {latestPrediction?.recommendation && (
                <div className="mt-5 rounded-lg bg-[#080810] border border-[#1e1e30] p-4">
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-400 mb-1">
                    System Recommendation
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {latestPrediction.recommendation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#0f0f1a] border border-[#1e1e30] text-white rounded-xl shadow-xs">
            <CardHeader className="p-6 pb-3 border-b border-[#1c1c2b]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-white">
                  Risk Trend (Last 20 Readings)
                </CardTitle>
                <span className="text-xs text-gray-400 font-mono">Score 0–100</span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <RiskTrendChart predictions={chartPredictions} />
            </CardContent>
          </Card>
        </div>

        {/* Explainable AI (XAI) Hydrological Factor Attribution Panel */}
        <RiskFactorBreakdown
          factors={latestPrediction?.factors}
          prediction={latestPrediction}
        />

        {/* Interactive Hydrological What-If Scenario Stress-Testing */}
        <WhatIfScenarioSimulator
          baselinePrediction={latestPrediction}
          zoneElevation={Number(zone?.elevation ?? 12.0)}
        />

        <Card className="bg-[#0f0f1a] border border-[#1e1e30] text-white rounded-xl shadow-xs overflow-hidden">
          <CardHeader className="p-6 pb-3 border-b border-[#1c1c2b]">
            <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-white">
              Recent Predictions History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1c1c2b] hover:bg-transparent">
                  <TableHead className="text-gray-400 font-mono text-xs">Time</TableHead>
                  <TableHead className="text-gray-400 font-mono text-xs">Risk Level</TableHead>
                  <TableHead className="text-gray-400 font-mono text-xs">Risk Score</TableHead>
                  <TableHead className="text-gray-400 font-mono text-xs">Rainfall</TableHead>
                  <TableHead className="text-gray-400 font-mono text-xs">River Level</TableHead>
                  <TableHead className="text-gray-400 font-mono text-xs">Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tablePredictions.length === 0 ? (
                  <TableRow className="border-[#1c1c2b] hover:bg-transparent">
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 font-mono">
                      No prediction logs found for this zone
                    </TableCell>
                  </TableRow>
                ) : (
                  tablePredictions.map((pred) => (
                    <TableRow key={pred.id} className="border-[#1c1c2b] hover:bg-[#080810]">
                      <TableCell className="font-mono text-xs text-white">
                        {formatTime(pred.recorded_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "rounded text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider border-transparent shadow-none",
                            riskBadgeStyles[pred.risk_level] || riskBadgeStyles.Safe
                          )}
                        >
                          {pred.risk_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold font-mono text-white">
                        {pred.risk_score}
                      </TableCell>
                      <TableCell className="text-gray-300 font-mono text-xs">
                        {pred.rainfall} mm
                      </TableCell>
                      <TableCell className="text-gray-300 font-mono text-xs">
                        {pred.river_level} m
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs max-w-xs truncate">
                        {pred.recommendation}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Evacuation Protocol Directive Modal */}
        <EvacuationProtocolModal
          prediction={latestPrediction}
          open={protocolModalOpen}
          onOpenChange={setProtocolModalOpen}
          onOrderUpdated={(order) => setActiveOrder(order)}
        />
      </div>
    </div>
  )
}
