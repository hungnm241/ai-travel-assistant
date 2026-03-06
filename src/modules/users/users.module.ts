import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonJwtModule } from '../../common/modules/jwt.module';

@Module({
    imports: [CommonJwtModule],
    controllers: [UsersController],
    providers: [UsersService, PrismaService],
    exports: [UsersService]
})
export class UsersModule {}
