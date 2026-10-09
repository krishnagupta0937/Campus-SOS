import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { CampusMap } from '../../components/map/CampusMap';
import { PhotoPicker } from '../../components/upload/PhotoPicker';
import { sosService } from '../../services/sosService';
import { mapService } from '../../services/mapService';
import { attachmentService } from '../../services/attachmentService';
import type { PinCoordinates, PredefinedLocation } from '../../types';
import { AlertCircle, MapPin, ArrowRight } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Fire / Smoke', text: 'Active fire/smoke observed on campus.' },
  { label: 'Medical / Injury', text: 'Severe injury or medical distress requiring immediate assistance.' },
  { label: 'Physical Fight', text: 'Altercation / fight in progress endangering students.' },
  { label: 'Blocked Route', text: 'Critical route / building exit blocked creating immediate hazard.' },
  { label: 'Suspicious Activity', text: 'Suspicious person / imminent security threat observed.' },
  { label: 'Other Emergency', text: 'Major emergency requiring urgent dispatch.' },
];

export const EmergencySos: React.FC = () => {
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [selectedPin, setSelectedPin] = useState<PinCoordinates | null>(null);
  const [predefinedLocations, setPredefinedLocations] = useState<PredefinedLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [locationText, setLocationText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    mapService.getPredefinedLocations().then((locs) => {
      setPredefinedLocations(locs || []);
    }).catch(() => {});
  }, []);

  const handleQuickAction = (text: string) => {
    // ONLY prefills description text. Does NOT set urgency or bypass confirmation.
    setDescription((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const handleLocationSelect = (locId: string) => {
    setSelectedLocationId(locId);
    const found = predefinedLocations.find((l) => l.id === locId);
    if (found && found.anchorX !== null && found.anchorY !== null) {
      setSelectedPin({ x: found.anchorX, y: found.anchorY });
    }
  };

  const handleContinueToConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('Please describe the emergency so the response team can prepare.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. If photos attached, upload them first via presigned URLs
      const attachmentIds: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const presigned = await attachmentService.requestUpload({
          mime_type: file.type,
          size_bytes: file.size,
          position: i + 1,
        });
        await attachmentService.uploadBinary(presigned.upload_url, file);
        await attachmentService.completeUpload(presigned.attachment_id);
        attachmentIds.push(presigned.attachment_id);
      }

      // 2. Create SOS Draft for staging (DOES NOT DISPATCH OR ALERT TEAMS)
      const draftRes = await sosService.createDraft({
        description: description.trim(),
        location: {
          predefined_location_id: selectedLocationId || undefined,
          text: locationText || undefined,
        },
        pin: selectedPin || undefined,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      // 3. Staging complete, forward to explicit confirmation gate
      navigate(`/student/sos/${draftRes.draft_id}/confirm`, {
        state: {
          description,
          pin: selectedPin,
          locationName: predefinedLocations.find((l) => l.id === selectedLocationId)?.name || locationText,
          photoCount: photos.length,
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to prepare emergency request. Please try again or use the hotline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--emergency-soft)',
          border: '1px solid var(--emergency-border)',
          borderRadius: 'var(--radius-control)',
          padding: '12px 16px',
          color: 'var(--emergency)',
        }}
      >
        <AlertCircle size={20} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
          Emergency SOS Assist — Teams will only be dispatched after explicit confirmation.
        </span>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--emergency-soft)',
            color: 'var(--emergency)',
            padding: '12px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--emergency-border)',
            fontSize: 'var(--text-body-sm)',
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleContinueToConfirmation} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Step 1: Emergency Assist — What happened? */}
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <label htmlFor="sos-desc" style={{ display: 'block', fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: '6px' }}>
            What is happening? <span style={{ color: 'var(--emergency)' }}>*</span>
          </label>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Describe the situation briefly so the appropriate team can be notified.
          </p>

          {/* Quick-action prefill buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                type="button"
                onClick={() => handleQuickAction(qa.text)}
                style={{
                  fontSize: 'var(--text-caption)',
                  fontWeight: 600,
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  color: 'var(--text)',
                }}
              >
                + {qa.label}
              </button>
            ))}
          </div>

          <textarea
            id="sos-desc"
            rows={4}
            placeholder="Tell us what's happening (e.g. fire on second floor laboratory, person injured)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Step 2: Location & Map Pin */}
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <MapPin size={20} color="var(--brand)" />
            <span style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>
              Campus Location & Map Pin
            </span>
          </div>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Select a predefined location or tap the map to place an exact pin.
          </p>

          {/* Predefined locations */}
          {predefinedLocations.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="location-select" style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 600, marginBottom: '6px' }}>
                Predefined Location:
              </label>
              <select
                id="location-select"
                value={selectedLocationId}
                onChange={(e) => handleLocationSelect(e.target.value)}
              >
                <option value="">-- Choose Predefined Area --</option>
                {predefinedLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.kind})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="location-text" style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 600, marginBottom: '6px' }}>
              Specific Room / Landmark Details:
            </label>
            <input
              id="location-text"
              type="text"
              placeholder="e.g. Room 204, near main staircase"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
            />
          </div>

          {/* Interactive Campus Map Pin Picker */}
          <div style={{ marginTop: '12px' }}>
            <span style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 600, marginBottom: '6px' }}>
              Tap map to drop pin:
            </span>
            <CampusMap
              interactive
              selectedPin={selectedPin}
              onPinSelect={(pin) => setSelectedPin(pin)}
              height="280px"
            />
          </div>
        </div>

        {/* Step 3: Photos (Max 2) */}
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <PhotoPicker
            photos={photos}
            onChange={(p) => setPhotos(p)}
            maxPhotos={2}
          />
        </div>

        {/* Submit to Confirmation Screen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            rightIcon={<ArrowRight size={18} />}
          >
            Review & Confirm Emergency
          </Button>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', textAlign: 'center' }}>
            You will review the routing preview before the emergency is officially created.
          </span>
        </div>
      </form>
    </div>
  );
};
