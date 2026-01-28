# AGENTS Guide: amplication/opentelemetry-nestjs

> Authoritative instructions for automated agents collaborating on this repository. Review this guide before making changes so your contributions align with the project’s tooling, quality bars, and documentation style.

## Project Overview

- **Purpose:** `@amplication/opentelemetry-nestjs` is a NestJS-focused OpenTelemetry helper module that auto-instruments controllers, providers, microservice handlers, schedulers, and logging while exposing decorators, tracing helpers, and SDK bootstrapping utilities.
- **Core Exports:** `OpenTelemetryModule` (with `.forRoot()` / `.forRootAsync()`), default instrumentation classes under `src/trace/instrumentation`, decorators (`@Span`, `@Traceable`), `TraceService`, the `Tracer` provider, and SDK helpers from `src/open-telemetry-nestjs-sdk.ts`.
- **Key Behaviors:**
  - Automatic wiring of NestJS components defined in the default instrumentation array from [`src/open-telemetry.module.ts`](src/open-telemetry.module.ts)—controllers, GraphQL resolvers, guards, interceptors, pipes, scheduler jobs, event emitters, and the console logger—to spans with semantic attributes (`nestjs.type`, `nestjs.controller`, etc.).
  - SDK helper functions to start a tuned `NodeSDK` with context manager, propagators, and reduced-noise instrumentations.
  - README- and docs-driven guidance for consumers, plus CI enforcement (lint, coverage, build) on every PR.

## Repository Structure

| Path | Description | Notes |
| --- | --- | --- |
| `src/` | Library source. `index.ts` re-exports the module, instrumentation providers, decorators, and SDK helpers. | TypeScript only; compilation output lives in `dist/` (generated via `nest build`). |
| `src/trace/decorators/` | Decorators such as [`span.ts`](src/trace/decorators/span.ts) and `traceable.ts`. | Decorators rely on metadata constants defined in `src/constants.ts`. |
| `src/constants.ts` | Centralizes trace metadata keys (e.g., `Constants.TRACE_METADATA`) and shared attribute names. | Update alongside new decorators or instrumentation to keep metadata aligned. |
| `src/trace/instrumentation/` | Instrumentation classes (e.g., [`controller.instrumentation.ts`](src/trace/instrumentation/controller.instrumentation.ts)) plus shared base classes and interfaces. | Every instrumentation has a co-located `.spec.ts` (Jest). |
| `src/trace/instrumentation/base-trace.instrumentation.ts` (+ spec) | Provides the `BaseTraceInstrumentation` utilities for scanning modules and wiring spans. | Extend this base (and update the paired `.spec.ts`) when adding new instrumentation types. |
| `src/open-telemetry.module.ts` | Declares `OpenTelemetryModule`, the default instrumentation array, and tracer provider wiring. | Uses NestJS DI patterns and `EventEmitterModule` internally. |
| `src/open-telemetry-nestjs-sdk.ts` | SDK utilities (`startNestJsOpenTelemetrySDK`, `nodeAutoInstrumentationReduceNoise`, etc.). | Houses noise-reduction helpers, propagators, and config merging logic. |
| `docs/` | Markdown guides (e.g., [`docs/migration-5-to-6.md`](docs/migration-5-to-6.md)) plus images referenced by the README. | Follow the same structured style when contributing docs. |
| `.github/workflows/ci.yml` | CI pipeline running lint, tests (with coverage), and build on push/PR. | Defines the minimum checks your changes must pass. |
| `.github/workflows/release.yml` & `.github/workflows/releaseBeta.yml` | Stable and beta semantic-release pipelines. | Publish releases from `main` using conventional commits; do not trigger manually. |
| Root configs | `package.json`, `tsconfig*.json`, `.eslintrc.js`, `.prettierrc`, `jest.config.js`. | Do not hand-edit `dist/`; use scripts defined in `package.json`. |

## Development Guidelines

