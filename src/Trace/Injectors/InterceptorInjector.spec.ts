import { Test } from '@nestjs/testing';
import { OpenTelemetryModule } from '../../OpenTelemetryModule';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-node';
import {
  CallHandler,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import * as request from 'supertest';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Span } from '../Decorators/Span';
import { Tracing } from '../../Tracing';
import { InterceptorInjector } from './InterceptorInjector';
import { Observable, switchMap, timer } from 'rxjs';

describe('Tracing Interceptor Injector Test', () => {
  const sdkModule = OpenTelemetryModule.forRoot([InterceptorInjector]);
  let exporterSpy: jest.SpyInstance;
  const exporter = new NoopSpanProcessor();
  Tracing.init({ serviceName: 'a', spanProcessor: exporter });

  beforeEach(() => {
    exporterSpy = jest.spyOn(exporter, 'onStart');
  });

  afterEach(() => {
    exporterSpy.mockClear();
    exporterSpy.mockReset();
  });

  it(`should trace intercepted controller`, async () => {
    // given
    @Injectable()
    class TestInterceptor implements NestInterceptor {
      intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
      ): Observable<any> | Promise<Observable<any>> {
        return next.handle();
      }
    }

    @UseInterceptors(TestInterceptor)
    @Controller('hello')
    class HelloController {
      @Get()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      controllers: [HelloController],
    }).compile();
    const app = context.createNestApplication();
    await app.init();

    // when
    await request(app.getHttpServer()).get('/hello').send().expect(200);

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloController.TestInterceptor',
        attributes: {
          'nestjs.controller': 'HelloController',
          'nestjs.provider': 'TestInterceptor',
          'nestjs.scope': 'controller',
          'nestjs.type': 'interceptor',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should span the entire interceptor observable`, async () => {
    // given
    @Injectable()
    class TestInterceptor implements NestInterceptor {
      intercept(
        context: ExecutionContext,
        next: CallHandler,
      ): Observable<any> | Promise<Observable<any>> {
        return timer(1000).pipe(switchMap(() => next.handle()));
      }
    }

    @UseInterceptors(TestInterceptor)
    @Controller('hello')
    class HelloController {
      @Get()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    function hrTimeToMs([sec, nano]: [number, number]): number {
      return sec * 1000 + nano / 1e6;
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      controllers: [HelloController],
    }).compile();
    const app = context.createNestApplication();
    await app.init();

    // when
    await request(app.getHttpServer()).get('/hello').send().expect(200);

    //then
    expect(exporterSpy).toHaveBeenCalledTimes(1);

    const firstCallfirstArg = exporterSpy.mock.calls[0][0];

    expect(firstCallfirstArg).toBeDefined();
    expect(firstCallfirstArg.startTime).toBeDefined();
    expect(firstCallfirstArg.endTime).toBeDefined();
    expect(
      hrTimeToMs(firstCallfirstArg.endTime) -
        hrTimeToMs(firstCallfirstArg.startTime),
    ).toBeGreaterThan(0);

    await app.close();
  });

  it(`should trace intercepted controller method`, async () => {
    // given
    @Injectable()
    class TestInterceptor implements NestInterceptor {
      intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
      ): Observable<any> | Promise<Observable<any>> {
        return next.handle();
      }
    }

    @Controller('hello')
    class HelloController {
      @Get()
      @UseInterceptors(TestInterceptor)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      controllers: [HelloController],
    }).compile();
    const app = context.createNestApplication();
    await app.init();

    // when
    await request(app.getHttpServer()).get('/hello').send().expect(200);

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloController.hi.TestInterceptor',
        attributes: {
          'nestjs.controller': 'HelloController',
          'nestjs.callback': 'hi',
          'nestjs.provider': 'TestInterceptor',
          'nestjs.scope': 'controller_method',
          'nestjs.type': 'interceptor',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace guarded and decorated controller method`, async () => {
    // given
    @Injectable()
    class TestInterceptor implements NestInterceptor {
      intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
      ): Observable<any> | Promise<Observable<any>> {
        return next.handle();
      }
    }

    @Controller('hello')
    class HelloController {
      @Get()
      @Span('comolokko')
      @UseInterceptors(TestInterceptor)
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      controllers: [HelloController],
    }).compile();
    const app = context.createNestApplication();
    await app.init();

    // when
    await request(app.getHttpServer()).get('/hello').send().expect(200);

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloController.hi.TestInterceptor',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.controller': 'HelloController',
          'nestjs.provider': 'TestInterceptor',
          'nestjs.scope': 'controller_method',
          'nestjs.type': 'interceptor',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace global interceptor`, async () => {
    // given
    @Injectable()
    class TestInterceptor implements NestInterceptor {
      intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
      ): Observable<any> | Promise<Observable<any>> {
        return next.handle();
      }
    }

    @Controller('hello')
    class HelloController {
      @Get()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      controllers: [HelloController],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: TestInterceptor,
        },
      ],
    }).compile();
    const app = context.createNestApplication();
    await app.init();

    // when
    await request(app.getHttpServer()).get('/hello').send().expect(200);

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'TestInterceptor',
        attributes: {
          'nestjs.provider': 'TestInterceptor',
          'nestjs.scope': 'global',
          'nestjs.type': 'interceptor',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace global useExisting interceptor`, async () => {
    // given
    @Injectable()
    class TestInterceptor implements NestInterceptor {
      intercept(
        context: ExecutionContext,
        next: CallHandler<any>,
      ): Observable<any> | Promise<Observable<any>> {
        return next.handle();
      }
    }

    @Controller('hello')
    class HelloController {
      @Get()
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      controllers: [HelloController],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useExisting: TestInterceptor,
        },
        TestInterceptor,
      ],
    }).compile();
    const app = context.createNestApplication();
    await app.init();

    // when
    await request(app.getHttpServer()).get('/hello').send().expect(200);

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'TestInterceptor',
        attributes: {
          'nestjs.provider': 'TestInterceptor',
          'nestjs.scope': 'global',
          'nestjs.type': 'interceptor',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });
});
