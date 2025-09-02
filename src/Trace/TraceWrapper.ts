import { context, Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { Constants } from '../Constants';
import { TraceWrapperOptions } from './TraceWrapper.types';
import { MetadataScanner } from '../MetaScanner';

export class TraceWrapper {
  /**
   * Trace a class by wrapping all methods in a trace segment
   * @param instance Instance of the class to trace
   * @param options @type {TraceWrapperOptions} Options for the trace
   * @returns The traced instance of the class
   */
  static trace<T>(instance: T, options?: TraceWrapperOptions): T {
    const logger = options?.logger ?? console;
    const keys = new MetadataScanner().getAllMethodNames(
      instance.constructor.prototype,
    );
    for (const key of keys) {
      const defaultTraceName = `${instance.constructor.name}.${instance[key].name}`;
      const method = TraceWrapper.wrap(instance[key], defaultTraceName, {
        class: instance.constructor.name,
        method: instance[key].name,
        ...(options?.attributes ?? {}),
      });
      TraceWrapper.reDecorate(instance[key], method);

      instance[key] = method;
      logger.debug(`Mapped ${instance.constructor.name}.${key}`, {
        class: instance.constructor.name,
        method: key,
      });
    }

    return instance;
  }

  /**
   * Wrap a method in a trace segment
   * @param prototype prototype of the method to wrap
   * @param traceName Span/Segment name
   * @param attributes Additional attributes to add to the span
   * @returns The wrapped method
   */
  static wrap(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prototype: Record<any, any>,
    traceName: string,
    attributes = {},
    kind?: SpanKind,
  ): Record<any, any> {
    let method;

    if (prototype.constructor.name === 'AsyncFunction') {
      console.log("WRAPPING ASYNC", prototype.name)
      method = {
        [prototype.name]: async function (...args: unknown[]) {
          const tracer = trace.getTracer(Constants.TRACER_NAME);
          console.log('wrapped async exec', prototype.name, traceName, kind, attributes)
          return await tracer.startActiveSpan(
            traceName,
            { kind },
            async (span) => {
              span.setAttributes(attributes);
              return prototype
                .apply(this, args)
                .catch((error) => TraceWrapper.recordException(error, span))
                .finally(() => {
                  span.end();
                });
            },
          );
        },
      }[prototype.name];
    } else {
      console.log("WRAPPING NORMAL", prototype.name)
      method = {
        [prototype.name]: function (...args: unknown[]) {
          const tracer = trace.getTracer(Constants.TRACER_NAME);
          console.log('wrapped exec', prototype.name, traceName, kind, attributes, context.active())
          return tracer.startActiveSpan(traceName, { kind }, context.active(), (span) => {
            try {
              span.setAttributes(attributes);
              return prototype.apply(this, args);
            } catch (error) {
              TraceWrapper.recordException(error, span);
            } finally {
              span.end();
            }
          });
        },
      }[prototype.name];
    }

    Reflect.defineMetadata(Constants.TRACE_METADATA, traceName, method);
    TraceWrapper.affect(method);
    TraceWrapper.reDecorate(prototype, method);

    return method;
  }

  private static reDecorate(source, destination) {
    const keys = Reflect.getMetadataKeys(source);

    for (const key of keys) {
      const meta = Reflect.getMetadata(key, source);
      Reflect.defineMetadata(key, meta, destination);
    }
  }

  private static recordException(error, span: Span) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  }

  private static affect(prototype) {
    Reflect.defineMetadata(Constants.TRACE_METADATA_ACTIVE, 1, prototype);
  }
}
