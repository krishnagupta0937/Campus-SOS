import React, { createContext, useContext, useState, useEffect } from 'react';
import { realtime } from '../realtime/socket';

interface RealtimeContextType {
  isConnected: boolean;
  incomingOffer: any | null;
  clearIncomingOffer: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(realtime.isConnected());
  const [incomingOffer, setIncomingOffer] = useState<any | null>(null);

  useEffect(() => {
    const unsubStatus = realtime.onStatusChange((status) => {
      setIsConnected(status);
    });

    const unsubOffer = realtime.onDispatchOffer((offer) => {
      setIncomingOffer(offer);
    });

    return () => {
      unsubStatus();
      unsubOffer();
    };
  }, []);

  const clearIncomingOffer = () => {
    setIncomingOffer(null);
  };

  return (
    <RealtimeContext.Provider value={{ isConnected, incomingOffer, clearIncomingOffer }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
