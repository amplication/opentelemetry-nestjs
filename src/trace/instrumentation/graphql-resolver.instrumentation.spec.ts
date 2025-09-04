import { Test } from '@nestjs/testing';
import { OpenTelemetryModule } from '../../open-telemetry.module';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Injectable } from '@nestjs/common';
import { Constants } from '../../constants';
import { Resolver, Query, Subscription, Mutation } from '@nestjs/graphql';
import { startNestJsOpenTelemetrySDK } from '../../open-telemetry-nestjs-sdk';

describe('Tracing Decorator Instrumentation Test', () => {
  const sdkModule = OpenTelemetryModule.forRoot();
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

  it(`should trace graphql resolver provider Query method`, async () => {
    // given
    @Resolver(() => {
      /***/
    })
    class HelloService {
      @Query(() => [String], {
        nullable: false,
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.hi',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.provider': 'HelloService',
          'nestjs.resolver': 'query',
          'nestjs.type': 'graphql_resolver',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should trace graphql resolver provider Mutation method`, async () => {
    // given
    @Resolver(() => {
      /***/
    })
    class HelloService {
      @Mutation(() => [String], {
        nullable: false,
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.hi',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.provider': 'HelloService',
          'nestjs.resolver': 'mutation',
          'nestjs.type': 'graphql_resolver',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });
  it(`should trace graphql resolver provider Subscription method`, async () => {
    // given
    @Resolver(() => {
      /***/
    })
    class HelloService {
      @Subscription(() => [String], {
        nullable: false,
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);

    // when
    helloService.hi();

    //then
    expect(exporterSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'HelloService.hi',
        attributes: {
          'nestjs.callback': 'hi',
          'nestjs.provider': 'HelloService',
          'nestjs.resolver': 'subscription',
          'nestjs.type': 'graphql_resolver',
        },
      }),
      expect.any(Object),
    );

    await app.close();
  });

  it(`should not trace already tracing prototype`, async () => {
    // given
    @Injectable()
    @Resolver()
    class HelloService {
      @Query(() => [String], {
        nullable: false,
      })
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      hi() {}
    }

    Reflect.defineMetadata(
      Constants.TRACE_METADATA_ACTIVE,
      1,
      HelloService.prototype.hi,
    );

    const context = await Test.createTestingModule({
      imports: [sdkModule],
      providers: [HelloService],
    }).compile();
    const app = context.createNestApplication();
    const helloService = app.get(HelloService);

    // when
    helloService.hi();

    //then
    expect(exporterSpy).not.toHaveBeenCalled();

    await app.close();
  });
});
