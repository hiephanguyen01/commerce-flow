import { UserRole } from '../../../../generated/prisma/client.js';

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  sessionId: string;
};
