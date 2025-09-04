import { ControllerInstrumentation } from './Trace/Instrumentation/ControllerInstrumentation';
import { GuardInstrumentation } from './Trace/Instrumentation/GuardInstrumentation';
import { EventEmitterInstrumentation } from './Trace/Instrumentation/EventEmitterInstrumentation';
import { ScheduleInstrumentation } from './Trace/Instrumentation/ScheduleInstrumentation';
import { PipeInstrumentation } from './Trace/Instrumentation/PipeInstrumentation';
import { ConsoleLoggerInstrumentation } from './Trace/Instrumentation/ConsoleLoggerInstrumentation';
import { GraphQLResolverInstrumentation } from './Trace/Instrumentation/GraphQLResolverInstrumentation';
import { InterceptorInstrumentation } from './Trace/Instrumentation/InterceptorInstrumentation';
import { Instrumentation } from './Trace/Instrumentation/Instrumentation.js';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';

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
