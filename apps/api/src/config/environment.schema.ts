import Joi from 'joi';

export const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  API_PORT: Joi.number().port().default(4000),

  WEB_ORIGIN: Joi.string().uri().default('http://localhost:3000'),

  DATABASE_URL: Joi.string().required(),

  REDIS_URL: Joi.string().uri().required(),

  KAFKA_BROKERS: Joi.string().optional(),

  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().port().default(1025),

  MINIO_ENDPOINT: Joi.string().uri().required(),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
});
