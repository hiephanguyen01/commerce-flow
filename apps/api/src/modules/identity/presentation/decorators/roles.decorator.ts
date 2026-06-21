import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../../generated/prisma/client.js';

export const ROLES_KEY = 'identity:roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
