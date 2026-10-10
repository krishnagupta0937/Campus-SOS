"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { MotionNav } from "@/components/navigation/motion-nav";
import { RoleSwitcher, type RoleId } from "@/components/shared/role-switcher";
import { EditorialLanding } from "@/components/landing/editorial-landing";
import { StudentView } from "@/components/roles/student-view";
import { AdminView } from "@/components/roles/admin-view";
import { DepartmentWorkspace } from "@/components/roles/department-workspace";
import { EmergencySosModal } from "@/components/emergency/emergency-sos-modal";
import { ReportIncidentModal } from "@/components/incident/report-incident-modal";
import { LiveSosTracker, type SosTrackingData } from "@/components/live/live-sos-tracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ArrowLeft, Building2, Radio, User, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import {
  SAMPLE_ACCOUNTS,
  type SampleAccount,
  getAccountByRoleId,
} from "@/lib/sample-accounts";
import { fetchMyReports, fetchTeamIncidents } from "@/lib/api-client";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function Page() {
  // Navigation & Role states
  const [viewMode, setViewMode] = React.useState<"LANDING" | "WORKSPACE">("LANDING");
  const [currentRole, setCurrentRole] = React.useState<RoleId>("student");
  const [activeAccount, setActiveAccount] = React.useState<SampleAccount | null>(null);
  const [activeNav, setActiveNav] = React.useState<string>("home");

  // Sync active account and role on mount & URL search
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get("role") as RoleId | null;
      const stored = localStorage.getItem("campus_sos_active_account");

      if (urlRole) {
        setCurrentRole(urlRole);
        setViewMode("WORKSPACE");
        const found = getAccountByRoleId(urlRole);
        if (found) {
          setActiveAccount(found);
          localStorage.setItem("campus_sos_active_account", JSON.stringify(found));
        }
      } else if (stored) {
        try {
          const acc = JSON.parse(stored) as SampleAccount;
          setActiveAccount(acc);
          if (acc.roleId) {
            setCurrentRole(acc.roleId);
          }
        } catch {
          // ignore corrupted storage
        }
      } else {
        // Default to student sample account
        const def = getAccountByRoleId("student");
        if (def) setActiveAccount(def);
      }
    }
  }, []);

  const handleRoleChange = (role: RoleId) => {
    setCurrentRole(role);
    setViewMode("WORKSPACE");
    const matched = getAccountByRoleId(role);
    if (matched) {
      setActiveAccount(matched);
      if (typeof window !== "undefined") {
        localStorage.setItem("campus_sos_active_account", JSON.stringify(matched));
      }
    }
  };

  const handleSignOut = () => {
    setActiveAccount(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("campus_sos_active_account");
    }
  };
  // Modals
  const [sosModalOpen, setSosModalOpen] = React.useState(false);
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [liveSosIncident, setLiveSosIncident] = React.useState<SosTrackingData | null>(null);

  // Synchronized Incidents State (populated from real backend)
  const [incidents, setIncidents] = React.useState<any[]>([
    {
      id: "SOS-2026-904122",
      public_id: "SOS-2026-9041",
      workflow: "EMERGENCY_SOS",
      category: "FIRE_HAZARD",
      category_label: "Fire & Chemical Hazard",
      description: "Chemical smoke detected in Block B Organic Chemistry Lab. Immediate evacuation in progress.",
      location: "Academic Block B (Science Labs)",
      pin: { x: 0.42, y: 0.58 },
      photos: [],
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      status: "TEAMS_NOTIFIED",
      assigned_teams: ["Fire & Safety", "Security Patrol", "Campus Administration"],
    },
    {
      id: "REP-2026-802114",
      public_id: "REP-2026-8021",
      workflow: "STANDARD_REPORT",
      category: "INFRASTRUCTURE",
      category_label: "Infrastructure & Hazard",
      description: "Broken handrail on exterior stairway behind Academic Block A. Risk of fall during rainy periods.",
      location: "Academic Block A (Lectures)",
      pin: { x: 0.24, y: 0.54 },
      photos: [],
      created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      status: "UNDER_REVIEW",
      assigned_teams: ["Infrastructure & Facilities"],
    },
  ]);

  // Sync with real backend when activeAccount changes
  React.useEffect(() => {
    let active = true;
    async function loadData() {
      if (!activeAccount) return;
      try {
        if (activeAccount.roleId === "student") {
          const r = await fetchMyReports(activeAccount, "reports");
          const s = await fetchMyReports(activeAccount, "sos");
          const merged = [...(s || []), ...(r || [])];
          if (active && merged.length > 0) {
            setIncidents((prev) => {
              // merge unique by id
              const ids = new Set(merged.map((m: any) => m.id));
              const extras = prev.filter((p) => !ids.has(p.id));
              return [...merged, ...extras];
            });
          }
        } else {
          const teamList = await fetchTeamIncidents(activeAccount);
          if (active && teamList.length > 0) {
            setIncidents((prev) => {
              const ids = new Set(teamList.map((m: any) => m.id));
              const extras = prev.filter((p) => !ids.has(p.id));
              return [...teamList, ...extras];
            });
          }
        }
      } catch (e) {
        console.warn("Backend fetch note:", e);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [activeAccount]);

  const handleEmergencyConfirmed = (newEmergency: any) => {
    setIncidents((prev) => [newEmergency, ...prev]);
    setLiveSosIncident(newEmergency);
    setViewMode("WORKSPACE");
    setCurrentRole("student");
  };

  const handleReportSubmitted = (newReport: any) => {
    setIncidents((prev) => [newReport, ...prev]);
    setViewMode("WORKSPACE");
    setCurrentRole("student");
  };

  const handleSelectNav = (key: string) => {
    setActiveNav(key);
    setViewMode("WORKSPACE");
    if (key === "home") {
      // Return to main role home
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#272B27] flex flex-col font-sans">
      {/* Branded Loading Screen (From Video Reference - Initial Boot Only) */}
      <LoadingScreen />

      {/* Top Application Bar with Navigation & Dev Role Switcher */}
      <MotionNav
        onOpenSos={() => setSosModalOpen(true)}
        onOpenReport={() => setReportModalOpen(true)}
        onSelectNav={handleSelectNav}
        activeNav={activeNav}
        activeAccount={activeAccount}
        onSignOut={handleSignOut}
      />

      {/* Role Switcher Toolbar (Always visible for easy testing of all 12 roles) */}
      <div className="w-full bg-[#EEE8DC] border-b border-[#272B27]/40 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          {viewMode === "WORKSPACE" ? (
            <button
              type="button"
              onClick={() => setViewMode("LANDING")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#272B27] hover:bg-[#F5F1E8] font-bold uppercase cursor-pointer tech-shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Landing Page
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode("WORKSPACE")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#272B27] text-white border border-[#272B27] hover:bg-[#3E453E] font-bold uppercase cursor-pointer tech-shadow-sm"
            >
              <Building2 className="w-3.5 h-3.5" /> Open Active Workspaces
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[#5B6158]">MODE:</span>
            <span className="font-bold text-[#272B27]">
              {viewMode === "LANDING" ? "EDITORIAL LANDING" : "ROLE WORKSPACE"}
            </span>
          </div>
        </div>

        {/* Active Account Identity Pill */}
        {activeAccount ? (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-white border border-[#272B27]/40 text-[#272B27]">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-bold">{activeAccount.name}</span>
            <span className="text-[#5B6158]">({activeAccount.roleLabel})</span>
            <Link
              href="/login"
              className="text-[#D94B3D] hover:underline font-bold text-[10px] ml-1 uppercase"
            >
              [Switch / Sign In]
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="hidden md:inline-flex items-center gap-1 text-[#272B27] hover:underline font-bold"
          >
            <LogIn className="w-3.5 h-3.5" /> Sign in with Sample Account
          </Link>
        )}

        {/* 12-Role Switcher dropdown */}
        <div className="flex items-center gap-2">
          <RoleSwitcher
            currentRole={currentRole}
            onRoleChange={handleRoleChange}
          />
        </div>
      </div>

      {/* Main Content Area with Smooth Page Transition */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {viewMode === "LANDING" ? (
            <motion.div
              key="landing-page"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <EditorialLanding
                onOpenSos={() => setSosModalOpen(true)}
                onOpenReport={() => setReportModalOpen(true)}
                onEnterApp={() => setViewMode("WORKSPACE")}
              />
            </motion.div>
          ) : (
            <motion.div
              key="workspace-matrix"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6"
            >
              {/* Live SOS Beacon Banner if emergency active */}
              {liveSosIncident && (
                <LiveSosTracker
                  data={liveSosIncident}
                  onClose={() => setLiveSosIncident(null)}
                />
              )}

              {/* Render Active Role Workspace */}
              {currentRole === "student" && (
                <StudentView
                  onOpenSos={() => setSosModalOpen(true)}
                  onOpenReport={() => setReportModalOpen(true)}
                  onSelectIncident={(inc) => {
                    if (inc.workflow === "EMERGENCY_SOS") setLiveSosIncident(inc);
                  }}
                  incidents={incidents}
                  activeSubView={activeNav}
                />
              )}

              {currentRole === "campus_admin" && (
                <AdminView
                  incidents={incidents}
                  onOpenSosModal={() => setSosModalOpen(true)}
                />
              )}

              {/* Other 10 Department / Responder Workspaces */}
              {currentRole !== "student" && currentRole !== "campus_admin" && (
                <DepartmentWorkspace
                  roleId={currentRole}
                  incidents={incidents}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL 1: EMERGENCY SOS (Immediate Dispatch Protocol with deliberate confirmation) */}
      <EmergencySosModal
        open={sosModalOpen}
        onOpenChange={setSosModalOpen}
        onEmergencyConfirmed={handleEmergencyConfirmed}
      />

      {/* MODAL 2: REPORT AN INCIDENT (Standard Non-Urgent Intake) */}
      <ReportIncidentModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        onReportSubmitted={handleReportSubmitted}
      />
    </div>
  );
}
