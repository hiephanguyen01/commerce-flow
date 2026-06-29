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

  MINIO_PUBLIC_URL: Joi.string().uri().required(),

  MINIO_AUTO_CREATE_BUCKET: Joi.boolean().default(false),

  CATALOG_CACHE_ENABLED: Joi.boolean().default(true),

  CATALOG_CATEGORY_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(300),

  CATALOG_PRODUCT_LIST_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(60),

  CATALOG_PRODUCT_DETAIL_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(300),

  CATALOG_CACHE_LOCK_TTL_MS: Joi.number().integer().positive().default(5000),

  PRODUCT_IMAGE_MAX_SIZE_BYTES: Joi.number()
    .integer()
    .positive()
    .default(5 * 1024 * 1024),

  INVENTORY_EXPIRATION_WORKER_ENABLED: Joi.boolean().default(true),

  INVENTORY_EXPIRATION_BATCH_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .default(100),

  INVENTORY_EXPIRATION_MAX_BATCHES_PER_RUN: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),
});
