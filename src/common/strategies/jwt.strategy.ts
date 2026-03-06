import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
    email: string;
    fullName: string;
    userId: string;
    iat: number;
    exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private prisma: PrismaService
    ) {
        const secret = configService.get<string>('SECRET_JWT_KEY');
        if (!secret) {
            throw new Error('JWT secret key is not configured');
        }
    
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: BigInt(parseInt(payload.userId)) },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return {
            sub: Number(user.id),
            userId: user.id.toString(),
            fullName: user.fullName,
            email: user.email,
        };
    }
}
