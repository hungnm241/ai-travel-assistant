import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private jwtService: JwtService
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new ForbiddenException('Access denied: No token provided');
        }

        try {
            const payload = this.jwtService.decode(token) as any;

            // Check if user has admin role
            if (payload?.role === Role.ADMIN) {
                return true;
            }

            throw new ForbiddenException('Access denied: Admin privileges required');
        } catch (error) {
            throw new ForbiddenException('Access denied: Invalid token');
        }
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}