# NestJS OpenTelemetry

<p align="center">
<a href="https://www.npmjs.com/package/@amplication/opentelemetry-nestjs"><img src="https://img.shields.io/npm/v/@amplication/opentelemetry-nestjs.svg"/> <img src="https://img.shields.io/npm/dt/@amplication/opentelemetry-nestjs.svg"/></a>
<a href="https://github.com/overbit/opentelemetry-nestjs"><img src="https://img.shields.io/npm/l/@overbit/opentelemetry-nestjs.svg"/></a>
<a href="https://github.com/overbit/opentelemetry-nestjs"><img src="https://img.shields.io/github/stars/overbit/opentelemetry-nestjs.svg"/></a>
</p>

This library, originally forked
from [@overbit/opentelemetry-nestjs](https://github.com/overbit/opentelemetry-nestjs.git), provides seamless
OpenTelemetry integration for NestJS applications, including automatic tracing and metrics.

## Description

Designed for NestJS, a protocol-agnostic framework, this library works across HTTP, GRPC, RabbitMQ, and other protocols.
It enables deep observability of NestJS-specific layers,
including [Controllers](https://docs.nestjs.com/controllers), [Guards](https://docs.nestjs.com/guards), [Interceptors](https://docs.nestjs.com/interceptors), [Pipes](https://docs.nestjs.com/pipes),
and [Providers](https://docs.nestjs.com/providers).

Additionally, it provides automatic trace and metric instrumentation for widely-used NestJS libraries, helping you
monitor and analyze your application with minimal configuration.

## Installation

```bash
npm install @amplication/opentelemetry-nestjs --save
```

## Setup

Getting started with `@amplication/opentelemetry-nestjs` is simple. To enable automatic instrumentation for most NestJS
components, just import the `OpenTelemetryModule` in your root module:

```ts
import { OpenTelemetryModule } from '@amplication/opentelemetry-nestjs';

@Module({
  imports: [OpenTelemetryModule.forRoot()],
})
export class AppModule {}
```

This will automatically instrument controllers, providers, guards, interceptors, and other core NestJS layers, giving
you observability out-of-the-box.

> [!TIP]
> This library only instruments NestJS code. Make sure
> the [OpenTelemetry Node SDK](https://opentelemetry.io/docs/languages/js/getting-started/nodejs) is installed and
> properly initialized to collect traces and metrics. This package also
> provides [helpers](#starting-the-opentelemetry-sdk) for it.

## Usage

While this library automatically instruments core NestJS layers, you can use `@Traceable` and `@Span` decorators to
create custom spans for specific methods, such as provider functions. This allows you to give meaningful names to spans
and capture fine-grained traces for important operations.

### `@Span`

```ts
import { Injectable } from '@nestjs/common';
import { Span } from '@amplication/opentelemetry-nestjs';

@Injectable()
export class AppService {
  @Span()
  getHello(): string {
    return 'Hello World!';
  }

  @Span('SpecialCase')
  getSpecial(): string {
    return 'Never miss a SpecialCase with its fancy name!';
  }
}
```

### `@Traceable`

`@Traceable` works like `@Span` but with the difference that it can be used at a class level to auto instrument every
method of the class:

```ts
import { Injectable } from '@nestjs/common';
import { Traceable } from '@amplication/opentelemetry-nestjs';

@Traceable()
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

## `Tracer`

In an advanced use cases, you need to access the native OpenTelemetry trace provider to access them from NestJS
application context. In that case you can inject the `Tracer` provider:

```ts
import { Injectable } from '@nestjs/common';
import { Tracer } from '@amplication/opentelemetry-nestjs';

@Injectable()
export class AppService {
  constructor(private readonly tracer: Tracer) {}

  getHello(): string {
    const span = this.tracer.startSpan('important_section_start');
    // do something important
    span.setAttributes({ userId: 1150 });
    span.end();
    return 'Hello World!';
  }
}
```

### `TraceService`

The `TraceService` provides direct access to the current span context and allows you to start custom spans:

```ts
import { Injectable } from '@nestjs/common';
import { TraceService } from '@amplication/opentelemetry-nestjs';

@Injectable()
export class AppService {
  constructor(private readonly traceService: TraceService) {}

  getHello(): string {
    const span = this.traceService.startSpan('hello');
    // do something
    span.end();
    return 'Hello World!';
  }
}
```

## Auto Trace Instrumentation

The library comes with comprehensive NestJS instrumentation out-of-the-box. Once you import the module, controllers,
guards, providers, pipes, and other core components are automatically traced.

If you want to customize which instrumentations are enabled, you can use the `instrumentation` option:

```ts
import { Module } from '@nestjs/common';
import {
  OpenTelemetryModule,
  ControllerInstrumentation,
  EventEmitterInstrumentation,
  GuardInstrumentation,
  LoggerInstrumentation,
  PipeInstrumentation,
  ScheduleInstrumentation,
} from '@amplication/opentelemetry-nestjs';

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      instrumentation: [
        ControllerInstrumentation,
        GuardInstrumentation,
        EventEmitterInstrumentation,
        ScheduleInstrumentation,
        PipeInstrumentation,
        LoggerInstrumentation,
      ],
    }),
  ],
})
export class AppModule {}
```

### Instrumented components

| Instance                       | Description                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ControllerInstrumentation`    | Auto trace all of module controllers                                                                                                                                                                               |
| `GuardInstrumentation`         | Auto trace all of module guards including global guards                                                                                                                                                            |
| `PipeInstrumentation`          | Auto trace all of module pipes including global pipes                                                                                                                                                              |
| `InterceptorInstrumentation`   | Auto trace all of module interceptors including global pipes                                                                                                                                                       |
| `EventEmitterInstrumentation`  | Auto trace for [@nestjs/event-emitter](https://docs.nestjs.com/techniques/events) library, supports all features                                                                                                   |
| `ScheduleInstrumentation`      | Auto trace for [@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling) library, supports all features                                                                                               |
| `ConsoleLoggerInstrumentation` | [ConsoleLogger](https://docs.nestjs.com/techniques/logger#extend-built-in-logger) and [Logger](https://docs.nestjs.com/techniques/logger#using-the-logger-for-application-logging) class tracer, logs with traceId |

#### Logging with Trace ID

By enabling ConsoleLoggerInstrumentation (or using the default configuration), all logs will automatically include the
current trace ID, making it easier to correlate logs with traces:

![Example trace output](./docs/log.png)

### Manual Tracing for Non-Injectable Classes

If you need to trace instances of classes that aren’t managed by the NestJS DI container, you can wrap the instance with
`TraceWrapper.trace()`. This automatically creates a new span for each method:

```ts
import { TraceWrapper } from '@amplication/opentelemetry-nestjs';

class MyClass {
  hello() {
    console.log('Hi');
  }

  async bye() {
    await new Promise(() => console.log('bye bye'));
  }
}

// ....

const instance = new MyClass();
const tracedInstance = TraceWrapper.trace(instance);

// ....
```

## Metrics

You can set up metrics collection using the Prometheus exporter. First, install the Prometheus exporter package:

```
npm install @opentelemetry/exporter-prometheus
```

Then, configure it in your OpenTelemetry Node SDK:

```ts
new NodeSDK({
  serviceName: 'nestjs-opentelemetry-example',
  // ...
  metricReader: new PrometheusExporter({
    endpoint: 'metrics',
    port: 9464,
  }),
});
```

You can now access the automatically collected metrics via the Prometheus exporter
at [http://localhost:9464/metrics](http://localhost:9464/metrics).

For other exporter options, see
the [OpenTelemetry JavaScript exporters documentation](https://opentelemetry.io/docs/js/exporters/).

## Starting the OpenTelemetry SDK

In a typical OpenTelemetry setup for Node.js, it’s conventional to create a `tracing.ts` (or similarly named) file where
you initialize and configure the SDK. This file should be imported **at the very top of `main.ts`**, before any other
imports, so that all modules and libraries loaded afterward are properly instrumented. Doing this ensures that spans
are correctly created for your application’s operations, and that context propagation and auto-instrumentations are
active from the start of the process.

This package provides a set of helper functions to simplify starting and configuring the OpenTelemetry Node SDK for
NestJS applications. It covers context management, propagators, resource detection, auto-instrumentations, and span
processing — and can significantly reduce noise in traces.

### `startNestJsOpenTelemetrySDK(configuration)`

Starts the Node OpenTelemetry SDK with default NestJS-friendly helpers, including auto-instrumentations, context
manager, propagators, and resource detectors. Accepts any `NodeSDKConfiguration` overrides:

**Example:**

```ts
import { startNestJsOpenTelemetrySDK } from '@amplication/opentelemetry-nestjs';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

const sdk = startNestJsOpenTelemetrySDK({
  serviceName: 'nestjs-example',
  metricReader: new PrometheusExporter({ endpoint: 'metrics', port: 9464 }),
});
```

`startNestJsOpenTelemetrySDK` is equivalent to the following:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  nodeAutoInstrumentationReduceNoise,
  nodeAutoInstrumentationHttpReduceIncoming,
  nestjsContextManager,
  nestjsTextMapPropagator,
  nestjsResourceDetectors,
} from '@amplication/opentelemetry-nestjs';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  instrumentations: getNodeAutoInstrumentations(
    mergeInstrumentationConfigMap(
      nodeAutoInstrumentationReduceNoise(),
      nodeAutoInstrumentationHttpReduceIncoming(),
    ),
  ),
  contextManager: nestjsContextManager(),
  textMapPropagator: nestjsTextMapPropagator(),
  resourceDetectors: nestjsResourceDetectors(),
});

sdk.start();
```

### `nodeAutoInstrumentationReduceNoise()`

Returns a preconfigured set of Node auto-instrumentations with noise reduction:

- `fs` instrumentation ignores files in `node_modules` and tags spans with file paths.
- `http` instrumentation updates incoming request spans to `"HTTP_METHOD PATH"`.
- `graphql` instrumentation is configured for NestJS (`mergeItems: true`, `ignoreResolveSpans: true`,
  `ignoreTrivialResolveSpans: true`).
- `net`, `dns`, `express`, and `nestjs-core` instrumentations are disabled to reduce noise.

**Example:**

```ts
import { nodeAutoInstrumentationReduceNoise } from '@amplication/opentelemetry-nestjs';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const instrumentations = getNodeAutoInstrumentations(
  nodeAutoInstrumentationReduceNoise(),
);
```

### `nodeAutoInstrumentationHttpReduceIncoming(options?)`

Filters out specific incoming HTTP requests from tracing, such as health checks or OPTIONS requests.

**Options:**

- `healthChecks`: array of URL paths to ignore (`['/health', '/_health', '/healthz', 'healthcheck']` by default)
- `methods`: array of HTTP methods to ignore (`['OPTIONS']` by default)

**Example:**

```ts
import { nodeAutoInstrumentationHttpReduceIncoming } from '@amplication/opentelemetry-nestjs';

const httpInstrumentations = nodeAutoInstrumentationHttpReduceIncoming({
  healthChecks: ['/health', '/status'],
  methods: ['OPTIONS'],
});
```

---

### `nestjsContextManager()`

Returns an `AsyncLocalStorageContextManager` for proper context propagation in async NestJS code.

**Example:**

```ts
import { nestjsContextManager } from '@amplication/opentelemetry-nestjs';

const contextManager = nestjsContextManager();
```

---

### `nestjsTextMapPropagator()`

Returns a composite propagator supporting:

- Jaeger
- W3C Trace Context
- B3 single-header and multi-header

**Example:**

```ts
import { nestjsTextMapPropagator } from '@amplication/opentelemetry-nestjs';

const propagator = nestjsTextMapPropagator();
```

---

### `nestjsResourceDetectors()`

Returns an array of resource detectors to enrich spans with environment information (currently includes
`containerDetector`).

**Example:**

```ts
import { nestjsResourceDetectors } from '@amplication/opentelemetry-nestjs';

const detectors = nestjsResourceDetectors();
```

---

### `mergeInstrumentationConfigMap(target, source)`

Recursively merges two instrumentation configuration objects. Useful to combine custom auto-instrumentation options with
the defaults.

**Example:**

```ts
import {
  mergeInstrumentationConfigMap,
  nodeAutoInstrumentationReduceNoise,
} from '@amplication/opentelemetry-nestjs';

const customConfig = {
  '@opentelemetry/instrumentation-http': {
    ignoreIncomingRequestHook: (req) => req.url === '/metrics',
  },
};

const merged = mergeInstrumentationConfigMap(
  nodeAutoInstrumentationReduceNoise(),
  customConfig,
);
```

### Examples

```ts
/* tracing.ts */
import { startNestJsOpenTelemetrySDK } from '@amplication/opentelemetry-nestjs';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { CompositePropagator } from '@opentelemetry/core';
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';

startNestJsOpenTelemetrySDK({
  serviceName: 'myservice-opentelemetry-example',
  metricReader: new PrometheusExporter({
    endpoint: 'metrics',
    port: 9464,
  }),
  spanProcessors: [
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: 'your-jaeger-url',
      }),
    ),
  ],
  textMapPropagator: new CompositePropagator({
    propagators: [
      new JaegerPropagator(),
      new B3Propagator(),
      new B3Propagator({
        injectEncoding: B3InjectEncoding.MULTI_HEADER,
      }),
    ],
  }),
});

