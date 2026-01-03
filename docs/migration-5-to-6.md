# Migration Guide: v5.x to v6.x

This guide will help you migrate your application from `@amplication/opentelemetry-nestjs` v5.x to v6.x.

## Overview

Version 6.0 introduces significant breaking changes to improve type safety, align with OpenTelemetry standards, and enhance code organization. The changes affect:

- Module configuration structure
- SDK initialization
- Import paths
- Custom instrumentation classes
- Async configuration

**Estimated migration time:** 30-60 minutes per project

---

## Table of Contents

1. [SDK Initialization](#1-sdk-initialization)
2. [Module Configuration](#2-module-configuration)
3. [Import Path Updates](#3-import-path-updates)
4. [Custom Instrumentation](#4-custom-instrumentation)
5. [Async Configuration](#5-async-configuration)
6. [Type Changes](#6-type-changes)
7. [Complete Migration Example](#7-complete-migration-example)

---

## 1. SDK Initialization

### Before (v5.x)

```typescript
// main.ts - at the very top
import { Tracing } from '@amplication/opentelemetry-nestjs';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';

Tracing.init({
  serviceName: 'my-service',
  spanProcessor: new SimpleSpanProcessor(
    new ZipkinExporter({
      url: 'your-zipkin-url',
    }),
  ),
});

import { NestFactory } from '@nestjs/core';
// ...
```

### After (v6.x)

```typescript
// tracing.ts (or similar)
import { startNestJsOpenTelemetrySDK } from '@amplication/opentelemetry-nestjs';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';

startNestJsOpenTelemetrySDK({
  serviceName: 'my-service',
  spanProcessors: [
    new SimpleSpanProcessor(
      new ZipkinExporter({
        url: 'your-zipkin-url',
      }),
    ),
  ],
});
```

```typescript
// main.ts - at the very top
import './tracing';

import { NestFactory } from '@nestjs/core';
// ...
```

**Key Changes:**

- `Tracing.init()` → `startNestJsOpenTelemetrySDK()`
- `spanProcessor` → `spanProcessors` (now an array)
- SDK initialization is now separate from the NestJS module

---

## 2. Module Configuration

### Before (v5.x)

```typescript
import { OpenTelemetryModule } from '@amplication/opentelemetry-nestjs';

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      serviceName: 'nestjs-opentelemetry-example',
    }),
  ],
})
export class AppModule {}
```

**Note:** In v5.x, `forRoot()` could accept an array of injectors or use defaults.

```typescript
import {
  OpenTelemetryModule,
  ControllerInjector,
  GuardInjector,
} from '@amplication/opentelemetry-nestjs';

@Module({
  imports: [OpenTelemetryModule.forRoot([ControllerInjector, GuardInjector])],
})
export class AppModule {}
```

### After (v6.x)

```typescript
import { OpenTelemetryModule } from '@amplication/opentelemetry-nestjs';

@Module({
  imports: [OpenTelemetryModule.forRoot()],
})
export class AppModule {}
```

**With custom instrumentation:**

```typescript
import {
  OpenTelemetryModule,
  ControllerInstrumentation,
  GuardInstrumentation,
} from '@amplication/opentelemetry-nestjs';

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      instrumentation: [ControllerInstrumentation, GuardInstrumentation],
    }),
  ],
})
export class AppModule {}
```

**Key Changes:**

- Configuration is now an **object** with an `instrumentation` property
- `serviceName` is no longer part of module config (moved to SDK initialization)
- All `*Injector` classes renamed to `*Instrumentation`

---

## 3. Import Path Updates

### File Naming Changes

All files have been renamed from PascalCase to kebab-case:

| v5.x                  | v6.x                        |
| --------------------- | --------------------------- |
| `OpenTelemetryModule` | `open-telemetry.module`     |
| `Constants`           | `constants`                 |
| `Tracing`             | `open-telemetry-nestjs-sdk` |
| `Trace/Injectors/*`   | `trace/instrumentation/*`   |
| `Trace/Decorators/*`  | `trace/decorators/*`        |

### Import Updates

#### Before (v5.x)

```typescript
import {
  OpenTelemetryModule,
  ControllerInjector,
  GuardInjector,
  EventEmitterInjector,
  ScheduleInjector,
  PipeInjector,
  ConsoleLoggerInjector,
  GraphQLResolverInjector,
} from '@amplication/opentelemetry-nestjs';
```

#### After (v6.x)

```typescript
import {
  OpenTelemetryModule,
  ControllerInstrumentation,
  GuardInstrumentation,
  EventEmitterInstrumentation,
  ScheduleInstrumentation,
  PipeInstrumentation,
  ConsoleLoggerInstrumentation,
  GraphQLResolverInstrumentation,
} from '@amplication/opentelemetry-nestjs';
```

**Note:** The main package exports remain the same, but internal class names have changed.

---

## 4. Custom Instrumentation

If you created custom injectors, you'll need to update them to the new `Instrumentation` interface.

### Before (v5.x)

```typescript
import { Injectable } from '@nestjs/common';
import { Injector } from '@amplication/opentelemetry-nestjs';

@Injectable()
export class MyCustomInjector implements Injector {
  async inject() {
    // Your instrumentation logic
  }
}
```

### After (v6.x)

```typescript
import { Injectable } from '@nestjs/common';
import { Instrumentation } from '@amplication/opentelemetry-nestjs';

@Injectable()
export class MyCustomInstrumentation implements Instrumentation {
  async setupInstrumentation() {
    // Your instrumentation logic
  }
}
```

**Key Changes:**

- `Injector` interface → `Instrumentation` interface
- `inject()` method → `setupInstrumentation()` method
- Class naming convention: `*Injector` → `*Instrumentation`

---

## 5. Async Configuration

### Before (v5.x)

```typescript
import { OpenTelemetryModule } from '@amplication/opentelemetry-nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    OpenTelemetryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        serviceName: configService.get('SERVICE_NAME'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### After (v6.x)

```typescript
import { OpenTelemetryModule } from '@amplication/opentelemetry-nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    OpenTelemetryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        instrumentation: [
          // Add your instrumentation here if needed
        ],
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

**Key Changes:**

- Better type safety with generic type parameters
- `serviceName` removed from module config (now in SDK initialization)
- Configuration structure matches the synchronous `forRoot()` format

**Note:** The async configuration now has improved type safety. TypeScript will infer the types of injected dependencies.

---

## 6. Type Changes

### Module Config Type

**Before:**

```typescript
type OpenTelemetryModuleConfig = Provider<Injector>[];
```

**After:**

```typescript
type OpenTelemetryModuleConfig = {
  instrumentation?: Provider<Instrumentation>[];
};
```

### Async Config Type

**Before:**

```typescript
interface OpenTelemetryModuleAsyncOption {
  useFactory?: (
    ...args: any[]
  ) =>
    | Promise<Partial<OpenTelemetryModuleConfig>>
    | Partial<OpenTelemetryModuleConfig>;
  inject?: any[];
}
```

**After:**

```typescript
interface OpenTelemetryModuleAsyncOptions<Tokens extends InjectionToken[]> {
  useFactory?: (
    ...args: {
      [K in keyof Tokens]: Tokens[K] extends InjectionToken<infer T>
        ? T
        : never;
    }
  ) =>
    | Promise<Partial<OpenTelemetryModuleConfig>>
    | Partial<OpenTelemetryModuleConfig>;
  inject?: Tokens;
}
```

---

## 7. Complete Migration Example

Here's a complete example showing the migration of a typical application:

### Before (v5.x)

```typescript
// main.ts
import { Tracing } from '@amplication/opentelemetry-nestjs';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';

Tracing.init({
  serviceName: 'my-app',
  spanProcessor: new SimpleSpanProcessor(
    new ZipkinExporter({ url: 'http://localhost:9411/api/v2/spans' }),
  ),
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import {
  OpenTelemetryModule,
  ControllerInjector,
  GuardInjector,
} from '@amplication/opentelemetry-nestjs';

@Module({
  imports: [OpenTelemetryModule.forRoot([ControllerInjector, GuardInjector])],
})
export class AppModule {}
```

### After (v6.x)

```typescript
// tracing.ts
import { startNestJsOpenTelemetrySDK } from '@amplication/opentelemetry-nestjs';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';

startNestJsOpenTelemetrySDK({
  serviceName: 'my-app',
  spanProcessors: [
    new SimpleSpanProcessor(
      new ZipkinExporter({ url: 'http://localhost:9411/api/v2/spans' }),
    ),
  ],
});
```

```typescript
// main.ts
import './tracing';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import {
  OpenTelemetryModule,
  ControllerInstrumentation,
  GuardInstrumentation,
} from '@amplication/opentelemetry-nestjs';

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      instrumentation: [ControllerInstrumentation, GuardInstrumentation],
    }),
  ],
})
export class AppModule {}
```

---

## Migration Checklist

Use this checklist to ensure you've completed all necessary changes:

- [ ] Update SDK initialization from `Tracing.init()` to `startNestJsOpenTelemetrySDK()`
- [ ] Move `serviceName` from module config to SDK initialization
- [ ] Update `spanProcessor` to `spanProcessors` (array) in SDK config
- [ ] Update module configuration from array to object format
- [ ] Rename all `*Injector` imports to `*Instrumentation`
- [ ] Update custom injectors to use `Instrumentation` interface and `setupInstrumentation()` method
- [ ] Update async configuration if used
- [ ] Test all instrumentation is working correctly
- [ ] Verify traces are being exported correctly

---

## Additional Notes

### Semantic Conventions

In v6, trace naming has been updated to align with OpenTelemetry Semantic Conventions:

**Before (v5):**

- Trace name: `Pipe->Global->MyPipe`
- Attributes: Basic

**After (v6):**

- Trace name: `MyPipe`
- Attributes:
  - `nestjs.type: pipe`
  - `nestjs.scope: global`

This provides cleaner trace names while maintaining all the necessary context through attributes.

### Default Instrumentation

The default instrumentation in v6 includes:

- `ControllerInstrumentation`
- `GraphQLResolverInstrumentation`
- `GuardInstrumentation`
- `InterceptorInstrumentation` (new in v6)
- `EventEmitterInstrumentation`
- `ScheduleInstrumentation`
- `PipeInstrumentation`
- `ConsoleLoggerInstrumentation`

If you were using the defaults in v5, you don't need to specify them explicitly in v6.

---

## Summary

The migration to v6.x improves:

- ✅ Type safety with better TypeScript support
- ✅ Semantic clarity with OpenTelemetry-aligned naming
- ✅ Code organization with clearer structure
- ✅ Separation of concerns (SDK vs Module)

While the changes are breaking, they result in a more maintainable and standards-compliant library.

---

## Acknowledgments

Thanks to [@Helveg](https://github.com/Helveg) for most of the modernization work that made v6.0 possible. See [PR #13: Modernization of the package](https://github.com/amplication/opentelemetry-nestjs/pull/13) for details.
