import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import {
  PrismaClient,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main(): Promise<void> {
  await prisma.product.deleteMany({
    where: {
      slug: 'e2e-cached-product',
    },
  });

  await prisma.user.upsert({
    where: {
      email: 'admin@commerceflow.test',
    },
    create: {
      email: 'admin@commerceflow.test',
      passwordHash: await hash('Admin123!'),
      displayName: 'E2E Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      failedLoginAttempts: 0,
      lockedUntil: null,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash: await hash('Admin123!'),
      displayName: 'E2E Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      failedLoginAttempts: 0,
      lockedUntil: null,
      emailVerifiedAt: new Date(),
    },
  });
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
