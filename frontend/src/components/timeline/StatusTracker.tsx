import React from 'react';
import { Check, Circle } from 'lucide-react';
import type { SosStepStatus } from '../../types';

interface StatusTrackerProps {
  steps: SosStepStatus[];
  currentStatus: string;
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({ steps }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0px',
        padding: '16px 0',
      }}
      aria-label="Emergency Response Progress"
      aria-live="polite"
    >
      {steps.map((step, idx) => {
        const isDone = step.done;
        const isNext = !isDone && (idx === 0 || steps[idx - 1].done);
        const isLast = idx === steps.length - 1;

        return (
          <div
            key={step.key}
            style={{
              display: 'flex',
              gap: '16px',
              position: 'relative',
            }}
          >
            {/* Step Indicator & Vertical Line */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '28px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDone
                    ? 'var(--success)'
                    : isNext
                    ? 'var(--brand)'
                    : 'var(--surface-2)',
                  color: isDone || isNext ? 'white' : 'var(--text-muted)',
                  border: isDone || isNext ? 'none' : '1px solid var(--border)',
                  zIndex: 2,
                }}
              >
                {isDone ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  <Circle size={8} fill={isNext ? 'currentColor' : 'none'} />
                )}
              </div>

              {!isLast && (
                <div
                  style={{
                    width: '2px',
                    flexGrow: 1,
                    minHeight: '28px',
                    backgroundColor: isDone ? 'var(--success)' : 'var(--border)',
                    margin: '4px 0',
                  }}
                />
              )}
            </div>

            {/* Step Label & Timestamp */}
            <div
              style={{
                paddingBottom: isLast ? '0px' : '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-body)',
                  fontWeight: isNext || isDone ? 600 : 400,
                  color: isNext || isDone ? 'var(--text)' : 'var(--text-muted)',
                }}
              >
                {step.label}
              </span>
              {step.at && (
                <span
                  style={{
                    fontSize: 'var(--text-caption)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {new Date(step.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
