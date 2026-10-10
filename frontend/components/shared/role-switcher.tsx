"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Building2,
  Scale,
  Shield,
  Stethoscope,
  Flame,
  HeartHandshake,
  Users,
  Wrench,
  Bus,
  Laptop,
  Check,
  ChevronDown,
} from "lucide-react";

export type RoleId =
  | "student"
  | "campus_admin"
  | "chief_proctor"
  | "security"
  | "medical"
  | "fire_safety"
  | "women_safety"
  | "men_safety"
  | "student_council"
  | "facilities"
  | "transport"
  | "it_digital";

export interface RoleConfig {
  id: RoleId;
  title: string;
  shortTitle: string;
  domain: string;
  icon: React.ComponentType<{ className?: string }>;
  restricted?: boolean;
}

export const ROLES: RoleConfig[] = [
  { id: "student", title: "Student App", shortTitle: "Student", domain: "Reporting & Emergency", icon: GraduationCap },
  { id: "campus_admin", title: "Campus Administration", shortTitle: "Admin Console", domain: "Master Command Centre", icon: Building2 },
  { id: "chief_proctor", title: "Chief Proctor", shortTitle: "Chief Proctor", domain: "Conduct & Disciplinary", icon: Scale },
  { id: "security", title: "Security Dispatch", shortTitle: "Security", domain: "Physical Perimeter Control", icon: Shield },
  { id: "medical", title: "Medical Response", shortTitle: "Medical", domain: "First Aid & Clinic", icon: Stethoscope },
  { id: "fire_safety", title: "Fire & Life Safety", shortTitle: "Fire & Safety", domain: "Hazard & Evacuation", icon: Flame },
  { id: "women_safety", title: "Women Safety Cell", shortTitle: "Women Safety", domain: "Confidential Protection", icon: HeartHandshake, restricted: true },
  { id: "men_safety", title: "Men Safety / Grievance", shortTitle: "Men Safety", domain: "Confidential Protection", icon: HeartHandshake, restricted: true },
  { id: "student_council", title: "Student Council", shortTitle: "Council", domain: "Welfare & Grievances", icon: Users },
  { id: "facilities", title: "Infrastructure & Facilities", shortTitle: "Facilities", domain: "Repairs & Work Orders", icon: Wrench },
  { id: "transport", title: "Transportation & Traffic", shortTitle: "Traffic", domain: "Fleet & Roadways", icon: Bus },
  { id: "it_digital", title: "IT & Digital Safety", shortTitle: "Cyber Safety", domain: "Network & Security", icon: Laptop },
];

interface RoleSwitcherProps {
  currentRole: RoleId;
  onRoleChange: (role: RoleId) => void;
  className?: string;
}

export function RoleSwitcher({ currentRole, onRoleChange, className }: RoleSwitcherProps) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const current = ROLES.find((r) => r.id === currentRole) || ROLES[0];

  return (
    <div className={cn("relative font-mono text-xs z-40", className)}>
      <div className="flex items-center gap-2">
        <span className="hidden lg:inline-block text-[#5B6158] font-bold uppercase tracking-wider text-[10px]">
          [ DEV ROLE MATRIX: ]
        </span>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#EEE8DC] border border-[#272B27] hover:bg-[#E5DDCF] tech-shadow-sm cursor-pointer select-none text-[#272B27] font-semibold"
        >
          <current.icon className="w-4 h-4 text-[#D94B3D]" />
          <span>{current.shortTitle}</span>
          {current.restricted && (
            <Badge variant="emergency" className="text-[9px] px-1 py-0">RESTRICTED</Badge>
          )}
          <ChevronDown className="w-3.5 h-3.5 ml-1 text-[#272B27]" />
        </button>
      </div>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-[#F5F1E8] border-2 border-[#272B27] tech-shadow z-50 p-1 divide-y divide-[#272B27]/10 animate-in fade-in zoom-in-95 duration-100">
            <div className="p-2 bg-[#EEE8DC] border-b border-[#272B27]/20 text-[10px] font-bold uppercase text-[#5B6158] flex justify-between items-center">
              <span>Switch Active Workspace (12 Roles)</span>
              <span>12/12 ACTIVE</span>
            </div>
            {ROLES.map((r) => {
              const isSelected = r.id === currentRole;
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onRoleChange(r.id);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 text-left transition-colors cursor-pointer",
                    isSelected ? "bg-[#272B27] text-[#F5F1E8]" : "hover:bg-[#EEE8DC] text-[#272B27]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn("w-4 h-4", isSelected ? "text-[#F5F1E8]" : "text-[#272B27]")} />
                    <div>
                      <p className="font-bold text-xs leading-none">{r.title}</p>
                      <p className={cn("text-[10px] mt-0.5", isSelected ? "text-[#F5F1E8]/70" : "text-[#5B6158]")}>
                        {r.domain}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
