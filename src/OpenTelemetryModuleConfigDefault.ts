import { ControllerInjector } from './Trace/Injectors/ControllerInjector';
import { GuardInjector } from './Trace/Injectors/GuardInjector';
import { EventEmitterInjector } from './Trace/Injectors/EventEmitterInjector';
import { ScheduleInjector } from './Trace/Injectors/ScheduleInjector';
import { PipeInjector } from './Trace/Injectors/PipeInjector';
import { ConsoleLoggerInjector } from './Trace/Injectors/ConsoleLoggerInjector';
import { OpenTelemetryModuleConfig } from './OpenTelemetryModuleConfig.interface';
import { GraphQLResolverInjector } from './Trace/Injectors/GraphQLResolverInjector';
import { InterceptorInjector } from './Trace/Injectors/InterceptorInjector.js';

export const OpenTelemetryModuleDefaultConfig = <OpenTelemetryModuleConfig>[
  ControllerInjector,
  GraphQLResolverInjector,
  GuardInjector,
  InterceptorInjector,
  EventEmitterInjector,
  ScheduleInjector,
  PipeInjector,
  ConsoleLoggerInjector,
];
