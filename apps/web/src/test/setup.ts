import { mockServer } from '@/mocks/server';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

beforeAll(() => {
  mockServer.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  cleanup();
  mockServer.resetHandlers();
});

afterAll(() => {
  mockServer.close();
});
