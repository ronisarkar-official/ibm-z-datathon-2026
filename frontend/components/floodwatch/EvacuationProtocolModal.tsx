"use client"

import { useState, useEffect } from "react"
import {
  AlertTriangle,
  Users,
  Building2,
  Navigation,
  ShieldCheck,
  Radio,
  Download,
  CheckCircle2,
  PhoneCall,
  Flame,
  Truck,
  Waves,
  X,
  FileText,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  type Prediction,
  type EvacuationOrder,
  type Shelter,
  type EvacuationRoute,
  type ZoneEvacuationData,
  fetchZoneEvacuationStatus,
  authorizeEvacuationPlan,
  standDownEvacuationPlan,
  broadcastCitizenAlert,
  updateRouteStatus,
  updateShelterStatus,
} from "@/lib/supabase"

interface EvacuationProtocolModalProps {
  prediction: Prediction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderUpdated?: (order: EvacuationOrder | null) => void
  onOrderStoodDown?: (zoneId: string) => void
}

export function EvacuationProtocolModal({
  prediction,
  open,
  onOpenChange,
  onOrderUpdated,
  onOrderStoodDown,
}: EvacuationProtocolModalProps) {
  const [loading, setLoading] = useState(false)
  const [authorizing, setAuthorizing] = useState(false)
  const [standingDown, setStandingDown] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [alertBroadcasted, setAlertBroadcasted] = useState<string | null>(null)
  const [zoneData, setZoneData] = useState<ZoneEvacuationData | null>(null)
  const [activeOrder, setActiveOrder] = useState<EvacuationOrder | null>(null)
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [routes, setRoutes] = useState<EvacuationRoute[]>([])

  useEffect(() => {
    if (!open || !prediction) return

    let isMounted = true
    async function loadStatus() {
      setLoading(true)
      try {
        const data = await fetchZoneEvacuationStatus(prediction!.zone_id)
        if (isMounted && data) {
          setZoneData(data)
          setActiveOrder(data.active_order)
          setShelters(data.shelters)
          setRoutes(data.routes)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadStatus()
    return () => {
      isMounted = false
    }
  }, [open, prediction])

  if (!prediction) return null

  const zoneName = prediction.zones?.name || zoneData?.metadata.name || `Zone ${prediction.zone_id.slice(0, 8)}`
  const district = prediction.zones?.district || prediction.zones?.state || zoneData?.metadata.district || "River Basin Area"
  const population = zoneData?.metadata.population || "110,000 residents"
  const riverBasin = prediction.zones?.river_basin || zoneData?.metadata.river_basin || "Monitored River Catchment"
  const coordinator = zoneData?.metadata.coordinator || {
    name: "S. K. Mukherjee, IAS",
    title: "District Disaster Incident Commander",
    phone: "+91 33 2214-5555",
  }

  const isCritical = prediction.risk_level === "Critical"
  const isAuthorized = !!activeOrder

  const handleAuthorizeDispatch = async () => {
    try {
      setAuthorizing(true)
      const order = await authorizeEvacuationPlan({
        zone_id: prediction.zone_id,
        risk_level: prediction.risk_level,
        authorized_by: coordinator.name,
        commander_phone: coordinator.phone,
        deployed_units: [
          "National Disaster Response Force (NDRF) Team Alpha (45 Personnel)",
          "12x Motorized Inflatable Rescue Boats (MIRBs)",
          "6x Heavy Axial Dewatering Pumps",
          "Central Trauma & Waterborne Triage Units",
        ],
        incident_notes: `Emergency directive issued for ${zoneName} (${district}) at risk score ${prediction.risk_score}/100.`,
      })
      setActiveOrder(order)
      if (onOrderUpdated) onOrderUpdated(order)
    } finally {
      setAuthorizing(false)
    }
  }

  const handleStandDown = async () => {
    try {
      setStandingDown(true)
      await standDownEvacuationPlan(prediction.zone_id, "Flood levels receded below critical threshold")
      setActiveOrder(null)
      if (onOrderUpdated) onOrderUpdated(null)
      if (onOrderStoodDown) onOrderStoodDown(prediction.zone_id)
      setAlertBroadcasted("Evacuation stood down. Zone returned to normal status.")
      setTimeout(() => setAlertBroadcasted(null), 5000)
    } finally {
      setStandingDown(false)
    }
  }

  const handleBroadcastAlert = async () => {
    try {
      setBroadcasting(true)
      const channel = "Cell Broadcast CAP & Disaster SMS Gateway"
      const message = `EMERGENCY EVACUATION ALERT: Rapid flood inundation forecast for ${zoneName}. Move immediately to designated high-ground shelters via clear arterial routes. Follow disaster response instructions.`
      await broadcastCitizenAlert({
        zone_id: prediction.zone_id,
        message,
        channel,
      })
      setAlertBroadcasted(`Emergency alert broadcasted via ${channel} to ${population}`)
      setTimeout(() => setAlertBroadcasted(null), 8000)
    } finally {
      setBroadcasting(false)
    }
  }

  const handleToggleRoute = async (route: EvacuationRoute) => {
    const cycle: Record<string, "Clear" | "Restricted" | "Flooded"> = {
      Clear: "Restricted",
      Restricted: "Flooded",
      Flooded: "Clear",
    }
    const nextStatus = cycle[route.status] || "Clear"

    setRoutes((prev) =>
      prev.map((r) =>
        r.id === route.id
          ? {
              ...r,
              status: nextStatus,
              eta: nextStatus === "Flooded" ? "CLOSED" : r.eta === "CLOSED" ? "15 min" : r.eta,
            }
          : r
      )
    )

    await updateRouteStatus(prediction.zone_id, route.id, nextStatus)
  }

  const handleToggleShelter = async (shelter: Shelter) => {
    const cycle: Record<string, "Open" | "Filling" | "Full" | "Standby"> = {
      Open: "Filling",
      Filling: "Full",
      Full: "Standby",
      Standby: "Open",
    }
    const nextStatus = cycle[shelter.status] || "Open"

    setShelters((prev) =>
      prev.map((s) => (s.id === shelter.id ? { ...s, status: nextStatus } : s))
    )

    await updateShelterStatus(prediction.zone_id, shelter.id, nextStatus)
  }

  const handleDownloadEAP = () => {
    const orderCode = activeOrder?.authorization_code || `EAP-${prediction.zone_id.slice(0, 4).toUpperCase()}-DIRECTIVE`
    const orderStatus = activeOrder ? `AUTHORIZATION CONFIRMED (${activeOrder.status.toUpperCase()})` : "DRAFT DIRECTIVE (PENDING AUTHORIZATION)"

    const content = `=====================================================
FLOODWATCH EMERGENCY ACTION PLAN (EAP)
INCIDENT EVACUATION DIRECTIVE — DISASTER MANAGEMENT
=====================================================
Target Basin: ${zoneName} (${district})
River Basin: ${riverBasin}
Current Severity: ${prediction.risk_level.toUpperCase()} (Score: ${prediction.risk_score}/100)
Directive Status: ${orderStatus}
Authorization Code: ${orderCode}
Time Logged: ${new Date().toUTCString()}

1. DEMOGRAPHICS & POPULATION AT RISK:
   Estimated Population in Hazard Corridor: ${population}
   Incident Commander: ${coordinator.name} (${coordinator.phone})

2. DESIGNATED EVACUATION SHELTERS:
${shelters.map((s) => `   - ${s.name} | Capacity: ${s.capacity} | Status: ${s.status}`).join("\n")}

3. INUNDATION CORRIDOR & EVACUATION ROUTES:
${routes.map((r) => `   - ${r.name}: ${r.status.toUpperCase()} (Transit Time: ${r.eta})`).join("\n")}

4. DEPLOYMENT CHECKLIST:
   [X] National Disaster Response Force (NDRF) Alerted
   [X] Motorized Inflatable Rescue Boats (MIRBs) Dispatched
   [X] High-Discharge Dewatering Pumps Mobilized
   [X] Wireless Emergency Alert (WEA) Triggered via IBM Z LinuxONE Event Bus

Generated via FloodWatch — Real-Time AI for Critical Decisions.
=====================================================`

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `EAP_${zoneName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 bg-[#0f0f1a] border border-[#232338] text-white shadow-2xl">
        {/* Flat Header Strip without Gradients */}
        <div className="bg-[#080810] p-6 pb-4 border-b border-[#1c1c2b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge
                className={cn(
                  "uppercase text-[10px] tracking-wider font-extrabold px-2.5 py-0.5 rounded",
                  isCritical
                    ? "bg-[#dc2626] text-white"
                    : "bg-amber-600 text-white"
                )}
              >
                {prediction.risk_level} Protocol Active
              </Badge>

              {isAuthorized && (
                <Badge className="bg-emerald-600 text-white font-mono text-[10px] px-2 py-0.5 uppercase tracking-wider rounded">
                  Active Dispatch #{activeOrder?.authorization_code}
                </Badge>
              )}

              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs font-mono text-gray-400 flex items-center gap-1">
                <Clock className="size-3 text-[#dc2626]" />
                Score: {prediction.risk_score} / 100
              </span>
            </div>
            <DialogTitle className="text-2xl font-black text-white tracking-tight">
              {zoneName} Evacuation Action Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              {district} • {riverBasin} • Standard Operating Procedure (SOP) Directive
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadEAP}
              className="h-8 gap-1.5 text-xs bg-[#0f0f1a] border-[#232338] text-gray-300 hover:text-white cursor-pointer"
            >
              <Download className="size-3.5 text-[#dc2626]" />
              <span>Export EAP</span>
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Real-Time Alert Broadcast Banner */}
          {alertBroadcasted && (
            <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/20 text-emerald-400 p-3.5 flex items-center justify-between animate-in fade-in slide-in-from-top-1 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                <span>{alertBroadcasted}</span>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                Broadcast Logged
              </Badge>
            </div>
          )}

          {/* Active Order Persistent Notice */}
          {activeOrder && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <span className="font-bold text-emerald-300">
                    Evacuation Order Officially Authorized & Recorded in Database
                  </span>
                </div>
                <p className="text-gray-400 text-[11px]">
                  Directive Code: <span className="font-mono text-white font-semibold">{activeOrder.authorization_code}</span> • Authorized at {new Date(activeOrder.authorized_at).toLocaleTimeString()} by {activeOrder.authorized_by}
                </p>
              </div>
              <Badge className="bg-emerald-600 text-white shrink-0 text-[10px] px-2.5 py-1">
                STATUS: DISPATCHED
              </Badge>
            </div>
          )}

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#1e1e30] bg-[#080810] p-3.5">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1 font-mono">
                <Users className="size-4 text-[#dc2626]" />
                <span>Population at Risk</span>
              </div>
              <div className="text-lg font-bold font-mono text-white">{population}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{riverBasin}</div>
            </div>

            <div className="rounded-xl border border-[#1e1e30] bg-[#080810] p-3.5">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1 font-mono">
                <Building2 className="size-4 text-emerald-500" />
                <span>Designated Shelters</span>
              </div>
              <div className="text-lg font-bold font-mono text-white">
                {shelters.length} Facilities Monitored
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">Click shelter to toggle status</div>
            </div>

            <div className="rounded-xl border border-[#1e1e30] bg-[#080810] p-3.5">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1 font-mono">
                <PhoneCall className="size-4 text-amber-500" />
                <span>Incident Commander</span>
              </div>
              <div className="text-sm font-bold text-white truncate">{coordinator.name}</div>
              <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                {coordinator.phone}
              </div>
            </div>
          </div>

          {/* Two-Column Grid: Evacuation Corridors & Shelters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Evacuation Corridors */}
            <div className="rounded-xl border border-[#1e1e30] bg-[#0f0f1a] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1c1c2b] pb-2">
                <div className="flex items-center gap-2">
                  <Navigation className="size-4 text-[#dc2626]" />
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Evacuation Routes
                  </h4>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Click to toggle status</span>
              </div>

              <div className="space-y-2">
                {routes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleToggleRoute(r)}
                    className="w-full text-left rounded-lg border border-[#1e1e30] bg-[#080810] hover:border-[#2a2a44] p-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    title="Click to toggle route status in database"
                  >
                    <div>
                      <div className="font-bold text-white">{r.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">Est. Transit Time: {r.eta}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 transition-colors font-mono",
                        r.status === "Clear"
                          ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                          : r.status === "Restricted"
                          ? "border-amber-500/40 text-amber-400 bg-amber-950/20"
                          : "border-[#dc2626]/50 text-[#dc2626] bg-red-950/30"
                      )}
                    >
                      {r.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Designated Shelters */}
            <div className="rounded-xl border border-[#1e1e30] bg-[#0f0f1a] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1c1c2b] pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-emerald-500" />
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Safe Relief Shelters
                  </h4>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Click to toggle capacity</span>
              </div>

              <div className="space-y-2">
                {shelters.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleToggleShelter(s)}
                    className="w-full text-left rounded-lg border border-[#1e1e30] bg-[#080810] hover:border-[#2a2a44] p-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    title="Click to toggle shelter status in database"
                  >
                    <div>
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        Capacity: {s.capacity} {s.occupancy ? `• ${s.occupancy} evacuees checked in` : ""}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 transition-colors font-mono",
                        s.status === "Open"
                          ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                          : s.status === "Filling"
                          ? "border-amber-500/40 text-amber-400 bg-amber-950/20"
                          : s.status === "Full"
                          ? "border-[#dc2626]/50 text-[#dc2626] bg-red-950/30"
                          : "border-gray-500/40 text-gray-400 bg-gray-900/30"
                      )}
                    >
                      {s.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Operational SCADA & NDRF Dispatch Checklist */}
          <div className="rounded-xl border border-[#1e1e30] bg-[#080810] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1c1c2b] pb-2">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-amber-500" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Emergency Tactical Dispatch Checklist
                </h4>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-[#232338] text-gray-400">
                {isAuthorized ? "Dispatched & Active" : "Pending Order"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30]">
                <CheckCircle2
                  className={cn(
                    "size-4 shrink-0",
                    isAuthorized ? "text-emerald-500" : "text-gray-600"
                  )}
                />
                <div>
                  <div className="font-bold text-white">NDRF 2nd Battalion (45 Personnel)</div>
                  <div className="text-[10px] text-gray-400">Flood rescue and medical triage teams</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30]">
                <CheckCircle2
                  className={cn(
                    "size-4 shrink-0",
                    isAuthorized ? "text-emerald-500" : "text-gray-600"
                  )}
                />
                <div>
                  <div className="font-bold text-white">12x Inflatable Rescue Boats (MIRB)</div>
                  <div className="text-[10px] text-gray-400">Pre-staged at northern canal staging zone</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30]">
                <CheckCircle2
                  className={cn(
                    "size-4 shrink-0",
                    isAuthorized ? "text-emerald-500" : "text-gray-600"
                  )}
                />
                <div>
                  <div className="font-bold text-white">6x Heavy Axial Dewatering Pumps</div>
                  <div className="text-[10px] text-gray-400">Deploying to sub-surface drainage nodes</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f0f1a] border border-[#1e1e30]">
                <CheckCircle2
                  className={cn(
                    "size-4 shrink-0",
                    isAuthorized ? "text-emerald-500" : "text-gray-600"
                  )}
                />
                <div>
                  <div className="font-bold text-white">Central Trauma & Waterborne Kits</div>
                  <div className="text-[10px] text-gray-400">Antibiotics, anti-venom, clean water filtration</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1c1c2b]">
            <div className="text-xs text-gray-400 font-mono">
              Directives authenticated and persisted in Supabase Database.
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBroadcastAlert}
                disabled={broadcasting}
                className="flex-1 sm:flex-initial h-9 text-xs bg-[#080810] border-[#232338] text-gray-300 hover:text-white gap-1.5 cursor-pointer"
              >
                {broadcasting ? <Loader2 className="size-3.5 animate-spin" /> : <Radio className="size-3.5 text-[#dc2626]" />}
                <span>{broadcasting ? "Broadcasting..." : "Broadcast Citizen Alert"}</span>
              </Button>

              {isAuthorized ? (
                <>
                  <Badge className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-[11px] h-9 px-3 flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-400" />
                    <span>Dispatched & Active</span>
                  </Badge>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStandDown}
                    disabled={standingDown}
                    className="flex-1 sm:flex-initial h-9 text-xs font-bold gap-1.5 cursor-pointer bg-[#0f0f1a] border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/40 hover:text-white transition-all shadow-xs"
                    title="Stand down evacuation and return this zone back to normal status"
                  >
                    {standingDown ? (
                      <Loader2 className="size-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <RotateCcw className="size-3.5 text-emerald-400" />
                    )}
                    <span>{standingDown ? "Standing Down..." : "Stand Down Order (Return to Normal)"}</span>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleAuthorizeDispatch}
                  disabled={authorizing}
                  className={cn(
                    "flex-1 sm:flex-initial h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-sm transition-all",
                    isCritical
                      ? "bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                      : "bg-amber-600 hover:bg-amber-500 text-white"
                  )}
                >
                  {authorizing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  <span>{authorizing ? "Authorizing..." : "Authorize Evacuation Plan"}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
