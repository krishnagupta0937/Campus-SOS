"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  ShieldAlert,
  Radio,
  Crosshair,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Flame,
  Shield,
  Building2,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SafetyNode {
  id: string;
  name: string;
  code: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  status: "SECURE" | "ALERT" | "STANDBY";
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CAMPUS_NODES: SafetyNode[] = [
  {
    id: "node_gate",
    name: "Main Security Gate",
    code: "NODE-SEC-01",
    x: 50,
    y: 18,
    status: "SECURE",
    category: "Perimeter Control",
    description: "Primary access portal. Perimeter barrier & vehicle inspection active.",
    icon: Shield,
  },
  {
    id: "node_admin",
    name: "Central Command Admin",
    code: "NODE-ADM-02",
    x: 50,
    y: 48,
    status: "SECURE",
    category: "Master Dispatch",
    description: "Campus SOS coordination desk. 12 departmental consoles synchronized.",
    icon: Building2,
  },
  {
    id: "node_science",
    name: "Science Block B (Labs)",
    code: "NODE-LAB-03",
    x: 28,
    y: 62,
    status: "ALERT",
    category: "Hazard Monitoring",
    description: "Chemistry lab ventilation and smoke sensor circuit armed.",
    icon: Flame,
  },
  {
    id: "node_medical",
    name: "Health Clinic & Ambulance",
    code: "NODE-MED-04",
    x: 76,
    y: 38,
    status: "STANDBY",
    category: "Medical Response",
    description: "24/7 emergency clinic & paramedic ambulance on dedicated bay.",
    icon: Stethoscope,
  },
  {
    id: "node_hostel",
    name: "Hostel Quadrangle Zone",
    code: "NODE-RES-05",
    x: 74,
    y: 74,
    status: "SECURE",
    category: "Residential Safety",
    description: "Night escort corridor & emergency lighting operational.",
    icon: ShieldAlert,
  },
];

export function CampusSafetyRadar({ className }: { className?: string }) {
  const [selectedNode, setSelectedNode] = React.useState<SafetyNode>(CAMPUS_NODES[1]);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative w-full bg-[#EEE8DC] border-2 border-[#272B27] tech-shadow overflow-hidden flex flex-col font-mono select-none",
        className
      )}
    >
      {/* Technical Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#F5F1E8] border-b-2 border-[#272B27] text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#272B27] text-white">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-[#272B27] uppercase tracking-wider">
            CAMPUS TELEMETRY & RADAR NETWORK
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-[#E6ECE5] px-2 py-0.5 border border-emerald-800/30">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            5 NODES ONLINE
          </span>
          <span className="text-[11px] text-[#5B6158] hidden sm:inline">
            SWEEP: 12.0s
          </span>
        </div>
      </div>

      {/* Main Radar Screen Viewport */}
      <div className="relative w-full h-[340px] sm:h-[400px] bg-[#F5F1E8] tech-grid flex items-center justify-center overflow-hidden">
        {/* CSS Keyframes for smooth continuous radar sweep */}
        <style>{`
          @keyframes radar-sweep {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-radar-sweep {
            animation: radar-sweep 12s linear infinite;
          }
        `}</style>

        {/* Concentric Architectural Radar Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Ring 1 - 20% (Core) */}
          <div className="w-[80px] h-[80px] rounded-full border border-[#272B27]/25" />
          {/* Ring 2 - 45% (Inner Campus) */}
          <div className="absolute w-[180px] h-[180px] rounded-full border border-[#272B27]/30" />
          {/* Ring 3 - 70% (Outer Quadrangles) */}
          <div className="absolute w-[290px] h-[290px] rounded-full border border-[#272B27]/35" />
          {/* Ring 4 - 92% (Perimeter Fence) */}
          <div className="absolute w-[380px] h-[380px] rounded-full border-2 border-dashed border-[#272B27]/30" />

          {/* Crosshair Axes */}
          <div className="absolute w-full h-[1px] bg-[#272B27]/15" />
          <div className="absolute h-full w-[1px] bg-[#272B27]/15" />

          {/* Cardinal Directions */}
          <span className="absolute top-2 text-[10px] font-bold text-[#5B6158]">NORTH (000°)</span>
          <span className="absolute bottom-2 text-[10px] font-bold text-[#5B6158]">SOUTH (180°)</span>
          <span className="absolute left-2 text-[10px] font-bold text-[#5B6158]">WEST (270°)</span>
          <span className="absolute right-2 text-[10px] font-bold text-[#5B6158]">EAST (090°)</span>
        </div>

        {/* Radar Rotating Sweep Line with Conic Gradient Trail */}
        {!shouldReduceMotion && (
          <div
            className="animate-radar-sweep absolute w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, transparent 310deg, rgba(217, 75, 61, 0.08) 345deg, rgba(39, 43, 39, 0.22) 360deg)",
            }}
          >
            {/* Fine leading sweep vector line */}
            <div className="absolute top-0 left-1/2 w-[1px] h-[200px] bg-[#272B27]/60 origin-bottom" />
          </div>
        )}

        {/* SVG Interconnected Signal Pathways between Nodes */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          preserveAspectRatio="none"
        >
          {/* Pathway: Gate -> Admin */}
          <line x1="50" y1="18" x2="50" y2="48" stroke="#272B27" strokeWidth="0.4" strokeDasharray="1,1" />
          {/* Pathway: Admin -> Science */}
          <line x1="50" y1="48" x2="28" y2="62" stroke="#272B27" strokeWidth="0.4" strokeDasharray="1,1" />
          {/* Pathway: Admin -> Medical */}
          <line x1="50" y1="48" x2="76" y2="38" stroke="#272B27" strokeWidth="0.4" strokeDasharray="1,1" />
          {/* Pathway: Admin -> Hostel */}
          <line x1="50" y1="48" x2="74" y2="74" stroke="#272B27" strokeWidth="0.4" strokeDasharray="1,1" />
          {/* Pathway: Science -> Gate */}
          <line x1="28" y1="62" x2="50" y2="18" stroke="#272B27" strokeWidth="0.3" strokeDasharray="1.5,1.5" opacity="0.4" />
          {/* Pathway: Medical -> Hostel */}
          <line x1="76" y1="38" x2="74" y2="74" stroke="#272B27" strokeWidth="0.3" strokeDasharray="1.5,1.5" opacity="0.4" />

          {/* Animated Signal Packet Pulses */}
          {!shouldReduceMotion && (
            <>
              {/* Pulse from Gate to Admin */}
              <circle r="0.8" fill="#272B27">
                <animate
                  attributeName="cx"
                  values="50;50;50"
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="18;48;18"
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.2;1;0.2" dur="3s" repeatCount="indefinite" />
              </circle>
              {/* Pulse from Admin to Science */}
              <circle r="0.8" fill="#D94B3D">
                <animate
                  attributeName="cx"
                  values="50;28;50"
                  dur="4s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="48;62;48"
                  dur="4s"
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.2;1;0.2" dur="4s" repeatCount="indefinite" />
              </circle>
              {/* Pulse from Admin to Medical */}
              <circle r="0.8" fill="#647F9C">
                <animate
                  attributeName="cx"
                  values="50;76;50"
                  dur="3.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="cy"
                  values="48;38;48"
                  dur="3.5s"
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.2;1;0.2" dur="3.5s" repeatCount="indefinite" />
              </circle>
            </>
          )}
        </svg>

        {/* Interactive Campus Safety Nodes */}
        {CAMPUS_NODES.map((node) => {
          const isSelected = selectedNode.id === node.id;
          const Icon = node.icon;

          return (
            <div
              key={node.id}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
            >
              <button
                type="button"
                onClick={() => setSelectedNode(node)}
                className={cn(
                  "group relative p-2 rounded-none border-2 flex items-center justify-center cursor-pointer transition-all duration-150 focus:outline-none",
                  isSelected
                    ? "bg-[#272B27] text-[#F5F1E8] border-[#272B27] tech-shadow"
                    : node.status === "ALERT"
                    ? "bg-[#FCEBE9] text-[#D94B3D] border-[#D94B3D] hover:bg-[#D94B3D] hover:text-white"
                    : "bg-white text-[#272B27] border-[#272B27] hover:bg-[#EEE8DC]"
                )}
                aria-label={`View ${node.name} node`}
              >
                {/* Node Status Beacon Aura */}
                {node.status === "ALERT" && !shouldReduceMotion && (
                  <span className="absolute -inset-1 border border-[#D94B3D] animate-ping pointer-events-none" />
                )}

                <Icon className="w-4 h-4 stroke-[2.2]" />

                {/* Technical Node Badge */}
                <div
                  className={cn(
                    "absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap border pointer-events-none transition-all",
                    isSelected
                      ? "bg-[#272B27] text-[#F5F1E8] border-white/20"
                      : "bg-[#F5F1E8] text-[#272B27] border-[#272B27]/40 group-hover:border-[#272B27]"
                  )}
                >
                  {node.name}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Node Realtime Telemetry Panel */}
      <div className="p-3.5 bg-white border-t-2 border-[#272B27] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={cn(
              "p-2 border border-[#272B27]",
              selectedNode.status === "ALERT"
                ? "bg-[#D94B3D] text-white"
                : "bg-[#272B27] text-white"
            )}
          >
            <selectedNode.icon className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#272B27] text-sm uppercase">
                {selectedNode.name}
              </span>
              <span className="text-[#5B6158] text-[10px] font-bold">
                [{selectedNode.code}]
              </span>
              <Badge
                variant={
                  selectedNode.status === "ALERT"
                    ? "emergency"
                    : selectedNode.status === "STANDBY"
                    ? "outline"
                    : "sage"
                }
                className="text-[9px] px-1.5 py-0"
              >
                {selectedNode.status}
              </Badge>
            </div>
            <p className="text-[11px] text-[#5B6158] font-sans mt-0.5">
              {selectedNode.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-[11px] font-mono text-[#5B6158]">
          <span className="text-[#272B27] font-bold">[ SLA: &lt; 3 MINS ]</span>
          <span>•</span>
          <span>COORDINATES: {selectedNode.x}%, {selectedNode.y}%</span>
        </div>
      </div>
    </div>
  );
}
