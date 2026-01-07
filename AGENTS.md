# AGENTS Guide for `@amplication/opentelemetry-nestjs`

## Project Overview
- **Purpose:** Provide a NestJS-first wrapper around OpenTelemetry that auto-instruments framework primitives (controllers, guards, pipes, interceptors, schedulers, event emitters, GraphQL resolvers, console logger) while also exposing decorators, SDK helpers, and tracing utilities.
- **Entry points:** `OpenTelemetryModule` (in `src/open-telemetry.module.ts`) configures instrumentation; `src/open-telemetry-nestjs-sdk.ts` ships helpers such as `startNestJsOpenTelemetrySDK` so agents can bootstrap OTEL inside tests or apps.
- **Distribution:** The package is published as `@amplication/opentelemetry-nestjs` (see `package.json`) and targets ESNext with decorator metadata enabled (`tsconfig.json`).

## Repository Structure
```
/
├── README.md                         # User-facing usage guide
├── package.json                      # Scripts, dependencies, release info
├── docs/
│   ├── migration-5-to-6.md           # Upgrade checklist and before/after samples
│   └── log.png / trace-flow.jpeg     # Diagram assets referenced in README
├── src/
│   ├── open-telemetry.module.ts      # NestJS module definition
│   ├── trace/
│   │   ├── decorators/               # `@Span` and `@Traceable`
│   │   ├── instrumentation/          # Layer-specific instrumentation classes & specs
│   │   └── trace-wrapper*.ts         # Helpers for non-DI classes
│   └── *.spec.ts                     # Jest specs colocated with implementations
├── .github/workflows/ci.yml          # Lint → test:cov → build pipeline
├── .eslintrc.js / .prettierrc        # Linting & formatting rules
└── jest.config.js                    # Coverage thresholds (branches ≥80%, lines ≥90%)
```
> **Tip:** Every instrumentation file inside `src/trace/instrumentation/` has a matching `.spec.ts`, making it easy to track parity between runtime and tests.

## Development Guidelines
1. **TypeScript configuration**
   - Target `ESNext`, emit decorator metadata, and keep declaration builds enabled as enforced by `tsconfig.json`.
   - Build outputs go to `dist/`; always run `npm run build` (Nest CLI) after changing public APIs because `prepublishOnly` depends on it.
2. **Styling & linting**
   - Format with Prettier (`.prettierrc` sets `singleQuote: true` and `trailingComma: 'all'`).
   - ESLint (`.eslintrc.js`) extends `@typescript-eslint` + Prettier; some strictness (e.g., explicit return types) is intentionally disabled, so do not re-enable without consensus.
   - Keep filenames in kebab-case; colocate specs using the `.spec.ts` suffix next to the implementation (pattern visible throughout `src/trace/**`).
3. **Module exports**
   - Public exports are curated in `src/index.ts`. When adding a decorator, instrumentation, or helper, update this barrel so downstream projects can import it.
4. **Documentation cadence**
   - README tables (e.g., the "Instrumented components" matrix) must stay in sync with any new instrumentation class.
   - Major changes require updates to `docs/migration-5-to-6.md`–style guides to preserve upgrade clarity.

## Code Patterns
### Decorators
`src/trace/decorators/span.ts` shows how metadata keys from `Constants` get applied via Nest’s `SetMetadata`:
```ts
import { SetMetadata } from '@nestjs/common';
import { Constants } from '../../constants';
export const Span = (name?: string) =>
  SetMetadata(Constants.TRACE_METADATA, name);
```
Use `@Traceable()` similarly at the class level (see `src/trace/decorators/traceable.ts`) to auto-wrap every method.

### Instrumentation classes
All instrumentations extend `BaseTraceInstrumentation` and implement the shared `Instrumentation` interface. For example, `ControllerInstrumentation` (`src/trace/instrumentation/controller.instrumentation.ts`) scans controller methods and wraps undecorated handlers:
```ts
const traceName = `${controller.name}.${controller.metatype.prototype[key].name}`;
const method = this.wrap(
  controller.metatype.prototype[key],
  traceName,
  {
    'nestjs.type': 'handler',
    'nestjs.controller': controller.name,
    'nestjs.callback': controller.metatype.prototype[key].name,
  },
  { kind: SpanKind.SERVER },
);
```
Always gate wrapping logic with `isDecorated`/`isAffected` checks to avoid double instrumentation.

