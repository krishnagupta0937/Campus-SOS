import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

// Extract authenticated user from request
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// Role-based access metadata
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Public route (no auth required)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Idempotency key required
export const IDEMPOTENCY_REQUIRED_KEY = 'idempotencyRequired';
export const IdempotencyRequired = () => SetMetadata(IDEMPOTENCY_REQUIRED_KEY, true);
