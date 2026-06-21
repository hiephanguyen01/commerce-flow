import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

export async function startPostgres(): Promise<StartedPostgreSqlContainer> {
  const container = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('commerce_flow_test')
    .withUsername('commerce')
    .withPassword('commerce_test')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();

  return container;
}