1. **Environment:** Target Node.js LTS (CI uses `lts/*`). Run `npm ci` to install dependencies.
2. **CI Command Order:** Run `npm ci` → `npm run lint` → `npm run test:cov` → `npm run build` sequentially to mirror [`.github/workflows/ci.yml`](.github/workflows/ci.yml); do not reorder or skip steps.
3. **Types & Style:**
   - TypeScript only; keep filenames in kebab-case.
   - Use the existing ESLint + Prettier configuration (`npm run lint` / `npm run format`).
   - Prefer explicit types when adding public APIs.
3. **Module Wiring:** Always register instrumentation providers through `OpenTelemetryModule` (sync or async) and ensure they implement the `Instrumentation` interface with `setupInstrumentation()`.
4. **SDK Helpers:** When adjusting `startNestJsOpenTelemetrySDK` or related helpers, keep defaults backwards-compatible and document new options in `README.md` and `docs/` where relevant.
5. **Docs Consistency:** Mirror the tone and structure of `README.md` and `docs/migration-5-to-6.md` (headings, callouts, checklists). Use relative links to files within the repo.
6. **No Generated Files:** Never commit build outputs. Use `npm run build` only for verification.

## Code Patterns to Follow

### Module Initialization

```ts
// src/open-telemetry.module.ts usage
@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      instrumentation: [ControllerInstrumentation, GuardInstrumentation],
    }),
  ],
})
export class AppModule {}
```

- Default instrumentation includes controllers, guards, pipes, interceptors, scheduler, event emitters, console logger, and GraphQL resolvers.
- Async configuration (`forRootAsync`) expects a factory returning `{ instrumentation?: Provider<Instrumentation>[] }`.

### Decorators

- `@Span(name?)` (`src/trace/decorators/span.ts`) sets metadata used by instrumentation.
- `@Traceable()` auto-wraps every class method. Ensure new decorators register metadata under `Constants.TRACE_METADATA` for compatibility.

### Instrumentation Classes

```ts
@Injectable()
export class ControllerInstrumentation
  extends BaseTraceInstrumentation
  implements Instrumentation
{
  async setupInstrumentation() {
    // scan controllers, wrap handlers with TraceService
  }
}
```

- Extend `BaseTraceInstrumentation` when you need metadata scanners and helpers (see [`controller.instrumentation.ts`](src/trace/instrumentation/controller.instrumentation.ts)).
- Provide thorough `.spec.ts` coverage verifying span names, attributes, and error handling (`controller.instrumentation.spec.ts`).

### SDK Helpers

- `startNestJsOpenTelemetrySDK` bootstraps `NodeSDK` with `nestjsContextManager`, `nestjsTextMapPropagator`, and merged instrumentation config.
- Utility helpers (`nodeAutoInstrumentationReduceNoise`, `nodeAutoInstrumentationHttpReduceIncoming`, `mergeInstrumentationConfigMap`) should remain pure and documented in the README.

## Quality Standards

| Area | Requirements |
| --- | --- |
| **Linting** | `npm run lint` must pass (ESLint + `@typescript-eslint`, Prettier integration). |
| **Testing** | `npm run test` / `npm run test:cov` using Jest. Global coverage thresholds: **80% branches**, **90% lines** (`jest.config.js`). |
| **Build** | `npm run build` executes `nest build` after cleaning `dist/` via `rimraf`. Build must succeed with strict TypeScript settings from `tsconfig*.json`. |
| **CI** | `.github/workflows/ci.yml` runs `npm ci`, lint, `npm run test:cov`, and `npm run build` on every PR/push (non-`main`). Match these steps locally before submitting changes. |
| **Releases** | `semantic-release` (triggered separately) expects conventional commits; keep change logs readable. |

## Critical Rules for Agents

1. **Stay within TypeScript source:** modify `src/**` or docs; never edit compiled `dist/` output.
2. **Preserve API compatibility:** Do not rename exported classes/interfaces without coordinating documentation and migration notes.
3. **Tests for instrumentation:** Any change to instrumentation logic must include or update the corresponding `.spec.ts` in the same folder.
4. **Docs for breaking changes:** Update `README.md` and, if needed, add or adjust guides under `docs/` whenever you change usage patterns, defaults, or SDK helpers.
5. **Consistent metadata keys:** Always use the `Constants` file for trace metadata keys to avoid drift across decorators and instrumentations.
6. **No silent config changes:** When altering default instrumentation arrays or SDK defaults, explicitly note the change in this guide or the README to alert future agents.

