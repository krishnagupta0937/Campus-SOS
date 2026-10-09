import React, { useRef } from 'react';
import { Camera, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface PhotoPickerProps {
  photos: File[];
  onChange: (photos: File[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  photos,
  onChange,
  maxPhotos = 2,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const availableSlots = maxPhotos - photos.length;

    if (selectedFiles.length > availableSlots) {
      setErrorMessage(`Cannot upload ${selectedFiles.length} photos. Maximum ${maxPhotos} photos allowed.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setErrorMessage(null);

    // Filter valid images under 10MB
    const validFiles = selectedFiles
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, availableSlots);

    onChange([...photos, ...validFiles]);

    // Reset input so re-selecting same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    setErrorMessage(null);
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  const isLimitReached = photos.length >= maxPhotos;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
          Photos / Evidence (Optional)
        </span>
        <span
          style={{
            fontSize: 'var(--text-caption)',
            color: isLimitReached ? 'var(--warning)' : 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          {photos.length} of {maxPhotos} photos attached
        </span>
      </div>

      {/* Thumbnails & Add Button Grid */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {photos.map((photo, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              width: '96px',
              height: '96px',
              borderRadius: 'var(--radius-control)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-2)',
            }}
          >
            <img
              src={URL.createObjectURL(photo)}
              alt={`Evidence thumbnail ${idx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              title="Remove photo"
              aria-label={`Remove photo ${idx + 1}`}
              disabled={disabled}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'rgba(0,0,0,0.65)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Add photo trigger button */}
        {!isLimitReached && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            style={{
              width: '96px',
              height: '96px',
              borderRadius: 'var(--radius-control)',
              border: '2px dashed var(--border-strong)',
              backgroundColor: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: 'var(--text-muted)',
              transition: 'border-color var(--transition-fast)',
            }}
          >
            <Camera size={24} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Add Photo</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={disabled || isLimitReached}
      />

      {errorMessage && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 'var(--text-caption)',
            color: 'var(--emergency)',
            backgroundColor: 'var(--emergency-soft)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--emergency-border)',
            marginTop: '4px',
          }}
        >
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLimitReached && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 'var(--text-caption)',
            color: 'var(--text-muted)',
            marginTop: '4px',
          }}
        >
          <AlertCircle size={14} />
          <span>Maximum photo limit of 2 reached. Remove one to replace.</span>
        </div>
      )}
    </div>
  );
};
