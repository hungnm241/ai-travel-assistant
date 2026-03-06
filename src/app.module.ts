import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TaskScheduleModule } from './modules/schedule/schedule.module';
import { TravelOrchestratorModule } from './modules/travel-orchestrator/travel-orchestrator.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { ConfigModule } from '@nestjs/config';
import { CommonJwtModule } from './common/modules/jwt.module';
import { PrismaService } from './prisma/prisma.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        CommonJwtModule,
        AuthModule,
        UsersModule,
        TaskScheduleModule,
        TravelOrchestratorModule,
    ],
    providers: [
        PrismaService,
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
    ]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggingMiddleware).forRoutes('*');
    }
}
