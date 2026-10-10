"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SAMPLE_ACCOUNTS,
  SampleAccount,
  getDevTestPassword,
} from "@/lib/sample-accounts";
import { authenticate } from "@/lib/api-client";
import { type RoleId } from "@/components/shared/role-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  UserCheck,
  Building,
  HeartPulse,
  Flame,
  Scale,
  Shield,
  Radio,
  Wrench,
  Bus,
  Laptop,
  Users,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [loadingAccountId, setLoadingAccountId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const handleLogin = async (account: SampleAccount) => {
    setLoadingAccountId(account.id);
    setErrorMsg(null);
    setSuccessMsg(`Verifying identity with campus security server as ${account.name} (${account.roleLabel})...`);

    try {
      await authenticate(account.email, getDevTestPassword());
      if (typeof window !== "undefined") {
        localStorage.setItem("campus_sos_active_account", JSON.stringify(account));
        localStorage.setItem("campus_sos_active_role", account.roleId);
      }
      setSuccessMsg(`Authenticated successfully. Redirecting...`);
      setTimeout(() => {
        router.push(`/?role=${account.roleId}&login=success`);
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setErrorMsg(`Server login error: ${msg}`);
      setSuccessMsg(null);
    } finally {
      setLoadingAccountId(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg("Verifying credentials with backend server...");
    setIsSubmitting(true);

    try {
      const auth = await authenticate(email.trim(), password);
      const matched = SAMPLE_ACCOUNTS.find((a) => a.email.toLowerCase() === auth.email.toLowerCase());
      const roleId = (matched?.roleId || "student") as RoleId;

      if (typeof window !== "undefined") {
        if (matched) {
          localStorage.setItem("campus_sos_active_account", JSON.stringify(matched));
        }
        localStorage.setItem("campus_sos_active_role", roleId);
      }
      setSuccessMsg(`Authenticated as ${auth.fullName || auth.email}. Redirecting...`);
      setTimeout(() => {
        router.push(`/?role=${roleId}&login=success`);
      }, 300);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      setErrorMsg(`Login failed: ${msg}`);
      setSuccessMsg(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (roleId: string) => {
    switch (roleId) {
      case "student":
        return Users;
      case "chief_proctor":
        return Scale;
      case "campus_admin":
        return Building;
      case "security":
        return Shield;
      case "medical":
        return HeartPulse;
      case "fire_safety":
        return Flame;
      case "women_safety":
      case "men_safety":
        return ShieldAlert;
      case "student_council":
        return Users;
      case "facilities":
      case "infrastructure":
        return Wrench;
      case "transport":
      case "transportation":
        return Bus;
      case "it_digital":
        return Laptop;
      default:
        return Radio;
    }
  };

  const categories = [
    {
      key: "PRIMARY",
      title: "Core Command & Governance",
      desc: "Student safety intake, proctorate tribunal, and administrative oversight",
    },
    {
      key: "RESPONDER",
      title: "Emergency Response Units",
      desc: "Tactical patrol, medical dispatch, and fire/chemical containment",
    },
    {
      key: "WELFARE",
      title: "Safety, Welfare & Council",
      desc: "ICC women safety, student harassment, and elected student council",
    },
    {
      key: "OPERATIONS",
      title: "Campus Infrastructure & Operations",
      desc: "Civil maintenance, transit logistics, and digital cyber security",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#272B27] flex flex-col font-sans selection:bg-[#272B27] selection:text-[#F5F1E8]">
      {/* Top Header Bar */}
      <header className="w-full bg-[#F5F1E8] border-b-2 border-[#272B27] px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEE8DC] border border-[#272B27] hover:bg-white text-xs font-mono font-bold uppercase cursor-pointer tech-shadow-sm transition-transform active:translate-y-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
          </Link>

          <div className="hidden sm:flex items-center gap-2 border-l border-[#272B27]/30 pl-4">
            <span className="text-xs font-mono font-bold text-[#5B6158]">AUTHENTICATION PORTAL</span>
          </div>
        </div>

        {/* Brand Lockup */}
        <div className="h-10 flex items-center px-2 py-1 bg-[#F5F1E8] border border-[#272B27] tech-shadow-sm">
          <img
            src="/brand/campus-sos-lockup-transparent.png"
            alt="Campus SOS Logo"
            className="max-h-8 w-auto object-contain"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Manual Sign-In Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-white border-2 border-[#272B27] tech-shadow space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#272B27] text-white font-mono text-[10px] uppercase font-bold tracking-wider">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  INSTITUTIONAL ACCESS GATE
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-[#272B27]">
                  Account Sign In
                </h1>
                <p className="text-xs text-[#5B6158] font-sans">
                  Sign in with your campus identity or click any test account on the right for instant 1-click verification.
                </p>
              </div>

              {/* Status Alert Banners */}
              {errorMsg && (
                <div className="p-3 bg-[#FCEBE9] border border-[#D94B3D] text-xs font-mono text-[#D94B3D] flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-[#E6ECE5] border border-emerald-700 text-xs font-mono text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] flex items-center justify-between">
                    <span>Institutional Email</span>
                    <span className="text-[10px] text-[#5B6158] normal-case">@campus-sos.edu</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6158]" />
                    <Input
                      type="email"
                      required
                      placeholder="e.g. student.priya@campus-sos.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] flex items-center justify-between">
                    <span>Password</span>
                    <span className="text-[10px] font-mono text-[#5B6158]">Test default: Password123!</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6158]" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6158] hover:text-[#272B27] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-full justify-center text-xs font-mono font-bold uppercase tracking-widest mt-2"
                >
                  <UserCheck className="w-4 h-4" /> Sign In to Workspace
                </Button>
              </form>

              <div className="pt-4 border-t border-[#272B27]/20 font-mono text-[11px] text-[#5B6158] space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Single Sign-On (SSO) & SAML 2.0 Ready</span>
                </div>
                <div className="text-[10px] text-[#5B6158]/80">
                  Role-based permissions are enforced server-side. Unauthorized access is recorded to the immutable audit log.
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 1-Click Sample Account Test Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 bg-[#EEE8DC] border-2 border-[#272B27] tech-shadow space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#272B27]/30 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#D94B3D] text-white font-mono text-[10px] uppercase font-bold tracking-wider">
                    TESTING READY
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-[#272B27] mt-1">
                    1-Click Sample Accounts
                  </h2>
                </div>
                <span className="text-xs font-mono text-[#5B6158]">
                  12 Canonical Roles Configured
                </span>
              </div>

              {/* Categories */}
              <div className="space-y-6">
                {categories.map((cat) => {
                  const accounts = SAMPLE_ACCOUNTS.filter((a) => a.category === cat.key);
                  return (
                    <div key={cat.key} className="space-y-3">
                      <div>
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-[#272B27]" />
                          {cat.title}
                        </h3>
                        <p className="text-[11px] text-[#5B6158] font-sans">{cat.desc}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {accounts.map((acc) => {
                          const Icon = getRoleIcon(acc.roleId);
                          const isLoggingIn = loadingAccountId === acc.id;

                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => handleLogin(acc)}
                              disabled={isLoggingIn}
                              className="text-left p-3 bg-white border border-[#272B27] hover:border-[#272B27] hover:bg-[#F5F1E8] tech-shadow-sm transition-all group cursor-pointer flex flex-col justify-between gap-2 relative disabled:opacity-50"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-[#272B27] text-white flex items-center justify-center shrink-0">
                                    <Icon className="w-4 h-4 text-emerald-400" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-[#272B27] leading-tight group-hover:text-[#D94B3D] transition-colors">
                                      {acc.name}
                                    </div>
                                    <div className="text-[10px] font-mono font-bold uppercase text-[#5B6158]">
                                      {acc.roleLabel}
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-[9px] shrink-0 font-mono">
                                  LOGIN →
                                </Badge>
                              </div>

                              <div className="pt-2 border-t border-[#272B27]/10 font-mono text-[10px] text-[#5B6158] space-y-0.5">
                                <div className="truncate font-medium text-[#272B27]/80">
                                  {acc.email}
                                </div>
                                <div className="truncate text-[#5B6158]">
                                  📍 {acc.dutyStation}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
