import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  ENCRYPTION_KEY: z.string().min(24),
  CITY_NAME: z.string().default("San Francisco"),
  CITY_LAT: z.coerce.number().default(37.7749),
  CITY_LON: z.coerce.number().default(-122.4194),
  CITY_RADIUS_KM: z.coerce.number().default(30),
  APPROVAL_BUNDLE_TTL_MIN: z.coerce.number().default(30),
  MAX_MARKETS_PER_ORDER: z.coerce.number().default(3),
  DEFAULT_MAX_PRICE_DELTA_PCT: z.coerce.number().default(5)
});

export const env = envSchema.parse(process.env);
