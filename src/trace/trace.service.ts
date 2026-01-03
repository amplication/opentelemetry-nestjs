import { context, trace, Span } from '@opentelemetry/api';
import { Injectable } from '@nestjs/common';
import { Constants } from '../constants';

@Injectable()
export class TraceService {
  public getTracer() {
    return trace.getTracer(Constants.TRACER_NAME);
  }

  public getSpan(): Span {
    return trace.getSpan(context.active());
  }

  public startSpan(name: string): Span {
    const tracer = trace.getTracer(Constants.TRACER_NAME);
    return tracer.startSpan(name);
  }
}
