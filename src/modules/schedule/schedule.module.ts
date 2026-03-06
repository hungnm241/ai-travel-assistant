import { Module } from '@nestjs/common';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    imports: [
        NestScheduleModule.forRoot(),
        HttpModule.register({
            timeout: 5000,
            maxRedirects: 5,
        }),
    ],
    providers: [
        PrismaService,
    ],
})
export class TaskScheduleModule {}