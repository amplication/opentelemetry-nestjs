import { Test } from '@nestjs/testing';
import { Tracing } from '../../Tracing';
import { OpenTelemetryModule } from '../../OpenTelemetryModule';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { Span } from '../Decorators/Span';
import * as request from 'supertest';
import { ControllerInjector } from './ControllerInjector';
import waitForExpect from 'wait-for-expect';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

describe('Tracing Controller Injector Test', () => {
  const sdkModule = OpenTelemetryModule.forRoot([ControllerInjector]);
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

  describe('for microservices', () => {
    it(`should trace controller method using MessagePattern`, async () => {
      // given
      @Controller('hello')
      class HelloController {
        @MessagePattern('time.us.*')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        message() {}
      }

      const context = await Test.createTestingModule({
        imports: [sdkModule],
        controllers: [HelloController],
      }).compile();
      const app = context.createNestApplication();
      await app.init();

      // when
      await app.get(HelloController).message();

      //then
      await waitForExpect(() =>
        expect(exporterSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'HelloController.message',
            attributes: {
              'nestjs.callback': 'message',
              'nestjs.controller': 'HelloController',
              'nestjs.type': 'handler',
            },
            kind: SpanKind.SERVER,
          }),
          expect.any(Object),
        ),
      );

      await app.close();
    });

    it(`should trace controller method using EventPattern`, async () => {
      // given
      @Controller('hello')
      class HelloController {
        @EventPattern('user.created')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        event() {}
      }

      const context = await Test.createTestingModule({
        imports: [sdkModule],
        controllers: [HelloController],
      }).compile();
      const app = context.createNestApplication();
      await app.init();

      // when
      await app.get(HelloController).event();

      //then
      await waitForExpect(() =>
        expect(exporterSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'HelloController.event',
            attributes: {
              'nestjs.callback': 'event',
              'nestjs.controller': 'HelloController',
              'nestjs.type': 'handler',
            },
            kind: SpanKind.SERVER,
          }),
          expect.any(Object),
        ),
      );

      await app.close();
    });

    it(`should not trace controller method if it is not a microservice client`, async () => {
      // given
      @Controller('hello')
      class HelloController {
        @MessagePattern('time.us.*')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        message() {}

        @EventPattern('time.us.*')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        event() {}

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        other() {}
      }

      const context = await Test.createTestingModule({
        imports: [sdkModule],
        controllers: [HelloController],
      }).compile();
      const app = context.createNestApplication();
      await app.init();
      const helloController = app.get(HelloController);

      //when
      helloController.message();
      helloController.event();
      helloController.other();

      //then
      await waitForExpect(() => {
        expect(exporterSpy).toHaveBeenCalledTimes(2);
        return expect(exporterSpy).not.toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'HelloController.other',
          }),
          expect.any(Object),
        );
      });

      await app.close();
    });

    it(`should trace controller method exception`, async () => {
      // given      @Controller('hello')
      @Controller()
      class HelloController {
        @EventPattern('user.created')
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        event() {
          throw new Error("I'm an error");
        }
      }

      const context = await Test.createTestingModule({
        imports: [sdkModule],
        controllers: [HelloController],
      }).compile();
      const app = context.createNestApplication();
      await app.init();

      // when
      try {
        await app.get(HelloController).event();
      } catch (error) {}

      //then
      await waitForExpect(() =>
        expect(exporterSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'HelloController.event',
            attributes: {
              'nestjs.callback': 'event',
              'nestjs.controller': 'HelloController',
              'nestjs.type': 'handler',
            },
            status: {
              code: SpanStatusCode.ERROR,
              message: "I'm an error",
            },
          }),
          expect.any(Object),
        ),
      );

      await app.close();
    });
  });

  describe('for http', () => {
    it(`should trace controller method`, async () => {
      // given
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
      await waitForExpect(() =>
        expect(exporterSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'HelloController.hi',
            attributes: {
              'nestjs.callback': 'hi',
              'nestjs.controller': 'HelloController',
              'nestjs.type': 'handler',
            },
            kind: SpanKind.SERVER,
          }),
          expect.any(Object),
        ),
      );

      await app.close();
    });

    it(`should trace controller method exception`, async () => {
      // given
      @Controller('hello')
      class HelloController {
        @Get()
        hi() {
          throw new ForbiddenException();
        }
      }

      const context = await Test.createTestingModule({
        imports: [sdkModule],
        controllers: [HelloController],
      }).compile();
      const app = context.createNestApplication();
      await app.init();

      // when
      await request(app.getHttpServer()).get('/hello').send().expect(403);

      //then
      await waitForExpect(() =>
        expect(exporterSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'HelloController.hi',
            attributes: {
              'nestjs.callback': 'hi',
              'nestjs.controller': 'HelloController',
              'nestjs.type': 'handler',
            },
            status: {
              code: SpanStatusCode.ERROR,
              message: 'Forbidden',
            },
          }),
          expect.any(Object),
        ),
      );

      await app.close();
    });

    it(`should not trace controller method if there is no path`, async () => {
      // given
      @Controller('hello')
      class HelloController {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        hi() {}
      }

      const context = await Test.createTestingModule({
        imports: [sdkModule],
        controllers: [HelloController],
      }).compile();
      const app = context.createNestApplication();
      await app.init();
      const helloController = app.get(HelloController);

      //when
      helloController.hi();

      //then
      expect(exporterSpy).not.toHaveBeenCalled();

      await app.close();
    });

    it(`should not trace controller method if already decorated`, async () => {
      // given
      @Controller('hello')
      class HelloController {
        @Get()
        @Span('SLM_CNM')
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

      // then
      expect(exporterSpy).toHaveBeenCalledTimes(1)
      await waitForExpect(() =>
        expect(exporterSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'HelloController.SLM_CNM',
            attributes: {
              "nestjs.callback": "hi",
              "nestjs.controller": "HelloController",
              "nestjs.type": "controller_method",
              "nestjs.name": "SLM_CNM"
            },
          }),
          expect.any(Object),
        ),
      );

      await app.close();
    });
  });
});
