import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Optional, Inject } from '@nestjs/common';
import { AccessPolicyService } from '../access-policy/access-policy.service';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

/**
 * Socket.IO WebSocket gateway for real-time incident updates.
 * ARCHITECTURE.md §11, CLAUDE_BACKEND_HANDOFF.md §16
 *
 * Channels:
 *   incident:{id}    — Live status for a specific incident (reporter + assigned)
 *   team:{id}        — Team workspace feed (new assignments, status changes)
 *   admin:dispatch   — Admin dispatch board live updates
 *   user:{id}        — Personal notification channel
 */
@WebSocketGateway({
  namespace: '/rt',
  cors: {
    origin: '*', // Configured per environment
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Optional() @Inject(AccessPolicyService) private readonly accessPolicyService?: AccessPolicyService,
  ) {}

  /**
   * Authenticate on connection using JWT from handshake auth.
   */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      // Attach user data to socket
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.data.teams = payload.teams || [];
      client.data.teamMemberships = payload.teamMemberships || [];
      client.data.user = {
        id: payload.sub,
        role: payload.role,
        teams: payload.teams || [],
        teamMemberships: payload.teamMemberships || [],
        isPersonnel: payload.isPersonnel || false,
        email: payload.email || '',
        fullName: payload.fullName || '',
      } as AuthUser;

      // Track connection
      const userSockets = this.connectedUsers.get(payload.sub) || new Set();
      userSockets.add(client.id);
      this.connectedUsers.set(payload.sub, userSockets);

      // Auto-join personal channel
      client.join(`user:${payload.sub}`);

      // Auto-join team channels
      for (const tm of payload.teamMemberships || []) {
        client.join(`team:${tm.teamId}`);
      }

      // Admin gets dispatch board channel
      if (payload.role === 'CAMPUS_ADMIN') {
        client.join('admin:dispatch');
        client.join('admin:incidents');
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
    }
  }

  /**
   * Client subscribes to a specific incident's live status.
   * Access control: only reporter, assigned teams, admin, or active break-glass with REALTIME_ACCESS.
   */
  @SubscribeMessage('subscribe:incident')
  async handleSubscribeIncident(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { incident_id: string },
  ) {
    const user = client.data?.user as AuthUser | undefined;
    if (this.accessPolicyService && user && data?.incident_id) {
      const hasAccess = await this.accessPolicyService.hasRealtimeAccess(user, data.incident_id);
      if (!hasAccess) {
        return { event: 'error', data: { message: 'Unauthorized: REALTIME_ACCESS required' } };
      }
    }
    client.join(`incident:${data.incident_id}`);
    return { event: 'subscribed', data: { channel: `incident:${data.incident_id}` } };
  }

  /**
   * Client unsubscribes from an incident channel.
   */
  @SubscribeMessage('unsubscribe:incident')
  handleUnsubscribeIncident(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { incident_id: string },
  ) {
    client.leave(`incident:${data.incident_id}`);
    return { event: 'unsubscribed', data: { channel: `incident:${data.incident_id}` } };
  }

  /**
   * Check if a specific user is currently connected.
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
  }

  /**
   * Get count of connected clients.
   */
  getOnlineCount(): number {
    return this.connectedUsers.size;
  }
}
