"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  FileText,
  Crosshair,
  ArrowRight,
  PhoneCall,
  Radio,
  Layers,
  UserCheck,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { CampusMap } from "@/components/map/campus-map";
import { CampusSafetyRadar } from "@/components/motion/campus-safety-radar";

interface EditorialLandingProps {
  onOpenSos: () => void;
  onOpenReport: () => void;
  onEnterApp: () => void;
}

export function EditorialLanding({
  onOpenSos,
  onOpenReport,
  onEnterApp,
}: EditorialLandingProps) {
  const [demoPin, setDemoPin] = React.useState<{ x: number; y: number } | null>({
    x: 0.42,
    y: 0.58,
  });
  const [visualMode, setVisualMode] = React.useState<"RADAR" | "MAP">("RADAR");

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#272B27] flex flex-col font-sans selection:bg-[#272B27] selection:text-[#F5F1E8]">
      {/* Top Technical Metadata Header Strip */}
      <div className="w-full bg-[#EEE8DC] border-b-2 border-[#272B27] px-4 sm:px-6 py-1.5 font-mono text-[11px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#272B27]">[ REF.2026.CAMPUS-SOS ]</span>
          <span className="text-[#272B27]/40 hidden sm:inline">|</span>
          <span className="text-[#5B6158] hidden sm:inline">INSTITUTIONAL CRITICAL SAFETY PLATFORM</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold text-[#D94B3D]">
            <span className="w-2 h-2 rounded-full bg-[#D94B3D] animate-ping" />
            24/7 DISPATCH ACTIVE
          </span>
          <span className="text-[#5B6158] hidden md:inline">WCAG 2.2 AAA COMPLIANT</span>
        </div>
      </div>

      {/* Main Editorial Hero Section (Deliberately Asymmetrical Composition with Motion Stagger) */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT EDITORIAL COLUMN (Structured side orientation, NOT centered copy) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="lg:col-span-5 flex flex-col justify-between space-y-6 lg:space-y-8"
          >
            <div className="space-y-4">
              {/* Technical Classification Label */}
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#272B27] text-[#F5F1E8] font-mono text-xs font-bold uppercase tracking-wider tech-shadow-sm">
                <span>CAMPUS DEFENCE ARCHITECTURE</span>
                <span className="text-white/40">/</span>
                <span className="text-emerald-400">STAGE 1 DEPLOYED</span>
              </div>

              {/* Bold Editorial Headline Lockup */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[#272B27] leading-[0.95]">
                SAFETY WITH <br />
                <span className="text-[#D94B3D] underline decoration-4 decoration-[#272B27]">CALM</span> AUTHORITY.
              </h1>

              {/* Editorial Subtitle */}
              <p className="text-sm sm:text-base text-[#5B6158] leading-relaxed max-w-md font-sans">
                A unified campus protection network connecting students, emergency responders, and administration in real time. Built with assistive AI comprehension and 100% deterministic incident dispatch.
              </p>
            </div>

            {/* SEPARATE & PROMINENT PRIMARY ACTIONS (Non-Negotiable) */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#5B6158] block">
                [ TWO PRIMARY DISPATCH WORKFLOWS ]:
              </span>

              {/* Action 1: EMERGENCY SOS (Immediate Threat) */}
              <div className="p-4 sm:p-5 bg-[#FCEBE9] border-2 border-[#D94B3D] tech-shadow-emergency transition-all duration-150 hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="emergency" className="text-[10px] tracking-wider font-mono">
                    CRITICAL ACTION
                  </Badge>
                  <span className="text-[11px] font-mono font-bold text-[#D94B3D]">
                    EXPLICIT CONFIRMATION REQUIRED
                  </span>
                </div>
                <h2 className="text-lg font-black uppercase text-[#D94B3D] tracking-tight">
                  Emergency Assistance
                </h2>
                <p className="text-xs text-[#272B27] mt-1 mb-3 leading-relaxed">
                  For immediate fire, medical collapse, physical violence, or security distress. Dispatches duty officers directly.
                </p>
                <Button
                  variant="emergency"
                  size="lg"
                  onClick={onOpenSos}
                  className="w-full text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
                  <span>Trigger Emergency SOS</span>
                </Button>
              </div>

              {/* Action 2: REPORT AN INCIDENT (Non-Emergency Intake) */}
              <div className="p-4 sm:p-5 bg-white border-2 border-[#272B27] tech-shadow transition-all duration-150 hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="default" className="text-[10px] tracking-wider font-mono">
                    STANDARD INTAKE
                  </Badge>
                  <span className="text-[11px] font-mono text-[#5B6158]">
                    CONFIDENTIAL REVIEW DESK
                  </span>
                </div>
                <h2 className="text-lg font-black uppercase text-[#272B27] tracking-tight">
                  Report an Incident
                </h2>
                <p className="text-xs text-[#5B6158] mt-1 mb-3 leading-relaxed">
                  For non-urgent issues: harassment, misconduct, infrastructure defects, or lost property.
                </p>
                <Button
                  variant="report"
                  size="lg"
                  onClick={onOpenReport}
                  className="w-full text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#272B27]" />
                  <span>File Incident Report</span>
                  <ArrowRight className="w-4 h-4 text-[#5B6158] transition-transform duration-150 group-hover:translate-x-1" />
                </Button>
              </div>

              {/* Portal Access Button Matrix */}
              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={onEnterApp}
                  className="w-full font-mono text-xs uppercase font-bold justify-between group"
                >
                  <span>Launch 12-Role Workspace Matrix</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
                </Button>

                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-between px-3 py-2.5 bg-[#EEE8DC] hover:bg-white border-2 border-[#272B27] text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] tech-shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-700" />
                    Sign In with 12 Sample Accounts
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Emergency Hotline Quick Access with working tel: link */}
            <div className="p-3 bg-[#EEE8DC] border-2 border-[#272B27] font-mono text-xs flex items-center justify-between tech-shadow-sm">
              <span className="flex items-center gap-1.5 font-bold text-[#D94B3D]">
                <PhoneCall className="w-4 h-4" /> 24/7 HOTLINE:
              </span>
              <a
                href="tel:+911800226787"
                className="font-bold underline text-[#272B27] hover:text-[#D94B3D] transition-colors"
                title="Call Campus SOS Emergency Hotline"
              >
                +91 1800-CAMPUS-SOS
              </a>
            </div>
          </motion.div>

          {/* RIGHT ARCHITECTURAL VISUALIZATION COLUMN (Restrained Animated Safety Radar & Interactive Map) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
            className="lg:col-span-7 flex flex-col space-y-4"
          >
            {/* Visual Header with Visual Mode Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#272B27] pb-2 font-mono text-xs">
              <div className="flex items-center gap-2 font-bold text-[#272B27] uppercase">
                <Crosshair className="w-4 h-4 text-[#D94B3D]" />
                <span>Institutional Response Telemetry</span>
              </div>

              {/* Mode Toggle Pills: RADAR vs 2D MAP */}
              <div className="flex items-center gap-1 bg-[#EEE8DC] p-0.5 border border-[#272B27]">
                <button
                  type="button"
                  onClick={() => setVisualMode("RADAR")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold uppercase transition-colors cursor-pointer",
                    visualMode === "RADAR"
                      ? "bg-[#272B27] text-[#F5F1E8]"
                      : "text-[#272B27] hover:bg-[#E5DDCF]"
                  )}
                >
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3" /> Safety Radar
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisualMode("MAP")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold uppercase transition-colors cursor-pointer",
                    visualMode === "MAP"
                      ? "bg-[#272B27] text-[#F5F1E8]"
                      : "text-[#272B27] hover:bg-[#E5DDCF]"
                  )}
                >
                  <span className="flex items-center gap-1">
                    <Compass className="w-3 h-3" /> 2D Map Grid
                  </span>
                </button>
              </div>
            </div>

            {/* Visual Presentation: Either CampusSafetyRadar Motion Graphic or CampusMap */}
            {visualMode === "RADAR" ? (
              <CampusSafetyRadar />
            ) : (
              <div className="relative">
                <CampusMap
                  pin={demoPin}
                  onPinChange={setDemoPin}
                  heightClass="h-[360px] sm:h-[420px]"
                  interactive={true}
                />
                <div className="absolute top-10 right-3 z-30 bg-[#272B27] text-[#F5F1E8] px-2.5 py-1 text-[11px] font-mono border border-white/20 tech-shadow">
                  <span>[ DRAG / CLICK TO PIN ]</span>
                </div>
              </div>
            )}

            {/* Realtime 3-Step Coordination Architecture Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 bg-white border-2 border-[#272B27] tech-shadow-sm space-y-1 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-[#272B27] uppercase">
                  <span className="w-4 h-4 bg-[#272B27] text-white flex items-center justify-center text-[10px]">1</span>
                  AI Comprehension
                </div>
                <p className="text-[11px] text-[#5B6158]">
                  Multilingual extraction (English, Hindi, Hinglish) maps keywords to campus safety taxonomy.
                </p>
              </div>

              <div className="p-3 bg-white border-2 border-[#272B27] tech-shadow-sm space-y-1 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-[#272B27] uppercase">
                  <span className="w-4 h-4 bg-[#272B27] text-white flex items-center justify-center text-[10px]">2</span>
                  Deterministic Rules
                </div>
                <p className="text-[11px] text-[#5B6158]">
                  Audited rule engine matches category union to responsible campus departments.
                </p>
              </div>

              <div className="p-3 bg-[#FCEBE9] border-2 border-[#D94B3D] tech-shadow-sm space-y-1 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-[#D94B3D] uppercase">
                  <span className="w-4 h-4 bg-[#D94B3D] text-white flex items-center justify-center text-[10px]">3</span>
                  Instant Dispatch
                </div>
                <p className="text-[11px] text-[#272B27]">
                  Automatic duty officer allocation with Available / Busy status tracking.
                </p>
              </div>
            </div>

            {/* System Status Indicators Strip */}
            <div className="p-3 bg-[#E6ECE5] border-2 border-[#272B27] flex flex-wrap items-center justify-between gap-2 text-xs font-mono tech-shadow-sm">
              <span className="text-[#272B27] font-bold">
                INSTITUTIONAL INTEGRITY METRICS:
              </span>
              <div className="flex items-center gap-4 text-[#272B27]">
                <span>12 Unified Roles</span>
                <span>•</span>
                <span>Max 2 Photo Attachments</span>
                <span>•</span>
                <span>Zero Public Leaks</span>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Institutional Architecture Section with Scroll Reveal */}
      <section className="w-full bg-[#EEE8DC] border-t-2 border-[#272B27] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#272B27] pb-4">
            <div>
              <span className="text-xs font-mono font-bold uppercase text-[#5B6158] block">
                [ DIVISION MATRIX ]
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-[#272B27]">
                12 Specialised Role Workspaces
              </h2>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={onEnterApp}
              className="self-start sm:self-auto font-mono text-xs uppercase"
            >
              Explore Full App →
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 font-mono text-xs">
            {[
              { title: "Student App", role: "STUDENT", desc: "SOS beacon & standard reports" },
              { title: "Campus Admin", role: "ADMIN", desc: "Master incident oversight & analytics" },
              { title: "Chief Proctor", role: "PROCTOR", desc: "Student & faculty conduct hearings" },
              { title: "Security Dispatch", role: "SECURITY", desc: "Perimeter patrols & alerts" },
              { title: "Medical Response", role: "MEDICAL", desc: "24/7 health clinic & ambulance" },
              { title: "Fire & Safety", role: "FIRE_SAFETY", desc: "Hazard control & evacuation" },
              { title: "Women Safety", role: "WOMEN_SAFETY", desc: "Confidential protection desk" },
              { title: "Men Safety", role: "MEN_SAFETY", desc: "Confidential dispute resolution" },
              { title: "Student Council", role: "COUNCIL", desc: "Hostel & campus welfare" },
              { title: "Infrastructure", role: "FACILITIES", desc: "Work orders & repairs" },
              { title: "Transportation", role: "TRAFFIC", desc: "Bays, parking & shuttle flow" },
              { title: "Digital Safety", role: "CYBER", desc: "IT accounts & cyber security" },
            ].map((col, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.25, delay: (idx % 4) * 0.05 }}
                className="p-3 bg-white border-2 border-[#272B27] tech-shadow-sm flex flex-col justify-between space-y-2 hover:bg-[#F5F1E8] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[#5B6158] mb-1">
                    <span>0{idx + 1}.</span>
                    <span className="font-bold">{col.role}</span>
                  </div>
                  <h4 className="font-bold text-sm text-[#272B27] uppercase">{col.title}</h4>
                  <p className="text-[11px] text-[#5B6158] mt-1">{col.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Footer */}
      <footer className="w-full bg-[#272B27] text-[#F5F1E8] border-t-2 border-[#272B27] py-8 px-4 sm:px-6 font-mono text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 px-2 bg-[#F5F1E8] border border-white/20 flex items-center justify-center">
              <img
                src="/brand/campus-sos-lockup-transparent.png"
                alt="Campus SOS"
                className="max-h-7 max-w-full object-contain"
              />
            </div>
            <span className="text-white/60">© 2026 Campus SOS Institutional Infrastructure.</span>
          </div>

          <div className="flex items-center gap-4 text-white/80">
            <span>Deterministic Routing v1.0</span>
            <span>•</span>
            <span>No Uncontrolled AI Decisions</span>
            <span>•</span>
            <span>WCAG AAA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
