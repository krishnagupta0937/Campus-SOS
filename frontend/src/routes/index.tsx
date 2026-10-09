import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';

// Auth
import { Login } from './auth/Login';

// Student
import { StudentHome } from './student/StudentHome';
import { EmergencySos } from './student/EmergencySos';
import { SosConfirmation } from './student/SosConfirmation';
import { SosLiveTracking } from './student/SosLiveTracking';
import { ReportIncident } from './student/ReportIncident';
import { MyReports } from './student/MyReports';
import { ReportDetail } from './student/ReportDetail';
import { Explore } from './student/Explore';
import { Notifications } from './student/Notifications';
import { Contacts } from './student/Contacts';

// Admin
import { CommandCenter } from './admin/CommandCenter';
import { IncidentTable } from './admin/IncidentTable';
import { IncidentCaseDetail } from './admin/IncidentCaseDetail';
import { DispatchBoard } from './admin/DispatchBoard';
import { Directory } from './admin/Directory';
import { Analytics } from './admin/Analytics';
import { AuditTrail } from './admin/AuditTrail';
import { BroadcastGate } from './admin/BroadcastGate';
import { Settings } from './admin/Settings';

// Responder
import { ResponderConsole } from './responder/ResponderConsole';

// Role-specific Workspaces
import { RoleWorkspace } from './roles/RoleWorkspace';

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  // Root redirect based on role
  const getHomeElement = () => {
    if (!user || user.role === 'STUDENT') {
      return <StudentHome />;
    }
    if (user.role === 'CAMPUS_ADMIN') {
      return <CommandCenter />;
    }
    return <ResponderConsole />;
  };

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {/* Index */}
        <Route index element={getHomeElement()} />

        {/* Auth & Public */}
        <Route path="auth/login" element={<Login />} />
        <Route path="contacts" element={<Contacts />} />

        {/* Student Application */}
        <Route path="student" element={<StudentHome />} />
        <Route path="student/sos" element={<EmergencySos />} />
        <Route path="student/sos/:draftId/confirm" element={<SosConfirmation />} />
        <Route path="student/sos/:incidentId/live" element={<SosLiveTracking />} />
        <Route path="student/report" element={<ReportIncident />} />
        <Route path="student/my-reports" element={<MyReports />} />
        <Route path="student/reports/:id" element={<ReportDetail />} />
        <Route path="student/explore" element={<Explore />} />
        <Route path="student/notifications" element={<Notifications />} />
        <Route path="student/contacts" element={<Contacts />} />

        {/* Responder Console */}
        <Route path="responder" element={<ResponderConsole />} />

        {/* Admin Command Center */}
        <Route path="admin" element={<CommandCenter />} />
        <Route path="admin/incidents" element={<IncidentTable />} />
        <Route path="admin/incidents/:id" element={<IncidentCaseDetail />} />
        <Route path="admin/dispatch" element={<DispatchBoard />} />
        <Route path="admin/map" element={<Explore />} />
        <Route path="admin/teams" element={<Directory />} />
        <Route path="admin/responders" element={<Directory />} />
        <Route path="admin/directory" element={<Directory />} />
        <Route path="admin/analytics" element={<Analytics />} />
        <Route path="admin/audit" element={<AuditTrail />} />
        <Route path="admin/notices" element={<BroadcastGate />} />
        <Route path="admin/settings" element={<Settings />} />

        {/* Role-Specific Workspaces for all 12 roles */}
        <Route
          path="portal/chief-proctor"
          element={
            <RoleWorkspace
              forcedRole="CHIEF_PROCTOR"
              title="Chief Proctor Workspace"
              subtitle="Disciplinary, student-staff disputes, quarrels, and misconduct cases."
            />
          }
        />
        <Route
          path="portal/security"
          element={
            <RoleWorkspace
              forcedRole="SECURITY"
              title="Security & Area Control"
              subtitle="Physical security threats, unauthorized access, and patrol dispatch."
            />
          }
        />
        <Route
          path="portal/medical"
          element={
            <RoleWorkspace
              forcedRole="MEDICAL"
              title="Campus Medical & Clinic"
              subtitle="Medical distress, trauma, physical injuries, and clinic triage."
            />
          }
        />
        <Route
          path="portal/fire-safety"
          element={
            <RoleWorkspace
              forcedRole="FIRE_SAFETY"
              title="Fire & Physical Safety"
              subtitle="Active fire alarms, chemical hazard cases, and drill operations."
            />
          }
        />
        <Route
          path="portal/women-safety"
          element={
            <RoleWorkspace
              forcedRole="WOMEN_SAFETY"
              title="Women Safety Cell"
              subtitle="Confidential harassment, grievance, and protection caseload."
              isRestrictedQueue
            />
          }
        />
        <Route
          path="portal/men-safety"
          element={
            <RoleWorkspace
              forcedRole="MEN_SAFETY"
              title="Men Safety Cell"
              subtitle="Confidential harassment, welfare, and protection caseload."
              isRestrictedQueue
            />
          }
        />
        <Route
          path="portal/student-council"
          element={
            <RoleWorkspace
              forcedRole="STUDENT_COUNCIL"
              title="Student Council Workspace"
              subtitle="General student welfare, complaints, and campus amenities grievances."
            />
          }
        />
        <Route
          path="portal/infrastructure"
          element={
            <RoleWorkspace
              forcedRole="INFRASTRUCTURE"
              title="Facilities & Infrastructure"
              subtitle="Building maintenance, electrical faults, leaks, and physical repairs."
            />
          }
        />
        <Route
          path="portal/transportation"
          element={
            <RoleWorkspace
              forcedRole="TRANSPORTATION"
              title="Transportation & Routes"
              subtitle="Campus transit, blocked pathways, traffic obstruction, and parking control."
            />
          }
        />
        <Route
          path="portal/digital-safety"
          element={
            <RoleWorkspace
              forcedRole="IT_DIGITAL"
              title="IT & Digital Safety"
              subtitle="Cyber harassment, account compromises, digital security, and network breaches."
            />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
