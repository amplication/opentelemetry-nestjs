import { Test } from '@nestjs/testing';
import { OpenTelemetryModule } from '../../OpenTelemetryModule';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { CanActivate, Controller, Get, UseGuards } from '@nestjs/common';
import * as request from 'supertest';
import { GuardInjector } from './GuardInjector';
import { APP_GUARD } from '@nestjs/core';
import { Span } from '../Decorators/Span';
import { Tracing } from '../../Tracing';

describe('Tracing Guard Injector Test', () => {
  const sdkModule = OpenTelemetryModule.forRoot([GuardInjector]);
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

  it(`should trace guarded controller`, async () => {
    // given
    class VeyselEfendi implements CanActivate {
      canActivate() {
        return true;
      }
    }

    @UseGuards(VeyselEfendi)
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
        name: 'HelloController.VeyselEfendi',
        attributes: {
          'nestjs.controller': 'HelloController',
          'nestjs.provider': 'VeyselEfendi',
          'nestjs.scope': 'controller',
          'nestjs.type': 'guard',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace guarded controller method`, async () => {
    // given
    class VeyselEfendi implements CanActivate {
      canActivate() {
        return true;
      }
    }

    @Controller('hello')
    class HelloController {
      @Get()
      @UseGuards(VeyselEfendi)
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
        name: 'HelloController.hi.VeyselEfendi',
        attributes: {
          'nestjs.controller': 'HelloController',
          'nestjs.callback': 'hi',
          'nestjs.provider': 'VeyselEfendi',
          'nestjs.scope': 'controller_method',
          'nestjs.type': 'guard',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace guarded and decorated controller method`, async () => {
    // given
    class VeyselEfendi implements CanActivate {
      canActivate() {
        return true;
      }
    }

    @Controller('hello')
    class HelloController {
      @Get()
      @Span('comolokko')
      @UseGuards(VeyselEfendi)
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
        name: 'HelloController.hi.VeyselEfendi',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.controller': 'HelloController',
          'nestjs.provider': 'VeyselEfendi',
          'nestjs.scope': 'controller_method',
          'nestjs.type': 'guard',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace global guard`, async () => {
    // given
    class VeyselEfendi implements CanActivate {
      canActivate() {
        return true;
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
          provide: APP_GUARD,
          useClass: VeyselEfendi,
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
        name: 'VeyselEfendi',
        attributes: {
          'nestjs.provider': 'VeyselEfendi',
          'nestjs.scope': 'global',
          'nestjs.type': 'guard',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });
});
