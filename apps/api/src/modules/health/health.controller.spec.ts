import { vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;

  const prismaMock = {
    $queryRaw: vi.fn<() => Promise<unknown[]>>(),
  };

  beforeEach(async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ result: 1 }]);

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns liveness status', () => {
    const result = controller.checkLiveness();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toBeDefined();
  });

  it('returns readiness status when database is available', async () => {
    const result = await controller.checkReadiness();

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ready');
    expect(result.dependencies.database).toBe('up');
  });
});
