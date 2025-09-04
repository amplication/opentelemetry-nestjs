import { DynamicModule } from '@nestjs/common';
import { TraceService } from './Trace/TraceService';
import { Constants } from './Constants';
import { defaultInstrumentation } from './OpenTelemetryModuleConfigDefault';
import {
  FactoryProvider,
  Provider,
} from '@nestjs/common/interfaces/modules/provider.interface';
import { OpenTelemetryModuleAsyncOption } from './OpenTelemetryModuleAsyncOption';
import { DecoratorInstrumentation } from './Trace/Instrumentation/DecoratorInstrumentation';
import { ModuleRef } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OpenTelemetryModuleConfig } from './OpenTelemetryModuleConfig.interface';
import { Tracer } from './Trace/Tracer.types';
import { Instrumentation } from './Trace/Instrumentation/Instrumentation.js';

export class OpenTelemetryModule {
  static forRoot(config: OpenTelemetryModuleConfig = {}): DynamicModule {
    const instrumentation = config.instrumentation ?? defaultInstrumentation;

    return {
      global: true,
      module: OpenTelemetryModule,
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ...instrumentation,
        TraceService,
        DecoratorInstrumentation,
        this.buildInstrumentation(instrumentation),
        this.buildTracer(),
      ],
      exports: [TraceService, Tracer],
    };
  }

  private static buildInstrumentation(
    instrumentation: Provider<Instrumentation>[] = [],
  ): FactoryProvider {
    return {
      provide: Constants.SDK_INJECTORS,
      useFactory: async (...instrumentation) => {
        for await (const instrument of instrumentation) {
          await instrument.setupInstrumentation?.();
        }
      },
      inject: [
        DecoratorInstrumentation,
        // eslint-disable-next-line @typescript-eslint/ban-types
        ...(instrumentation as Function[]),
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
        this.buildAsyncInstrumentation(),
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

  private static buildAsyncInstrumentation(): FactoryProvider {
    return {
      provide: Constants.SDK_INJECTORS,
      useFactory: async (instrumentation, moduleRef: ModuleRef) => {
        instrumentation ??= defaultInstrumentation;

        const decoratorInstrumentation = await moduleRef.create(
          DecoratorInstrumentation,
        );
        await decoratorInstrumentation.setupInstrumentation();

        for await (const instrument of instrumentation) {
          const created = await moduleRef.create(instrument);
          await created.setupInstrumentation?.();
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
