import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './../src/app.module';

process.on('unhandledRejection', (reason: any) => {
  if (reason?.message?.includes('Connection is closed') || reason?.message?.includes('ECONNREFUSED')) {
    return;
  }
});

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 30000);

  it('/ (GET)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe('Hello World!');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
