import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

// Core modules
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { LocationsModule } from './modules/locations/locations.module';
import { AiModule } from './modules/ai/ai.module';
import { RoutingModule } from './modules/routing/routing.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ExploreModule } from './modules/explore/explore.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AccessPolicyModule } from './modules/access-policy/access-policy.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // BullMQ queues
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const parsed = new URL(redisUrl);
        return {
          connection: {
            host: parsed.hostname,
            port: parseInt(parsed.port || '6379'),
            lazyConnect: true,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            retryStrategy: () => null,
          },
        };
      },
    }),

    // Database
    DatabaseModule,

    // Domain modules
    AccessPolicyModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    IncidentsModule,
    AttachmentsModule,
    LocationsModule,
    AiModule,
    RoutingModule,
    DispatchModule,
    NotificationsModule,
    RealtimeModule,
    ExploreModule,
    AnalyticsModule,
    AuditModule,
    SettingsModule,
    HealthModule,
  ],
})
export class AppModule {}
