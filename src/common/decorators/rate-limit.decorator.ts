import { SetMetadata } from '@nestjs/common';

export type RateLimitKeyStrategy = 'user' | 'ip' | 'userOrIp';

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  /**
   * When true, rate limit is separated per route (method + path).
   * When false, applies across all routes for the same key.
   */
  perRoute: boolean;
  keyStrategy: RateLimitKeyStrategy;
};

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (options: Partial<RateLimitOptions>) =>
  SetMetadata(RATE_LIMIT_KEY, options);

