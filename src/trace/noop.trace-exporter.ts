import { SpanExporter } from '@opentelemetry/sdk-trace-node';

export class NoopTraceExporter implements SpanExporter {
  export() {
    // noop
  }

  shutdown(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
