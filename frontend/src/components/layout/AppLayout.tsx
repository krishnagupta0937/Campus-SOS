import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopHeader } from './TopHeader';
import { StudentBottomNav } from './StudentBottomNav';
import { StaffSidebar } from './StaffSidebar';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { DispatchOfferModal } from '../emergency/DispatchOfferModal';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const { incomingOffer, clearIncomingOffer } = useRealtime();

  const isStudent = !user || user.role === 'STUDENT';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg)',
        overflowX: 'hidden',
      }}
    >
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <TopHeader />

      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          overflowX: 'hidden',
        }}
      >
        {!isStudent && <StaffSidebar />}

        <main
          id="main-content"
          style={{
            flex: 1,
            width: '100%',
            paddingBottom: isStudent ? '80px' : '32px', // space for bottom nav on mobile
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </main>
      </div>

      {isStudent && <StudentBottomNav />}

      {/* Realtime 45s Dispatch Offer Interrupt Modal for on-duty responders */}
      {incomingOffer && (
        <DispatchOfferModal
          offer={incomingOffer}
          onClose={clearIncomingOffer}
        />
      )}
    </div>
  );
};
