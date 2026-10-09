import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { CampusMap } from '../../components/map/CampusMap';
import { PhotoPicker } from '../../components/upload/PhotoPicker';
import { incidentService } from '../../services/incidentService';
import { mapService } from '../../services/mapService';
import { attachmentService } from '../../services/attachmentService';
import type { PinCoordinates, PredefinedLocation } from '../../types';
import { AlertTriangle, MapPin, Send, CheckCircle2 } from 'lucide-react';

const CATEGORIES = [
  'Infrastructure & Maintenance',
  'Electrical & Power Fault',
  'Water & Plumbing Issue',
  'Lost & Found / Theft',
  'Traffic & Parking Obstruction',
  'Noise & Public Disturbance',
  'Disciplinary Dispute',
  'Digital & Account Issue',
  'General Campus Concern',
];

export const ReportIncident: React.FC = () => {
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedPin, setSelectedPin] = useState<PinCoordinates | null>(null);
  const [predefinedLocations, setPredefinedLocations] = useState<PredefinedLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [locationText, setLocationText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    mapService.getPredefinedLocations().then((locs) => {
      setPredefinedLocations(locs || []);
    }).catch(() => {});
  }, []);

  const handleLocationSelect = (locId: string) => {
    setSelectedLocationId(locId);
    const found = predefinedLocations.find((l) => l.id === locId);
    if (found && found.anchorX !== null && found.anchorY !== null) {
      setSelectedPin({ x: found.anchorX, y: found.anchorY });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setErrorMessage('Description must be at least 10 characters long.');
      return;
    }

    if (!selectedPin) {
      setErrorMessage('Please place a location pin on the campus map so staff can find the issue.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Upload photos if any
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

      // 2. Submit report with Idempotency-Key
      const idempotencyKey = crypto.randomUUID();
      const res = await incidentService.createStandardReport(
        {
          description: description.trim(),
          category,
          location: {
            predefined_location_id: selectedLocationId || undefined,
            kind: 'CAMPUS',
            text: locationText || undefined,
          },
          pin: selectedPin,
          attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
        },
        idempotencyKey
      );

      setSuccessId(res.incident.public_id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report. Please check fields and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div className="content-wrap" style={{ maxWidth: '540px', margin: '40px auto', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '36px 24px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <CheckCircle2 size={48} color="var(--success)" style={{ marginBottom: '16px' }} />
          <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 700, marginBottom: '8px' }}>
            Incident Report Submitted
          </h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Your report has been logged under reference number <strong>{successId}</strong>.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => navigate('/student/my-reports')}>
              View My Reports
            </Button>
            <Button variant="secondary" onClick={() => navigate('/student')}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrap" style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Switch to Emergency SOS Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--warning-soft)',
          border: '1px solid var(--warning)',
          borderRadius: 'var(--radius-control)',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--warning)" />
          <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
            Is this an urgent or active danger happening right now?
          </span>
        </div>
        <Link
          to="/student/sos"
          style={{
            color: 'var(--emergency)',
            fontWeight: 700,
            fontSize: 'var(--text-body-sm)',
            textDecoration: 'underline',
          }}
        >
          Switch to Emergency SOS
        </Link>
      </div>

      <div>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>
          Report a Non-Emergency Incident
        </h1>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          For non-immediate campus concerns, facilities, complaints, and general issues.
        </p>
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
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Category */}
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <label htmlFor="category-select" style={{ display: 'block', fontSize: 'var(--text-h3)', fontWeight: 600, marginBottom: '8px' }}>
            Category
          </label>
          <select
            id="category-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <label htmlFor="incident-desc" style={{ display: 'block', fontSize: 'var(--text-h3)', fontWeight: 600, marginBottom: '6px' }}>
            Incident Description <span style={{ color: 'var(--emergency)' }}>*</span>
          </label>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Provide complete details (minimum 10 characters).
          </p>
          <textarea
            id="incident-desc"
            rows={4}
            placeholder="Describe what occurred, any damages observed, or assistance needed..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Location & Map Pin */}
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <MapPin size={18} color="var(--brand)" />
            <span style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Location (Required)</span>
          </div>

          {predefinedLocations.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="predef-loc" style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 600, marginBottom: '4px' }}>
                Predefined Area:
              </label>
              <select
                id="predef-loc"
                value={selectedLocationId}
                onChange={(e) => handleLocationSelect(e.target.value)}
              >
                <option value="">-- Select Predefined Location --</option>
                {predefinedLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label htmlFor="room-spec" style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 600, marginBottom: '4px' }}>
              Specific Room / Location Details:
            </label>
            <input
              id="room-spec"
              type="text"
              placeholder="e.g. Corridor 2B, near water dispenser"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
            />
          </div>

          <div>
            <span style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 600, marginBottom: '6px' }}>
              Place exact pin on campus map: <span style={{ color: 'var(--emergency)' }}>*</span>
            </span>
            <CampusMap
              interactive
              selectedPin={selectedPin}
              onPinSelect={(p) => setSelectedPin(p)}
              height="260px"
            />
          </div>
        </div>

        {/* Photos (Max 2) */}
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <PhotoPicker
            photos={photos}
            onChange={(p) => setPhotos(p)}
            maxPhotos={2}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          leftIcon={<Send size={18} />}
        >
          Submit Report
        </Button>
      </form>
    </div>
  );
};