### TraceWrapper utility
`TraceWrapper.trace()` (`src/trace/trace-wrapper.ts`) re-decorates arbitrary class instances outside the Nest container, forwarding errors to spans:
```ts
const method = TraceWrapper.wrap(instance[key], defaultTraceName, {
  class: instance.constructor.name,
  method: instance[key].name,
  ...(options?.attributes ?? {}),
});
TraceWrapper.reDecorate(instance[key], method);
instance[key] = method;
```
Mirror this approach if you introduce new wrappers so metadata remains intact.

### Testing strategy
Instrumentation specs (e.g., `src/trace/instrumentation/controller.instrumentation.spec.ts`) spin up a Nest testing module, inject the desired instrumentation through `OpenTelemetryModule.forRoot`, and assert spans via a `NoopSpanProcessor` spy combined with `wait-for-expect`. Reuse this structure for new coverage to stay consistent with existing async expectations.

## Quality Standards
- **Coverage:** `jest.config.js` enforces `branches: 80` and `lines: 90`. Failing to meet these thresholds will break CI.
- **CI workflow:** `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm run test:cov`, and `npm run build` on every PR against `main`. Keep scripts stable and deterministic.
- **Releases:** `release.yml` / `releaseBeta.yml` trigger `semantic-release`, so commits must follow Conventional Commit semantics for versioning to work.
- **Runtime assurance:** Specs double as documentation. When editing instrumentation logic, update the adjacent `.spec.ts` and confirm `npm run test:cov` exercises the new spans or error cases.

## Critical Rules
1. **Instrumentation/Test Parity:** Every file in `src/trace/instrumentation/*.ts` has a sibling `.spec.ts`. Maintain this pairing when adding or renaming classes to preserve confidence in span coverage.
2. **Public Surface Sync:** Any new decorator, helper, or instrumentation must be exported via `src/index.ts` _and_ documented in README tables to avoid dead code paths.
3. **Formatting is Non-Negotiable:** Always run `npm run format` (Prettier) before submitting changes; CI will not auto-fix style for you.
4. **Do Not Weaken Coverage:** Keep the `jest.config.js` thresholds intact unless the team explicitly approves a change. Introducing code without tests typically fails the `npm run test:cov` gate.
5. **SDK Helper Consistency:** If you modify `startNestJsOpenTelemetrySDK`, update the helper usage inside specs (many import it directly) to avoid inconsistent test scaffolding.

## Common Tasks
| Task | Command | Notes |
| --- | --- | --- |
| Install dependencies | `npm ci` | Matches the CI workflow; prefer over `npm install`.
| Format code | `npm run format` | Uses Prettier with single quotes and trailing commas.
| Lint | `npm run lint` | ESLint across `src`, `apps`, `libs`, `test` paths with `--fix` enabled.
| Unit tests | `npm run test` | Jest in-band, good for local red/green cycles.
| Coverage run | `npm run test:cov` | Required before pushing; mirrors CI and reports a summary.
| Watch tests | `npm run test:watch` | Uses Jest watch mode for rapid iteration.
| Build package | `npm run build` | Delegates to Nest CLI; cleans `dist/` via `npm run prebuild` first.
| Release (CI only) | `npm run semantic-release` | Handled by `release*.yml`; do not run manually unless coordinating a release.

## Reference Examples
- **Decorator metadata:** `src/trace/decorators/span.ts` – minimal, well-documented function showing how to attach OTEL metadata.
- **Complex instrumentation:** `src/trace/instrumentation/controller.instrumentation.ts` + `.spec.ts` – demonstrates scanning modules, wrapping handlers, and asserting spans for HTTP/microservices paths.
- **Trace utilities:** `src/trace/trace-wrapper.ts` – showcases wrapping async, sync, and observable flows with shared error handling.
- **SDK bootstrap:** `src/open-telemetry-nestjs-sdk.ts` – reference for initializing OTEL in both app code and Jest suites.
- **Documentation cadence:** `docs/migration-5-to-6.md` – example of the tone and structure expected for future migration notes.

## Additional Resources
- [`README.md`](./README.md) – authoritative usage, instrumentation matrix, and logging guidance (includes `docs/log.png`).
- [`docs/migration-5-to-6.md`](./docs/migration-5-to-6.md) – upgrade checklist from the previous major release.
- [`docs/trace-flow.jpeg`](./docs/trace-flow.jpeg) – architecture diagram for spans/logs.
- [CI workflow](./.github/workflows/ci.yml) – automation steps to mirror locally.
- [Release workflows](./.github/workflows/release.yml) & [`releaseBeta.yml`](./.github/workflows/releaseBeta.yml) – semantic-release pipelines targeting `main`.
