import {
  context,
  Span,
  SpanKind,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import { Constants } from '../constants';
import { TraceWrapperOptions } from './trace-wrapper.types';
import { MetadataScanner } from '../meta-scanner';
import { catchError, finalize, isObservable, Observable } from 'rxjs';
import { isPromise } from 'rxjs/internal/util/isPromise';

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
   * @param options Span options. Only supports spanKind
   * @returns The wrapped method
   */
  static wrap(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prototype: Record<any, any>,
    traceName: string,
    attributes = {},
    options: { kind?: SpanKind; wrapObservable?: boolean } = {},
  ): Record<any, any> {
    let method;

    const observableWrapper = (promise: Promise<unknown>, span: Span) =>
      this.wrapObservable(promise, span);

    if (prototype.constructor.name === 'AsyncFunction') {
      method = {
        [prototype.name]: async function (...args: unknown[]) {
          const tracer = trace.getTracer(Constants.TRACER_NAME);

          return await tracer.startActiveSpan(
            traceName,
            { kind: options.kind },
            async (span) => {
              span.setAttributes(attributes);
              const promise = prototype
                .apply(this, args)
                .catch((error) => TraceWrapper.recordException(error, span));

              if (options.wrapObservable) {
                return observableWrapper(promise, span);
              } else {
                return promise.finally(() => span.end());
              }
            },
          );
        },
      }[prototype.name];
    } else {
      method = {
        [prototype.name]: function (...args: unknown[]) {
          const tracer = trace.getTracer(Constants.TRACER_NAME);

          return tracer.startActiveSpan(
            traceName,
            { kind: options.kind },
            context.active(),
            (span) => {
              try {
                span.setAttributes(attributes);
                const returnValue = prototype.apply(this, args);
                if (options.wrapObservable) {
                  return observableWrapper(returnValue, span);
                } else {
                  return returnValue;
                }
              } catch (error) {
                TraceWrapper.recordException(error, span);
              } finally {
                if (!options.wrapObservable) {
                  span.end();
                }
              }
            },
          );
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

  private static wrapObservable(
    promiseOrObservable: unknown | Promise<unknown>,
    span: Span,
  ) {
    if (isPromise(promiseOrObservable)) {
      return promiseOrObservable.then((obs) => this.wrapObservable(obs, span));
    }

    if (isObservable(promiseOrObservable)) {
      return (promiseOrObservable as Observable<unknown>).pipe(
        catchError((error) => {
          TraceWrapper.recordException(error, span);
          throw error;
        }),
        finalize(() => span.end()),
      );
    } else {
      span.end();
    }

    // Did not receive what we expected, let's just do nothing then.
    return promiseOrObservable;
  }
}
