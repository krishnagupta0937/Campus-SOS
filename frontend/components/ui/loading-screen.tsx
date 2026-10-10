"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { checkHealth } from "@/lib/api-client";
import { PhoneCall } from "lucide-react";

interface LoadingScreenProps {
  onComplete?: () => void;
  className?: string;
}

export function LoadingScreen({ onComplete, className }: LoadingScreenProps) {
  const [shouldRender, setShouldRender] = React.useState<boolean>(true);
  const [progress, setProgress] = React.useState<number>(30);
  const [isReady, setIsReady] = React.useState<boolean>(false);
  const [statusMessage, setStatusMessage] = React.useState<string>("INITIALIZING SECURE PROTOCOLS...");
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (!shouldRender) {
      onComplete?.();
      return;
    }

    let active = true;

    const initialize = async () => {
      if (typeof window !== "undefined" && sessionStorage.getItem("campus_sos_initial_loaded")) {
        setShouldRender(false);
        onComplete?.();
        return;
      }
      // 1. Check font readiness
      if (typeof document !== "undefined" && "fonts" in document) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font loading fallback
        }
      }
      if (!active) return;
      setProgress(60);

      // 2. Probe backend connectivity asynchronously without blocking
      setStatusMessage("VERIFYING CAMPUS DISPATCH API...");
      try {
        await checkHealth(1000);
      } catch {
        // Fallback gracefully without blocking user access
      }

      if (!active) return;
      setProgress(100);
      setStatusMessage("SYSTEM READY");

      // Brief transition settle
      const settleDelay = shouldReduceMotion ? 40 : 180;
      await new Promise((r) => setTimeout(r, settleDelay));
      if (!active) return;

      if (typeof window !== "undefined") {
        sessionStorage.setItem("campus_sos_initial_loaded", "true");
      }
      setIsReady(true);

      const exitDelay = shouldReduceMotion ? 50 : 300;
      await new Promise((r) => setTimeout(r, exitDelay));
      if (!active) return;

      setShouldRender(false);
      onComplete?.();
    };

    initialize();

    return () => {
      active = false;
    };
  }, [shouldRender, onComplete, shouldReduceMotion]);

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("campus_sos_initial_loaded", "true");
    }
    setIsReady(true);
    setShouldRender(false);
    onComplete?.();
  };

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
            "fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#F5F1E8] select-none text-[#272B27] p-6",
            className
          )}
          style={{ backgroundColor: "#F5F1E8" }}
          aria-live="polite"
        >
          {/* Subtle Decorative Star Sparkles from the Reference Design */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute bottom-12 right-12 text-[#272B27]/15 hidden sm:block">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>
            <div className="absolute top-12 left-12 text-[#272B27]/10 hidden sm:block">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
              </svg>
            </div>
          </div>

          {/* Top Skip / Immediate Emergency Safety Action (Accessible Without Waiting) */}
          <div className="w-full max-w-lg flex items-center justify-between gap-3 relative z-20">
            <a
              href="tel:1800226787"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D94B3D] text-white font-mono text-xs font-bold uppercase border border-[#272B27] tech-shadow-sm hover:bg-[#C23C2F] transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Emergency Call: 1800-226-787
            </a>

            <button
              type="button"
              onClick={handleSkip}
              className="px-3 py-1.5 bg-white border border-[#272B27] text-[#272B27] font-mono text-xs font-bold uppercase hover:bg-[#EEE8DC] transition-all cursor-pointer"
            >
              Skip →
            </button>
          </div>

          {/* Center Brand and Progress Container */}
          <div className="relative flex flex-col items-center justify-center px-4 max-w-sm sm:max-w-md w-full my-auto">
            {/* Logo Lockup Container with Antenna Signal Wave Pulse */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-[340px] sm:max-w-[400px] flex items-center justify-center"
            >
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

              {/* Official Campus SOS Lockup Logo */}
              <div className="relative w-[320px] h-[130px] sm:w-[380px] sm:h-[150px]">
                <Image
                  src="/brand/campus-sos-lockup-transparent.png"
                  alt="Campus SOS Safety & Emergency Response"
                  fill
                  priority
                  sizes="(max-width: 640px) 320px, 380px"
                  className="object-contain relative z-10"
                />
              </div>
            </motion.div>

            {/* Outlined Progress Bar */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
              className="mt-6 sm:mt-8 w-60 sm:w-72 md:w-80"
            >
              <div
                className="w-full h-3 sm:h-3.5 rounded-full border-[1.5px] border-[#272B27] bg-[#F5F1E8] p-[1.5px] overflow-hidden flex items-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
                role="progressbar"
                aria-label="Loading Campus SOS"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[#D94B3D] transition-[width] duration-300 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2 rounded-r-full bg-white/40" />
                </div>
              </div>

              <div className="mt-2 text-center">
                <span className="text-[10px] font-mono tracking-widest text-[#5B6158] uppercase">
                  {statusMessage}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Bottom verified safety note */}
          <div className="w-full text-center font-mono text-[10px] text-[#5B6158]">
            CAMPUS RESILIENCE & CRISIS RESPONSE NETWORK • ENCRYPTED DISPATCH
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
