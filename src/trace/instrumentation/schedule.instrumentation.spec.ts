import { Test } from '@nestjs/testing';
import { OpenTelemetryModule } from '../../open-telemetry.module';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Injectable } from '@nestjs/common';
import { Span } from '../decorators/span';
import { Cron, Interval, Timeout } from '@nestjs/schedule';
import { ScheduleInstrumentation } from './schedule.instrumentation';
import { startNestJsOpenTelemetrySDK } from '../../open-telemetry-nestjs-sdk';

describe('Tracing Scheduler Instrumentation Test', () => {
  const sdkModule = OpenTelemetryModule.forRoot({
    instrumentation: [ScheduleInstrumentation],
  });
  let exporterSpy: jest.SpyInstance;
  const exporter = new NoopSpanProcessor();
  startNestJsOpenTelemetrySDK({ serviceName: 'a', spanProcessors: [exporter] });

  beforeEach(() => {
    exporterSpy = jest.spyOn(exporter, 'onStart');
  });

  afterEach(() => {
    exporterSpy.mockClear();
    exporterSpy.mockReset();
  });

  it(`should trace scheduled cron method`, async () => {
    // given
    @Injectable()
    class HelloService {
      @Cron('2 * * * * *')
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);
    await app.init();

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.hi',
        attributes: {
          'nestjs.provider': 'HelloService',
          'nestjs.callback': 'hi',
          'nestjs.schedule_type': 'interval',
          'nestjs.type': 'schedule',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace scheduled and named cron method`, async () => {
    // given
    @Injectable()
    class HelloService {
      @Cron('2 * * * * *', { name: 'AKSUNGUR' })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);
    await app.init();

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.AKSUNGUR',
        attributes: {
          'nestjs.provider': 'HelloService',
          'nestjs.callback': 'hi',
          'nestjs.name': 'AKSUNGUR',
          'nestjs.schedule_type': 'interval',
          'nestjs.type': 'schedule',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should not trace already decorated cron method`, async () => {
    // given
    @Injectable()
    class HelloService {
      @Cron('2 * * * * *')
      @Span('ORUC_REIS')
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);
    await app.init();

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.ORUC_REIS',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.name': 'ORUC_REIS',
          'nestjs.provider': 'HelloService',
          'nestjs.type': 'custom',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace scheduled interval method`, async () => {
    // given
    @Injectable()
    class HelloService {
      @Interval(100)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);
    await app.init();

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.hi',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.provider': 'HelloService',
          'nestjs.schedule_type': 'interval',
          'nestjs.type': 'schedule',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace scheduled and named interval method`, async () => {
    // given
    @Injectable()
    class HelloService {
      @Interval('FATIH', 100)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);
    await app.init();

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.FATIH',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.name': 'FATIH',
          'nestjs.provider': 'HelloService',
          'nestjs.schedule_type': 'interval',
          'nestjs.type': 'schedule',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace scheduled timeout method`, async () => {
    // given
    @Injectable()
    class HelloService {
      @Timeout(100)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);
    await app.init();

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.hi',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.provider': 'HelloService',
          'nestjs.schedule_type': 'interval',
          'nestjs.type': 'schedule',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace scheduled and named timeout method`, async () => {
    // given
    @Injectable()
    class HelloService {
      @Timeout('BARBAROS', 100)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    await app.init();
    const helloService = app.get(HelloService);

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.BARBAROS',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.name': 'BARBAROS',
          'nestjs.provider': 'HelloService',
          'nestjs.schedule_type': 'interval',
          'nestjs.type': 'schedule',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });
});
