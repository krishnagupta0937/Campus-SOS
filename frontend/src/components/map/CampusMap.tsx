import React, { useRef, useState } from 'react';
import type { PinCoordinates } from '../../types';
import { MapPin, Navigation, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export interface MapIncidentPin {
  id: string;
  x: number; // [0, 1]
  y: number; // [0, 1]
  type?: 'emergency' | 'standard' | 'responder';
  label?: string;
  category?: string;
}

interface CampusMapProps {
  interactive?: boolean;
  selectedPin?: PinCoordinates | null;
  onPinSelect?: (pin: PinCoordinates) => void;
  pins?: MapIncidentPin[];
  onPinClick?: (pin: MapIncidentPin) => void;
  height?: string | number;
  mapImageUrl?: string;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  interactive = false,
  selectedPin = null,
  onPinSelect,
  pins = [],
  onPinClick,
  height = '360px',
  mapImageUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normalizedX = Math.max(0, Math.min(1, Number((clickX / rect.width).toFixed(4))));
    const normalizedY = Math.max(0, Math.min(1, Number((clickY / rect.height).toFixed(4))));

    if (onPinSelect) {
      onPinSelect({ x: normalizedX, y: normalizedY });
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: 'var(--surface-2)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Interactive Controls Bar */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 20,
          display: 'flex',
          gap: '6px',
          backgroundColor: 'var(--surface)',
          padding: '4px',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
          title="Zoom In"
          aria-label="Zoom In"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--text)',
            borderRadius: '4px',
          }}
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
          title="Zoom Out"
          aria-label="Zoom Out"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--text)',
            borderRadius: '4px',
          }}
        >
          <ZoomOut size={18} />
        </button>
        <button
          type="button"
          onClick={resetView}
          title="Reset View"
          aria-label="Reset View"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--text)',
            borderRadius: '4px',
          }}
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {interactive && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            zIndex: 20,
            backgroundColor: 'var(--surface)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border)',
            fontSize: 'var(--text-caption)',
            fontWeight: 500,
            color: 'var(--text-muted)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {selectedPin
            ? `Pin placed: ${(selectedPin.x * 100).toFixed(1)}% X, ${(selectedPin.y * 100).toFixed(1)}% Y`
            : 'Tap anywhere to drop exact location pin'}
        </div>
      )}

      {/* Campus Map Container */}
      <div
        ref={containerRef}
        onClick={handleMapClick}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: interactive ? 'crosshair' : 'default',
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {mapImageUrl ? (
          <img
            src={mapImageUrl}
            alt="Campus Map Floorplan"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          /* High-fidelity stylized SVG architectural vector grid representing campus zones */
          <svg
            viewBox="0 0 1000 700"
            style={{ width: '100%', height: '100%', display: 'block' }}
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border)" strokeWidth="0.5" opacity="0.6" />
              </pattern>
            </defs>
            <rect width="1000" height="700" fill="var(--bg)" />
            <rect width="1000" height="700" fill="url(#grid)" />

            {/* Campus Boundary & Perimeter Roads */}
            <path
              d="M 60 60 L 940 60 L 940 640 L 60 640 Z"
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />

            {/* Campus Pathways & Internal Avenues */}
            <path d="M 60 350 L 940 350" stroke="var(--border)" strokeWidth="12" />
            <path d="M 500 60 L 500 640" stroke="var(--border)" strokeWidth="12" />
            <circle cx="500" cy="350" r="45" fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth="2" />

            {/* Academic Block A (North West) */}
            <rect x="120" y="100" width="180" height="120" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
            <text x="210" y="165" textAnchor="middle" fill="var(--text-muted)" fontSize="14" fontWeight="600">Block A (Academic)</text>

            {/* Science & Tech Laboratories (North East) */}
            <rect x="700" y="100" width="180" height="120" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
            <text x="790" y="165" textAnchor="middle" fill="var(--text-muted)" fontSize="14" fontWeight="600">Laboratories</text>

            {/* Central Library & Administrative Hub (Center) */}
            <rect x="420" y="180" width="160" height="100" rx="6" fill="var(--brand-soft)" stroke="var(--brand-border)" strokeWidth="1.5" />
            <text x="500" y="235" textAnchor="middle" fill="var(--brand)" fontSize="14" fontWeight="600">Admin & Library</text>

            {/* Auditorium & Student Welfare (East) */}
            <rect x="700" y="440" width="180" height="140" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
            <text x="790" y="515" textAnchor="middle" fill="var(--text-muted)" fontSize="14" fontWeight="600">Auditorium & Canteen</text>

            {/* Hostels & Residential Block (South West) */}
            <rect x="120" y="440" width="180" height="140" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="1.5" />
            <text x="210" y="515" textAnchor="middle" fill="var(--text-muted)" fontSize="14" fontWeight="600">Student Hostels</text>

            {/* Sports Grounds & Parking (South Center) */}
            <rect x="380" y="460" width="240" height="120" rx="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
            <text x="500" y="525" textAnchor="middle" fill="var(--text-muted)" fontSize="13" fontWeight="500">Sports Complex & Grounds</text>
          </svg>
        )}

        {/* Selected Interactive Pin (Single) */}
        {selectedPin && (
          <div
            style={{
              position: 'absolute',
              left: `${selectedPin.x * 100}%`,
              top: `${selectedPin.y * 100}%`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 30,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--emergency)',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin size={22} fill="white" />
              </div>
              <div
                style={{
                  width: '4px',
                  height: '6px',
                  backgroundColor: 'var(--emergency)',
                }}
              />
            </div>
          </div>
        )}

        {/* Incident Pins (Multiple from backend) */}
        {pins.map((pin) => {
          const isEmergency = pin.type === 'emergency';
          return (
            <div
              key={pin.id}
              onClick={(e) => {
                e.stopPropagation();
                if (onPinClick) onPinClick(pin);
              }}
              style={{
                position: 'absolute',
                left: `${pin.x * 100}%`,
                top: `${pin.y * 100}%`,
                transform: 'translate(-50%, -100%)',
                cursor: onPinClick ? 'pointer' : 'default',
                zIndex: isEmergency ? 25 : 22,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                }}
              >
                <div
                  style={{
                    backgroundColor: isEmergency ? 'var(--emergency)' : 'var(--brand)',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={pin.label || pin.category || 'Incident'}
                >
                  {pin.type === 'responder' ? (
                    <Navigation size={16} fill="white" />
                  ) : (
                    <MapPin size={18} fill="white" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
