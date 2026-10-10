"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface HighlightContextType {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
}

const HighlightContext = React.createContext<HighlightContextType | null>(null);

export function Highlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [hoverId, setHoverId] = React.useState<string | null>(null);

  return (
    <HighlightContext.Provider
      value={{ activeId, setActiveId, hoverId, setHoverId }}
    >
      <div className={cn("relative flex items-center", className)}>
        {children}
      </div>
    </HighlightContext.Provider>
  );
}

export function HighlightItem({
  children,
  id,
  className,
  highlightClassName,
  isActive,
}: {
  children: React.ReactNode;
  id: string;
  className?: string;
  highlightClassName?: string;
  isActive?: boolean;
}) {
  const ctx = React.useContext(HighlightContext);

  const isCurrentActive = isActive ?? ctx?.activeId === id;
  const isHovered = ctx?.hoverId === id;

  return (
    <div
      className={cn("relative z-10", className)}
      onMouseEnter={() => ctx?.setHoverId(id)}
      onMouseLeave={() => ctx?.setHoverId(null)}
      onFocus={() => ctx?.setHoverId(id)}
      onBlur={() => ctx?.setHoverId(null)}
    >
      {(isCurrentActive || isHovered) && (
        <motion.div
          layoutId="highlight-pill"
          className={cn(
            "absolute inset-0 z-[-1] pointer-events-none transition-colors",
            isCurrentActive ? "bg-[#272B27] text-white" : "bg-[#272B27]/10",
            highlightClassName
          )}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      {children}
    </div>
  );
}
