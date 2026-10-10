"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { MapPin, Crosshair, ZoomIn, ZoomOut, RotateCcw, Compass, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface CampusLocation {
  id: string;
  kind: string;
  name: string;
  defaultX: number;
  defaultY: number;
}

export const PREDEFINED_CAMPUS_LOCATIONS: CampusLocation[] = [
  { id: "loc_admin", kind: "ADMIN", name: "Campus Administration Block", defaultX: 0.50, defaultY: 0.22 },
  { id: "loc_lib", kind: "LIBRARY", name: "Central Library & Study Hub", defaultX: 0.32, defaultY: 0.38 },
  { id: "loc_block_a", kind: "CLASSROOM", name: "Academic Block A (Lectures)", defaultX: 0.24, defaultY: 0.54 },
  { id: "loc_block_b", kind: "LABORATORY", name: "Academic Block B (Science Labs)", defaultX: 0.42, defaultY: 0.58 },
  { id: "loc_block_c", kind: "LABORATORY", name: "Academic Block C (Computing / IT)", defaultX: 0.60, defaultY: 0.52 },
  { id: "loc_canteen", kind: "CANTEEN", name: "Student Canteen & Dining Hall", defaultX: 0.68, defaultY: 0.36 },
  { id: "loc_med", kind: "MEDICAL", name: "Medical Centre & Health Clinic", defaultX: 0.78, defaultY: 0.28 },
  { id: "loc_hostel_b", kind: "HOSTEL", name: "Boys Hostel Quadrangle", defaultX: 0.20, defaultY: 0.78 },
  { id: "loc_hostel_g", kind: "HOSTEL", name: "Girls Hostel Quadrangle", defaultX: 0.82, defaultY: 0.72 },
  { id: "loc_ground", kind: "GROUND", name: "Athletic Ground & Sports Complex", defaultX: 0.50, defaultY: 0.82 },
  { id: "loc_parking_n", kind: "PARKING", name: "North Parking & Transport Bay", defaultX: 0.16, defaultY: 0.20 },
  { id: "loc_gate_main", kind: "GATE", name: "Main Campus Entrance & Security", defaultX: 0.50, defaultY: 0.08 },
];

export interface IncidentPin {
  id: string;
  x: number;
  y: number;
  title: string;
  category: string;
  isEmergency?: boolean;
  status: string;
}

interface CampusMapProps {
  pin?: { x: number; y: number } | null;
  onPinChange?: (pin: { x: number; y: number } | null) => void;
  interactive?: boolean;
  selectedLocationId?: string;
  onSelectLocation?: (location: CampusLocation) => void;
  pins?: IncidentPin[];
  className?: string;
  heightClass?: string;
}

