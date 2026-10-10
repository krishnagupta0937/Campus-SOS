"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogCloseButton } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampusMap, PREDEFINED_CAMPUS_LOCATIONS, type CampusLocation } from "@/components/map/campus-map";
import { FileText, Upload, X, CheckCircle2, ShieldCheck, HelpCircle } from "lucide-react";

import { createStandardReport, type IncidentRecord } from "@/lib/api-client";

interface ReportIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportSubmitted: (report: IncidentRecord) => void;
}

export const INCIDENT_CATEGORIES = [
  { id: "INFRASTRUCTURE", name: "Infrastructure & Hazard", desc: "Broken tiles, water leakage, power fault, pathway blockage" },
  { id: "STUDENT_MISCONDUCT", name: "Student Conduct / Dispute", desc: "Verbal altercation, bullying, disciplinary concern" },
  { id: "FACULTY_STAFF_MISCONDUCT", name: "Staff / Faculty Misconduct", desc: "Unfair treatment, improper behavior, grievance" },
  { id: "WOMEN_HARASSMENT", name: "Women Safety Concern", desc: "Confidential handling by Women Safety Team & Proctor" },
  { id: "MEN_HARASSMENT", name: "Men Safety Concern", desc: "Confidential handling by Men Safety Team & Proctor" },
  { id: "DIGITAL_CYBER", name: "IT & Digital Security", desc: "Phishing, account compromise, online harassment" },
  { id: "TRAFFIC_PARKING", name: "Traffic & Parking Violation", desc: "Blocked bay, unauthorized parking, transport issue" },
  { id: "GENERAL_COMPLAINT", name: "General Campus Grievance", desc: "Canteen cleanliness, library noise, hostel facilities" },
];

export function ReportIncidentModal({
  open,
  onOpenChange,
  onReportSubmitted,
}: ReportIncidentModalProps) {
  const [category, setCategory] = React.useState(INCIDENT_CATEGORIES[0].id);
  const [description, setDescription] = React.useState("");
  const [selectedLocation, setSelectedLocation] = React.useState<CampusLocation | null>(null);
  const [pin, setPin] = React.useState<{ x: number; y: number } | null>({ x: 0.32, y: 0.38 });
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const selectedCatObj = INCIDENT_CATEGORIES.find((c) => c.id === category);
      const result = await createStandardReport({
        category,
        description,
        locationName: selectedLocation?.name || "Campus Location",
        locationId: selectedLocation?.id || "loc_hostel_4",
        pin: pin || { x: 0.32, y: 0.38 },
        photos,
      });

      setIsSubmitting(false);
      setSubmitted(true);
      onReportSubmitted({
        ...result,
        category_label: selectedCatObj?.name || category,
      });
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : "Failed to submit incident report. Please try again.";
      setErrorMessage(msg);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSubmitted(false);
    setDescription("");
    setPhotos([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-5 max-h-[85vh] overflow-y-auto pr-1">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#272B27] text-[#F5F1E8] tech-shadow-sm">
                <FileText className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-[#272B27]">
                  Report an Incident
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-[#5B6158]">
                  Standard Non-Urgent Intake • Authorized Review Workflow
                </DialogDescription>
              </div>
            </div>
            <DialogCloseButton onClose={handleClose} />
          </div>
        </DialogHeader>

        {submitted ? (
          <div className="p-6 bg-[#E6ECE5] border-2 border-[#272B27] tech-shadow text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#272B27] mx-auto" />
            <h3 className="text-lg font-bold text-[#272B27] uppercase">
              Incident Report Submitted
            </h3>
            <p className="text-xs text-[#272B27] max-w-md mx-auto">
              Your report has been securely registered with Campus Administration and routed to the assigned review desk. You can monitor the resolution status under <strong>My Reports</strong>.
            </p>
            <div className="pt-2">
              <Button variant="default" size="default" onClick={handleClose}>
                Return to Campus Home
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Select */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] mb-1">
                Incident Category:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-white border-2 border-[#272B27] tech-shadow-sm text-sm text-[#272B27] focus:outline-none focus:ring-2 focus:ring-[#272B27] font-mono cursor-pointer"
              >
                {INCIDENT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} — {cat.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] mb-1">
                Detailed Description (Minimum 10 characters):
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide complete facts: date, time, location specifics, involved parties, or hazard details..."
                className="w-full h-28 p-3 bg-white border-2 border-[#272B27] tech-shadow-sm text-sm text-[#272B27] placeholder:text-[#5B6158]/60 focus:outline-none focus:ring-2 focus:ring-[#272B27] font-sans"
              />
            </div>

            {/* Location & Map Pin */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#272B27] mb-1">
                Incident Location & Campus Map Pin:
              </label>
              <CampusMap
                pin={pin}
                onPinChange={setPin}
                selectedLocationId={selectedLocation?.id}
                onSelectLocation={setSelectedLocation}
                heightClass="h-[240px]"
              />
            </div>

            {/* Photos Upload: Up to 2 Photos */}
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
              <p className="text-[11px] text-[#5B6158] font-mono mt-1">
                Evidence photos are securely encrypted and accessible only by Campus Administration and authorized team leads.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#272B27]/20">
              <span className="text-xs font-mono text-[#5B6158]">
                Standard Queue • No Siren Alarm
              </span>
              <Button
                variant="default"
                size="lg"
                disabled={description.trim().length < 10 || isSubmitting}
                className="w-full sm:w-auto uppercase tracking-wider"
              >
                {isSubmitting ? "Submitting..." : "Submit Incident Report"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
