import { DynamicModule } from '@nestjs/common';
import { TraceService } from './Trace/TraceService';
import { Constants } from './Constants';
import { OpenTelemetryModuleDefaultConfig } from './OpenTelemetryModuleConfigDefault';
import { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface';
import { OpenTelemetryModuleAsyncOption } from './OpenTelemetryModuleAsyncOption';
import { DecoratorInjector } from './Trace/Injectors/DecoratorInjector';
import { ModuleRef } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OpenTelemetryModuleConfig } from './OpenTelemetryModuleConfig.interface';
import { Tracer } from '@opentelemetry/sdk-trace-base';

export class OpenTelemetryModule {
  static forRoot(
    traceAutoInjectors?: OpenTelemetryModuleConfig,
  ): DynamicModule {
    const injectors = traceAutoInjectors ?? OpenTelemetryModuleDefaultConfig;

    return {
      global: true,
      module: OpenTelemetryModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ...injectors,
        TraceService,
        DecoratorInjector,
        this.buildInjectors(injectors),
        this.buildTracer(),
      ],
      exports: [TraceService, Tracer],
    };
  }

  private static buildInjectors(
    injectors: OpenTelemetryModuleConfig = [],
  ): FactoryProvider {
    return {
      provide: Constants.SDK_INJECTORS,
      useFactory: async (...injectors) => {
        for await (const injector of injectors) {
          if (injector['inject']) await injector.inject();
        }
      },
      inject: [
        DecoratorInjector,
        // eslint-disable-next-line @typescript-eslint/ban-types
        ...(injectors as Function[]),
      ],
    };
  }

  static async forRootAsync(
    configuration: OpenTelemetryModuleAsyncOption = {},
  ): Promise<DynamicModule> {
    return {
      global: true,
      module: OpenTelemetryModule,
      // eslint-disable-next-line no-unsafe-optional-chaining
      imports: [...configuration?.imports, EventEmitterModule.forRoot()],
      providers: [
        TraceService,
        this.buildAsyncInjectors(),
        this.buildTracer(),
        {
          provide: Constants.SDK_CONFIG,
          useFactory: configuration.useFactory,
          inject: configuration.inject,
        },
      ],
      exports: [TraceService, Tracer],
    };
  }

  private static buildAsyncInjectors(): FactoryProvider {
    return {
      provide: Constants.SDK_INJECTORS,
      useFactory: async (traceAutoInjectors, moduleRef: ModuleRef) => {
        const injectors =
          traceAutoInjectors ?? OpenTelemetryModuleDefaultConfig;

        const decoratorInjector = await moduleRef.create(DecoratorInjector);
        await decoratorInjector.inject();

        for await (const injector of injectors) {
          const created = await moduleRef.create(injector);
          if (created['inject']) await created.inject();
        }

        return {};
      },
      inject: [Constants.SDK_CONFIG, ModuleRef],
    };
  }

  private static buildTracer() {
    return {
      provide: Tracer,
      useFactory: (traceService: TraceService) => traceService.getTracer(),
      inject: [TraceService],
    };
  }
}
