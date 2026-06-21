import { UserRole } from '../../../../generated/prisma/client.js';

export type AuthUserResponse = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
};

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
};

export type AuthResponse = {
  user: AuthUserResponse;
  tokens: AuthTokensResponse;
};