export function CampusMap({
  pin,
  onPinChange,
  interactive = true,
  selectedLocationId,
  onSelectLocation,
  pins = [],
  className,
  heightClass = "h-[360px] sm:h-[440px]",
}: CampusMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(1);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onPinChange || !mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Normalize coordinates to 0..1
    const normX = Math.max(0.02, Math.min(0.98, Number((clickX / rect.width).toFixed(4))));
    const normY = Math.max(0.02, Math.min(0.98, Number((clickY / rect.height).toFixed(4))));

    onPinChange({ x: normX, y: normY });
  };

  const handleNudge = (dx: number, dy: number) => {
    if (!interactive || !onPinChange) return;
    const currentX = pin?.x ?? 0.5;
    const currentY = pin?.y ?? 0.5;
    const nextX = Math.max(0.02, Math.min(0.98, Number((currentX + dx).toFixed(4))));
    const nextY = Math.max(0.02, Math.min(0.98, Number((currentY + dy).toFixed(4))));
    onPinChange({ x: nextX, y: nextY });
  };

  return (
    <div className={cn("relative flex flex-col border-2 border-[#272B27] bg-[#EEE8DC] tech-shadow overflow-hidden select-none", className)}>
      {/* Map Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#F5F1E8] border-b border-[#272B27]/30 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#272B27]" />
          <span className="font-bold tracking-wider text-[#272B27] uppercase">Campus 2D Coordinate Grid</span>
          <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">
            Scale: 1:2500
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {pin && (
            <div className="flex items-center gap-1.5 bg-[#E6ECE5] px-2 py-0.5 border border-[#272B27]/20 text-[#272B27]">
              <Crosshair className="w-3.5 h-3.5 text-[#D94B3D]" />
              <span>X: {(pin.x * 100).toFixed(1)}%</span>
              <span className="text-[#272B27]/40">|</span>
              <span>Y: {(pin.y * 100).toFixed(1)}%</span>
            </div>
          )}

          {interactive && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
                className="p-1 border border-[#272B27]/40 bg-white hover:bg-[#EEE8DC] text-[#272B27]"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}
                className="p-1 border border-[#272B27]/40 bg-white hover:bg-[#EEE8DC] text-[#272B27]"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              {pin && (
                <button
                  type="button"
                  onClick={() => onPinChange?.(null)}
                  className="px-2 py-1 border border-[#272B27]/40 bg-white hover:bg-[#EEE8DC] text-[#272B27] flex items-center gap-1 text-[11px]"
                  title="Reset Pin"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map View Canvas */}
      <div
        ref={mapContainerRef}
        onClick={handleMapClick}
        style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        className={cn(
          "relative w-full tech-grid transition-transform duration-150 cursor-crosshair overflow-hidden",
          heightClass
        )}
      >
        {/* SVG Campus Architectural Grounds */}
        <svg
          viewBox="0 0 1000 600"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
        >
          {/* Outer Perimeter Fence */}
          <rect x="20" y="20" width="960" height="560" fill="none" stroke="#272B27" strokeWidth="2" strokeDasharray="6,4" />

          {/* Campus Roads and Pathways */}
          {/* Main Avenue */}
          <line x1="500" y1="20" x2="500" y2="580" stroke="#DCD6C9" strokeWidth="24" />
          <line x1="500" y1="20" x2="500" y2="580" stroke="#272B27" strokeWidth="1" strokeDasharray="8,8" />
          {/* East-West Boulevard */}
          <line x1="40" y1="280" x2="960" y2="280" stroke="#DCD6C9" strokeWidth="20" />
          {/* Southern Ring Road */}
          <line x1="120" y1="460" x2="880" y2="460" stroke="#DCD6C9" strokeWidth="16" />

          {/* Zones & Buildings (Architectural Plans) */}

          {/* 1. Main Campus Gate & Perimeter Control */}
          <rect x="420" y="30" width="160" height="40" fill="#F5F1E8" stroke="#272B27" strokeWidth="2" />
          <text x="500" y="55" textAnchor="middle" fill="#272B27" fontSize="13" fontWeight="bold" fontFamily="monospace">
            [ MAIN SECURITY GATE & PERIMETER ]
          </text>

          {/* 2. Campus Administration Block */}
          <rect x="420" y="110" width="160" height="70" fill="#E6ECE5" stroke="#272B27" strokeWidth="2" />
          <text x="500" y="145" textAnchor="middle" fill="#272B27" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
            ADMINISTRATION BLDG
          </text>
          <text x="500" y="162" textAnchor="middle" fill="#5B6158" fontSize="10" fontFamily="monospace">
            Proctor • Security Office • Registry
          </text>

          {/* 3. Central Library */}
          <rect x="240" y="200" width="160" height="70" fill="#FFFFFF" stroke="#272B27" strokeWidth="2" />
          <text x="320" y="235" textAnchor="middle" fill="#272B27" fontSize="13" fontWeight="bold">
            CENTRAL LIBRARY
          </text>
          <text x="320" y="252" textAnchor="middle" fill="#5B6158" fontSize="10" fontFamily="monospace">
            Study Commons • Archive
          </text>

          {/* 4. Academic Block A */}
          <rect x="160" y="295" width="160" height="75" fill="#FFFFFF" stroke="#272B27" strokeWidth="2" />
          <text x="240" y="330" textAnchor="middle" fill="#272B27" fontSize="13" fontWeight="bold">
            ACADEMIC BLOCK A
          </text>
          <text x="240" y="348" textAnchor="middle" fill="#5B6158" fontSize="10" fontFamily="monospace">
            Lecture Theatres 1-8
          </text>

          {/* 5. Academic Block B (Science Labs) */}
          <rect x="340" y="320" width="160" height="75" fill="#FFFFFF" stroke="#272B27" strokeWidth="2" />
          <text x="420" y="355" textAnchor="middle" fill="#272B27" fontSize="13" fontWeight="bold">
            SCIENCE BLOCK B
          </text>
          <text x="420" y="373" textAnchor="middle" fill="#5B6158" fontSize="10" fontFamily="monospace">
            Chemical, Bio & Physics Labs
          </text>

          {/* 6. Academic Block C (IT & Computing) */}
          <rect x="520" y="285" width="160" height="75" fill="#FFFFFF" stroke="#272B27" strokeWidth="2" />
          <text x="600" y="320" textAnchor="middle" fill="#272B27" fontSize="13" fontWeight="bold">
            COMPUTING BLOCK C
          </text>
          <text x="600" y="338" textAnchor="middle" fill="#5B6158" fontSize="10" fontFamily="monospace">
            Server Rooms • Digital Hub
          </text>

          {/* 7. Student Canteen & Food Court */}
          <rect x="600" y="190" width="160" height="65" fill="#FFFFFF" stroke="#272B27" strokeWidth="2" />
          <text x="680" y="225" textAnchor="middle" fill="#272B27" fontSize="13" fontWeight="bold">
            STUDENT CANTEEN
          </text>
          <text x="680" y="242" textAnchor="middle" fill="#5B6158" fontSize="10" fontFamily="monospace">
            Dining Quadrangle
          </text>

          {/* 8. Medical Centre */}
          <rect x="710" y="135" width="140" height="60" fill="#E6ECE5" stroke="#272B27" strokeWidth="2" />
          <text x="780" y="165" textAnchor="middle" fill="#272B27" fontSize="12" fontWeight="bold">
            MEDICAL CLINIC
          </text>
          <text x="780" y="180" textAnchor="middle" fill="#D94B3D" fontSize="10" fontWeight="bold" fontFamily="monospace">
            24/7 First Aid & Ambulance
          </text>

          {/* 9. Athletic Grounds & Pavilion */}
          <rect x="380" y="460" width="240" height="90" rx="45" fill="#E6ECE5" stroke="#272B27" strokeWidth="2" />
          <text x="500" y="505" textAnchor="middle" fill="#272B27" fontSize="14" fontWeight="bold">
            ATHLETIC GROUND & STADIUM
          </text>
          <text x="500" y="525" textAnchor="middle" fill="#5B6158" fontSize="10" fontFamily="monospace">
            Open Perimeter Area
          </text>

          {/* 10. Boys Hostel */}
          <rect x="120" y="430" width="160" height="85" fill="#FFFFFF" stroke="#272B27" strokeWidth="2" />
          <text x="200" y="470" textAnchor="middle" fill="#272B27" fontSize="13" fontWeight="bold">
            BOYS HOSTEL QUAD
          </text>
          <text x="200" y="488" textAnchor="middle" fill="#5B6158" fontSize="10" fontFamily="monospace">
            Residential Block 1-4
          </text>

          {/* 11. Girls Hostel */}
          <rect x="740" y="395" width="160" height="85" fill="#FFFFFF" stroke="#272B27" strokeWidth="2" />
          <text x="820" y="435" textAnchor="middle" fill="#272B27" fontSize="13" fontWeight="bold">
            GIRLS HOSTEL QUAD
          </text>
          <text x="820" y="453" textAnchor="middle" fill="#5B6158" fontSize="10" fontFamily="monospace">
            Protected Security Enclosure
          </text>

          {/* 12. North Parking Bay */}
          <rect x="80" y="90" width="150" height="60" fill="#EEE8DC" stroke="#272B27" strokeWidth="1.5" strokeDasharray="4,4" />
          <text x="155" y="125" textAnchor="middle" fill="#272B27" fontSize="12" fontWeight="bold">
            NORTH PARKING BAY
          </text>
        </svg>

        {/* Existing / Multiple Incident Pins (Explore & Admin modes) */}
        {pins.map((p) => (
          <motion.div
            key={p.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            className="absolute -translate-x-1/2 -translate-y-full z-20 group pointer-events-auto"
          >
            <div className={cn(
              "p-1.5 border-2 border-[#272B27] tech-shadow-sm flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-115 active:scale-95",
              p.isEmergency ? "bg-[#D94B3D] text-white" : "bg-[#272B27] text-white"
            )}>
              <MapPin className="w-4 h-4 fill-current" />
            </div>
            <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-max max-w-xs bg-[#272B27] text-[#F5F1E8] px-2.5 py-1 text-[11px] font-mono border border-white/20 tech-shadow z-30">
              <p className="font-bold uppercase tracking-wider">{p.title}</p>
              <p className="text-white/70 text-[10px]">{p.category} • {p.status}</p>
            </div>
          </motion.div>
        ))}

        {/* Placed Active Pin (Current User Input) - tip anchored precisely at coordinates */}
        {pin && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
            className="absolute -translate-x-1/2 -translate-y-full z-30 pointer-events-none"
          >
            {/* Coordinate-anchored radar pulse ring centered at the exact coordinate point without moving the pin */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-[#D94B3D] animate-ping opacity-75 pointer-events-none" />
            <div className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#D94B3D] border border-[#272B27] pointer-events-none" />

            <div className="flex flex-col items-center">
              <div className="bg-[#D94B3D] text-white p-2 border-2 border-[#272B27] tech-shadow">
                <Crosshair className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="w-1.5 h-3 bg-[#272B27]" />
              <div className="mt-1 bg-[#272B27] text-[#F5F1E8] px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-[#F5F1E8]/40 whitespace-nowrap">
                TARGET PIN
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Location Snapping Bar */}
      {interactive && (
        <div className="p-3 bg-[#F5F1E8] border-t border-[#272B27]/30 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase text-[#5B6158]">
              Snap Pin to Campus Location:
            </span>
            {/* Keyboard Nudge Controls */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-[#5B6158] mr-1">Fine-tune:</span>
              <button
                type="button"
                onClick={() => handleNudge(-0.01, 0)}
                className="p-1 border border-[#272B27]/40 bg-white hover:bg-[#EEE8DC]"
                title="Nudge Left"
              >
                <ArrowLeft className="w-3 h-3 text-[#272B27]" />
              </button>
              <button
                type="button"
                onClick={() => handleNudge(0, -0.01)}
                className="p-1 border border-[#272B27]/40 bg-white hover:bg-[#EEE8DC]"
                title="Nudge Up"
              >
                <ArrowUp className="w-3 h-3 text-[#272B27]" />
              </button>
              <button
                type="button"
                onClick={() => handleNudge(0, 0.01)}
                className="p-1 border border-[#272B27]/40 bg-white hover:bg-[#EEE8DC]"
                title="Nudge Down"
              >
                <ArrowDown className="w-3 h-3 text-[#272B27]" />
              </button>
              <button
                type="button"
                onClick={() => handleNudge(0.01, 0)}
                className="p-1 border border-[#272B27]/40 bg-white hover:bg-[#EEE8DC]"
                title="Nudge Right"
              >
                <ArrowRight className="w-3 h-3 text-[#272B27]" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {PREDEFINED_CAMPUS_LOCATIONS.map((loc) => {
              const isSelected = selectedLocationId === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    onSelectLocation?.(loc);
                    onPinChange?.({ x: loc.defaultX, y: loc.defaultY });
                  }}
                  className={cn(
                    "px-2 py-1 text-xs font-mono border transition-all cursor-pointer",
                    isSelected
                      ? "bg-[#272B27] text-[#F5F1E8] border-[#272B27] font-bold tech-shadow-sm"
                      : "bg-white text-[#272B27] border-[#272B27]/30 hover:bg-[#EEE8DC]"
                  )}
                >
                  {loc.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
