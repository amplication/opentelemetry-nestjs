import { Test } from '@nestjs/testing';
import { OpenTelemetryModule } from '../../open-telemetry.module';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Controller, Get, Injectable } from '@nestjs/common';
import { Span } from '../decorators/span';
import * as request from 'supertest';
import { ControllerInstrumentation } from './controller.instrumentation';
import { startNestJsOpenTelemetrySDK } from '../../open-telemetry-nestjs-sdk';

describe('Base Trace Instrumentation Test', () => {
  const sdkModule = OpenTelemetryModule.forRoot({
    instrumentation: [ControllerInstrumentation],
  });
  let exporterSpy: jest.SpyInstance;

  beforeEach(() => {
    const exporter = new NoopSpanProcessor();
    exporterSpy = jest.spyOn(exporter, 'onStart');
    startNestJsOpenTelemetrySDK({
      serviceName: 'a',
      spanProcessors: [exporter],
    });
  });

  afterEach(() => {
    exporterSpy.mockClear();
    exporterSpy.mockReset();
  });

  it('should create spans that are children of their parent spans', async () => {
    // given
    @Injectable()
    class HelloService {
      @Span()
      hello() {
        this.helloAgain();
      }

      @Span()
      helloAgain() {} // eslint-disable-line @typescript-eslint/no-empty-function
    }

    @Controller('hello')
    class HelloController {
      constructor(private service: HelloService) {}

      @Get()
      hi() {
        return this.service.hello();
      }
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
      controllers: [HelloController],
    }).compile();
    const app = context.createNestApplication();
    await app.init();

    //when
    await request(app.getHttpServer()).get('/hello').send().expect(200);

    //then
    const [[parent], [childOfParent], [childOfChild]] = exporterSpy.mock.calls;

    // should inherit from each other
    expect(parent.parentSpanContext).toBeUndefined();
    expect(childOfParent.parentSpanContext).toBeDefined();
    expect(childOfParent.parentSpanContext.spanId).toEqual(
      parent.spanContext().spanId,
    );
    expect(childOfChild.parentSpanContext).toBeDefined();
    expect(childOfChild.parentSpanContext.spanId).toEqual(
      childOfParent.spanContext().spanId,
    );

    // should be part of the same trace
    expect([
      parent.spanContext().traceId,
      childOfParent.spanContext().traceId,
      childOfChild.spanContext().traceId,
    ]).toEqual([
      parent.spanContext().traceId,
      parent.spanContext().traceId,
      parent.spanContext().traceId,
    ]);
    await app.close();
  });
});
