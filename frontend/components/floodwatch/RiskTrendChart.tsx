"use client"

import { useState, useEffect } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import type { Prediction } from "@/lib/supabase"

interface RiskTrendChartProps {
  predictions: Prediction[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: {
      time: string
      risk_score: number
      risk_level: string
    }
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload

  return (
    <div className="rounded-lg border border-[#232338] bg-[#080810] p-2.5 text-xs shadow-xl text-white font-mono">
      <div className="text-gray-400 text-[11px] mb-1">{data.time}</div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-gray-400">Risk Score:</span>
        <span className="font-bold text-white">{data.risk_score}</span>
      </div>
      <div className="flex items-center justify-between gap-4 mt-0.5">
        <span className="text-gray-400">Risk Level:</span>
        <span className="font-semibold text-[#dc2626]">{data.risk_level}</span>
      </div>
    </div>
  )
}

function formatHHMM(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function RiskTrendChart({ predictions }: RiskTrendChartProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-[200px] w-full bg-[#080810] rounded-xl animate-pulse border border-[#1e1e30]" />
    )
  }

  if (predictions.length === 0) {
    return (
      <div className="h-[200px] w-full flex items-center justify-center text-xs font-mono text-gray-500 bg-[#080810] rounded-xl border border-[#1e1e30]">
        No telemetry trend recorded yet
      </div>
    )
  }

  const latestPrediction = predictions.reduce((latest, cur) => {
    if (!latest) return cur
    return new Date(cur.recorded_at).getTime() >= new Date(latest.recorded_at).getTime()
      ? cur
      : latest
  }, predictions[0])

  const latestScore = latestPrediction ? latestPrediction.risk_score : 0

  const lineColor =
    latestScore >= 75
      ? "#dc2626"
      : latestScore >= 50
      ? "#f59e0b"
      : latestScore >= 25
      ? "#eab308"
      : "#10b981"

  const chartData = predictions.map((p) => ({
    time: formatHHMM(p.recorded_at),
    risk_score: p.risk_score,
    risk_level: p.risk_level,
  }))

  return (
    <div className="h-[200px] w-full bg-[#0f0f1a] rounded-xl p-3 border border-[#1e1e30]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
          <XAxis
            dataKey="time"
            stroke="#6b7280"
            fontSize={10}
            fontFamily="monospace"
            tickLine={false}
            axisLine={{ stroke: "#1e1e30" }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#6b7280"
            fontSize={10}
            fontFamily="monospace"
            tickLine={false}
            axisLine={{ stroke: "#1e1e30" }}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="risk_score"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 2, fill: lineColor, stroke: "#0f0f1a" }}
            activeDot={{ r: 4, fill: lineColor, stroke: "#ffffff" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
