import { InjectionToken, ModuleMetadata, Provider } from '@nestjs/common';
import type { Instrumentation } from './trace/instrumentation/Instrumentation';

export type OpenTelemetryModuleConfig = {
  instrumentation?: Provider<Instrumentation>[];
};

export interface OpenTelemetryModuleAsyncOptions<
  Tokens extends InjectionToken[],
> extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: {
      [K in keyof Tokens]: Tokens[K] extends InjectionToken<infer T>
        ? T
        : never;
    }
  ) =>
    | Promise<Partial<OpenTelemetryModuleConfig>>
    | Partial<OpenTelemetryModuleConfig>;
  inject?: Tokens;
}
