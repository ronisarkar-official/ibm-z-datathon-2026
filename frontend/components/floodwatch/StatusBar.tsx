"use client"

import { useState, useEffect } from "react"
import { ShieldAlert, AlertTriangle, Layers, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Prediction } from "@/lib/supabase"

interface StatusBarProps {
  predictions: Prediction[]
}

export function StatusBar({ predictions }: StatusBarProps) {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let isMounted = true
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL
    const primaryUrl =
      rawApiUrl && !rawApiUrl.includes("your-render-app")
        ? rawApiUrl
        : "http://localhost:8000"
    const fallbackUrl = primaryUrl.includes("localhost")
      ? primaryUrl.replace("localhost", "127.0.0.1")
      : primaryUrl.includes("127.0.0.1")
      ? primaryUrl.replace("127.0.0.1", "localhost")
      : null

    async function checkHealth() {
      try {
        let res: Response | null = null
        try {
          res = await fetch(`${primaryUrl}/health`, {
            method: "GET",
            cache: "no-store",
          })
        } catch {
          if (fallbackUrl) {
            res = await fetch(`${fallbackUrl}/health`, {
              method: "GET",
              cache: "no-store",
            })
          }
        }

        if (isMounted) {
          setBackendOnline(res ? res.ok : false)
        }
      } catch {
        if (isMounted) {
          setBackendOnline(false)
        }
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 10000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const totalZones = predictions.length
  const criticalCount = predictions.filter((p) => p.risk_level === "Critical").length
  const warningCount = predictions.filter((p) => p.risk_level === "Warning").length

  const latestRecordedAt = predictions.reduce((latest, cur) => {
    if (!latest) return cur.recorded_at
    return new Date(cur.recorded_at).getTime() > new Date(latest).getTime()
      ? cur.recorded_at
      : latest
  }, "")

  const lastUpdated = latestRecordedAt
    ? new Date(latestRecordedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "--:--:--"

  return (
    <div className="w-full rounded-xl border border-[#1e1e30] bg-[#0c0c16] px-4 py-3 text-sm text-gray-300 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2 text-white">
            <Layers className="size-4 text-gray-400" />
            <span className="font-mono font-semibold">{totalZones} Zones Monitored</span>
          </div>

          <div className="h-3.5 w-px bg-[#1e1e30] hidden sm:block" />

          <div className="flex items-center gap-2 text-[#dc2626]">
            <ShieldAlert className="size-4" />
            <span className="font-mono font-bold">{criticalCount} Critical</span>
          </div>

          <div className="h-3.5 w-px bg-[#1e1e30] hidden sm:block" />

          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="size-4" />
            <span className="font-mono font-semibold">{warningCount} Warnings</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-gray-400" />
            <span>Updated: {lastUpdated}</span>
          </div>

          <div className="h-3.5 w-px bg-[#1e1e30] hidden sm:block" />

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full shrink-0 transition-colors",
                backendOnline === true && "bg-emerald-500",
                backendOnline === false && "bg-[#dc2626]",
                backendOnline === null && "bg-gray-600 animate-pulse"
              )}
            />
            <span className="font-medium text-white">
              {backendOnline === true
                ? "IBM Z Engine Online"
                : backendOnline === false
                ? "Engine Offline"
                : "Checking..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
