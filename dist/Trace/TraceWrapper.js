"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceWrapper = void 0;
const api_1 = require("@opentelemetry/api");
const Constants_1 = require("../Constants");
const MetaScanner_1 = require("../MetaScanner");
class TraceWrapper {
    static trace(instance, options) {
        const logger = options?.logger ?? console;
        const keys = new MetaScanner_1.MetadataScanner().getAllMethodNames(instance.constructor.prototype);
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
    static wrap(prototype, traceName, attributes = {}, kind) {
        let method;
        if (prototype.constructor.name === 'AsyncFunction') {
            method = {
                [prototype.name]: async function (...args) {
                    const tracer = api_1.trace.getTracer('default');
                    return await tracer.startActiveSpan(traceName, { kind }, async (span) => {
                        span.setAttributes(attributes);
                        return prototype
                            .apply(this, args)
                            .catch((error) => TraceWrapper.recordException(error, span))
                            .finally(() => {
                            span.end();
                        });
                    });
                },
            }[prototype.name];
        }
        else {
            method = {
                [prototype.name]: function (...args) {
                    const tracer = api_1.trace.getTracer('default');
                    return tracer.startActiveSpan(traceName, { kind }, (span) => {
                        try {
                            span.setAttributes(attributes);
                            return prototype.apply(this, args);
                        }
                        catch (error) {
                            TraceWrapper.recordException(error, span);
                        }
                        finally {
                            span.end();
                        }
                    });
                },
            }[prototype.name];
        }
        Reflect.defineMetadata(Constants_1.Constants.TRACE_METADATA, traceName, method);
        TraceWrapper.affect(method);
        TraceWrapper.reDecorate(prototype, method);
        return method;
    }
    static reDecorate(source, destination) {
        const keys = Reflect.getMetadataKeys(source);
        for (const key of keys) {
            const meta = Reflect.getMetadata(key, source);
            Reflect.defineMetadata(key, meta, destination);
        }
    }
    static recordException(error, span) {
        span.recordException(error);
        span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: error.message });
        throw error;
    }
    static affect(prototype) {
        Reflect.defineMetadata(Constants_1.Constants.TRACE_METADATA_ACTIVE, 1, prototype);
    }
}
exports.TraceWrapper = TraceWrapper;
//# sourceMappingURL=TraceWrapper.js.map