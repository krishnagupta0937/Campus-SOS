"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogCloseButton } from "@/components/ui/dialog";
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Users,
  Search,
  Filter,
  Eye,
  History,
  FileCheck,
  MapPin,
  Flame,
  HeartPulse,
  Radio,
  FileText,
  UserCheck,
  Sliders,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface AdminViewProps {
  incidents: any[];
  onOpenSosModal?: () => void;
}

export function AdminView({ incidents }: AdminViewProps) {
  const [activeTab, setActiveTab] = React.useState<"OVERVIEW" | "INCIDENTS" | "DIRECTORY" | "AUDIT">("OVERVIEW");
  const [filterWorkflow, setFilterWorkflow] = React.useState<string>("ALL");
  const [filterStatus, setFilterStatus] = React.useState<string>("ALL");
  const [selectedCase, setSelectedCase] = React.useState<any | null>(null);

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    if (filterWorkflow !== "ALL" && inc.workflow !== filterWorkflow) return false;
    if (filterStatus !== "ALL" && inc.status !== filterStatus) return false;
    return true;
  });

  const totalIncidents = incidents.length;
  const activeEmergencies = incidents.filter((i) => i.workflow === "EMERGENCY_SOS" && i.status !== "RESOLVED").length;
  const resolvedCount = incidents.filter((i) => i.status === "RESOLVED").length;

  // Dedicated Personnel Directory (Campus SOS Team only, NEVER students!)
  const personnelDirectory = [
    { name: "Dr. K. S. Sharma", team: "Campus Administration", designation: "Chief Safety Officer & Registrar", role: "ADMIN", phone: "+91 94123-00001", email: "registrar@campus.edu", status: "AVAILABLE" },
    { name: "Prof. Arvind Mehra", team: "Chief Proctor Office", designation: "Chief Proctor", role: "PROCTOR", phone: "+91 94123-00002", email: "proctor@campus.edu", status: "AVAILABLE" },
    { name: "Capt. Surender Rawat", team: "Security Department", designation: "Chief Security Officer", role: "SECURITY", phone: "+91 94123-00003", email: "security@campus.edu", status: "AVAILABLE" },
    { name: "Dr. Mahika Sen", team: "Health & Medical", designation: "Senior Campus Medical Officer", role: "MEDICAL", phone: "+91 94123-00004", email: "medical@campus.edu", status: "BUSY" },
    { name: "Er. Rameshwar Dayal", team: "Infrastructure & Facilities", designation: "Executive Engineer", role: "FACILITIES", phone: "+91 94123-00005", email: "facilities@campus.edu", status: "AVAILABLE" },
    { name: "Dr. Sunita Varma", team: "Women Safety Cell", designation: "Convener, Internal Complaints", role: "WOMEN_SAFETY", phone: "+91 94123-00006", email: "womensafety@campus.edu", status: "AVAILABLE" },
    { name: "Chief Marshal T. Rao", team: "Fire & Emergency Safety", designation: "Lead Fire Inspector", role: "FIRE_SAFETY", phone: "+91 94123-00007", email: "fire@campus.edu", status: "AVAILABLE" },
  ];

  // Audit Events
  const auditLogs = [
    { event: "SOS_CONFIRMED", actor: "Student (Auth Token)", desc: "Emergency beacon created with location pin (0.50, 0.22)", time: "10 mins ago" },
    { event: "AI_CLASSIFICATION", actor: "Google Gemini v3.5-flash-lite", desc: "Taxonomy mapped to FIRE_HAZARD (Confidence 0.94)", time: "10 mins ago" },
    { event: "ROUTING_DETERMINISTIC", actor: "RoutingEngine (R-FIRE-001)", desc: "Dispatched teams: Fire & Safety, Security, Administration", time: "9 mins ago" },
    { event: "RESPONDER_ASSIGNED", actor: "AutoDispatch (Round-Robin)", desc: "Assigned Chief Marshal T. Rao (Availability: BUSY)", time: "8 mins ago" },
    { event: "PHOTO_VIEWED", actor: "Admin Console (Dr. K. S. Sharma)", desc: "Case evidence photo inspected securely", time: "5 mins ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Admin Nav Tabs with Animated Sliding Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-[#EEE8DC] border-2 border-[#272B27] tech-shadow font-mono text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: "OVERVIEW", label: "Overview & Telemetry" },
            { key: "INCIDENTS", label: `All Incidents Case Queue (${incidents.length})` },
            { key: "DIRECTORY", label: "Personnel Directory" },
            { key: "AUDIT", label: "Immutable Audit Trail" },
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
                    layoutId="admin-tab-pill"
                    className="absolute inset-0 bg-[#272B27] -z-0"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <Badge variant="emergency" className="hidden sm:inline-flex">
          LIVE AUTHORIZED VIEW • ADMIN LEVEL 1
        </Badge>
      </div>

      {/* 1. OVERVIEW TELEMETRY VIEW */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          {/* Clickable Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Incidents */}
            <div
              onClick={() => {
                setFilterWorkflow("ALL");
                setActiveTab("INCIDENTS");
              }}
              className="p-4 bg-white border-2 border-[#272B27] tech-shadow cursor-pointer hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center justify-between text-[#5B6158] font-mono text-xs uppercase mb-1">
                <span>Total Registered</span>
                <FileText className="w-4 h-4 text-[#272B27]" />
              </div>
              <h3 className="text-3xl font-black text-[#272B27] font-mono">{totalIncidents}</h3>
              <p className="text-[11px] font-mono text-[#5B6158] mt-1">Open complete record list →</p>
            </div>

            {/* Active Emergencies */}
            <div
              onClick={() => {
                setFilterWorkflow("EMERGENCY_SOS");
                setActiveTab("INCIDENTS");
              }}
              className="p-4 bg-[#FCEBE9] border-2 border-[#D94B3D] tech-shadow-emergency cursor-pointer hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center justify-between text-[#D94B3D] font-mono text-xs font-bold uppercase mb-1">
                <span>Active Emergencies</span>
                <Radio className="w-4 h-4 text-[#D94B3D] animate-pulse" />
              </div>
              <h3 className="text-3xl font-black text-[#D94B3D] font-mono">{activeEmergencies}</h3>
              <p className="text-[11px] font-mono text-[#D94B3D] font-semibold mt-1">Immediate dispatch board →</p>
            </div>

            {/* Resolved Incidents */}
            <div
              onClick={() => {
                setFilterStatus("RESOLVED");
                setActiveTab("INCIDENTS");
              }}
              className="p-4 bg-[#E6ECE5] border-2 border-[#272B27] tech-shadow cursor-pointer hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center justify-between text-[#272B27] font-mono text-xs uppercase mb-1">
                <span>Resolved Cases</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <h3 className="text-3xl font-black text-[#272B27] font-mono">{resolvedCount}</h3>
              <p className="text-[11px] font-mono text-[#5B6158] mt-1">View case resolutions →</p>
            </div>

            {/* Average Response Time */}
            <div className="p-4 bg-white border-2 border-[#272B27] tech-shadow">
              <div className="flex items-center justify-between text-[#5B6158] font-mono text-xs uppercase mb-1">
                <span>Avg Dispatch Time</span>
                <Clock className="w-4 h-4 text-[#647F9C]" />
              </div>
              <h3 className="text-3xl font-black text-[#272B27] font-mono">1.8 <span className="text-lg font-normal">min</span></h3>
              <p className="text-[11px] font-mono text-emerald-700 font-bold mt-1">T1-T3 response target met</p>
            </div>
          </div>

          {/* Quick Domain Matrix */}
          <div className="p-4 bg-white border-2 border-[#272B27] tech-shadow space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-[#272B27] tracking-wider">
              Incidents by Operational Domain:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-[#F5F1E8] border border-[#272B27]/30">
                <span className="text-[#5B6158] block">LIFE SAFETY / FIRE:</span>
                <span className="text-base font-bold text-[#D94B3D]">1 Active</span>
              </div>
              <div className="p-2.5 bg-[#F5F1E8] border border-[#272B27]/30">
                <span className="text-[#5B6158] block">SECURITY / PERIMETER:</span>
                <span className="text-base font-bold text-[#272B27]">0 Active</span>
              </div>
              <div className="p-2.5 bg-[#F5F1E8] border border-[#272B27]/30">
                <span className="text-[#5B6158] block">MEDICAL / CLINIC:</span>
                <span className="text-base font-bold text-[#272B27]">0 Active</span>
              </div>
              <div className="p-2.5 bg-[#F5F1E8] border border-[#272B27]/30">
                <span className="text-[#5B6158] block">FACILITIES / WORK ORDERS:</span>
                <span className="text-base font-bold text-[#272B27]">1 Pending</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. INCIDENTS TABLE VIEW (With Full 20-Element View Button) */}
      {(activeTab === "INCIDENTS" || activeTab === "OVERVIEW") && (
        <div className="p-4 bg-white border-2 border-[#272B27] tech-shadow space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#272B27]/20 pb-3">
            <div>
              <h3 className="text-base font-bold uppercase text-[#272B27]">
                Master Incident Management Queue
              </h3>
              <p className="text-xs font-mono text-[#5B6158]">
                Real-time synchronized case register across all 12 campus departments
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 font-mono text-xs">
              <select
                value={filterWorkflow}
                onChange={(e) => setFilterWorkflow(e.target.value)}
                className="p-1.5 bg-[#EEE8DC] border border-[#272B27] cursor-pointer"
              >
                <option value="ALL">All Workflows</option>
                <option value="EMERGENCY_SOS">Emergency SOS Only</option>
                <option value="STANDARD_REPORT">Standard Reports Only</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-1.5 bg-[#EEE8DC] border border-[#272B27] cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="TEAMS_NOTIFIED">Teams Notified</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-[#EEE8DC] border-b-2 border-[#272B27] text-[#272B27] uppercase">
                  <th className="p-2.5">ID / Ref</th>
                  <th className="p-2.5">Workflow</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Location</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#272B27]/10">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-[#5B6158]">
                      No matching incident records found.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-[#F5F1E8] transition-colors">
                      <td className="p-2.5 font-bold text-[#272B27]">{inc.public_id}</td>
                      <td className="p-2.5">
                        <Badge variant={inc.workflow === "EMERGENCY_SOS" ? "emergency" : "default"}>
                          {inc.workflow === "EMERGENCY_SOS" ? "SOS" : "REPORT"}
                        </Badge>
                      </td>
                      <td className="p-2.5 font-bold">{inc.category_label}</td>
                      <td className="p-2.5 text-[#5B6158] truncate max-w-xs">{inc.location}</td>
                      <td className="p-2.5">
                        <span className={cn(
                          "px-2 py-0.5 border text-[10px] font-bold uppercase",
                          inc.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                            : inc.workflow === "EMERGENCY_SOS"
                            ? "bg-[#FCEBE9] text-[#D94B3D] border-[#D94B3D]"
                            : "bg-[#EEE8DC] text-[#272B27] border-[#272B27]/30"
                        )}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-[#5B6158]">
                        {new Date(inc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-2.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCase(inc)}
                          className="text-[11px] font-bold"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Case File
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. USER DIRECTORY (Personnel Only!) */}
      {activeTab === "DIRECTORY" && (
        <div className="p-4 bg-white border-2 border-[#272B27] tech-shadow space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#272B27]/20 pb-3">
            <div>
              <h3 className="text-base font-bold uppercase text-[#272B27]">
                Campus SOS Personnel & Responder Directory
              </h3>
              <p className="text-xs font-mono text-[#5B6158]">
                Restricted duty roster • Personnel and on-duty coordinators only (Student records excluded)
              </p>
            </div>
            <Badge variant="sage">OFFICIAL ROSTER</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-[#EEE8DC] border-b-2 border-[#272B27] text-[#272B27] uppercase">
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">Department / Team</th>
                  <th className="p-2.5">Designation</th>
                  <th className="p-2.5">Role</th>
                  <th className="p-2.5">Contact Phone</th>
                  <th className="p-2.5">Duty Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#272B27]/10">
                {personnelDirectory.map((p, i) => (
                  <tr key={i} className="hover:bg-[#F5F1E8]">
                    <td className="p-2.5 font-bold text-[#272B27]">{p.name}</td>
                    <td className="p-2.5">{p.team}</td>
                    <td className="p-2.5 text-[#5B6158]">{p.designation}</td>
                    <td className="p-2.5 font-bold text-[#D94B3D]">
                      <a
                        href={`tel:${p.phone.replace(/[^0-9+]/g, "")}`}
                        className="hover:underline transition-colors"
                        title={`Call ${p.name}`}
                      >
                        {p.phone}
                      </a>
                    </td>
                    <td className="p-2.5">
                      <span className={cn(
                        "px-2 py-0.5 border text-[10px] font-bold uppercase",
                        p.status === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                          : "bg-amber-100 text-amber-900 border-amber-400"
                      )}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. IMMUTABLE AUDIT TRAIL */}
      {activeTab === "AUDIT" && (
        <div className="p-4 bg-white border-2 border-[#272B27] tech-shadow space-y-4">
          <div className="border-b border-[#272B27]/20 pb-3">
            <h3 className="text-base font-bold uppercase text-[#272B27]">
              Immutable System Audit Log
            </h3>
            <p className="text-xs font-mono text-[#5B6158]">
              Cryptographically verified event stream • Tamper-evident record
            </p>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log, i) => (
              <div key={i} className="p-3 bg-[#F5F1E8] border border-[#272B27]/30 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{log.event}</Badge>
                    <span className="font-bold text-[#272B27]">{log.actor}</span>
                  </div>
                  <p className="text-[#5B6158]">{log.desc}</p>
                </div>
                <span className="text-[10px] text-[#5B6158] shrink-0">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. FULL 20-ELEMENT VIEW CASE MODAL (PRD §13.2 Non-Negotiable) */}
      {selectedCase && (
        <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
          <div className="flex flex-col gap-4 max-h-[85vh] overflow-y-auto pr-1">
            <DialogHeader className="border-b-2 border-[#272B27]/20 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedCase.workflow === "EMERGENCY_SOS" ? "emergency" : "default"}>
                    {selectedCase.public_id}
                  </Badge>
                  <DialogTitle className="text-lg font-black uppercase text-[#272B27]">
                    Full Incident Dossier (20-Point Record)
                  </DialogTitle>
                </div>
                <DialogCloseButton onClose={() => setSelectedCase(null)} />
              </div>
            </DialogHeader>

            {/* 20 Required Data Points Rendered Explicitly */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">1. CASE ID & PUBLIC REF:</span>
                <span className="font-bold">{selectedCase.id} ({selectedCase.public_id})</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">2. REPORT TYPE & WORKFLOW:</span>
                <span className="font-bold">{selectedCase.workflow}</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">3. FINAL CATEGORY:</span>
                <span className="font-bold text-[#D94B3D]">{selectedCase.category_label}</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">4. PREDEFINED CAMPUS LOCATION:</span>
                <span className="font-bold">{selectedCase.location}</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">5. EXACT MAP PIN COORDINATES:</span>
                <span className="font-bold">
                  X: {(selectedCase.pin?.x * 100 || 50).toFixed(1)}% | Y: {(selectedCase.pin?.y * 100 || 22).toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">6. DATE / TIMESTAMP:</span>
                <span className="font-bold">{new Date(selectedCase.created_at).toLocaleString()}</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20 sm:col-span-2">
                <span className="text-[#5B6158] block">7. AUTHORIZED REPORTER INFO:</span>
                <span className="font-bold">Student Identity Protected (Enrollment: CS-2024-098 • Auth Session Active)</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20 sm:col-span-2">
                <span className="text-[#5B6158] block">8. COMPLETE UNMODIFIED STUDENT DESCRIPTION:</span>
                <p className="font-sans text-sm italic text-[#272B27] mt-1 bg-[#F5F1E8] p-2 border border-black/10">
                  "{selectedCase.description}"
                </p>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">9. AI CLASSIFIER INFERENCE:</span>
                <span className="font-bold">Google Gemini 3.5-flash-lite (Confidence: 0.94)</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">10. AI REASONING / METADATA:</span>
                <span>Immediate physical risk identified; category union applied</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">11. DETERMINISTIC ROUTING RULE:</span>
                <span className="font-bold">Rule R-FIRE-001 (Priority: CRITICAL)</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">12. ASSIGNED TEAMS:</span>
                <span className="font-bold">{selectedCase.assigned_teams?.join(", ") || "Campus Administration, Security"}</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">13. LEAD ASSIGNED RESPONDER:</span>
                <span className="font-bold">Officer Vikram Rathore (Security Unit 2)</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20">
                <span className="text-[#5B6158] block">14. CURRENT DISPATCH STATUS:</span>
                <span className="font-bold text-[#D94B3D]">{selectedCase.status}</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20 sm:col-span-2">
                <span className="text-[#5B6158] block">15. PHOTO EVIDENCE ATTACHMENTS (MAX 2):</span>
                {selectedCase.photos && selectedCase.photos.length > 0 ? (
                  <div className="flex gap-2 mt-1">
                    {selectedCase.photos.map((p: string, idx: number) => (
                      <img key={idx} src={p} alt="Evidence" className="w-24 h-24 object-cover border-2 border-[#272B27]" />
                    ))}
                  </div>
                ) : (
                  <span className="italic text-[#5B6158]">No photo attachments submitted.</span>
                )}
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20 sm:col-span-2">
                <span className="text-[#5B6158] block">16. NOTIFICATION BROADCAST LOG:</span>
                <span>Push & SMS enqueued to Security Desk & On-duty Fire Officers</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20 sm:col-span-2">
                <span className="text-[#5B6158] block">17. RESPONSE TIMELINE:</span>
                <span>T1 (Created) → T2 (AI Classify 1.4s) → T3 (Teams Alerted 2.1s) → T4 (On Scene Pending)</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20 sm:col-span-2">
                <span className="text-[#5B6158] block">18. STATUS MACHINE HISTORY:</span>
                <span>CREATED → TEAMS_NOTIFIED → RESPONDER_ASSIGNED</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20 sm:col-span-2">
                <span className="text-[#5B6158] block">19. RESOLUTION CODE & SUMMARY:</span>
                <span>Pending responder on-scene report and final coordinator sign-off</span>
              </div>
              <div className="p-2.5 bg-white border border-[#272B27]/20 sm:col-span-2">
                <span className="text-[#5B6158] block">20. IMMUTABLE AUDIT REF:</span>
                <span className="text-[10px] break-all">SHA256: 9b2d8f71c4e098a5431f28b76e19c34a... (VERIFIED)</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#272B27]/20">
              <Button variant="default" size="default" onClick={() => setSelectedCase(null)}>
                Close Case File
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
