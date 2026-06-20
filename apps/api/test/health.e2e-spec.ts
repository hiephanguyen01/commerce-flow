import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

function getStatus(body: unknown): unknown {
  if (typeof body !== 'object' || body === null || !('status' in body)) {
    return undefined;
  }

  return body.status;
}

describe('Health API', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health/live', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200);

    const body: unknown = response.body;

    expect(getStatus(body)).toBe('ok');
  });

  it('GET /api/v1/health/ready', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);

    const body: unknown = response.body;

    expect(getStatus(body)).toBe('ready');
  });
});
