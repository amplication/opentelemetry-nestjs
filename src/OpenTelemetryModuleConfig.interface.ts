import type { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import type { Instrumentation } from './Trace/Instrumentation/Instrumentation';

export type OpenTelemetryModuleConfig = {
  instrumentation?: Provider<Instrumentation>[];
};
