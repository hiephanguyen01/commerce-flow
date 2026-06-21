import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../application/types/authenticated-user.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

export const CurrentUser = createParamDecorator(
  (
    property: keyof AuthenticatedUser | undefined,
    context: ExecutionContext,
  ) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (property) {
      return request.user?.[property];
    }

    return request.user;
  },
);
