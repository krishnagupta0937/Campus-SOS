"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  onComplete?: () => void;
  className?: string;
}

export function LoadingScreen({ onComplete, className }: LoadingScreenProps) {
  const [progress, setProgress] = React.useState<number>(15);
  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [shouldRender, setShouldRender] = React.useState<boolean>(true);
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => {
    // Check if initial session loading already took place in this browser tab
    if (typeof window !== "undefined") {
      const alreadyLoaded = sessionStorage.getItem("campus_sos_initial_loaded");
      if (alreadyLoaded) {
        setShouldRender(false);
        onComplete?.();
        return;
      }
    }

    let active = true;

    // Orchestrate actual loading milestones
    const runMilestones = async () => {
      // Milestone 1: DOM & Document structure initialized
      await new Promise((r) => setTimeout(r, 80));
      if (!active) return;
      setProgress(35);

      // Milestone 2: Fonts loaded
      if (typeof document !== "undefined" && "fonts" in document) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font loading fallback
        }
      }
      if (!active) return;
      setProgress(60);

      // Milestone 3: Local state & API connectivity probe
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 600);
        await fetch("http://localhost:4000/api/v1/health", {
          signal: controller.signal,
        }).catch(() => null);
        clearTimeout(timeout);
      } catch {
        // Fallback gracefully without blocking
      }

      if (!active) return;
      setProgress(85);

      // Milestone 4: Final layout hydration & asset stabilization
      await new Promise((r) => setTimeout(r, 120));
      if (!active) return;
      setProgress(100);

      // Small fluid settle at 100% before smooth fade out
      await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 220));
      if (!active) return;
      setIsReady(true);

      // Record that initial boot sequence has completed for this tab session
      if (typeof window !== "undefined") {
        sessionStorage.setItem("campus_sos_initial_loaded", "true");
      }

      // Exit transition duration
      await new Promise((r) => setTimeout(r, shouldReduceMotion ? 50 : 350));
      if (!active) return;
      setShouldRender(false);
      onComplete?.();
    };

    runMilestones();

    return () => {
      active = false;
    };
  }, [onComplete, shouldReduceMotion]);

  if (!shouldRender) return null;

  return (
    <AnimatePresence>
      {!isReady && (
        <motion.div
          key="initial-loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.1 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F5F1E8] select-none text-[#272B27]",
            className
          )}
          style={{ backgroundColor: "#F5F1E8" }}
          aria-live="polite"
        >
          {/* Subtle Decorative Star Sparkles from the Reference Video */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Bottom-right subtle diamond sparkle */}
            <div className="absolute bottom-12 right-12 text-[#272B27]/15 hidden sm:block">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>
            {/* Top-left subtle diamond sparkle */}
            <div className="absolute top-12 left-12 text-[#272B27]/10 hidden sm:block">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>
          </div>

          <div className="relative flex flex-col items-center justify-center px-4 max-w-sm sm:max-w-md w-full">
            {/* Logo Lockup Container with Restrained Entrance & Antenna Signal Wave Pulse */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-[340px] sm:max-w-[400px] flex items-center justify-center"
            >
              {/* Subtle Signal Radar Pulse positioned over the transmitter arc inside the logo */}
              {!shouldReduceMotion && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: "24.5%",
                    top: "46%",
                    transform: "translate(-50%, -50%)",
                  }}
                  aria-hidden="true"
                >
                  <motion.div
                    animate={{
                      scale: [0.9, 1.45, 1.9],
                      opacity: [0.65, 0.3, 0],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="w-16 h-16 rounded-full border-2 border-[#D94B3D]/70 bg-[#D94B3D]/10"
                  />
                </div>
              )}

              {/* Official Campus SOS Lockup Logo (Preserving aspect ratio, transparent, no redrawing) */}
              <img
                src="/brand/campus-sos-lockup-transparent.png"
                alt="Campus SOS Safety & Coordination"
                className="w-full h-auto max-h-[140px] sm:max-h-[160px] object-contain relative z-10"
              />
            </motion.div>

            {/* Slim Outlined Progress Bar from Video Reference */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
              className="mt-6 sm:mt-8 w-60 sm:w-72 md:w-80"
            >
              {/* Thin Charcoal-Outlined Capsule Container */}
              <div
                className="w-full h-3 sm:h-3.5 rounded-full border-[1.5px] border-[#272B27] bg-[#F5F1E8] p-[1.5px] overflow-hidden flex items-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                role="progressbar"
                aria-label="Loading Campus SOS"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {/* Emergency Red Fill Bar with Smooth Horizontal Interpolation & Leading Glow */}
                <div
                  className="h-full rounded-full bg-[#D94B3D] transition-[width] duration-200 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  {/* Subtle leading highlight sparkle */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 rounded-r-full bg-white/40" />
                </div>
              </div>

              {/* Accessible Minimal Status Label (Visually subtle) */}
              <div className="mt-2 text-center">
                <span className="text-[10px] font-mono tracking-widest text-[#5B6158] uppercase">
                  {progress < 100 ? "INITIALIZING SECURE PROTOCOLS..." : "SYSTEM READY"}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
