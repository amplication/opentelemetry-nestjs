import { Test } from '@nestjs/testing';
import { OpenTelemetryModule } from '../../open-telemetry.module';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Injectable } from '@nestjs/common';
import { Span } from '../decorators/span';
import { EventEmitterInstrumentation } from './event-emitter.instrumentation';
import { OnEvent } from '@nestjs/event-emitter';
import { startNestJsOpenTelemetrySDK } from '../../open-telemetry-nestjs-sdk';

describe('Tracing Event Emitter Instrumentation Test', () => {
  const sdkModule = OpenTelemetryModule.forRoot({
    instrumentation: [EventEmitterInstrumentation],
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

  it(`should trace event consumer method`, async () => {
    // given
    @Injectable()
    class HelloService {
      @OnEvent('selam')
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
        name: 'HelloService.selam',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.event': 'selam',
          'nestjs.provider': 'HelloService',
          'nestjs.type': 'event',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should not trace already decorated event consumer method`, async () => {
    // given
    @Injectable()
    class HelloService {
      @Span('untraceable')
      @OnEvent('tb2')
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
        name: 'HelloService.untraceable',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.name': 'untraceable',
          'nestjs.provider': 'HelloService',
          'nestjs.type': 'custom',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });
});
