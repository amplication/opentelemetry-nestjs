# 🧭 Project Overview
`@amplication/opentelemetry-nestjs` delivers first-class OpenTelemetry integration for NestJS apps by combining automatic instrumentation, decorators, and SDK helpers. The README (`README.md`) and global module (`src/open-telemetry.module.ts`) confirm that importing `OpenTelemetryModule.forRoot()` traces controllers, guards, pipes, interceptors, schedulers, event emitters, and loggers with zero extra setup. The SDK utilities in `src/open-telemetry-nestjs-sdk.ts` wrap the OpenTelemetry NodeSDK with Nest-friendly defaults (noise-reduced auto-instrumentations, ALS context manager, composite propagators, container resource detectors).

# 🗂️ Repository Structure
```
.
├─ src/
│  ├─ open-telemetry.module.ts           # Global module + default instrumentation wiring
│  ├─ open-telemetry-nestjs-sdk.ts       # NodeSDK helpers (noise reduction, propagators, detectors)
│  └─ trace/
│     ├─ decorators/span.ts              # @Span decorator metadata helper
│     ├─ instrumentation/                # Controller/Guard/Pipe/etc. instrumentation classes & specs
│     └─ trace.service.ts                # Provides Tracer + span helpers
├─ docs/
│  └─ migration-5-to-6.md                # Breaking-change guide (serviceName move, naming rules)
├─ .github/workflows/
│  ├─ ci.yml                             # Lint → test:cov → build on PRs
│  ├─ release.yml                        # Main-branch semantic-release pipeline
│  └─ releaseBeta.yml                    # Manual beta publishing entrypoint
├─ package.json                          # npm scripts, tooling, semantic-release config
└─ README.md                             # Usage, instrumentation table, SDK helper docs
```

# 🔄 Development Workflow
1. **Install** dependencies exactly as CI does:
   ```bash
   npm ci
   ```
2. **Local checks** should mirror `.github/workflows/ci.yml`:
   ```bash
   npm run lint
   npm run test:cov
   npm run build
   ```
   - `npm run lint` runs ESLint with the `src`, `apps`, `libs`, `test` glob defined in `package.json`.
   - `npm run test:cov` executes Jest (`jest.config.js`) with coverage summary; instrumentation specs such as `src/trace/instrumentation/controller.instrumentation.spec.ts` assert span creation and attributes.
   - `npm run build` delegates to the Nest CLI (`nest build`) to emit the library into `dist/` (cleaned by `prebuild` via `rimraf dist`).
3. **Releases**: The `release.yml` workflow installs, lints, tests, builds, and invokes `npx semantic-release` on `main`, so every merged change must remain semver-friendly and include proper commit messages. Manual beta versions go through `releaseBeta.yml` by providing a semver input, running `npm publish --tag beta` with the supplied version baked via `npm version`.
4. **Docs updates**: Keep README and `docs/migration-5-to-6.md` aligned with behavioral changes (e.g., new instrumentation, decorator semantics) to prevent regressions for consumers following those guides.

# 🧱 Code Patterns
- **Default instrumentation contract** (`src/open-telemetry.module.ts`):
  ```ts
  export const defaultInstrumentation = [
    ControllerInstrumentation,
    GraphQLResolverInstrumentation,
    GuardInstrumentation,
    InterceptorInstrumentation,
    EventEmitterInstrumentation,
    ScheduleInstrumentation,
    PipeInstrumentation,
    ConsoleLoggerInstrumentation,
  ];
  ```
  `OpenTelemetryModule.forRoot()` registers these providers globally and eagerly calls `setupInstrumentation()` on each (plus `DecoratorInstrumentation`) via the `Constants.SDK_INJECTORS` factory. When supplying `config.instrumentation`, always pass providers extending the `Instrumentation` interface exported from `src/trace/instrumentation/Instrumentation`.
- **Async bootstrapping**: `forRootAsync()` uses `ModuleRef.create()` to instantiate `DecoratorInstrumentation` and any supplied instrumentation classes lazily; ensure async factories in `OpenTelemetryModuleAsyncOptions` return `{ instrumentation?: Provider<Instrumentation>[] }`.
- **Decorators**: `src/trace/decorators/span.ts` shows `@Span()` simply sets metadata (`Constants.TRACE_METADATA`). Instrumentation checks that metadata to avoid double spans, as demonstrated by the "should not trace controller method if already decorated" spec in `controller.instrumentation.spec.ts`.
- **NodeSDK helper** (`src/open-telemetry-nestjs-sdk.ts`):
  - `startNestJsOpenTelemetrySDK()` composes `getNodeAutoInstrumentations(mergeInstrumentationConfigMap(nodeAutoInstrumentationReduceNoise(), nodeAutoInstrumentationHttpReduceIncoming()))` and injects `nestjsContextManager()`, `nestjsTextMapPropagator()`, and `nestjsResourceDetectors()`.
  - `nodeAutoInstrumentationReduceNoise()` disables `net`, `dns`, `express`, and `nestjs-core` instrumentations, renames HTTP spans to `METHOD path`, and filters `fs` + `graphql` noise.
  - `nodeAutoInstrumentationHttpReduceIncoming()` ignores health-check routes (`/health`, `/healthz`, etc.) and OPTIONS requests by default.
  - `mergeInstrumentationConfigMap()` recursively merges instrumentation config objects—use it when combining helper defaults with custom settings.
