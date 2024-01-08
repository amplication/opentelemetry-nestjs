"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenTelemetryModuleDefaultConfig = exports.NodeAutoInstrumentationsDefaultConfig = void 0;
const ControllerInjector_1 = require("./Trace/Injectors/ControllerInjector");
const GuardInjector_1 = require("./Trace/Injectors/GuardInjector");
const EventEmitterInjector_1 = require("./Trace/Injectors/EventEmitterInjector");
const ScheduleInjector_1 = require("./Trace/Injectors/ScheduleInjector");
const PipeInjector_1 = require("./Trace/Injectors/PipeInjector");
const ConsoleLoggerInjector_1 = require("./Trace/Injectors/ConsoleLoggerInjector");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const resources_1 = require("@opentelemetry/resources");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const core_1 = require("@opentelemetry/core");
const propagator_jaeger_1 = require("@opentelemetry/propagator-jaeger");
const propagator_b3_1 = require("@opentelemetry/propagator-b3");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const resource_detector_container_1 = require("@opentelemetry/resource-detector-container");
const http_1 = require("http");
const GraphQLResolverInjector_1 = require("./Trace/Injectors/GraphQLResolverInjector");
exports.NodeAutoInstrumentationsDefaultConfig = {
    '@opentelemetry/instrumentation-fs': {
        requireParentSpan: true,
        enabled: true,
        createHook: (funtionName, { args }) => {
            return !args[0].toString().indexOf('node_modules');
        },
        endHook: (funtionName, { args, span }) => {
            span.setAttribute('file', args[0].toString());
        },
    },
    '@opentelemetry/instrumentation-http': {
        requireParentforOutgoingSpans: true,
        requestHook: (span, request) => {
            if (request instanceof http_1.ClientRequest)
                span.updateName(`${request.method} ${request.path}`);
            if (request instanceof http_1.IncomingMessage)
                span.updateName(`${request.method} ${request.url}`);
        },
        enabled: true,
        ignoreIncomingPaths: ['/health', '/_health', '/healthz', 'healthcheck'],
    },
    '@opentelemetry/instrumentation-net': {
        enabled: false,
    },
    '@opentelemetry/instrumentation-dns': {
        enabled: false,
    },
    '@opentelemetry/instrumentation-graphql': {
        enabled: true,
        mergeItems: true,
        ignoreTrivialResolveSpans: true,
        depth: 2,
    },
    '@opentelemetry/instrumentation-express': {
        enabled: true,
    },
};
exports.OpenTelemetryModuleDefaultConfig = {
    serviceName: 'UNKNOWN',
    traceAutoInjectors: [
        ControllerInjector_1.ControllerInjector,
        GraphQLResolverInjector_1.GraphQLResolverInjector,
        GuardInjector_1.GuardInjector,
        EventEmitterInjector_1.EventEmitterInjector,
        ScheduleInjector_1.ScheduleInjector,
        PipeInjector_1.PipeInjector,
        ConsoleLoggerInjector_1.ConsoleLoggerInjector,
    ],
    autoDetectResources: false,
    resourceDetectors: [resource_detector_container_1.containerDetector],
    contextManager: new context_async_hooks_1.AsyncLocalStorageContextManager(),
    resource: new resources_1.Resource({
        lib: '@overbit/opentelemetry-nestjs',
    }),
    instrumentations: [
        (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)(exports.NodeAutoInstrumentationsDefaultConfig),
    ],
    spanProcessor: new sdk_trace_base_1.NoopSpanProcessor(),
    textMapPropagator: new core_1.CompositePropagator({
        propagators: [
            new propagator_jaeger_1.JaegerPropagator(),
            new propagator_b3_1.B3Propagator(),
            new propagator_b3_1.B3Propagator({
                injectEncoding: propagator_b3_1.B3InjectEncoding.MULTI_HEADER,
            }),
        ],
    }),
};
//# sourceMappingURL=OpenTelemetryModuleDefaultConfig.js.map