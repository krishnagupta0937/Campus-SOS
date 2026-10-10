"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogCloseButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampusMap, PREDEFINED_CAMPUS_LOCATIONS, type CampusLocation } from "@/components/map/campus-map";
import { AlertTriangle, ShieldAlert, HeartPulse, Flame, PhoneCall, CheckCircle2, Upload, X, ArrowRight, ShieldCheck, Info } from "lucide-react";

import { createEmergencySos } from "@/lib/api-client";

interface EmergencySosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmergencyConfirmed: (incident: any) => void;
}

export function EmergencySosModal({
  open,
  onOpenChange,
  onEmergencyConfirmed,
}: EmergencySosModalProps) {
  const [step, setStep] = React.useState<"INTAKE" | "LOCATION" | "CONFIRM">("INTAKE");
  const [description, setDescription] = React.useState("");
  const [selectedLocation, setSelectedLocation] = React.useState<CampusLocation | null>(null);
  const [pin, setPin] = React.useState<{ x: number; y: number } | null>({ x: 0.50, y: 0.22 });
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [confirmedArm, setConfirmedArm] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Real-time classification simulation matching AI taxonomy
  const classification = React.useMemo(() => {
    const text = description.toLowerCase();
    if (text.includes("fire") || text.includes("smoke") || text.includes("burn") || text.includes("aag")) {
      return {
        category: "FIRE_HAZARD",
        label: "Fire & Life Safety Hazard",
        teams: ["Fire & Safety", "Security", "Campus Administration"],
        firstAid: "Evacuate area immediately via marked emergency exits. Avoid elevators. Close fire doors.",
        icon: Flame,
      };
    }
    if (text.includes("heart") || text.includes("bleed") || text.includes("faint") || text.includes("fall") || text.includes("chot") || text.includes("injury")) {
      return {
        category: "MEDICAL_EMERGENCY",
        label: "Urgent Medical Assistance",
        teams: ["Medical Clinic", "Security", "Campus Administration"],
        firstAid: "Keep patient calm and still. Do not move if spinal trauma suspected. Maintain open airway.",
        icon: HeartPulse,
      };
    }
    if (text.includes("follow") || text.includes("chedkhani") || text.includes("stalk") || text.includes("harass") || text.includes("threat")) {
      return {
        category: "WOMEN_SAFETY",
        label: "Urgent Protection / Security Alert",
        teams: ["Women Safety Team", "Security", "Chief Proctor"],
        firstAid: "Move toward lighted high-traffic areas or nearest security guard post immediately.",
        icon: ShieldAlert,
      };
    }
    return {
      category: "GENERAL_EMERGENCY",
      label: "Critical Campus Emergency",
      teams: ["Security Dispatch", "Campus Administration"],
      firstAid: "Stay in a safe sheltered location until authorized responders reach your coordinates.",
      icon: AlertTriangle,
    };
  }, [description]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (photos.length >= 2) return;

    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && photos.length < 2) {
        setPhotos((prev) => [...prev, event.target!.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const realEmergency = await createEmergencySos({
        description: description || "Immediate Emergency Assistance Dispatched",
        locationName: selectedLocation?.name || "Target Pin Coordinates",
        locationId: selectedLocation?.id || "loc_1",
        pin: pin || { x: 0.5, y: 0.22 },
        photos,
      });

      setIsSubmitting(false);
      onOpenChange(false);
      onEmergencyConfirmed({
        ...realEmergency,
        category: realEmergency.category || classification.category,
        category_label: realEmergency.category_label || classification.label,
        assigned_teams: realEmergency.assigned_teams || classification.teams,
      });
      // Reset state
      setStep("INTAKE");
      setDescription("");
      setPhotos([]);
      setConfirmedArm(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || "Failed to confirm emergency. Please notify security post directly.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-5 max-h-[85vh] overflow-y-auto pr-1">
        <DialogHeader className="border-b-2 border-[#D94B3D]/30 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#D94B3D] text-white tech-shadow-sm">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl text-[#D94B3D] font-extrabold">
                  Emergency Assistance
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-[#272B27]">
                  Priority Red Protocol • Immediate Dispatch
                </DialogDescription>
              </div>
            </div>
            <DialogCloseButton onClose={() => onOpenChange(false)} />
          </div>

          {/* Hotline Strip */}
          <div className="mt-2 flex items-center justify-between p-2 bg-[#FCEBE9] border border-[#D94B3D]/40 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold text-[#D94B3D]">
              <PhoneCall className="w-3.5 h-3.5" /> 24/7 CAMPUS HOTLINE:
            </span>
            <a
              href="tel:1800226787"
              className="font-bold underline text-[#272B27] hover:text-[#D94B3D]"
            >
              +91 1800-CAMPUS-SOS
            </a>
          </div>
        </DialogHeader>

        {/* Steps with smooth AnimatePresence transitions */}
        <AnimatePresence mode="wait">
          {/* STEP 1: INTAKE */}
          {step === "INTAKE" && (
            <motion.div
              key="step-intake"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] mb-1">
                  1. What happened? (Hindi / Hinglish / English accepted)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the immediate danger: e.g. 'Lab 3 me chemical aag lag gayi hai', 'Student collapsed near Canteen', 'Immediate medical attention needed'..."
                  className="w-full h-28 p-3 bg-white border-2 border-[#272B27] tech-shadow-sm text-sm text-[#272B27] placeholder:text-[#5B6158]/60 focus:outline-none focus:ring-2 focus:ring-[#D94B3D] font-sans"
                />
              </div>

              {/* AI Classification & First-Aid Card */}
              {description.trim().length > 5 && (
                <div className="p-3 bg-[#E6ECE5] border border-[#272B27] tech-shadow-sm space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase text-[#272B27] flex items-center gap-1">
                      <classification.icon className="w-4 h-4 text-[#D94B3D]" />
                      AI Detected: {classification.label}
                    </span>
                    <Badge variant="emergency" className="text-[10px]">
                      HIGH PRIORITY
                    </Badge>
                  </div>
                  <div className="p-2 bg-white border border-[#272B27]/20 text-xs text-[#272B27]">
                    <p className="font-bold text-[#D94B3D] mb-0.5 flex items-center gap-1">
                      <HeartPulse className="w-3.5 h-3.5" /> First-Aid & Protocol:
                    </p>
                    <p>{classification.firstAid}</p>
                  </div>
                </div>
              )}

              {/* Photo upload: max 2 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold uppercase text-[#272B27]">
                    Evidence Photos (Max 2 • Optional):
                  </span>
                  <span className="text-xs font-mono text-[#5B6158]">
                    {photos.length} of 2 attached
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {photos.map((src, index) => (
                    <div key={index} className="relative w-20 h-20 border-2 border-[#272B27] tech-shadow-sm bg-black overflow-hidden">
                      <img src={src} alt="Evidence" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-0 right-0 bg-[#D94B3D] text-white p-0.5 hover:bg-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 2 && (
                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-[#272B27] bg-white hover:bg-[#EEE8DC] cursor-pointer text-center p-1">
                      <Upload className="w-5 h-5 text-[#272B27]" />
                      <span className="text-[10px] font-mono mt-1 font-bold">Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="emergency"
                  size="lg"
                  disabled={description.trim().length < 3}
                  onClick={() => setStep("LOCATION")}
                  className="w-full sm:w-auto"
                >
                  Proceed to Location Pinning <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: LOCATION PINNING */}
          {step === "LOCATION" && (
            <motion.div
              key="step-location"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#272B27]">
                    2. Pinpoint Your Exact Location
                  </label>
                  <span className="text-xs font-mono text-[#D94B3D] font-bold">
                    Tap or click map to drop pin
                  </span>
                </div>
                <CampusMap
                  pin={pin}
                  onPinChange={setPin}
                  selectedLocationId={selectedLocation?.id}
                  onSelectLocation={setSelectedLocation}
                  heightClass="h-[280px]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setStep("INTAKE")}
                >
                  Back
                </Button>
                <Button
                  variant="emergency"
                  size="lg"
                  disabled={!pin}
                  onClick={() => setStep("CONFIRM")}
                >
                  Review & Confirm Emergency <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: EXPLICIT CONFIRMATION */}
          {step === "CONFIRM" && (
            <motion.div
              key="step-confirm"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.16 }}
              className="space-y-4"
            >
              <div className="p-4 bg-[#FCEBE9] border-2 border-[#D94B3D] tech-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-6 h-6 text-[#D94B3D]" />
                  <h3 className="text-base font-bold uppercase text-[#D94B3D] tracking-wide">
                    Explicit Confirmation Required
                  </h3>
                </div>
                <p className="text-xs text-[#272B27] leading-relaxed mb-3">
                  This action creates an immediate critical incident and dispatches on-duty campus responders. Please verify case details before broadcasting:
                </p>

                <div className="bg-white p-3 border border-[#272B27]/30 space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-[#5B6158]">CATEGORY: </span>
                    <span className="font-bold text-[#D94B3D]">{classification.label}</span>
                  </div>
                  <div>
                    <span className="text-[#5B6158]">LOCATION: </span>
                    <span className="font-bold text-[#272B27]">
                      {selectedLocation?.name || `Target Coordinates (${(pin!.x * 100).toFixed(1)}%, ${(pin!.y * 100).toFixed(1)}%)`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5B6158]">TEAMS TO DISPATCH: </span>
                    <span className="font-bold text-[#272B27]">
                      {classification.teams.join(" • ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5B6158]">DESCRIPTION: </span>
                    <span className="text-[#272B27] italic font-sans block mt-0.5">
                      "{description}"
                    </span>
                  </div>
                </div>

                {/* Safety Disarm / Arm Checkbox */}
                <label className="flex items-center gap-2 mt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedArm}
                    onChange={(e) => setConfirmedArm(e.target.checked)}
                    className="w-4 h-4 accent-[#D94B3D]"
                  />
                  <span className="text-xs font-bold text-[#272B27]">
                    I confirm this is a real immediate emergency requiring immediate personnel dispatch.
                  </span>
                </label>
              </div>

              {errorMessage && (
                <div className="p-2.5 bg-red-100 border border-red-500 text-red-900 text-xs font-mono">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setStep("LOCATION")}
                >
                  Back
                </Button>
                <Button
                  variant="emergency"
                  size="xl"
                  disabled={!confirmedArm || isSubmitting}
                  isLoading={isSubmitting}
                  onClick={handleFinalConfirm}
                  className="w-full sm:w-auto uppercase tracking-wider text-base"
                >
                  CONFIRM EMERGENCY
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Dialog>
  );
}
