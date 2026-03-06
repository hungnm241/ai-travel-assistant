import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private static readonly defaultOptions: RateLimitOptions = {
    windowMs: 60_000,
    limit: 10,
    perRoute: true,
    keyStrategy: 'userOrIp',
  };

  private static readonly requests = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const handler = context.getHandler();
    const clazz = context.getClass();

    const handlerOptions =
      (Reflect.getMetadata(RATE_LIMIT_KEY, handler) as Partial<RateLimitOptions> | undefined) ??
      undefined;
    const classOptions =
      (Reflect.getMetadata(RATE_LIMIT_KEY, clazz) as Partial<RateLimitOptions> | undefined) ??
      undefined;

    if (!handlerOptions && !classOptions) {
      return true;
    }

    const options: RateLimitOptions = {
      ...RateLimitGuard.defaultOptions,
      ...(classOptions ?? {}),
      ...(handlerOptions ?? {}),
    };

    const user = request?.user;

    const subjectKey = (() => {
      if (options.keyStrategy === 'user') {
        return user ? String(user.userId ?? user.id) : 'anonymous';
      }
      if (options.keyStrategy === 'ip') {
        return request.ip || 'unknown-ip';
      }
      return (user && String(user.userId ?? user.id)) || request.ip || 'anonymous';
    })();

    const routeKey = options.perRoute
      ? `${request.method}:${request.baseUrl ?? ''}${request.path ?? request.url ?? ''}`
      : 'global';

    const key = `${routeKey}:${subjectKey}`;

    const now = Date.now();
    const windowStart = now - options.windowMs;

    const timestamps = RateLimitGuard.requests.get(key) ?? [];
    const recent = timestamps.filter((ts) => ts > windowStart);

    if (recent.length >= options.limit) {
      // NOTE: Nest doesn't export TooManyRequestsException in this project setup.
      // Use BadRequestException to avoid breaking compilation, while still blocking spam.
      throw new BadRequestException('Too many requests. Please try again later.');
    }

    recent.push(now);
    RateLimitGuard.requests.set(key, recent);

    return true;
  }
}