## Common Tasks

### 1. Run Local Verification

```bash
npm ci
npm run lint
npm run test:cov
npm run build
```

Run commands in this order to mimic CI. Investigate and fix lint/test/build failures before submitting changes.

### 2. Add or Update an Instrumentation

1. Create/update `src/trace/instrumentation/<name>.instrumentation.ts` implementing `Instrumentation`.
2. Extend `BaseTraceInstrumentation` when scanning NestJS modules (`ModulesContainer`).
3. Add or update unit tests in the paired `.spec.ts` (see controller instrumentation specs for patterns using `@nestjs/testing`, `NoopSpanProcessor`, and `wait-for-expect`).
4. Register the instrumentation inside `OpenTelemetryModule` config or defaults if applicable.
5. Document the new instrumentation in `README.md` (Instrumented components table) and mention configuration knobs.

### 3. Update Documentation or Guides

- Follow the layout demonstrated in [`docs/migration-5-to-6.md`](docs/migration-5-to-6.md): intro, TOC, numbered sections, before/after code blocks, and checklists.
- Use Markdown callouts (`> [!TIP]`) when highlighting pitfalls.
- Keep links relative (e.g., `./docs/log.png`).

### 4. Adjust SDK Helper Behavior

1. Modify `src/open-telemetry-nestjs-sdk.ts` with clear, tree-shakable helpers.
2. Update README sections *Starting the OpenTelemetry SDK* and *AWS X-Ray/CloudWatch* with new parameters or defaults.
3. Add targeted unit tests if logic becomes more complex (for example, new merging behavior). Although current helpers lack dedicated specs, prefer adding tests when changing behavior.

## Reference Examples

| File | Purpose |
| --- | --- |
| [`src/trace/decorators/span.ts`](src/trace/decorators/span.ts) | Minimal decorator showing metadata usage (`Constants.TRACE_METADATA`). |
| [`src/trace/instrumentation/controller.instrumentation.ts`](src/trace/instrumentation/controller.instrumentation.ts) | Full-featured instrumentation extending `BaseTraceInstrumentation` with logging and span attributes. |
| [`src/trace/instrumentation/controller.instrumentation.spec.ts`](src/trace/instrumentation/controller.instrumentation.spec.ts) | Jest test verifying spans for HTTP and microservice controllers, error propagation, and decorator interactions. |
| [`src/open-telemetry.module.ts`](src/open-telemetry.module.ts) | Blueprint for module providers, default instrumentation array, and async factory usage. |
| [`src/open-telemetry-nestjs-sdk.ts`](src/open-telemetry-nestjs-sdk.ts) | SDK bootstrap helpers combining noise-reduction config, context manager, and propagators. |
| [`docs/migration-5-to-6.md`](docs/migration-5-to-6.md) | Example of long-form documentation with TOC, code comparisons, and checklists. |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Defines the lint/test/build pipeline you must satisfy locally. |

## Additional Resources

- [README.md](README.md) — comprehensive user-facing instructions and examples.
- [Migration Guide (`docs/migration-5-to-6.md`)](docs/migration-5-to-6.md) — authoritative reference for breaking changes.
- [Jest Configuration (`jest.config.js`)](jest.config.js) — coverage thresholds and test root definition.
- [Package Scripts (`package.json`)](package.json) — canonical list of npm scripts (lint/test/build/format, semantic-release).
- [CI Workflow (`.github/workflows/ci.yml`)](.github/workflows/ci.yml) — replicable checklist for automated validation.
- [Release Workflows (`.github/workflows/release.yml`, `.github/workflows/releaseBeta.yml`)](.github/workflows) — semantic-release automation for stable and beta channels; never edit without coordinating versioning strategy.

Use this guide as the single source of truth when planning or executing automated contributions to the project.
