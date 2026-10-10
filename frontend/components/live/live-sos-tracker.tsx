"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, Radio, Shield, User, MapPin, Phone, AlertTriangle } from "lucide-react";
import { formatLocation, type IncidentRecord } from "@/lib/api-client";

export type SosTrackingData = IncidentRecord;

const SOS_STEPS = [
  { key: "EMERGENCY_CREATED", label: "Emergency Created", desc: "Emergency registered with college central dispatch" },
  { key: "TEAMS_NOTIFIED", label: "Teams Notified", desc: "Broadcast sent to primary response teams & coordinator" },
  { key: "RESPONDER_ASSIGNED", label: "Responder Assigned", desc: "Designated duty officer accepted response task" },
  { key: "RESPONDER_ON_THE_WAY", label: "Responder On the Way", desc: "Responder en-route to reported campus coordinates" },
  { key: "RESPONDER_AT_LOCATION", label: "Responder At Location", desc: "Officer arrived on-scene; securing perimeter" },
  { key: "RESOLVED", label: "Resolved", desc: "Incident handled and safety confirmed" },
];

export function LiveSosTracker({
  data,
  onClose,
}: {
  data: SosTrackingData;
  onClose: () => void;
}) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(1); // Default to TEAMS_NOTIFIED

  // Simulate progress across time
  React.useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStepIndex(2), 4000);
    const timer2 = setTimeout(() => setCurrentStepIndex(3), 9000);
    const timer3 = setTimeout(() => setCurrentStepIndex(4), 16000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const responder = {
    name: "Officer Vikram Rathore",
    team: data.assigned_teams?.[0] || "Campus Security & Medical",
    phone: "+91 98765-43210",
    eta: currentStepIndex >= 3 ? "2 mins" : "En-route",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -8 }}
      transition={{ duration: 0.2 }}
      className="p-4 sm:p-6 bg-[#F5F1E8] border-2 border-[#D94B3D] tech-shadow space-y-6"
    >
      {/* Tracker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#272B27]/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative p-2 bg-[#D94B3D] text-white tech-shadow-sm animate-pulse">
            <Radio className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#D94B3D]">
                Active Emergency Beacon
              </h2>
              <Badge variant="emergency" className="animate-pulse">
                LIVE DISPATCH
              </Badge>
            </div>
            <p className="text-xs font-mono text-[#272B27] mt-0.5">
              CASE REF: <span className="font-bold">{data.public_id || data.publicId || data.id}</span> • TIME: {data.created_at || data.createdAt ? new Date(data.created_at || data.createdAt || 0).toLocaleTimeString() : "Just now"}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onClose} className="self-start sm:self-auto">
          Back to Overview
        </Button>
      </div>

      {/* Incident Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-white border border-[#272B27] tech-shadow-sm font-mono text-xs">
        <div>
          <span className="text-[#5B6158] block">INCIDENT CATEGORY:</span>
          <span className="font-bold text-[#D94B3D] text-sm">{data.category_label || data.category}</span>
        </div>
        <div>
          <span className="text-[#5B6158] block">TARGET LOCATION:</span>
          <span className="font-bold text-[#272B27] flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#D94B3D]" /> {formatLocation(data.location)}
          </span>
        </div>
        <div>
          <span className="text-[#5B6158] block">ASSIGNED RESPONDERS:</span>
          <span className="font-bold text-[#272B27]">{(data.assigned_teams || []).join(", ") || "Campus Response Unit"}</span>
        </div>
      </div>

      {/* 6-Step Status Progression Tracker */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#272B27]">
          Live Dispatch Progression (6-Step Verification):
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOS_STEPS.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isUpcoming = idx > currentStepIndex;

            return (
              <div
                key={step.key}
                className={cn(
                  "p-3 border-2 transition-all flex flex-col justify-between",
                  isCurrent && "bg-[#FCEBE9] border-[#D94B3D] tech-shadow-emergency",
                  isDone && "bg-[#E6ECE5] border-[#272B27] tech-shadow-sm",
                  isUpcoming && "bg-white border-[#272B27]/20 opacity-60"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold text-[#5B6158]">
                    0{idx + 1}. STEP
                  </span>
                  {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
                  {isCurrent && <Radio className="w-4 h-4 text-[#D94B3D] animate-spin" />}
                  {isUpcoming && <Circle className="w-4 h-4 text-[#5B6158]" />}
                </div>

                <div>
                  <h4 className={cn(
                    "text-sm font-bold uppercase",
                    isCurrent ? "text-[#D94B3D]" : "text-[#272B27]"
                  )}>
                    {step.label}
                  </h4>
                  <p className="text-[11px] text-[#5B6158] mt-0.5 leading-snug">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-black/10 text-[10px] font-mono">
                  {isDone && <span className="text-emerald-800 font-bold">COMPLETED</span>}
                  {isCurrent && <span className="text-[#D94B3D] font-bold">IN PROGRESS NOW</span>}
                  {isUpcoming && <span className="text-[#5B6158]">PENDING NEXT</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Responder Card (Visible when assigned) */}
      {currentStepIndex >= 2 && (
        <div className="p-4 bg-white border-2 border-[#272B27] tech-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#272B27] text-white flex items-center justify-center font-bold text-lg tech-shadow-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-[#5B6158] tracking-widest block">
                Lead Field Responder:
              </span>
              <h4 className="text-base font-black text-[#272B27] uppercase">
                {responder.name}
              </h4>
              <p className="text-xs font-mono text-[#5B6158]">
                {responder.team} • ETA: <span className="text-[#D94B3D] font-bold">{responder.eta}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${responder.phone.replace(/[^0-9+]/g, "")}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#272B27] text-white text-xs font-mono font-bold tracking-wider uppercase border border-[#272B27] hover:bg-[#3E453E] tech-shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0.5"
            >
              <Phone className="w-3.5 h-3.5" /> Call Responder
            </a>
          </div>
        </div>
      )}

      {/* Safety Notice Strip */}
      <div className="p-3 bg-[#E6ECE5] border border-[#272B27] text-xs font-mono text-[#272B27] flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-[#D94B3D] shrink-0" />
        <span>Keep your phone line open. Stay in your current location or sheltered spot unless direct hazard requires immediate evacuation.</span>
      </div>
    </motion.div>
  );
}
