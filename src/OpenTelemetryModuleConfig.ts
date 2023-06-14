import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { Injector } from './Trace/Injectors/Injector';
import { NodeSDKConfiguration } from '@opentelemetry/sdk-node';
import { ControllerInjector } from './Trace/Injectors/ControllerInjector';
import { GuardInjector } from './Trace/Injectors/GuardInjector';
import { EventEmitterInjector } from './Trace/Injectors/EventEmitterInjector';
import { ScheduleInjector } from './Trace/Injectors/ScheduleInjector';
import { PipeInjector } from './Trace/Injectors/PipeInjector';
import { LoggerInjector } from './Trace/Injectors/LoggerInjector';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { Resource } from '@opentelemetry/resources';
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { CompositePropagator } from '@opentelemetry/core';
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { containerDetector } from '@opentelemetry/resource-detector-container';

export interface OpenTelemetryModuleConfig
  extends Partial<NodeSDKConfiguration> {
  traceAutoInjectors?: Provider<Injector>[];
}

export const OpenTelemetryModuleDefaultConfig = {
  serviceName: 'UNKNOWN',
  traceAutoInjectors: [
    ControllerInjector,
    GuardInjector,
    EventEmitterInjector,
    ScheduleInjector,
    PipeInjector,
    LoggerInjector,
  ],
  autoDetectResources: false,
  resourceDetectors: [containerDetector],
  contextManager: new AsyncLocalStorageContextManager(),
  resource: new Resource({
    lib: '@overbit/opentelemetry-nestjs',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  spanProcessor: new NoopSpanProcessor(),
  textMapPropagator: new CompositePropagator({
    propagators: [
      new JaegerPropagator(),
      new B3Propagator(),
      new B3Propagator({
        injectEncoding: B3InjectEncoding.MULTI_HEADER,
      }),
    ],
  }),
} as OpenTelemetryModuleConfig;
