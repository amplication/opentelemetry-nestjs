import { SpanExporter } from '@opentelemetry/sdk-trace-base';
export declare class NoopTraceExporter implements SpanExporter {
    export(): void;
    shutdown(): Promise<void>;
}
