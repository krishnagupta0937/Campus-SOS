import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Optional, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators';
import { TokenRevocationService } from '../../modules/auth/token-revocation.service';

export interface AuthUser {
  id: string;
  role: string;
  teams: string[];        // team codes
  teamMemberships: Array<{
    teamId: string;
    teamCode: string;
    memberId: string;
    isCoordinator: boolean;
    canViewRestricted: boolean;
  }>;
  isPersonnel: boolean;
  email: string;
  fullName: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    @Optional() private readonly tokenRevocationService?: TokenRevocationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Missing access token' });
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (this.tokenRevocationService?.isRevoked(payload.sub, payload.iat, token)) {
        throw new UnauthorizedException({
          code: 'TOKEN_REVOKED',
          message: 'Access token has been revoked due to logout',
        });
      }

      request.user = payload as AuthUser;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ code: 'TOKEN_EXPIRED', message: 'Access token expired' });
      }
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Invalid access token' });
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers?.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