- **Testing conventions**: Specs use `@nestjs/testing` to spin up modules with targeted instrumentation and spy on span processors (see `controller.instrumentation.spec.ts`, `guard.instrumentation.spec.ts`, etc.). Tests rely on `startNestJsOpenTelemetrySDK({ serviceName: 'a', spanProcessors: [...] })` from the SDK helper.

# ✅ Quality Standards
- **Formatting**: `npm run format` invokes Prettier (`.prettierrc`) to enforce consistent TS formatting. Always run it on touched files or rely on editor integrations.
- **Linting**: Must pass `npm run lint` locally before PRs; CI will fail otherwise.
- **Testing**: Add or update Jest specs beside instrumentation/decorator code; ensure coverage stays high (`npm run test:cov`). Use `wait-for-expect` when asserting asynchronous span emission (as in `controller.instrumentation.spec.ts`).
- **Build integrity**: `npm run build` must succeed—especially important because `prepublishOnly` runs the build before publishing.
- **CI parity**: Only push code that passes the same sequence executed in `.github/workflows/ci.yml` to avoid regressions.
- **Release hygiene**: Semantic-release expects conventional commits; never bypass `release.yml` unless using the documented `releaseBeta.yml` workflow.

# 🚨 Critical Rules
- **Do NOT set `serviceName` in `OpenTelemetryModule` config**: `docs/migration-5-to-6.md` confirms module options now only accept `instrumentation`. Configure `serviceName` exclusively via `startNestJsOpenTelemetrySDK()` or equivalent NodeSDK initialization.
- **Keep file naming kebab-case**: The migration guide documents the repo-wide renaming. New files should follow the same pattern (`controller.instrumentation.ts`, not `ControllerInstrumentation.ts`).
- **Auto-import instrumentation carefully**: Only register classes that implement `Instrumentation` and expose `setupInstrumentation()`. Failing to do so blocks the async factory in `open-telemetry.module.ts`.
- **Never bypass decorator safeguards**: Instrumentation skips methods already annotated with `@Span` (`span.ts`). Custom instrumentation must respect `Constants.TRACE_METADATA` or risk double spans.
- **Preserve logger correlation**: `ConsoleLoggerInstrumentation` injects trace IDs into Nest logs—avoid removing it from defaults unless providing an alternative logger strategy.
- **SDK helpers expect early import**: As shown in `README.md` and `docs/migration-5-to-6.md`, always import your tracing bootstrap file before any Nest module (`import './tracing';` at the top of `main.ts`).

# 🛠️ Common Tasks
- **Run targeted instrumentation tests**:
  ```bash
  npx jest src/trace/instrumentation/controller.instrumentation.spec.ts
  ```
- **Add custom instrumentation**:
  1. Create `src/trace/instrumentation/my-feature.instrumentation.ts` (kebab-case).
  2. Implement `setupInstrumentation()` to wrap desired Nest components.
  3. Export it via `src/index.ts` (if needed) and include it in `OpenTelemetryModule.forRoot({ instrumentation: [MyFeatureInstrumentation] })`.
  4. Cover it with a Jest spec, following the controller instrumentation test pattern.
- **Customize NodeSDK auto-instrumentations**:
  ```ts
  import {
    mergeInstrumentationConfigMap,
    nodeAutoInstrumentationReduceNoise,
    nodeAutoInstrumentationHttpReduceIncoming,
  } from '@amplication/opentelemetry-nestjs';
  import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

  const instrumentations = getNodeAutoInstrumentations(
    mergeInstrumentationConfigMap(
      nodeAutoInstrumentationReduceNoise(),
      {
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => req.url === '/metrics',
        },
      },
    ),
  );
  ```
- **Publish beta builds**: Trigger `releaseBeta.yml` with an explicit semver (e.g., `1.1.0-beta.1`); the workflow runs `npm ci`, `npm version`, and `npm publish --tag beta` using `NPM_TOKEN`.

# 📚 Reference Examples
- **Default module usage** (`README.md`): demonstrates `OpenTelemetryModule.forRoot()` and instrumentation overrides.
- **Decorator metadata** (`src/trace/decorators/span.ts`): minimal implementation showing how spans are tagged.
- **Controller instrumentation spec** (`src/trace/instrumentation/controller.instrumentation.spec.ts`): end-to-end testing of HTTP and microservice handlers, assertion of `SpanKind`, attributes, and error status codes.
- **SDK bootstrap** (`src/open-telemetry-nestjs-sdk.ts`): canonical `startNestJsOpenTelemetrySDK()` configuration, plus helper exports for context, propagators, detectors, and instrumentation merges.
- **Migration guide** (`docs/migration-5-to-6.md`): authoritative source for naming conventions, module config changes, and checklist for contributors touching legacy areas.

# 🔗 Additional Resources
- **Primary docs**: `README.md` (usage, instrumentation matrix, logging with trace IDs) and `docs/migration-5-to-6.md` (breaking changes, checklist).
- **CI/CD**: `.github/workflows/ci.yml`, `release.yml`, `releaseBeta.yml` — inspect these before modifying pipelines or adding prerequisites.
- **Tooling configs**: `package.json` scripts, `.eslintrc.js`, `prettier` config, `tsconfig*.json`, and `jest.config.js` ensure consistent builds/tests.
- **Support**: Issues and discussions live under https://github.com/amplication/opentelemetry-nestjs; reference semantic-release output for published versions.
