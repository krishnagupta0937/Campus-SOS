"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldAlert,
  FileText,
  Compass,
  Building,
  PhoneCall,
  Menu,
  X,
  User,
  LogIn,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { SampleAccount } from "@/lib/sample-accounts";

interface MotionNavProps {
  onOpenSos: () => void;
  onOpenReport: () => void;
  onSelectNav: (key: string) => void;
  activeNav: string;
  activeAccount?: SampleAccount | null;
  onSignOut?: () => void;
}

export function MotionNav({
  onOpenSos,
  onOpenReport,
  onSelectNav,
  activeNav,
  activeAccount,
  onSignOut,
}: MotionNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { key: "home", label: "Campus Command", icon: Building },
    { key: "explore", label: "Explore Map", icon: Compass },
    { key: "reports", label: "My Reports", icon: FileText },
    { key: "hotlines", label: "Emergency Contacts", icon: PhoneCall },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F5F1E8]/95 backdrop-blur-md border-b-2 border-[#272B27] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand / Logo Lockup */}
        <div
          onClick={() => onSelectNav("home")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Logo container using user's uploaded Option 02 design derivative */}
          <div className="relative h-11 flex items-center justify-center px-2 py-1 bg-[#F5F1E8] border-2 border-[#272B27] tech-shadow-sm transition-transform duration-150 group-hover:-translate-y-0.5">
            <img
              src="/brand/campus-sos-lockup-transparent.png"
              alt="Campus SOS Logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div className="hidden md:flex flex-col border-l-2 border-[#272B27]/30 pl-3">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#5B6158] uppercase">
              CAMPUS SAFETY INFRASTRUCTURE
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs font-mono font-bold text-[#272B27]">SYSTEM ARMED • 24/7</span>
            </div>
          </div>
        </div>

        {/* Desktop Motion Nav Bar with smooth layoutId sliding pill */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#EEE8DC] p-1 border-2 border-[#272B27] tech-shadow-sm font-mono text-xs">
          {navItems.map((item) => {
            const isActive = activeNav === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectNav(item.key)}
                className={cn(
                  "relative px-3.5 py-1.5 flex items-center gap-1.5 font-bold transition-colors cursor-pointer rounded-none",
                  isActive
                    ? "text-[#F5F1E8]"
                    : "text-[#272B27] hover:bg-[#E5DDCF]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-nav-active-pill"
                    className="absolute inset-0 bg-[#272B27] -z-0"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Action Triggers Lockup */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Report an Incident - Distinct Standard Action */}
          <Button
            variant="report"
            size="default"
            onClick={onOpenReport}
            className="hidden sm:inline-flex text-xs font-mono font-bold uppercase tracking-wider group"
          >
            <FileText className="w-3.5 h-3.5 text-[#272B27]" />
            <span>Report Incident</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#5B6158] transition-transform duration-150 group-hover:translate-x-1" />
          </Button>

          {/* Emergency SOS - Prominent Signal-Red Action with deliberate press feedback */}
          <Button
            variant="emergency"
            size="default"
            onClick={onOpenSos}
            className="text-xs font-mono font-bold uppercase tracking-widest px-3 sm:px-5"
          >
            <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden xs:inline">EMERGENCY SOS</span>
            <span className="xs:hidden">SOS</span>
          </Button>

          {/* Sign In / Active Account Indicator & Sign Out */}
          {activeAccount ? (
            <div className="hidden sm:inline-flex items-center gap-1.5">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EEE8DC] hover:bg-white border-2 border-[#272B27] text-xs font-mono font-bold text-[#272B27] tech-shadow-sm transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5"
                title="Switch account"
              >
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span className="max-w-[120px] truncate">{activeAccount.name}</span>
              </Link>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign Out"
                  title="Sign Out"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#EEE8DC] hover:bg-rose-100 hover:text-rose-700 border-2 border-[#272B27] text-xs font-mono font-bold text-[#272B27] tech-shadow-sm transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEE8DC] hover:bg-white border-2 border-[#272B27] text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] tech-shadow-sm transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="lg:hidden p-2 border-2 border-[#272B27] bg-[#EEE8DC] hover:bg-[#E5DDCF] tech-shadow-sm text-[#272B27] cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Accessible Animated Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="lg:hidden border-t-2 border-[#272B27] bg-[#F5F1E8] px-4 py-4 space-y-3 font-mono text-sm overflow-hidden"
          >
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeNav === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onSelectNav(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 border-2 border-[#272B27] text-left font-bold transition-colors cursor-pointer",
                      isActive
                        ? "bg-[#272B27] text-[#F5F1E8] tech-shadow-sm"
                        : "bg-white text-[#272B27] hover:bg-[#EEE8DC]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex flex-col gap-2.5 border-t-2 border-[#272B27]/20">
              <Button
                variant="report"
                size="default"
                onClick={() => {
                  onOpenReport();
                  setMobileMenuOpen(false);
                }}
                className="w-full justify-center text-xs font-mono font-bold uppercase tracking-wider"
              >
                <FileText className="w-3.5 h-3.5" /> Report Non-Emergency Incident
              </Button>
              <Button
                variant="emergency"
                size="lg"
                onClick={() => {
                  onOpenSos();
                  setMobileMenuOpen(false);
                }}
                className="w-full justify-center text-sm font-mono font-black uppercase tracking-widest"
              >
                <ShieldAlert className="w-5 h-5" /> Trigger Emergency SOS
              </Button>

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 p-2.5 bg-[#EEE8DC] border-2 border-[#272B27] text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] tech-shadow-sm transition-transform active:translate-y-0.5"
              >
                {activeAccount ? (
                  <>
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>Signed in: {activeAccount.name} (Switch)</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In with Sample Account</span>
                  </>
                )}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
