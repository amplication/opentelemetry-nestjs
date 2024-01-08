import { SpanKind } from '@opentelemetry/api';
import { TraceWrapperOptions } from './TraceWrapper.types';
export declare class TraceWrapper {
    static trace<T>(instance: T, options?: TraceWrapperOptions): T;
    static wrap(prototype: Record<any, any>, traceName: string, attributes?: {}, kind?: SpanKind): Record<any, any>;
    private static reDecorate;
    private static recordException;
    private static affect;
}
