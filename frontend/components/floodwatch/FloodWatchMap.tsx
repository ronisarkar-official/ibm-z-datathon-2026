"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapControls,
  type MapRef,
} from "@/components/ui/map"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Droplets,
  Waves,
  Sprout,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Prediction } from "@/lib/supabase"

interface FloodWatchMapProps {
  predictions: Prediction[]
  onOpenProtocol?: (prediction: Prediction) => void
}

const DEFAULT_ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  "7f8b9c1d-1111-4444-8888-abcdef000001": { lat: 22.5726, lng: 88.3639 }, // Kolkata
  "7f8b9c1d-2222-4444-8888-abcdef000002": { lat: 26.1445, lng: 91.7362 }, // Guwahati
  "7f8b9c1d-3333-4444-8888-abcdef000003": { lat: 25.5941, lng: 85.1376 }, // Patna
  "7f8b9c1d-4444-4444-8888-abcdef000004": { lat: 20.4625, lng: 85.8828 }, // Cuttack
  "7f8b9c1d-5555-4444-8888-abcdef000005": { lat: 19.0760, lng: 72.8777 }, // Mumbai
}

// Same-origin tile proxy specifications: eliminates browser CORS & ad-blocker blocks
const RASTER_MAP_STYLES = {
  dark: {
    version: 8,
    sources: {
      "floodwatch-tiles-dark": {
        type: "raster",
        tiles: ["/api/tiles/v2/dark/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© FloodWatch GIS, © OpenStreetMap",
      },
    },
    layers: [
      {
        id: "floodwatch-dark-layer",
        type: "raster",
        source: "floodwatch-tiles-dark",
        minzoom: 0,
        maxzoom: 19,
        paint: {
          "raster-saturation": -0.85,
          "raster-contrast": 0.2,
          "raster-brightness-max": 0.6,
        },
      },
    ],
  },
  light: {
    version: 8,
    sources: {
      "floodwatch-tiles-light": {
        type: "raster",
        tiles: ["/api/tiles/v2/light/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© FloodWatch GIS, © OpenStreetMap",
      },
    },
    layers: [
      {
        id: "floodwatch-light-layer",
        type: "raster",
        source: "floodwatch-tiles-light",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
} as const

const RISK_CONFIG = {
  Critical: {
    color: "#dc2626",
    bg: "bg-[#dc2626]",
    ring: "ring-[#dc2626]/60",
    badge: "bg-[#dc2626] text-white",
    icon: ShieldAlert,
    label: "Critical",
  },
  Warning: {
    color: "#ea580c",
    bg: "bg-amber-600",
    ring: "ring-amber-500/60",
    badge: "bg-amber-600 text-white",
    icon: AlertTriangle,
    label: "Warning",
  },
  Advisory: {
    color: "#ca8a04",
    bg: "bg-yellow-600",
    ring: "ring-yellow-500/60",
    badge: "bg-[#1c1c2b] text-gray-300 border border-[#2e2e42]",
    icon: AlertCircle,
    label: "Advisory",
  },
  Safe: {
    color: "#16a34a",
    bg: "bg-emerald-600",
    ring: "ring-emerald-500/60",
    badge: "bg-emerald-600 text-white",
    icon: CheckCircle2,
    label: "Safe",
  },
}

export default function FloodWatchMap({ predictions, onOpenProtocol }: FloodWatchMapProps) {
  const [activeFilter, setActiveFilter] = useState<string>("All")
  const [mapRef, setMapRef] = useState<MapRef | null>(null)

  const zonesWithCoordinates = useMemo(() => {
    return predictions
      .map((p) => {
        const fallback = DEFAULT_ZONE_COORDS[p.zone_id]
        const lat = p.zones?.latitude ? Number(p.zones.latitude) : fallback?.lat
        const lng = p.zones?.longitude ? Number(p.zones.longitude) : fallback?.lng

        return {
          ...p,
          lat,
          lng,
        }
      })
      .filter((p): p is typeof p & { lat: number; lng: number } => p.lat != null && p.lng != null)
  }, [predictions])

  const filteredZones = useMemo(() => {
    if (activeFilter === "All") return zonesWithCoordinates
    return zonesWithCoordinates.filter((z) => z.risk_level === activeFilter)
  }, [zonesWithCoordinates, activeFilter])

  const counts = useMemo(() => {
    return {
      All: zonesWithCoordinates.length,
      Critical: zonesWithCoordinates.filter((z) => z.risk_level === "Critical").length,
      Warning: zonesWithCoordinates.filter((z) => z.risk_level === "Warning").length,
      Advisory: zonesWithCoordinates.filter((z) => z.risk_level === "Advisory").length,
      Safe: zonesWithCoordinates.filter((z) => z.risk_level === "Safe").length,
    }
  }, [zonesWithCoordinates])

  const handleFlyToZone = (lng: number, lat: number) => {
    if (mapRef) {
      mapRef.flyTo({
        center: [lng, lat],
        zoom: 7,
        essential: true,
        duration: 1200,
      })
    }
  }

  const handleResetView = () => {
    if (mapRef) {
      mapRef.flyTo({
        center: [82.5, 22.8],
        zoom: 4.3,
        essential: true,
        duration: 1000,
      })
    }
  }

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-[#1e1e30] bg-[#080810] shadow-sm">
      {/* Top HUD Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#080810]/90 backdrop-blur-md border border-[#232338] shadow-sm pointer-events-auto">
          {(["All", "Critical", "Warning", "Advisory", "Safe"] as const).map((filter) => {
            const count = counts[filter]
            const isSelected = activeFilter === filter
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer",
                  isSelected
                    ? filter === "Critical"
                      ? "bg-[#dc2626] text-white font-bold shadow-xs"
                      : "bg-[#1c1c2b] text-white font-bold shadow-xs border border-[#2e2e42]"
                    : "text-gray-400 hover:text-white hover:bg-[#141424]"
                )}
              >
                <span>{filter}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    isSelected
                      ? "bg-white/20 text-white font-bold"
                      : "bg-[#0f0f1a] text-gray-400"
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetView}
            className="h-8 text-xs bg-[#0f0f1a] backdrop-blur-md border-[#232338] text-gray-300 hover:text-white hover:border-gray-500 shadow-sm gap-1.5 cursor-pointer"
          >
            <LocateFixed className="size-3.5" />
            <span>Reset View</span>
          </Button>
        </div>
      </div>

      {/* Main Map Component powered by mapcn / MapLibre */}
      <Map
        ref={setMapRef}
        styles={RASTER_MAP_STYLES as any}
        viewport={{
          center: [82.5, 22.8],
          zoom: 4.3,
          pitch: 15,
        }}
        className="h-full w-full"
      >
        <MapControls position="bottom-right" showCompass showFullscreen showZoom />

        {filteredZones.map((zone) => {
          const cfg = RISK_CONFIG[zone.risk_level] || RISK_CONFIG.Safe
          const zoneName = zone.zones?.name || `Zone ${zone.zone_id.slice(0, 8)}`
          const district = zone.zones?.district || zone.zones?.state || "Monitored Region"
          const isHighRisk = zone.risk_level === "Critical" || zone.risk_level === "Warning"

          return (
            <MapMarker
              key={zone.id}
              longitude={zone.lng}
              latitude={zone.lat}
            >
              <MarkerContent>
                <div className="relative group cursor-pointer flex flex-col items-center">
                  {/* Radar Pulse for Critical */}
                  {isHighRisk && (
                    <span
                      className={cn(
                        "absolute -inset-2 rounded-full opacity-75 animate-ping",
                        zone.risk_level === "Critical" ? "bg-[#dc2626]/70" : "bg-amber-500/70"
                      )}
                    />
                  )}

                  {/* Marker Pin Badge */}
                  <div
                    className={cn(
                      "relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-md font-semibold text-xs transition-transform duration-200 group-hover:scale-110",
                      "bg-[#0f0f1a] border-[#232338] text-white",
                      isHighRisk && "ring-2 " + cfg.ring
                    )}
                  >
                    <span className={cn("size-2 rounded-full shrink-0", cfg.bg)} />
                    <span className="max-w-[100px] truncate">{zoneName}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono",
                        cfg.badge
                      )}
                    >
                      {zone.risk_score}
                    </span>
                  </div>

                  {/* Small pointer triangle */}
                  <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#232338] mt-0.5" />
                </div>
              </MarkerContent>

              {/* Rich Interactive Popup */}
              <MarkerPopup closeButton offset={16} className="z-50">
                <div className="w-72 p-4 rounded-xl bg-[#0f0f1a] text-white border border-[#232338] shadow-2xl space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-[#1c1c2b] pb-2.5">
                    <div>
                      <h4 className="font-bold text-sm text-white leading-tight">
                        {zoneName}
                      </h4>
                      <p className="text-xs text-gray-400">{district}</p>
                    </div>
                    <Badge
                      className={cn(
                        "rounded text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider border-transparent shadow-none shrink-0",
                        cfg.badge
                      )}
                    >
                      {zone.risk_level}
                    </Badge>
                  </div>

                  {/* Score & Key Sensor Vitals */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono text-gray-400 uppercase">Calculated Risk</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black font-mono tracking-tight text-white">
                        {zone.risk_score}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">/ 100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <div className="rounded-lg bg-[#080810] p-2 border border-[#1e1e30] text-center">
                      <Droplets className="size-3.5 mx-auto text-[#dc2626] mb-0.5" />
                      <div className="text-[10px] font-mono text-gray-400">Rain</div>
                      <div className="font-bold text-white font-mono">{zone.rainfall} mm</div>
                    </div>
                    <div className="rounded-lg bg-[#080810] p-2 border border-[#1e1e30] text-center">
                      <Waves className="size-3.5 mx-auto text-[#dc2626] mb-0.5" />
                      <div className="text-[10px] font-mono text-gray-400">River</div>
                      <div className="font-bold text-white font-mono">{zone.river_level} m</div>
                    </div>
                    <div className="rounded-lg bg-[#080810] p-2 border border-[#1e1e30] text-center">
                      <Sprout className="size-3.5 mx-auto text-emerald-500 mb-0.5" />
                      <div className="text-[10px] font-mono text-gray-400">Soil</div>
                      <div className="font-bold text-white font-mono">{zone.soil_moisture}%</div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#080810] p-2 border border-[#1e1e30] text-xs">
                    <span className="font-bold font-mono text-white">Action: </span>
                    <span className="text-gray-300">{zone.recommendation}</span>
                  </div>

                  <div className="pt-1 flex items-center justify-between gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-gray-400 hover:text-white cursor-pointer px-2"
                      onClick={() => handleFlyToZone(zone.lng, zone.lat)}
                    >
                      Focus
                    </Button>
                    {isHighRisk && onOpenProtocol && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "text-xs h-7 px-2 font-semibold cursor-pointer border-0",
                          zone.risk_level === "Critical"
                            ? "bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                            : "bg-amber-600 hover:bg-amber-500 text-white"
                        )}
                        onClick={() => onOpenProtocol(zone)}
                      >
                        <ShieldAlert className="size-3 mr-1" />
                        Plan
                      </Button>
                    )}
                    <Button
                      asChild
                      size="sm"
                      className="text-xs h-7 gap-1 font-semibold cursor-pointer bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                    >
                      <Link href={`/floodwatch/zone/${zone.zone_id}`}>
                        <span>Analysis</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </MarkerPopup>
            </MapMarker>
          )
        })}
      </Map>

      {/* Floating Bottom-Left Legend */}
      <div className="absolute bottom-3 left-3 z-10 p-2.5 rounded-xl bg-[#080810]/95 backdrop-blur-md border border-[#232338] shadow-sm text-xs space-y-1.5 pointer-events-auto">
        <div className="flex items-center gap-1.5 font-semibold text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-1">
          <Layers className="size-3" />
          <span>Spatial Severity</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#dc2626] animate-pulse" />
            <span className="text-white">Critical (≥75)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="text-white">Warning (50–74)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-yellow-500" />
            <span className="text-white">Advisory (25–49)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-white">Safe (0–24)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
