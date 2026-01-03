import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import {
  InstrumentationConfigMap,
  getNodeAutoInstrumentations,
} from '@opentelemetry/auto-instrumentations-node';
import { containerDetector } from '@opentelemetry/resource-detector-container';
import { Span } from '@opentelemetry/api';
import { IncomingMessage } from 'http';
import { NodeSDK, NodeSDKConfiguration } from '@opentelemetry/sdk-node';

export function nodeAutoInstrumentationReduceNoise(): InstrumentationConfigMap {
  return {
    '@opentelemetry/instrumentation-fs': {
      requireParentSpan: true,
      enabled: true,
      createHook: (_, { args }) => {
        return !args[0].toString().includes('node_modules');
      },
      endHook: (_, { args, span }) => {
        span.setAttribute('file', args[0].toString());
      },
    },
    '@opentelemetry/instrumentation-http': {
      requireParentforOutgoingSpans: true,
      requestHook: (span: Span, request: IncomingMessage) => {
        span.updateName(`${request.method} ${request.url}`);
      },
      enabled: true,
    },
    '@opentelemetry/instrumentation-graphql': {
      enabled: true,
      mergeItems: true,
      ignoreResolveSpans: true,
      ignoreTrivialResolveSpans: true,
    },
    '@opentelemetry/instrumentation-net': {
      enabled: false,
    },
    '@opentelemetry/instrumentation-nestjs-core': {
      enabled: false,
    },
    '@opentelemetry/instrumentation-dns': {
      enabled: false,
    },
    '@opentelemetry/instrumentation-express': {
      enabled: false,
    },
  };
}

export function nodeAutoInstrumentationHttpReduceIncoming(
  options: { healthChecks?: string[] | false; methods?: string[] | false } = {
    healthChecks: ['/health', '/_health', '/healthz', '/healthcheck'],
    methods: ['OPTIONS'],
  },
): InstrumentationConfigMap {
  return {
    '@opentelemetry/instrumentation-http': {
      ignoreIncomingRequestHook: (request: IncomingMessage) => {
        return (
          (options.healthChecks &&
            options.healthChecks.includes(request.url)) ||
          (options.methods && options.methods.includes(request.method))
        );
      },
    },
  };
}

export function nestjsResourceDetectors() {
  return [containerDetector];
}

export function nestjsContextManager() {
  return new AsyncLocalStorageContextManager();
}

export function nestjsTextMapPropagator() {
  return new CompositePropagator({
    propagators: [
      new JaegerPropagator(),
      new W3CTraceContextPropagator(),
      new B3Propagator(),
      new B3Propagator({
        injectEncoding: B3InjectEncoding.MULTI_HEADER,
      }),
    ],
  });
}

export function startNestJsOpenTelemetrySDK(
  configuration: Partial<NodeSDKConfiguration>,
) {
  const sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations(
        mergeInstrumentationConfigMap(
          nodeAutoInstrumentationReduceNoise(),
          nodeAutoInstrumentationHttpReduceIncoming(),
        ),
      ),
    ],
    resourceDetectors: nestjsResourceDetectors(),
    textMapPropagator: nestjsTextMapPropagator(),
    contextManager: nestjsContextManager(),
    ...configuration,
  } as const satisfies Partial<NodeSDKConfiguration>);
  sdk.start();
  return sdk;
}

export function mergeInstrumentationConfigMap<T>(
  target: Partial<T>,
  source: Partial<T>,
): T {
  const output = { ...target } as any;
  for (const key of Object.keys(source)) {
    const srcVal = (source as any)[key];
    const tgtVal = (target as any)[key];

    if (
      srcVal &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      output[key] = mergeInstrumentationConfigMap(tgtVal, srcVal);
    } else {
      output[key] = srcVal;
    }
  }
  return output;
}
