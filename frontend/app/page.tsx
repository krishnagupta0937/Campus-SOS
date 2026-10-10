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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  LogIn,
  AlertTriangle,
  RefreshCw,
  Info,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  type SampleAccount,
  getAccountByRoleId,
  getDevTestPassword,
} from "@/lib/sample-accounts";
import {
  fetchMyReports,
  fetchTeamIncidents,
  fetchAdminIncidents,
  authenticate,
  logout,
  verifyCurrentSession,
  getStoredAuth,
  type IncidentRecord,
} from "@/lib/api-client";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function Page() {
  // Navigation & Role states
  const [viewMode, setViewMode] = React.useState<"LANDING" | "WORKSPACE">("LANDING");
  const [currentRole, setCurrentRole] = React.useState<RoleId>("student");
  const [activeAccount, setActiveAccount] = React.useState<SampleAccount | null>(null);
  const [activeNav, setActiveNav] = React.useState<string>("home");

  // Live Incident States (Genuinely empty on init, populated ONLY by real API responses)
  const [incidents, setIncidents] = React.useState<IncidentRecord[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = React.useState<boolean>(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = React.useState<boolean>(false);

  // Modals & Live SOS Tracker
  const [sosModalOpen, setSosModalOpen] = React.useState<boolean>(false);
  const [reportModalOpen, setReportModalOpen] = React.useState<boolean>(false);
  const [liveSosIncident, setLiveSosIncident] = React.useState<SosTrackingData | null>(null);

  // Sync active account and verify authenticated session on mount & URL search
  React.useEffect(() => {
    let active = true;

    async function initSession() {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get("role") as RoleId | null;
      const storedAuth = getStoredAuth();

      // If URL role requested in development
      if (urlRole) {
        setCurrentRole(urlRole);
        setViewMode("WORKSPACE");
        const found = getAccountByRoleId(urlRole);
        if (found) {
          setActiveAccount(found);
          try {
            // Authenticate directly with backend for this role
            await authenticate(found.email, getDevTestPassword());
          } catch {
            console.warn("Development auto-login fallback for URL role");
          }
        }
      } else if (storedAuth) {
        // Verify stored session with backend /auth/me
        try {
          const verified = await verifyCurrentSession();
          if (active && verified) {
            const matched = getAccountByRoleId((verified.role.toLowerCase() as RoleId) || "student");
            if (matched) {
              setActiveAccount(matched);
              setCurrentRole(matched.roleId);
            }
          }
        } catch {
          // If session expired or invalid
          if (active) {
            setActiveAccount(null);
          }
        }
      } else {
        // Unauthenticated initial state: default to student view preview
        const def = getAccountByRoleId("student");
        if (def && active) {
          setActiveAccount(def);
        }
      }
    }

    initSession();

    return () => {
      active = false;
    };
  }, []);

  // Fetch real incidents when activeAccount or currentRole changes
  const loadIncidents = React.useCallback(async () => {
    if (!activeAccount) {
      setIncidents([]);
      return;
    }

    setIsLoadingIncidents(true);
    setFetchError(null);

    try {
      if (currentRole === "student") {
        const [reports, sos] = await Promise.all([
          fetchMyReports(activeAccount, "reports"),
          fetchMyReports(activeAccount, "sos"),
        ]);
        const merged = [...(sos || []), ...(reports || [])];
        setIncidents(merged);
      } else if (currentRole === "campus_admin") {
        const allAdminIncidents = await fetchAdminIncidents(activeAccount);
        setIncidents(allAdminIncidents || []);
      } else {
        const teamList = await fetchTeamIncidents(activeAccount);
        setIncidents(teamList || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load incidents from campus server.";
      setFetchError(msg);
      // Cleanly clear state on failure — NEVER preserve fabricated or stale fake records!
      setIncidents([]);
    } finally {
      setIsLoadingIncidents(false);
    }
  }, [activeAccount, currentRole]);

  React.useEffect(() => {
    let isCancelled = false;
    const run = async () => {
      await Promise.resolve();
      if (!isCancelled) {
        loadIncidents();
      }
    };
    void run();
    return () => {
      isCancelled = true;
    };
  }, [loadIncidents]);

  // Verified role switcher (Authenticates against real backend)
  const handleRoleChange = async (role: RoleId) => {
    setCurrentRole(role);
    setViewMode("WORKSPACE");
    const matched = getAccountByRoleId(role);
    if (matched) {
      setActiveAccount(matched);
      try {
        await authenticate(matched.email, getDevTestPassword());
      } catch (err) {
        console.warn("Backend auth notice for role switch:", err);
      }
    }
  };

  const handleSignOut = async () => {
    await logout();
    setActiveAccount(null);
    setIncidents([]);
    setViewMode("LANDING");
    if (typeof window !== "undefined") {
      localStorage.removeItem("campus_sos_active_account");
      localStorage.removeItem("campus_sos_active_role");
    }
  };

  const handleEmergencyConfirmed = (newEmergency: IncidentRecord) => {
    setIncidents((prev) => [newEmergency, ...prev]);
    setLiveSosIncident({
      id: newEmergency.id,
      public_id: newEmergency.public_id || newEmergency.publicId || newEmergency.id,
      workflow: "EMERGENCY_SOS",
      category: newEmergency.category || "EMERGENCY",
      category_label: newEmergency.category_label || "Emergency SOS",
      description: newEmergency.description,
      location: typeof newEmergency.location === "object" ? newEmergency.location?.text || "Pin" : newEmergency.location,
      status: newEmergency.status || "REPORTED",
      created_at: newEmergency.created_at || newEmergency.createdAt || new Date().toISOString(),
      pin: newEmergency.pin || { x: 0.5, y: 0.22 },
      assigned_teams: newEmergency.assigned_teams || ["Security Patrol", "Campus Administration"],
    });
    setViewMode("WORKSPACE");
    setCurrentRole("student");
  };

  const handleReportSubmitted = (newReport: IncidentRecord) => {
    setIncidents((prev) => [newReport, ...prev]);
    setViewMode("WORKSPACE");
    setCurrentRole("student");
  };

  const handleSelectNav = (key: string) => {
    setActiveNav(key);
    setViewMode("WORKSPACE");
  };

  // Demo records generator (Explicitly isolated & visually labelled)
  const toggleDemoMode = () => {
    if (!isDemoMode) {
      setIsDemoMode(true);
      setIncidents([
        {
          id: "DEMO-SOS-01",
          public_id: "DEMO-SOS-01",
          workflow: "EMERGENCY_SOS",
          category: "FIRE_HAZARD",
          category_label: "Fire Hazard (Illustrative)",
          description: "ILLUSTRATIVE DEMO: Simulated lab emergency drill record.",
          location: "Academic Block B (Demo)",
          pin: { x: 0.42, y: 0.58 },
          photos: [],
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          status: "TEAMS_NOTIFIED",
          assigned_teams: ["Fire & Safety", "Security Patrol"],
          isDemo: true,
        },
        {
          id: "DEMO-REP-02",
          public_id: "DEMO-REP-02",
          workflow: "STANDARD_REPORT",
          category: "INFRASTRUCTURE",
          category_label: "Infrastructure (Illustrative)",
          description: "ILLUSTRATIVE DEMO: Simulated facilities repair sample.",
          location: "Academic Block A (Demo)",
          pin: { x: 0.24, y: 0.54 },
          photos: [],
          created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          status: "UNDER_REVIEW",
          assigned_teams: ["Infrastructure & Facilities"],
          isDemo: true,
        },
      ]);
    } else {
      setIsDemoMode(false);
      loadIncidents();
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#272B27] flex flex-col font-sans">
      {/* Branded Loading Screen (Initial Boot Only, Non-Blocking) */}
      <LoadingScreen />

      {/* Top Application Bar with Navigation */}
      <MotionNav
        onOpenSos={() => setSosModalOpen(true)}
        onOpenReport={() => setReportModalOpen(true)}
        onSelectNav={handleSelectNav}
        activeNav={activeNav}
        activeAccount={activeAccount}
        onSignOut={handleSignOut}
      />

      {/* Explicitly Labelled Development & Demo Testing Toolbar */}
      <div className="w-full bg-[#EEE8DC] border-b border-[#272B27]/40 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          {viewMode === "WORKSPACE" ? (
            <button
              type="button"
              onClick={() => setViewMode("LANDING")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#272B27] hover:bg-[#F5F1E8] font-bold uppercase cursor-pointer tech-shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Landing Page
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode("WORKSPACE")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#272B27] text-white border border-[#272B27] hover:bg-[#3E453E] font-bold uppercase cursor-pointer tech-shadow-sm transition-all"
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

          <Badge variant="outline" className="text-[10px] bg-amber-100/70 border-amber-800 text-amber-900 font-bold uppercase">
            DEVELOPMENT TESTING
          </Badge>
        </div>

        {/* Demo Mode Toggle & Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDemoMode}
            className={`px-2 py-0.5 border font-mono text-[11px] font-bold uppercase transition-all cursor-pointer ${
              isDemoMode
                ? "bg-amber-500 text-white border-amber-700"
                : "bg-white text-[#272B27] border-[#272B27] hover:bg-[#EEE8DC]"
            }`}
          >
            {isDemoMode ? "Disable Demo Mode" : "Load Demo Data"}
          </button>

          {activeAccount ? (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-white border border-[#272B27]/40 text-[#272B27]">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="font-bold">{activeAccount.name}</span>
              <span className="text-[#5B6158]">({activeAccount.roleLabel})</span>
              <Link
                href="/login"
                className="text-[#D94B3D] hover:underline font-bold text-[10px] ml-1 uppercase"
              >
                [Switch]
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden md:inline-flex items-center gap-1 text-[#272B27] hover:underline font-bold"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </Link>
          )}

          {/* 12-Role Switcher dropdown */}
          <RoleSwitcher
            currentRole={currentRole}
            onRoleChange={handleRoleChange}
          />
        </div>
      </div>

      {/* Demo Mode Prominent Banner */}
      {isDemoMode && (
        <div className="w-full bg-amber-50 border-b border-amber-300 px-4 py-2 text-xs font-mono text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>DEMO MODE ACTIVE:</strong> Showing illustrative records for interface testing. These records are explicitly isolated and are not live campus incidents.
            </span>
          </div>
          <button
            type="button"
            onClick={toggleDemoMode}
            className="underline font-bold hover:text-amber-950 shrink-0"
          >
            Switch to Live Records
          </button>
        </div>
      )}

      {/* Network / API Error Notice with Retry */}
      {fetchError && !isDemoMode && (
        <div className="w-full bg-red-50 border-b border-red-300 px-4 py-2 text-xs font-mono text-red-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={loadIncidents}
            disabled={isLoadingIncidents}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-600 text-white font-bold uppercase hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingIncidents ? "animate-spin" : ""}`} />
            Retry
          </button>
        </div>
      )}

      {/* Main Content Area */}
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

              {/* Loading State Indicator */}
              {isLoadingIncidents && (
                <div className="p-4 bg-white border border-[#272B27] font-mono text-xs flex items-center justify-center gap-2 text-[#5B6158]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#D94B3D]" />
                  <span>Synchronizing incidents with campus response registry...</span>
                </div>
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
