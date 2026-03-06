import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonJwtModule } from '../../common/modules/jwt.module';

@Module({
    imports: [CommonJwtModule],
    controllers: [AuthController],
    providers: [AuthService, PrismaService],
    exports: [AuthService]
})
export class AuthModule {}
