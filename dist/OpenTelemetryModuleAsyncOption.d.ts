import { ModuleMetadata } from '@nestjs/common';
import type { OpenTelemetryModuleConfig } from './OpenTelemetryModuleConfig.interface';
export interface OpenTelemetryModuleAsyncOption extends Pick<ModuleMetadata, 'imports'> {
    useFactory?: (...args: any[]) => Promise<Partial<OpenTelemetryModuleConfig>> | Partial<OpenTelemetryModuleConfig>;
    inject?: any[];
}
