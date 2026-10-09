import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';

class RealtimeClient {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private statusListeners = new Set<(connected: boolean) => void>();

  public connect(): Socket | null {
    const token = api.getToken();
    if (!token) {
      this.disconnect();
      return null;
    }

    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    // Connect to /rt namespace
    this.socket = io('/rt', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.notifyStatus(true);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.notifyStatus(false);
    });

    this.socket.on('connect_error', () => {
      this.connected = false;
      this.notifyStatus(false);
    });

    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.notifyStatus(false);
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public onStatusChange(listener: (connected: boolean) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.connected);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((l) => l(connected));
  }

  public subscribeIncident(incidentId: string, onUpdate: (data: any) => void): () => void {
    const s = this.connect();
    if (s) {
      s.emit('subscribe:incident', { incident_id: incidentId });
      const handler = (data: any) => {
        if (data.incident_id === incidentId) {
          onUpdate(data);
        }
      };
      s.on('incident:status_update', handler);

      return () => {
        s.emit('unsubscribe:incident', { incident_id: incidentId });
        s.off('incident:status_update', handler);
      };
    }
    return () => {};
  }

  public onDispatchOffer(onOffer: (data: any) => void): () => void {
    const s = this.connect();
    if (s) {
      s.on('dispatch:offer', onOffer);
      return () => {
        s.off('dispatch:offer', onOffer);
      };
    }
    return () => {};
  }

  public onNotification(onNotify: (data: any) => void): () => void {
    const s = this.connect();
    if (s) {
      s.on('notification:new', onNotify);
      return () => {
        s.off('notification:new', onNotify);
      };
    }
    return () => {};
  }

  public onNoticePublished(onNotice: (data: any) => void): () => void {
    const s = this.connect();
    if (s) {
      s.on('notice:published', onNotice);
      return () => {
        s.off('notice:published', onNotice);
      };
    }
    return () => {};
  }
}

export const realtime = new RealtimeClient();
