import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, AlertCircle, FileText, Bell } from 'lucide-react';

export const StudentBottomNav: React.FC = () => {
  const getNavStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    color: isActive ? 'var(--brand)' : 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '11px',
    fontWeight: isActive ? 600 : 500,
    flex: 1,
    height: '100%',
    transition: 'color var(--transition-fast)',
  });

  return (
    <nav
      aria-label="Student primary navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        boxShadow: '0 -1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* 1. Home */}
      <NavLink to="/student" end style={({ isActive }) => getNavStyle(isActive)}>
        <Home size={20} />
        <span>Home</span>
      </NavLink>

      {/* 2. Explore */}
      <NavLink to="/student/explore" style={({ isActive }) => getNavStyle(isActive)}>
        <Compass size={20} />
        <span>Explore</span>
      </NavLink>

      {/* 3. Center SOS Button (Elevated Crimson Accent) */}
      <NavLink
        to="/student/sos"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '-18px',
          minWidth: '64px',
          minHeight: '72px',
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: 'var(--emergency)',
            color: 'var(--emergency-contrast)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(200, 16, 46, 0.4)',
            border: '3px solid var(--surface)',
          }}
        >
          <AlertCircle size={26} strokeWidth={2.5} />
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--emergency)',
            marginTop: '2px',
          }}
        >
          SOS
        </span>
      </NavLink>

      {/* 4. My Reports */}
      <NavLink to="/student/my-reports" style={({ isActive }) => getNavStyle(isActive)}>
        <FileText size={20} />
        <span>Reports</span>
      </NavLink>

      {/* 5. Notifications */}
      <NavLink to="/student/notifications" style={({ isActive }) => getNavStyle(isActive)}>
        <Bell size={20} />
        <span>Alerts</span>
      </NavLink>
    </nav>
  );
};
