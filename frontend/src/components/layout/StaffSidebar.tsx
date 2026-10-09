import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  Users2,
  UserCheck,
  BookOpen,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  Shield,
  Stethoscope,
  Flame,
  Lock,
  HeartHandshake,
  Wrench,
  Car,
  Laptop,
} from 'lucide-react';

export const StaffSidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const getNavLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    borderRadius: 'var(--radius-control)',
    color: isActive ? 'var(--brand)' : 'var(--text)',
    backgroundColor: isActive ? 'var(--brand-soft)' : 'transparent',
    fontWeight: isActive ? 600 : 500,
    fontSize: 'var(--text-body-sm)',
    textDecoration: 'none',
    transition: 'background-color var(--transition-fast)',
  });

  const renderNavLinks = () => {
    switch (role) {
      case 'CAMPUS_ADMIN':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Command Center
            </div>
            <NavLink to="/admin" end style={getNavLinkStyle}>
              <LayoutDashboard size={18} /> Overview
            </NavLink>
            <NavLink to="/admin/incidents" style={getNavLinkStyle}>
              <AlertTriangle size={18} /> Incident Management
            </NavLink>
            <NavLink to="/admin/dispatch" style={getNavLinkStyle}>
              <Shield size={18} /> Live Dispatch
            </NavLink>
            <NavLink to="/admin/map" style={getNavLinkStyle}>
              <Map size={18} /> Campus Map
            </NavLink>
            <NavLink to="/admin/teams" style={getNavLinkStyle}>
              <Users2 size={18} /> Teams
            </NavLink>
            <NavLink to="/admin/responders" style={getNavLinkStyle}>
              <UserCheck size={18} /> Responders
            </NavLink>
            <NavLink to="/admin/directory" style={getNavLinkStyle}>
              <BookOpen size={18} /> Directory
            </NavLink>
            <NavLink to="/admin/analytics" style={getNavLinkStyle}>
              <BarChart3 size={18} /> Analytics & SLA
            </NavLink>
            <NavLink to="/admin/notices" style={getNavLinkStyle}>
              <Bell size={18} /> Broadcast Gate
            </NavLink>
            <NavLink to="/admin/audit" style={getNavLinkStyle}>
              <ShieldCheck size={18} /> SHA-256 Audit
            </NavLink>
            <NavLink to="/admin/settings" style={getNavLinkStyle}>
              <Settings size={18} /> Settings
            </NavLink>
          </>
        );

      case 'CHIEF_PROCTOR':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Proctor Workspace
            </div>
            <NavLink to="/portal/chief-proctor" style={getNavLinkStyle}>
              <ShieldCheck size={18} /> Conduct Cases
            </NavLink>
            <NavLink to="/admin/directory" style={getNavLinkStyle}>
              <BookOpen size={18} /> Directory
            </NavLink>
          </>
        );

      case 'SECURITY':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Security Command
            </div>
            <NavLink to="/portal/security" style={getNavLinkStyle}>
              <Shield size={18} /> Live Alerts & Patrol
            </NavLink>
            <NavLink to="/responder" style={getNavLinkStyle}>
              <UserCheck size={18} /> My Duty & Dispatch
            </NavLink>
          </>
        );

      case 'MEDICAL':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Medical Services
            </div>
            <NavLink to="/portal/medical" style={getNavLinkStyle}>
              <Stethoscope size={18} /> Medical Emergencies
            </NavLink>
            <NavLink to="/responder" style={getNavLinkStyle}>
              <UserCheck size={18} /> My Duty & Dispatch
            </NavLink>
          </>
        );

      case 'FIRE_SAFETY':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Fire & Safety
            </div>
            <NavLink to="/portal/fire-safety" style={getNavLinkStyle}>
              <Flame size={18} /> Hazard Cases
            </NavLink>
            <NavLink to="/responder" style={getNavLinkStyle}>
              <UserCheck size={18} /> My Duty & Dispatch
            </NavLink>
          </>
        );

      case 'WOMEN_SAFETY':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Women Safety Cell
            </div>
            <NavLink to="/portal/women-safety" style={getNavLinkStyle}>
              <Lock size={18} /> Restricted Cases
            </NavLink>
            <NavLink to="/responder" style={getNavLinkStyle}>
              <UserCheck size={18} /> Duty & Response
            </NavLink>
          </>
        );

      case 'MEN_SAFETY':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Men Safety Cell
            </div>
            <NavLink to="/portal/men-safety" style={getNavLinkStyle}>
              <Lock size={18} /> Restricted Cases
            </NavLink>
            <NavLink to="/responder" style={getNavLinkStyle}>
              <UserCheck size={18} /> Duty & Response
            </NavLink>
          </>
        );

      case 'STUDENT_COUNCIL':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Student Council
            </div>
            <NavLink to="/portal/student-council" style={getNavLinkStyle}>
              <HeartHandshake size={18} /> Grievances & Welfare
            </NavLink>
          </>
        );

      case 'INFRASTRUCTURE':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Facilities & Works
            </div>
            <NavLink to="/portal/infrastructure" style={getNavLinkStyle}>
              <Wrench size={18} /> Work Orders & Leaks
            </NavLink>
            <NavLink to="/responder" style={getNavLinkStyle}>
              <UserCheck size={18} /> My Duty
            </NavLink>
          </>
        );

      case 'TRANSPORTATION':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              Transportation
            </div>
            <NavLink to="/portal/transportation" style={getNavLinkStyle}>
              <Car size={18} /> Route & Traffic
            </NavLink>
            <NavLink to="/responder" style={getNavLinkStyle}>
              <UserCheck size={18} /> My Duty
            </NavLink>
          </>
        );

      case 'IT_DIGITAL':
        return (
          <>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 12px 4px' }}>
              IT / Cyber Safety
            </div>
            <NavLink to="/portal/digital-safety" style={getNavLinkStyle}>
              <Laptop size={18} /> Digital Cases
            </NavLink>
          </>
        );

      default:
        return (
          <NavLink to="/responder" style={getNavLinkStyle}>
            <UserCheck size={18} /> Responder Console
          </NavLink>
        );
    }
  };

  return (
    <aside
      aria-label="Staff navigation sidebar"
      style={{
        width: '240px',
        flexShrink: 0,
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        minHeight: 'calc(100vh - 60px)',
        padding: '16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      {renderNavLinks()}
    </aside>
  );
};
