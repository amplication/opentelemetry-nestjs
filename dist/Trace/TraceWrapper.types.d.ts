import { ILogger } from './Logger.interface';
export interface TraceWrapperOptions {
    attributes?: Record<string, string>;
    logger?: ILogger;
}
