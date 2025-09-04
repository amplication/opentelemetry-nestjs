import { DynamicModule, InjectionToken } from '@nestjs/common';
import { TraceService } from './trace/trace.service';
import { Constants } from './constants';
import {
  FactoryProvider,
  Provider,
} from '@nestjs/common/interfaces/modules/provider.interface';
import {
  OpenTelemetryModuleAsyncOptions,
  OpenTelemetryModuleConfig,
} from './open-telemetry.interfaces';
import { DecoratorInstrumentation } from './trace/instrumentation/decorator.instrumentation';
import { ModuleRef } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Tracer } from './trace/tracer.types';
import { Instrumentation } from './trace/instrumentation/Instrumentation';
import { ControllerInstrumentation } from './trace/instrumentation/controller.instrumentation';
import { GraphQLResolverInstrumentation } from './trace/instrumentation/graphql-resolver.instrumentation';
import { GuardInstrumentation } from './trace/instrumentation/guard.instrumentation';
import { InterceptorInstrumentation } from './trace/instrumentation/interceptor.instrumentation';
import { EventEmitterInstrumentation } from './trace/instrumentation/event-emitter.instrumentation';
import { ScheduleInstrumentation } from './trace/instrumentation/schedule.instrumentation';
import { PipeInstrumentation } from './trace/instrumentation/pipe.instrumentation';
import { ConsoleLoggerInstrumentation } from './trace/instrumentation/console-logger.instrumentation';

export const defaultInstrumentation = [
  ControllerInstrumentation,
  GraphQLResolverInstrumentation,
  GuardInstrumentation,
  InterceptorInstrumentation,
  EventEmitterInstrumentation,
  ScheduleInstrumentation,
  PipeInstrumentation,
  ConsoleLoggerInstrumentation,
] as const satisfies Provider<Instrumentation>[];

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

  static async forRootAsync<T extends InjectionToken[]>(
    configuration: OpenTelemetryModuleAsyncOptions<T> = {},
  ): Promise<DynamicModule> {
    return {
      global: true,
      module: OpenTelemetryModule,
      imports: [
        ...(configuration?.imports ?? []),
        EventEmitterModule.forRoot(),
      ],
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
        decoratorInstrumentation.setupInstrumentation();

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