import { NestFactory } from '@nestjs/core';
// ....
```

```ts
/* at the very top of main.ts */
import 'tracing.ts';
// ...
```

```ts
/* app.module.ts */
import { Module } from '@nestjs/common';
import { OpenTelemetryModule } from '@amplication/opentelemetry-nestjs';

@Module({
  imports: [OpenTelemetryModule.forRoot()],
})
export class AppModule {}
```

### AWS X-Ray/CloudWatch

For the integration with AWS X-Ray and CloudWatch, follow
the [official instructions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-OTLPEndpoint.html):

```ts
/* tracing.ts */
import {
  startNestJsOpenTelemetrySDK,
  defaultInstrumentation,
} from '@amplication/opentelemetry-nestjs';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { CompositePropagator } from '@opentelemetry/core';
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';

startNestJsOpenTelemetrySDK({
  serviceName: 'myservice-opentelemetry-example',
  metricReader: new PrometheusExporter({
    endpoint: 'metrics',
    port: 9464,
  }),
  instrumentations: [
    ...defaultInstrumentation,
    new AwsInstrumentation({
      suppressInternalInstrumentation: true,
      sqsExtractContextPropagationFromPayload: true,
    }),
  ],
  idGenerator: new AWSXRayIdGenerator(),
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({}))],
  textMapPropagator: new AWSXRayPropagator(),
});
```

## Migrating to v6

In v6 the naming of the traces has been updated to be more in line with OpenTelemetry Semantic Conventions:

In v5 auto instrumentation would have trace names similar to `Pipe->Global->MyPipe`, now instead the name is `MyPipe`
and more semantic attributes are added to qualify the span instead:

```
nestjs.type: pipe
nestjs.scope: global
```

In v6 the library was restructured and most files and classes were renamed to be more in line with the OpenTelemetry
semantics, the TypeScript naming conventions, and to generally be clearer. You may have to update your imports. Most
notably, all the `*Injector` classes have been renamed to `*Instrumentation`.

Additionally, pattern for configuring the module has been restructured to match typical NestJS module configuration and
now takes an object with `instrumentation` option.
