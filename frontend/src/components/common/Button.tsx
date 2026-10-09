import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'destructive' | 'sos';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  style,
  ...props
}) => {
  // Styles aligned with Calm Authority
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'sos':
        return {
          backgroundColor: 'var(--emergency)',
          color: 'var(--emergency-contrast)',
          border: '1px solid var(--emergency)',
          fontWeight: 700,
          letterSpacing: '0.02em',
          boxShadow: 'var(--shadow-card)',
        };
      case 'destructive':
        return {
          backgroundColor: 'var(--surface)',
          color: 'var(--emergency)',
          border: '1px solid var(--emergency-border)',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--surface-2)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
        };
      case 'quiet':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-muted)',
          border: '1px solid transparent',
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--brand)',
          color: 'var(--brand-contrast)',
          border: '1px solid var(--brand)',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 12px',
          fontSize: 'var(--text-body-sm)',
          minHeight: '34px',
        };
      case 'lg':
        return {
          padding: '12px 24px',
          fontSize: 'var(--text-h3)',
          minHeight: '48px',
        };
      case 'xl':
        return {
          padding: '18px 28px',
          fontSize: 'var(--text-h2)',
          minHeight: '64px',
        };
      case 'md':
      default:
        return {
          padding: '10px 18px',
          fontSize: 'var(--text-body)',
          minHeight: '42px',
        };
    }
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: 'var(--radius-control)',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
    width: fullWidth ? '100%' : 'auto',
    textDecoration: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontWeight: 600,
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <button
      disabled={disabled || isLoading}
      style={baseStyle}
      className={`sos-button ${className}`}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            width: '18px',
            height: '18px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
