import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRealtime } from '../../context/RealtimeContext';
import {
  ShieldAlert,
  Moon,
  Sun,
  LogOut,
  PhoneCall,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const TopHeader: React.FC = () => {
  const { user, logout, activeRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useRealtime();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-4)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--text)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--brand)',
              color: 'white',
              padding: '6px',
              borderRadius: 'var(--radius-control)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '17px', letterSpacing: '-0.02em' }}>
              CAMPUS SOS
            </span>
          </div>
        </Link>

        {/* Realtime Telemetry Indicator */}
        <span
          title={isConnected ? 'Telemetry Connected' : 'Telemetry Reconnecting...'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: isConnected ? 'var(--success)' : 'var(--warning)',
            backgroundColor: isConnected ? 'var(--success-soft)' : 'var(--warning-soft)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-pill)',
            marginLeft: '6px',
            fontWeight: 500,
          }}
        >
          {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span style={{ display: 'none' }}>Live</span>
        </span>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Hotline link */}
        <Link
          to="/contacts"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--surface-2)',
            color: 'var(--text)',
            fontSize: 'var(--text-caption)',
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid var(--border)',
          }}
        >
          <PhoneCall size={13} color="var(--brand)" />
          <span style={{ display: 'inline' }}>Hotlines</span>
        </Link>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle Theme"
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            padding: '7px',
            cursor: 'pointer',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--surface)',
          }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Active Role and User Menu */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'var(--brand-soft)',
                color: 'var(--brand)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-pill)',
                textTransform: 'uppercase',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={activeRole || 'USER'}
            >
              {activeRole?.replace(/_/g, ' ')}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-control)',
                padding: '7px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--surface)',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link
            to="/auth/login"
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--brand)',
              color: 'var(--brand-contrast)',
              borderRadius: 'var(--radius-control)',
              fontWeight: 600,
              fontSize: 'var(--text-body-sm)',
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
