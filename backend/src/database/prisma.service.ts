import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DevStore } from './dev-store';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public isPostgresConnected = false;
  private devStore = new DevStore();

  // Model delegates mapping
  private modelHandlers: Record<string, any> = {
    user: this.devStore.createModelHandler('users'),
    team: this.devStore.createModelHandler('teams'),
    teamMember: this.devStore.createModelHandler('teamMembers'),
    incident: this.devStore.createModelHandler('incidents'),
    incidentDraft: this.devStore.createModelHandler('incidentDrafts'),
    incidentLocation: this.devStore.createModelHandler('incidentLocations'),
    attachment: this.devStore.createModelHandler('attachments'),
    outboxEvent: this.devStore.createModelHandler('outboxEvents'),
    auditLog: this.devStore.createModelHandler('auditLogs'),
    breakGlassRequest: this.devStore.createModelHandler('breakGlassRequests'),
    notification: this.devStore.createModelHandler('notifications'),
    hotline: this.devStore.createModelHandler('hotlines'),
    setting: this.devStore.createModelHandler('settings'),
  };

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });

    // Proxy fallback for models
    return new Proxy(this, {
      get: (target: any, prop: string | symbol) => {
        if (typeof prop === 'symbol') return target[prop];
        if (
          prop.startsWith('$') ||
          prop.startsWith('_') ||
          prop === 'isPostgresConnected' ||
          prop === 'onModuleInit' ||
          prop === 'onModuleDestroy' ||
          prop === 'devStore' ||
          prop === 'modelHandlers'
        ) {
          return target[prop];
        }
        if (!target.isPostgresConnected) {
          if (!target.modelHandlers[prop]) {
            target.modelHandlers[prop] = target.devStore.createModelHandler(prop);
          }
          return target.modelHandlers[prop];
        }
        return target[prop];
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.isPostgresConnected = true;
      console.log('✅ Connected to PostgreSQL at localhost:5432');
    } catch (err) {
      this.isPostgresConnected = false;
      console.warn('⚠️ PostgreSQL at localhost:5432 not reachable. Using resilient persistent DevStore engine.');
    }
  }

  // Override $transaction
  override $transaction(arg: any, options?: any): Promise<any> {
    if (this.isPostgresConnected) {
      return super.$transaction(arg, options);
    }
    if (typeof arg === 'function') {
      return arg(this);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return Promise.resolve(null);
  }

  async onModuleDestroy() {
    if (this.isPostgresConnected) {
      try {
        await this.$disconnect();
      } catch {}
    }
  }
}
