"use client"

import { useState } from "react"
import { CheckCircle2, Bell, Check, ShieldAlert, Trash2, CheckCheck, RotateCcw, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase, type Alert, clearAllAlerts, acknowledgeAllAlerts } from "@/lib/supabase"

interface AlertFeedProps {
  alerts: Alert[]
  onAlertUpdated?: () => void
  onClearFeed?: () => void
}

function formatTimeAgo(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime()
  if (Number.isNaN(diffMs)) return "recently"
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))
  if (diffSec < 60) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

export function AlertFeed({ alerts, onAlertUpdated, onClearFeed }: AlertFeedProps) {
  const [filterMode, setFilterMode] = useState<"active" | "all" | "resolved">("active")
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [isAckingAll, setIsAckingAll] = useState(false)

  const activeCount = alerts.filter((a) => !a.acknowledged).length

  const filteredAlerts = alerts.filter((alert) => {
    if (filterMode === "active") return !alert.acknowledged
    if (filterMode === "resolved") return alert.acknowledged
    return true
  })

  const handleAcknowledge = async (alertId: string) => {
    try {
      setAcknowledgingId(alertId)
      const now = new Date().toISOString()
      const { error } = await supabase
        .from("alert_log")
        .update({
          acknowledged: true,
          acknowledged_at: now,
          acknowledged_by: "Disaster Management Incident Commander",
        })
        .eq("id", alertId)

      if (error) {
        await supabase
          .from("alert_log")
          .update({ acknowledged: true })
          .eq("id", alertId)
      }
      if (onAlertUpdated) onAlertUpdated()
    } catch (err) {
      console.error("Failed to acknowledge alert:", err)
    } finally {
      setAcknowledgingId(null)
    }
  }

  const handleAcknowledgeAll = async () => {
    try {
      setIsAckingAll(true)
      await acknowledgeAllAlerts()
      if (onAlertUpdated) onAlertUpdated()
    } catch (err) {
      console.error("Failed to ack all alerts:", err)
    } finally {
      setIsAckingAll(false)
    }
  }

  const handleClearFeed = async () => {
    try {
      setIsClearing(true)
      await clearAllAlerts()
      if (onClearFeed) onClearFeed()
      if (onAlertUpdated) onAlertUpdated()
    } catch (err) {
      console.error("Failed to clear alert feed:", err)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Card className="bg-[#0f0f1a] border border-[#1e1e30] text-white rounded-xl shadow-xs h-full flex flex-col">
      <CardHeader className="p-4 pb-3 border-b border-[#1c1c2b] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-[#dc2626]" />
            <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-white">
              Incident Dispatch Feed
            </CardTitle>
            {activeCount > 0 && (
              <span className="size-2 rounded-full bg-[#dc2626] animate-pulse" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {activeCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                disabled={isAckingAll}
                onClick={handleAcknowledgeAll}
                className="h-6 px-1.5 text-[10px] text-gray-400 hover:text-white bg-[#080810] border border-[#232338] hover:border-gray-500 gap-1 cursor-pointer font-mono"
                title="Acknowledge all pending incidents"
              >
                {isAckingAll ? <Loader2 className="size-2.5 animate-spin" /> : <CheckCheck className="size-2.5 text-emerald-400" />}
                <span>Ack All</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              disabled={isClearing || alerts.length === 0}
              onClick={handleClearFeed}
              className="h-6 px-1.5 text-[10px] text-gray-400 hover:text-red-400 bg-[#080810] border border-[#232338] hover:border-red-900/60 gap-1 cursor-pointer font-mono"
              title="Clear feed for a clean demo demonstration"
            >
              {isClearing ? <Loader2 className="size-2.5 animate-spin" /> : <Trash2 className="size-2.5" />}
              <span>Clear</span>
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          <div className="flex items-center gap-1 bg-[#080810] p-0.5 rounded-lg border border-[#232338] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setFilterMode("active")}
              className={cn(
                "px-2 py-0.5 rounded transition-all cursor-pointer",
                filterMode === "active"
                  ? "bg-[#dc2626] text-white font-bold shadow-xs"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={cn(
                "px-2 py-0.5 rounded transition-all cursor-pointer",
                filterMode === "all"
                  ? "bg-[#1c1c2b] text-white font-bold shadow-xs"
                  : "text-gray-400 hover:text-white"
              )}
            >
              All ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("resolved")}
              className={cn(
                "px-2 py-0.5 rounded transition-all cursor-pointer",
                filterMode === "resolved"
                  ? "bg-[#1c1c2b] text-white font-bold shadow-xs"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Resolved ({alerts.length - activeCount})
            </button>
          </div>

          <span className="text-[10px] text-gray-500 font-mono">
            {filteredAlerts.length} shown
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-1">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 space-y-2">
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="text-sm font-semibold text-white">No active incidents</p>
            <p className="text-xs text-gray-400">All monitored river basins are reporting within thresholds</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filteredAlerts.map((alert) => {
              const isCritical = alert.risk_level === "Critical"
              const isWarning = alert.risk_level === "Warning"
              const zoneName = alert.zones?.name || `Zone ${alert.zone_id.slice(0, 8)}`
              const isAck = alert.acknowledged

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-xl p-3.5 border transition-all flex flex-col justify-between gap-2.5 bg-[#080810]",
                    isCritical
                      ? "border-l-4 border-l-[#dc2626] border-[#1e1e30]"
                      : isWarning
                      ? "border-l-4 border-l-amber-500 border-[#1e1e30]"
                      : "border-l-4 border-l-[#232338] border-[#1e1e30]"
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{zoneName}</span>
                        {isAck && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono border-emerald-500/40 text-emerald-400 bg-emerald-950/20">
                            Acked
                          </Badge>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          "rounded text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider border-transparent shadow-none",
                          isCritical
                            ? "bg-[#dc2626] text-white"
                            : isWarning
                            ? "bg-amber-600 text-white"
                            : "bg-[#1c1c2b] text-gray-300"
                        )}
                      >
                        {alert.risk_level}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{alert.message}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1c1c2b] text-[11px] font-mono text-gray-400">
                    <span>{formatTimeAgo(alert.triggered_at)}</span>

                    {!isAck ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={acknowledgingId === alert.id}
                        onClick={() => handleAcknowledge(alert.id)}
                        className="h-6 px-2 text-[11px] font-medium text-gray-300 hover:text-white bg-[#0f0f1a] border border-[#232338] hover:border-gray-500 gap-1 cursor-pointer"
                      >
                        <Check className="size-3" />
                        <span>Acknowledge</span>
                      </Button>
                    ) : (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Check className="size-3 text-emerald-400" /> Logged
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
