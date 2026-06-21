import Joi from 'joi';

export const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  API_PORT: Joi.number().port().default(4000),
  WEB_ORIGIN: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().uri().required(),

  JWT_ACCESS_SECRET: Joi.string().min(48).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().positive().default(900),
  JWT_ISSUER: Joi.string().required(),
  JWT_AUDIENCE: Joi.string().required(),

  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().positive().default(30),
  REFRESH_REUSE_GRACE_SECONDS: Joi.number().integer().min(0).default(5),

  AUTH_MAX_FAILED_ATTEMPTS: Joi.number().integer().positive().default(5),

  AUTH_LOCK_DURATION_MINUTES: Joi.number().integer().positive().default(15),

  MINIO_ENDPOINT: Joi.string().uri().required(),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
});
