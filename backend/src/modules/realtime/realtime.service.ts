import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Service for broadcasting real-time events to connected clients.
 * Used by other modules (incidents, dispatch, notifications) to push updates.
 * ARCHITECTURE.md §11
 */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  /**
   * Broadcast incident status update to all subscribers.
   * Sent to: incident:{id} channel
   */
  emitIncidentStatusUpdate(incidentId: string, data: {
    status: string;
    label: string;
    timestamp: string;
    details?: any;
  }) {
    this.gateway.server
      .to(`incident:${incidentId}`)
      .emit('incident:status_update', {
        incident_id: incidentId,
        ...data,
      });
  }

  /**
   * Broadcast new assignment offer to a responder.
   * Sent to: user:{userId} channel
   */
  emitDispatchOffer(userId: string, data: {
    assignment_id: string;
    incident_id: string;
    incident_summary: string;
    team_code: string;
    timeout_seconds: number;
    expires_at: string;
  }) {
    this.gateway.server
      .to(`user:${userId}`)
      .emit('dispatch:offer', data);
  }

  /**
   * Broadcast responder status change to the team and admin.
   * Sent to: team:{teamId} + admin:dispatch
   */
  emitResponderUpdate(teamId: string, data: {
    assignment_id: string;
    incident_id: string;
    member_name: string;
    status: string;
    timestamp: string;
  }) {
    this.gateway.server
      .to(`team:${teamId}`)
      .to('admin:dispatch')
      .emit('dispatch:responder_update', data);
  }

  /**
   * Broadcast new incident to relevant team channels and admin.
   * Sent to: team:{teamId}[] + admin:incidents
   */
  emitNewIncident(teamIds: string[], data: {
    incident_id: string;
    public_id: string;
    workflow: string;
    category: string;
    description_preview: string;
    status: string;
    is_restricted: boolean;
    created_at: string;
  }) {
    for (const teamId of teamIds) {
      this.gateway.server
        .to(`team:${teamId}`)
        .emit('incident:new', data);
    }

    // Always notify admin channel
    this.gateway.server
      .to('admin:incidents')
      .emit('incident:new', data);
  }

  /**
   * Send a personal notification to a specific user.
   * Sent to: user:{userId} channel
   */
  emitNotification(userId: string, data: {
    notification_id: string;
    title: string;
    body: string;
    incident_id?: string;
    audience_type: string;
    created_at: string;
  }) {
    this.gateway.server
      .to(`user:${userId}`)
      .emit('notification:new', data);
  }

  /**
   * Broadcast campus-wide notice.
   * Sent to all connected clients via a broadcast.
   */
  emitCampusNotice(data: {
    notice_id: string;
    title: string;
    body: string;
    area_text?: string;
    category?: string;
  }) {
    this.gateway.server.emit('notice:published', data);
  }

  /**
   * Check if a user is currently connected.
   */
  isUserOnline(userId: string): boolean {
    return this.gateway.isUserOnline(userId);
  }
}
