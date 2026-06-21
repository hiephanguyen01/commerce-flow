import type { Request } from 'express';
import type { AuthenticatedUser } from '../../application/types/authenticated-user.js';

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
