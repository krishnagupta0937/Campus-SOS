"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogCloseButton } from "@/components/ui/dialog";
import { type RoleId, ROLES } from "@/components/shared/role-switcher";
import {
  Shield,
  Stethoscope,
  Flame,
  Scale,
  HeartHandshake,
  Users,
  Wrench,
  Bus,
  Laptop,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Eye,
  Radio,
  UserCheck,
  ShieldAlert,
  ArrowUpRight,
  FileText,
  Lock,
} from "lucide-react";
import { formatLocation, type IncidentRecord } from "@/lib/api-client";

type DutyStatus = "AVAILABLE" | "BUSY" | "OFFLINE";

interface DepartmentWorkspaceProps {
  roleId: RoleId;
  incidents: IncidentRecord[];
}

export function DepartmentWorkspace({ roleId, incidents }: DepartmentWorkspaceProps) {
  const roleConfig = ROLES.find((r) => r.id === roleId) || ROLES[3];
  const [dutyState, setDutyState] = React.useState<DutyStatus>("AVAILABLE");
  const [selectedCase, setSelectedCase] = React.useState<IncidentRecord | null>(null);

  // Department-specific case filter
  const departmentCases = React.useMemo(() => {
    const safe = Array.isArray(incidents) ? incidents : [];
    switch (roleId) {
      case "chief_proctor":
        return safe.filter((i) => i.category?.includes("MISCONDUCT") || i.category?.includes("DISCIPLINARY") || i.category?.includes("HARASSMENT"));
      case "security":
        return safe.filter((i) => i.workflow === "EMERGENCY_SOS" || i.category?.includes("SECURITY") || i.category?.includes("MISCONDUCT") || i.category?.includes("FIRE"));
      case "medical":
        return safe.filter((i) => i.category?.includes("MEDICAL") || i.workflow === "EMERGENCY_SOS");
      case "fire_safety":
        return safe.filter((i) => i.category?.includes("FIRE") || i.category?.includes("HAZARD"));
      case "women_safety":
        return safe.filter((i) => i.category?.includes("WOMEN") || i.category?.includes("HARASSMENT"));
      case "men_safety":
        return safe.filter((i) => i.category?.includes("MEN") || i.category?.includes("HARASSMENT"));
      case "student_council":
        return safe.filter((i) => i.category?.includes("COMPLAINT") || i.category?.includes("STUDENT"));
      case "facilities":
        return safe.filter((i) => i.category?.includes("INFRASTRUCTURE") || i.category?.includes("HAZARD"));
      case "transport":
        return safe.filter((i) => i.category?.includes("TRAFFIC") || i.category?.includes("PARKING") || i.category?.includes("ROUTE"));
      case "it_digital":
        return safe.filter((i) => i.category?.includes("DIGITAL") || i.category?.includes("CYBER"));
      default:
        return safe;
    }
  }, [roleId, incidents]);

  const Icon = roleConfig.icon;

  return (
    <div className="space-y-6">
      {/* Department Header & Duty Roster */}
      <div className="p-4 sm:p-5 bg-white border-2 border-[#272B27] tech-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#272B27] text-[#F5F1E8] tech-shadow-sm">
            <Icon className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black uppercase text-[#272B27] tracking-tight">
                {roleConfig.title}
              </h2>
              {roleConfig.restricted && (
                <Badge variant="emergency" className="flex items-center gap-1">
                  <Lock className="w-3 h-3" /> CONFIDENTIAL
                </Badge>
              )}
            </div>
            <p className="text-xs font-mono text-[#5B6158]">
              Domain Scope: <span className="font-bold text-[#272B27]">{roleConfig.domain}</span>
            </p>
          </div>
        </div>

        {/* Duty Status Selector (Available, Busy, Offline) */}
        <div className="flex items-center gap-1.5 p-1 bg-[#EEE8DC] border border-[#272B27] tech-shadow-sm font-mono text-xs">
          <span className="text-[10px] font-bold text-[#5B6158] uppercase px-1">Duty Status:</span>
          {[
            { id: "AVAILABLE", label: "● Available", activeBg: "bg-emerald-700 text-white" },
            { id: "BUSY", label: "● Busy", activeBg: "bg-amber-700 text-white" },
            { id: "OFFLINE", label: "○ Offline", activeBg: "bg-[#272B27] text-white" },
          ].map((item) => {
            const isActive = dutyState === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setDutyState(item.id as DutyStatus)}
                className={cn(
                  "relative px-3 py-1 font-bold uppercase transition-colors cursor-pointer",
                  isActive ? "text-white" : "text-[#272B27] hover:bg-[#E5DDCF]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="dept-duty-pill"
                    className={cn("absolute inset-0 -z-0", item.activeBg)}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Department Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-white border border-[#272B27] tech-shadow-sm">
          <span className="text-[#5B6158] block">ASSIGNED CASES:</span>
          <span className="text-xl font-bold text-[#272B27]">{departmentCases.length}</span>
        </div>
        <div className="p-3 bg-white border border-[#272B27] tech-shadow-sm">
          <span className="text-[#5B6158] block">ACTIVE FIELD CASES:</span>
          <span className="text-xl font-bold text-[#D94B3D]">
            {departmentCases.filter((c) => c.status !== "RESOLVED").length}
          </span>
        </div>
        <div className="p-3 bg-white border border-[#272B27] tech-shadow-sm">
          <span className="text-[#5B6158] block">AVG RESPONSE:</span>
          <span className="text-xl font-bold text-[#272B27]">1.4 min</span>
        </div>
        <div className="p-3 bg-white border border-[#272B27] tech-shadow-sm">
          <span className="text-[#5B6158] block">SECURITY CLEARANCE:</span>
          <span className="text-xs font-bold text-emerald-800 uppercase">TIER 1 AUTHORIZED</span>
        </div>
      </div>

      {/* Special Security Photo Workflow (Unknown Person Alert without Facial Recognition) */}
      {roleId === "security" && (
        <div className="p-4 bg-[#E6ECE5] border-2 border-[#272B27] tech-shadow text-xs font-mono space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#272B27]">
            <ShieldAlert className="w-4 h-4 text-[#D94B3D]" />
            SECURITY EVIDENCE PROTOCOL (PRD Non-Negotiable):
          </div>
          <p className="text-[#5B6158]">
            Unknown person alerts provide raw eyewitness photos and coordinates for patrol verification. Automated facial identification or biometric recognition is strictly prohibited and deactivated by institutional safety policy.
          </p>
        </div>
      )}

      {/* Special Medical Protocol Banner */}
      {roleId === "medical" && (
        <div className="p-4 bg-[#FCEBE9] border-2 border-[#D94B3D] tech-shadow text-xs font-mono space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#D94B3D]">
            <Stethoscope className="w-4 h-4" />
            FIRST-AID & AMBULANCE DISPATCH PROTOCOL:
          </div>
          <p className="text-[#272B27]">
            Provide conservative basic first-aid guidance only while professional triage is deployed. Never provide definitive diagnosis or delay ambulance dispatch.
          </p>
        </div>
      )}

      {/* Department Cases Queue */}
      <div className="p-4 bg-white border-2 border-[#272B27] tech-shadow space-y-4">
        <div className="flex items-center justify-between border-b border-[#272B27]/20 pb-3">
          <h3 className="text-sm font-mono font-bold uppercase text-[#272B27]">
            {roleConfig.shortTitle} Active Incident Queue:
          </h3>
          <Badge variant="outline" className="text-xs">
            {departmentCases.length} Cases Routed
          </Badge>
        </div>

        {departmentCases.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-[#5B6158] border border-dashed border-[#272B27]/30 bg-[#F5F1E8]">
            No pending or active incidents assigned to {roleConfig.title}.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {departmentCases.map((inc) => (
                <motion.div
                  key={inc.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="p-4 bg-[#F5F1E8] border-2 border-[#272B27] tech-shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#EEE8DC] transition-all hover:-translate-y-0.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={inc.workflow === "EMERGENCY_SOS" ? "emergency" : "default"}>
                        {inc.public_id}
                      </Badge>
                      <span className="text-xs font-bold text-[#272B27] uppercase">
                        {inc.category_label || inc.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#5B6158]">
                        • {inc.created_at || inc.createdAt ? new Date(inc.created_at || inc.createdAt || 0).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-[#272B27] font-semibold italic">
                      &ldquo;{inc.description}&rdquo;
                    </p>
                    <p className="text-[11px] font-mono text-[#5B6158]">
                      Location: <strong className="text-[#272B27]">{formatLocation(inc.location)}</strong> • Status: <strong className="text-[#D94B3D]">{inc.status}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCase(inc)}
                      className="text-xs font-mono font-bold"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect File
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => alert(`Case ${inc.public_id} updated: Responder Acknowledged`)}
                      className="text-xs font-mono font-bold uppercase"
                    >
                      Acknowledge
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Case Details Modal */}
      {selectedCase && (
        <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
          <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
            <DialogHeader className="border-b border-[#272B27]/20 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedCase.workflow === "EMERGENCY_SOS" ? "emergency" : "default"}>
                    {selectedCase.public_id}
                  </Badge>
                  <DialogTitle className="text-lg font-black uppercase text-[#272B27]">
                    Department Case Inspection
                  </DialogTitle>
                </div>
                <DialogCloseButton onClose={() => setSelectedCase(null)} />
              </div>
            </DialogHeader>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 bg-white border border-[#272B27]/20 space-y-1">
                <p className="font-bold text-[#D94B3D] uppercase text-sm">
                  {selectedCase.category_label}
                </p>
                <p className="font-sans text-[#272B27] italic text-sm">
                  &ldquo;{selectedCase.description}&rdquo;
                </p>
                <p className="text-[#5B6158] pt-1">
                  Location: {formatLocation(selectedCase.location)} (Coordinates X: {((selectedCase.pin?.x ?? 0.5) * 100).toFixed(1)}%, Y: {((selectedCase.pin?.y ?? 0.22) * 100).toFixed(1)}%)
                </p>
              </div>

              {selectedCase.photos && selectedCase.photos.length > 0 && (
                <div className="p-3 bg-white border border-[#272B27]/20 space-y-2">
                  <span className="font-bold text-[#272B27] uppercase">Evidence Photos:</span>
                  <div className="flex gap-2">
                    {selectedCase.photos.map((p: string, i: number) => (
                      <img key={i} src={p} alt="Evidence" className="w-28 h-28 object-cover border-2 border-[#272B27]" />
                    ))}
                  </div>
                </div>
              )}

              {/* Responder Action Bar */}
              <div className="p-3 bg-[#EEE8DC] border border-[#272B27] flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#272B27]">Responder Actions:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      alert(`Dispatched status update: On-Scene at ${selectedCase.location}`);
                      setSelectedCase(null);
                    }}
                  >
                    Mark On-Scene
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      alert(`Case ${selectedCase.public_id} marked as RESOLVED.`);
                      setSelectedCase(null);
                    }}
                  >
                    Resolve Incident
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#272B27]/20">
              <Button variant="outline" size="sm" onClick={() => setSelectedCase(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
