import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { AdminGuard } from '../guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('SECRET_JWT_KEY'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h'
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [JwtStrategy, AdminGuard, PrismaService],
    exports: [JwtModule, JwtStrategy, AdminGuard],
})
export class CommonJwtModule {}
