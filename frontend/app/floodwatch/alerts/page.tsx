"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  Bell,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  Download,
  Check,
  CheckCheck,
  Clock,
  MapPin,
  ArrowRight,
  Shield,
  X,
} from "lucide-react"
import { supabase, type Alert } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export default function AlertsAuditPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null)
  const [batchAcknowledging, setBatchAcknowledging] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("alert_log")
        .select("*, zones(name, district, state)")
        .order("triggered_at", { ascending: false })

      if (error) {
        setAlerts([])
        return
      }

      if (data) {
        const normalized = data.map((item) => ({
          ...item,
          zones: Array.isArray(item.zones) ? item.zones[0] : item.zones,
        }))
        setAlerts(normalized as Alert[])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()

    const channel = supabase
      .channel("alerts-audit-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alert_log" },
        () => fetchAlerts()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAlerts])

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
      await fetchAlerts()
    } finally {
      setAcknowledgingId(null)
    }
  }

  const handleAcknowledgeAll = async () => {
    try {
      setBatchAcknowledging(true)
      const unackIds = alerts.filter((a) => !a.acknowledged).map((a) => a.id)
      if (unackIds.length === 0) return

      const now = new Date().toISOString()
      const { error } = await supabase
        .from("alert_log")
        .update({
          acknowledged: true,
          acknowledged_at: now,
          acknowledged_by: "Disaster Management Incident Commander",
        })
        .in("id", unackIds)

      if (error) {
        await supabase
          .from("alert_log")
          .update({ acknowledged: true })
          .in("id", unackIds)
      }
      await fetchAlerts()
    } finally {
      setBatchAcknowledging(false)
    }
  }

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const zoneName = (alert.zones?.name || "").toLowerCase()
      const msg = (alert.message || "").toLowerCase()
      const q = searchQuery.toLowerCase()

      const matchesSearch = !q || zoneName.includes(q) || msg.includes(q)
      const matchesSeverity = severityFilter === "all" || alert.risk_level === severityFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "unack" && !alert.acknowledged) ||
        (statusFilter === "acked" && alert.acknowledged)

      return matchesSearch && matchesSeverity && matchesStatus
    })
  }, [alerts, searchQuery, severityFilter, statusFilter])

  const counts = useMemo(() => {
    return {
      all: alerts.length,
      unack: alerts.filter((a) => !a.acknowledged).length,
      critical: alerts.filter((a) => a.risk_level === "Critical").length,
      warning: alerts.filter((a) => a.risk_level === "Warning").length,
    }
  }, [alerts])

  const handleExportCSV = () => {
    if (alerts.length === 0) return

    const headers = ["Alert ID", "Timestamp", "Zone ID", "Zone Name", "Severity", "Message", "Acknowledged"]
    const rows = filteredAlerts.map((a) => [
      `"${a.id}"`,
      `"${a.triggered_at}"`,
      `"${a.zone_id}"`,
      `"${a.zones?.name || a.zone_id}"`,
      `"${a.risk_level}"`,
      `"${(a.message || "").replace(/"/g, '""')}"`,
      a.acknowledged ? "TRUE" : "FALSE",
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const encoded = encodeURI(csvContent)
    const link = document.createElement("a")
    link.href = encoded
    link.download = `floodwatch_alert_audit_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function formatTime(timestamp: string) {
    const d = new Date(timestamp)
    if (Number.isNaN(d.getTime())) return "--:--"
    return d.toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white selection:bg-[#dc2626] selection:text-white font-sans antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-[#1c1c2b] pb-4">
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs bg-[#0f0f1a] border-[#232338] text-gray-300 hover:text-white">
              <Link href="/floodwatch">
                <ArrowLeft className="size-3.5" />
                <span>Back to Command Center</span>
              </Link>
            </Button>
            <span className="text-gray-600 text-xs">•</span>
            <span className="text-xs font-bold font-mono text-white">Incident Audit Log</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={alerts.length === 0}
              className="h-8 gap-1.5 text-xs bg-[#0f0f1a] border-[#232338] text-gray-300 hover:text-white cursor-pointer shadow-xs"
            >
              <Download className="size-3.5 text-[#dc2626]" />
              <span>Export Audit Trail (CSV)</span>
            </Button>
          </div>
        </div>

        {/* Page Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-[#dc2626] text-white">
                <Bell className="size-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Incident Dispatch & Alert Audit Log
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-400">
              Official disaster mitigation audit trail of critical flood triggers and civil defense orders
            </p>
          </div>

          {counts.unack > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAcknowledgeAll}
              disabled={batchAcknowledging}
              className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-semibold cursor-pointer"
            >
              <CheckCheck className="size-3.5" />
              <span>Acknowledge All Active ({counts.unack})</span>
            </Button>
          )}
        </div>

        {/* Metric Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-[#1e1e30] bg-[#0f0f1a] p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 font-mono">Total Incidents</div>
              <div className="text-2xl font-bold font-mono text-white mt-0.5">{counts.all}</div>
            </div>
            <Bell className="size-5 text-gray-400" />
          </div>

          <div className="rounded-xl border border-[#1e1e30] bg-[#0f0f1a] p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 font-mono">Active Unacknowledged</div>
              <div className="text-2xl font-bold font-mono text-amber-500 mt-0.5">{counts.unack}</div>
            </div>
            <Clock className="size-5 text-amber-500" />
          </div>

          <div className="rounded-xl border border-[#1e1e30] bg-[#0f0f1a] p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 font-mono">Critical Emergencies</div>
              <div className="text-2xl font-bold font-mono text-[#dc2626] mt-0.5">{counts.critical}</div>
            </div>
            <ShieldAlert className="size-5 text-[#dc2626]" />
          </div>

          <div className="rounded-xl border border-[#1e1e30] bg-[#0f0f1a] p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 font-mono">Warning Advisories</div>
              <div className="text-2xl font-bold font-mono text-amber-500 mt-0.5">{counts.warning}</div>
            </div>
            <AlertTriangle className="size-5 text-amber-500" />
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="rounded-xl border border-[#1e1e30] bg-[#0f0f1a] p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by basin name or directive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs bg-[#080810] border-[#1e1e30] text-white placeholder:text-gray-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap font-mono">
              {/* Status Filter */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#080810] border border-[#232338] text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                    statusFilter === "all" ? "bg-[#1c1c2b] text-white shadow-xs font-semibold" : "text-gray-400 hover:text-white"
                  )}
                >
                  All Status
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("unack")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                    statusFilter === "unack" ? "bg-[#1c1c2b] text-white shadow-xs font-semibold" : "text-gray-400 hover:text-white"
                  )}
                >
                  Active Only
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("acked")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer",
                    statusFilter === "acked" ? "bg-[#1c1c2b] text-white shadow-xs font-semibold" : "text-gray-400 hover:text-white"
                  )}
                >
                  Acknowledged
                </button>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1">
                {(["all", "Critical", "Warning", "Advisory"] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border",
                      severityFilter === sev
                        ? sev === "Critical"
                          ? "bg-[#dc2626] text-white font-bold border-transparent shadow-xs"
                          : "bg-[#1c1c2b] text-white font-bold border-[#2e2e42] shadow-xs"
                        : "bg-[#080810] text-gray-400 hover:text-white border-[#232338]"
                    )}
                  >
                    {sev === "all" ? "All Severity" : sev}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <Card className="bg-[#0f0f1a] border border-[#1e1e30] text-white rounded-xl shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1c1c2b] hover:bg-transparent">
                  <TableHead className="text-gray-400 font-mono text-xs">Triggered At</TableHead>
                  <TableHead className="text-gray-400 font-mono text-xs">River Basin</TableHead>
                  <TableHead className="text-gray-400 font-mono text-xs">Severity</TableHead>
                  <TableHead className="text-gray-400 font-mono text-xs">Tactical Recommendation</TableHead>
                  <TableHead className="text-gray-400 font-mono text-xs">Audit Status</TableHead>
                  <TableHead className="text-right text-gray-400 font-mono text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-gray-400 font-mono">
                      Loading audit records from Supabase...
                    </TableCell>
                  </TableRow>
                ) : filteredAlerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-xs text-gray-400 font-mono">
                      No matching incident alerts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlerts.map((alert) => {
                    const isCritical = alert.risk_level === "Critical"
                    const isWarning = alert.risk_level === "Warning"
                    const zoneName = alert.zones?.name || `Zone ${alert.zone_id.slice(0, 8)}`
                    const district = alert.zones?.district || alert.zones?.state || ""
                    const isAck = alert.acknowledged

                    return (
                      <TableRow key={alert.id} className="border-[#1c1c2b] hover:bg-[#080810]">
                        <TableCell className="font-mono text-xs text-white whitespace-nowrap">
                          {formatTime(alert.triggered_at)}
                        </TableCell>

                        <TableCell>
                          <div className="font-bold text-xs text-white">{zoneName}</div>
                          {district && <div className="text-[10px] text-gray-400 font-mono">{district}</div>}
                        </TableCell>

                        <TableCell>
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
                        </TableCell>

                        <TableCell className="text-xs text-gray-300 max-w-md">
                          {alert.message}
                        </TableCell>

                        <TableCell>
                          {isAck ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                              <CheckCircle2 className="size-3.5" />
                              <span>Acknowledged</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-500">
                              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Active Unread</span>
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isAck && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={acknowledgingId === alert.id}
                                onClick={() => handleAcknowledge(alert.id)}
                                className="h-6 px-2 text-[11px] bg-[#080810] border border-[#232338] text-gray-300 hover:text-white gap-1 cursor-pointer"
                              >
                                <Check className="size-3" />
                                <span>Acknowledge</span>
                              </Button>
                            )}

                            <Button asChild size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-gray-400 hover:text-white">
                              <Link href={`/floodwatch/zone/${alert.zone_id}`}>
                                <ArrowRight className="size-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
