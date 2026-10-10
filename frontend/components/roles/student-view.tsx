"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampusMap, type IncidentPin } from "@/components/map/campus-map";
import {
  ShieldAlert,
  FileText,
  PhoneCall,
  Bell,
  Clock,
  Compass,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  HeartPulse,
  Flame,
  Radio,
  ChevronRight,
  Layers,
} from "lucide-react";

interface StudentViewProps {
  onOpenSos: () => void;
  onOpenReport: () => void;
  onSelectIncident: (inc: any) => void;
  incidents: any[];
  activeSubView?: string;
}

export function StudentView({
  onOpenSos,
  onOpenReport,
  onSelectIncident,
  incidents,
  activeSubView = "home",
}: StudentViewProps) {
  const [activeTab, setActiveTab] = React.useState<"HOME" | "EXPLORE" | "REPORTS" | "NOTICES">(
    activeSubView === "explore" ? "EXPLORE" : activeSubView === "reports" ? "REPORTS" : "HOME"
  );
  const [reportsSubTab, setReportsSubTab] = React.useState<"REPORTS" | "SOS">("SOS");

  React.useEffect(() => {
    if (activeSubView === "explore") setActiveTab("EXPLORE");
    else if (activeSubView === "reports") setActiveTab("REPORTS");
    else if (activeSubView === "home") setActiveTab("HOME");
  }, [activeSubView]);

  const sosIncidents = incidents.filter((i) => i.workflow === "EMERGENCY_SOS");
  const standardReports = incidents.filter((i) => i.workflow === "STANDARD_REPORT");

  // Verified 24/7 Emergency Campus Hotlines
  const hotlines = [
    { title: "Central Campus Police & Security Control", number: "+91 1800-226-787", avail: "24/7 Available" },
    { title: "Campus Health Clinic & Ambulance", number: "+91 1800-226-911", avail: "Immediate Dispatch" },
    { title: "Women Safety Cell & Confidential Support", number: "+91 1800-226-100", avail: "Confidential Escort" },
    { title: "Chief Proctor Grievance Helpline", number: "+91 1800-226-444", avail: "Duty Officer on Call" },
  ];

  // Sanitized Map Pins for Student Explore
  const explorePins: IncidentPin[] = [
    { id: "pin_1", x: 0.42, y: 0.58, title: "Lab 3 Chemical Maintenance", category: "Facility", isEmergency: false, status: "Under Control" },
    { id: "pin_2", x: 0.16, y: 0.20, title: "North Parking Paving Works", category: "Traffic", isEmergency: false, status: "Advisory" },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs with Animated Sliding Pill */}
      <div className="flex items-center gap-1.5 p-1 bg-[#EEE8DC] border-2 border-[#272B27] tech-shadow-sm font-mono text-xs overflow-x-auto">
        {[
          { key: "HOME", label: "Student Dashboard" },
          { key: "EXPLORE", label: "Campus Explore (2D Map)" },
          { key: "REPORTS", label: `My Reports (${incidents.length})` },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "relative px-4 py-2 font-bold uppercase transition-colors whitespace-nowrap cursor-pointer",
                isActive ? "text-[#F5F1E8]" : "text-[#272B27] hover:bg-[#E5DDCF]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="student-tab-pill"
                  className="absolute inset-0 bg-[#272B27] -z-0"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. STUDENT HOME VIEW */}
      {activeTab === "HOME" && (
        <div className="space-y-6">
          {/* Dual Primary Actions (Crucial Non-Negotiable: SOS vs Report) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* EMERGENCY SOS TRIGGER CARD (72px Prominent Mobile Button) */}
            <div className="p-5 sm:p-6 bg-[#FCEBE9] border-2 border-[#D94B3D] tech-shadow-emergency flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="emergency" className="tracking-widest">
                    PRIMARY EMERGENCY PROTOCOL
                  </Badge>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D94B3D] animate-ping" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#D94B3D] tracking-tight">
                  Emergency Assistance
                </h2>
                <p className="text-xs sm:text-sm text-[#272B27] mt-1 leading-relaxed">
                  For immediate physical danger, medical crises, fire hazards, or urgent harassment threats. Dispatches on-duty campus responders directly to your coordinates.
                </p>
              </div>

              <Button
                variant="emergency"
                size="sos"
                onClick={onOpenSos}
                className="w-full h-18 text-lg sm:text-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 animate-pulse hover:animate-none"
              >
                <ShieldAlert className="w-7 h-7 stroke-[2.5]" />
                TRIGGER EMERGENCY SOS
              </Button>
            </div>

            {/* REPORT AN INCIDENT TRIGGER CARD */}
            <div className="p-5 sm:p-6 bg-white border-2 border-[#272B27] tech-shadow flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="default" className="tracking-widest">
                    STANDARD REPORTING INTAKE
                  </Badge>
                  <span className="text-xs font-mono text-[#5B6158]">NON-EMERGENCY</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-[#272B27] tracking-tight">
                  Report an Incident
                </h2>
                <p className="text-xs sm:text-sm text-[#5B6158] mt-1 leading-relaxed">
                  For campus maintenance, safety concerns, grievances, student or faculty misconduct, noise disturbances, and lost property. Does not sound emergency sirens.
                </p>
              </div>

              <Button
                variant="default"
                size="lg"
                onClick={onOpenReport}
                className="w-full h-18 text-base sm:text-lg font-bold uppercase tracking-wider flex items-center justify-center gap-3"
              >
                <FileText className="w-6 h-6" />
                FILE STANDARD INCIDENT REPORT
              </Button>
            </div>
          </div>

          {/* Active Broadcast Safety Notice */}
          <div className="p-4 bg-[#E6ECE5] border-2 border-[#272B27] tech-shadow-sm flex items-start gap-3">
            <Radio className="w-5 h-5 text-[#272B27] shrink-0 mt-0.5" />
            <div className="text-xs font-mono space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#272B27] uppercase">CAMPUS-WIDE SAFETY ADVISORY:</span>
                <span className="text-[10px] text-[#5B6158]">PUBLISHED 14:30 IST</span>
              </div>
              <p className="text-[#272B27]">
                Scheduled fire drill completed in Block B. All academic corridors and emergency stairs are cleared. Standard safety escort services operational from 18:00 onwards.
              </p>
            </div>
          </div>

          {/* On-Duty Campus Response Teams */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold uppercase text-[#272B27] tracking-wider">
                Current On-Duty Campus Responders:
              </h3>
              <Badge variant="sage" className="text-[10px]">
                ALL UNITS OPERATIONAL
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white border border-[#272B27] tech-shadow-sm font-mono text-xs">
                <div className="flex items-center gap-2 text-[#272B27] font-bold mb-1">
                  <Shield className="w-4 h-4 text-[#272B27]" /> Security Patrol
                </div>
                <p className="text-[11px] text-emerald-700 font-bold">4 Officers Active</p>
                <p className="text-[10px] text-[#5B6158]">Perimeter & Gates</p>
              </div>

              <div className="p-3 bg-white border border-[#272B27] tech-shadow-sm font-mono text-xs">
                <div className="flex items-center gap-2 text-[#272B27] font-bold mb-1">
                  <HeartPulse className="w-4 h-4 text-[#D94B3D]" /> Health Clinic
                </div>
                <p className="text-[11px] text-emerald-700 font-bold">2 Doctors On Duty</p>
                <p className="text-[10px] text-[#5B6158]">Infirmary Ward A</p>
              </div>

              <div className="p-3 bg-white border border-[#272B27] tech-shadow-sm font-mono text-xs">
                <div className="flex items-center gap-2 text-[#272B27] font-bold mb-1">
                  <Flame className="w-4 h-4 text-amber-700" /> Fire Marshals
                </div>
                <p className="text-[11px] text-emerald-700 font-bold">Squad Armed</p>
                <p className="text-[10px] text-[#5B6158]">Hydrants Checked</p>
              </div>

              <div className="p-3 bg-white border border-[#272B27] tech-shadow-sm font-mono text-xs">
                <div className="flex items-center gap-2 text-[#272B27] font-bold mb-1">
                  <ShieldAlert className="w-4 h-4 text-[#647F9C]" /> Women Safety
                </div>
                <p className="text-[11px] text-emerald-700 font-bold">Discreet Support</p>
                <p className="text-[10px] text-[#5B6158]">Night Escort Ready</p>
              </div>
            </div>
          </div>

          {/* 24/7 Verified Hotlines */}
          <div className="p-5 bg-[#EEE8DC] border-2 border-[#272B27] tech-shadow space-y-3">
            <div className="flex items-center justify-between border-b border-[#272B27]/20 pb-2">
              <h3 className="text-xs font-mono font-bold uppercase text-[#272B27] flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#D94B3D]" /> 24/7 Campus Emergency Hotlines
              </h3>
              <span className="text-[10px] font-mono text-[#5B6158]">DIRECT LINE ACCESS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hotlines.map((h, i) => (
                <div
                  key={i}
                  className="p-3 bg-white border border-[#272B27] tech-shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#272B27]">{h.title}</h4>
                    <span className="text-[10px] font-mono text-[#5B6158]">{h.avail}</span>
                  </div>
                  <a
                    href={`tel:${h.number.replace(/[^0-9+]/g, "")}`}
                    className="px-3.5 py-1.5 bg-[#272B27] text-[#F5F1E8] font-mono text-xs font-bold uppercase hover:bg-[#3E453E] border border-[#272B27] transition-all hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
                  >
                    Call
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. CAMPUS EXPLORE (2D MAP) VIEW */}
      {activeTab === "EXPLORE" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#272B27]/20 pb-3">
            <div>
              <h3 className="text-lg font-bold uppercase text-[#272B27]">
                Campus Incident Explorer
              </h3>
              <p className="text-xs font-mono text-[#5B6158]">
                Real-time sanitized campus activity overlay • Privacy-compliant view
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {explorePins.length} Sanitized Active Pins
              </Badge>
            </div>
          </div>

          <CampusMap
            pins={explorePins}
            interactive={true}
            heightClass="h-[420px]"
          />

          <div className="p-3 bg-white border border-[#272B27] tech-shadow-sm text-xs font-mono text-[#5B6158]">
            <p className="flex items-center gap-1.5 font-bold text-[#272B27] mb-1">
              <Shield className="w-3.5 h-3.5 text-[#272B27]" /> Privacy & Security Guarantee:
            </p>
            Sensitive cases, individual student complaints, and confidential harassment investigations are strictly excluded from the public Explore map.
          </div>
        </div>
      )}

      {/* 3. MY REPORTS VIEW (Distinct Tabs: Normal Reports vs Emergency SOS) */}
      {activeTab === "REPORTS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#272B27]/20 pb-3">
            <div>
              <h3 className="text-lg font-bold uppercase text-[#272B27]">
                My Submissions & Status History
              </h3>
              <p className="text-xs font-mono text-[#5B6158]">
                Track review progression and responder notes
              </p>
            </div>

            {/* Sub-tabs: Emergency SOS vs Reports */}
            <div className="flex items-center gap-1 bg-[#EEE8DC] p-1 border border-[#272B27] font-mono text-xs">
              <button
                type="button"
                onClick={() => setReportsSubTab("SOS")}
                className={cn(
                  "px-3 py-1 font-bold uppercase transition-all cursor-pointer",
                  reportsSubTab === "SOS" ? "bg-[#D94B3D] text-white" : "text-[#272B27] hover:bg-[#E5DDCF]"
                )}
              >
                Emergency SOS ({sosIncidents.length})
              </button>
              <button
                type="button"
                onClick={() => setReportsSubTab("REPORTS")}
                className={cn(
                  "px-3 py-1 font-bold uppercase transition-all cursor-pointer",
                  reportsSubTab === "REPORTS" ? "bg-[#272B27] text-white" : "text-[#272B27] hover:bg-[#E5DDCF]"
                )}
              >
                Standard Reports ({standardReports.length})
              </button>
            </div>
          </div>

          {/* List of Emergency SOS submissions */}
          {reportsSubTab === "SOS" && (
            <div className="space-y-3">
              {sosIncidents.length === 0 ? (
                <div className="p-8 bg-white border-2 border-dashed border-[#272B27]/40 text-center text-xs font-mono text-[#5B6158]">
                  No active or past Emergency SOS records.
                </div>
              ) : (
                <AnimatePresence>
                  {sosIncidents.map((inc) => (
                    <motion.div
                      key={inc.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => onSelectIncident(inc)}
                      className="p-4 bg-[#FCEBE9] border-2 border-[#D94B3D] tech-shadow cursor-pointer hover:bg-[#F9DDD9] transition-all hover:-translate-y-0.5 active:translate-y-0.5 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="emergency">{inc.public_id}</Badge>
                          <span className="text-xs font-bold text-[#D94B3D] uppercase">
                            {inc.category_label}
                          </span>
                        </div>
                        <p className="text-xs text-[#272B27] font-semibold italic">
                          "{inc.description}"
                        </p>
                        <p className="text-[11px] font-mono text-[#5B6158]">
                          Location: {inc.location} • Status: <strong className="text-[#D94B3D]">{inc.status}</strong>
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#D94B3D]" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}

          {/* List of Standard Non-Emergency Reports */}
          {reportsSubTab === "REPORTS" && (
            <div className="space-y-3">
              {standardReports.length === 0 ? (
                <div className="p-8 bg-white border-2 border-dashed border-[#272B27]/40 text-center text-xs font-mono text-[#5B6158]">
                  No standard incident reports filed yet.
                </div>
              ) : (
                <AnimatePresence>
                  {standardReports.map((inc) => (
                    <motion.div
                      key={inc.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => onSelectIncident(inc)}
                      className="p-4 bg-white border-2 border-[#272B27] tech-shadow cursor-pointer hover:bg-[#EEE8DC] transition-all hover:-translate-y-0.5 active:translate-y-0.5 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{inc.public_id}</Badge>
                          <span className="text-xs font-bold text-[#272B27] uppercase">
                            {inc.category_label}
                          </span>
                        </div>
                        <p className="text-xs text-[#272B27] italic">
                          "{inc.description}"
                        </p>
                        <p className="text-[11px] font-mono text-[#5B6158]">
                          Location: {inc.location} • Status: <strong>{inc.status}</strong>
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#272B27]" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
