# AGENTS Guide – `@amplication/opentelemetry-nestjs`

## Project Overview
- **Purpose:** `@amplication/opentelemetry-nestjs` is a NestJS module that wires OpenTelemetry tracing and metrics into framework primitives, pairing auto-instrumentation with SDK helpers for Node environments (see `README.md`).
- **Key SDK helpers:** `src/open-telemetry-nestjs-sdk.ts` exports `startNestJsOpenTelemetrySDK` (bootstraps the NodeSDK with Nest-friendly defaults), `nodeAutoInstrumentationReduceNoise` (central place to merge low-noise auto-instrumentation settings), and `nestjsContextManager` (AsyncLocalStorage-backed context manager to keep spans aligned with Nest request scope).
- **Tech stack:** TypeScript (NestJS module + decorators), OpenTelemetry SDK, Jest for unit tests, ESLint/Prettier for linting, and semantic-release for automated publishing.
- **Distribution:** Built via `nest build` and published from `dist/` (configured in `package.json`, `tsconfig.json`, and `tsconfig.build.json`).

## Repository Structure & Key Directories
```text
.
├── src/
│   ├── open-telemetry.module.ts        # Module bootstrap + default instrumentation wiring
│   ├── open-telemetry-nestjs-sdk.ts    # NodeSDK helpers (context manager, propagators, auto instrumentation)
│   ├── index.ts                        # Export hub (barrel) exposing module pieces to consumers
│   ├── meta-scanner*.ts                # Metadata utilities (+ colocated spec)
│   └── trace/
│       ├── decorators/                 # `span.ts`, `traceable.ts`
│       ├── instrumentation/            # Controller/Guard/etc. instrumentation + tests
│       ├── logger.interface.ts         # Contracts for pluggable trace logger implementations
│       ├── noop.trace-exporter.ts      # No-op exporter helper for logging/testing scenarios
│       ├── trace-wrapper*.ts           # Helpers and tests for manual wrapping
│       └── trace.service.ts            # Service exposed through module exports
├── docs/
│   ├── migration-5-to-6.md             # Example of structured guide w/ before/after blocks
│   ├── log.png                         # Asset referenced by README (trace log screenshot)
│   └── trace-flow.jpeg                 # Asset referenced by README (trace flow diagram)
├── .github/workflows/
│   ├── ci.yml                          # Validation pipeline
│   ├── release.yml                     # Semantic-release pipeline
│   └── releaseBeta.yml                 # Manual beta publishing workflow
├── README.md                           # Primary user documentation
├── package.json / package-lock.json    # Scripts, toolchain, dependency definitions
├── tsconfig.json & tsconfig.build.json # Compiler + build pipeline configs
├── .eslintrc.js & .prettierrc          # Linting/formatting rules
└── jest.config.js                      # Testing + coverage thresholds
```

## Development Workflow & Tooling
### Node, NPM, and Nest build
- Use **Node LTS** (matching the GitHub Actions workflows that run `actions/setup-node@v3` with `lts/*`).
- Install dependencies with `npm ci` to stay aligned with CI (lockfile enforced).
- `npm run build` executes `nest build`, which reads `tsconfig.build.json` (excluding `src/**/*.spec.ts`) and writes compiled artifacts to `dist/`.

### Available NPM Scripts (`package.json`)
| Script | Purpose |
| --- | --- |
| `npm run lint` | ESLint with auto-fix over `{src,apps,libs,test}/**/*.ts`.
| `npm run test` | Jest in-band execution.
| `npm run test:cov` | Jest with coverage summary (CI uses this).
| `npm run build` | Clean (`rimraf dist` via `prebuild`) then `nest build`.
| `npm run format` | Prettier `--write` across TypeScript files.
| `npm run semantic-release` | Release automation (triggered in `release.yml`).
| `npm run test:watch` | Local watcher variant.

### TypeScript Configuration
- `tsconfig.json` targets **ESNext**, enables decorators/metadata, and emits declarations to `dist/`.
- `tsconfig.build.json` extends the base config and excludes `dist`, `node_modules`, and every `*.spec.ts` so builds ship production code only.

## Coding & Testing Patterns
- **Instrumentation abstraction:** `src/trace/instrumentation/Instrumentation.ts` defines the interface, while `base-trace.instrumentation.ts` centralizes metadata lookup. Concrete instrumentations live under the same directory with paired specs (e.g., `controller.instrumentation.ts` + `.spec.ts`).
- **Default coverage for Nest pieces:** `OpenTelemetryModule` exports `defaultInstrumentation` (controllers, GraphQL resolvers, guards, interceptors, event emitters, schedulers, pipes, console logger) and, when `forRoot` is used, the `Constants.SDK_INJECTORS` factory iterates those classes and calls `setupInstrumentation()` directly; the async builder path instead relies on `ModuleRef` to resolve providers before invoking `setupInstrumentation()` (see `src/open-telemetry.module.ts`).
- **Decorators:** `src/trace/decorators/span.ts` and `traceable.ts` attach metadata consumed by `DecoratorInstrumentation` to wrap provider methods. Class-level `@Traceable()` instruments every method; method-level `@Span()` accepts optional span names.
- **Manual spans:** `TraceService` and `TraceWrapper` provide escape hatches when DI hooks are unavailable. `trace-wrapper.spec.ts` demonstrates wrapping non-injectable classes with automatic span creation.
- **Colocated tests:** Every helper/instrumentation class retains a nearby `.spec.ts` (e.g., `meta-scanner.spec.ts`, `event-emitter.instrumentation.spec.ts`), and Jest is configured to look only inside `src/` (see `jest.config.js`).
- **Coverage requirements:** Global thresholds (≥80% branches / ≥90% lines, per `jest.config.js`) must be satisfied—update companion specs whenever instrumentation logic changes.

## Quality & CI/CD Standards
- **Linting & Formatting:** `.eslintrc.js` extends `@typescript-eslint`’s recommended preset plus `plugin:prettier/recommended`; `.prettierrc` enforces single quotes and trailing commas. Always run `npm run lint` + `npm run format` before submitting changes.
- **Continuous Integration (`.github/workflows/ci.yml`):** On PRs/pushes (excluding `main`), CI enforces the full validation chain—`npm ci`, `npm run lint`, `npm run test:cov`, and `npm run build` (Nest CLI)—and blocks merges on any failure.
- **Releases:**
  - `release.yml` (push to `main`) reruns the same validation steps before invoking `npx semantic-release` with npm provenance via OIDC.
  - `releaseBeta.yml` is a manual `workflow_dispatch` requiring the desired semver input, runs `npm ci`, locally sets that version, and publishes with `npm publish --tag beta`.
- **Versioning:** Managed exclusively by semantic-release; do not hand-edit `version` except inside the manual beta workflow.

## Documentation Guidance
- **README pattern:** The root `README.md` mixes marketing (badges, description) with practical sections (Installation, Setup, decorator usage, instrumentation table, TIP callouts, code fences, and image embeds like `![Example trace output](./docs/log.png)`). Match this tone—include inline links to NestJS/OpenTelemetry docs, highlight decorators, and use `[!TIP]` blocks for caveats, plus keep the manual tracing helper walkthrough (`TraceWrapper`), metrics guidance (Prometheus exporter steps), and external integration examples (Prometheus scraping, OTLP exporters, AWS X-Ray/CloudWatch) up to date.
- **Migration guides:** `docs/migration-5-to-6.md` illustrates preferred structure—table of contents, before/after TypeScript snippets, checklists, and bold "Key Changes" callouts. Follow its format when documenting future breaking changes.
- **Assets:** Store diagrams/screenshots inside `docs/` (existing `log.png` and `trace-flow.jpeg`) and reference them with relative paths to keep README portable.

## Common Tasks
### Run validation locally
```bash
npm ci
npm run lint
npm run test:cov
npm run build # Nest CLI build
```

### Bootstrap SDK helpers for tracing
1. Add a `tracing.ts` (or similar) file that imports `startNestJsOpenTelemetrySDK`, `nodeAutoInstrumentationReduceNoise`, and `nestjsContextManager` from `@amplication/opentelemetry-nestjs` (bring in `nodeAutoInstrumentationHttpReduceIncoming` if you need extra filters).
2. Call `startNestJsOpenTelemetrySDK` with merged instrumentation config, for example:
   ```ts
   startNestJsOpenTelemetrySDK({
     instrumentations: [
       getNodeAutoInstrumentations(
         mergeInstrumentationConfigMap(
           nodeAutoInstrumentationReduceNoise(),
           nodeAutoInstrumentationHttpReduceIncoming(),
         ),
       ),
     ],
     contextManager: nestjsContextManager(),
   });
   ```
   This keeps noisy spans out while ensuring the Nest context manager is active for request-scoped spans.
3. Import the tracing file at the very top of `main.ts` so the SDK (and its context manager) boots before Nest constructs modules.
4. Run `npm run lint`, `npm run test:cov`, and `npm run build` to verify tracing boots cleanly alongside the rest of the validation pipeline.

### Adding or updating instrumentation
1. Create a new file in `src/trace/instrumentation/` (kebab-case) that extends `BaseTraceInstrumentation` or implements `Instrumentation`.
2. Add a matching `*.spec.ts` next to it; reuse existing specs (e.g., `guard.instrumentation.spec.ts`) as templates.
3. Export the provider (and optionally add it to `defaultInstrumentation` in `open-telemetry.module.ts`).
4. Update `src/index.ts` if new public exports are required.
5. Run lint/tests to maintain coverage.

### Writing documentation
- For README additions, keep sections short with code samples highlighting decorators or SDK helpers (reference `@Span`, `@Traceable`, `TraceService`).
- For migrations or deep dives, mirror `docs/migration-5-to-6.md` (sections, before/after diff, checklist, summary).
- Include screenshots/diagrams under `docs/` and ensure relative links are correct (`./docs/your-asset.png`).

## Reference Examples
- `src/trace/decorators/span.ts` – Minimal decorator implementation showcasing metadata keys from `src/constants.ts`.
- `src/trace/noop.trace-exporter.ts` – Lightweight helper for logging/testing scenarios when you need a no-op exporter.
- `src/open-telemetry.module.ts` – Central module wiring that registers the default instrumentation array and exposes the tracing services.
- `src/open-telemetry-nestjs-sdk.ts` – Canonical reference for `startNestJsOpenTelemetrySDK` (bootstraps the NodeSDK with Nest defaults), `nodeAutoInstrumentationReduceNoise` (curated instrumentation config), and `nestjsContextManager` (AsyncLocalStorage-backed context propagation).
- `src/trace/instrumentation/controller.instrumentation.ts` + `.spec.ts` – Full instrumentation pipeline (metadata scanning, wrapping) and companion tests validating controller behavior.
- `src/trace/instrumentation/guard.instrumentation.spec.ts` – Canonical Jest template for instrumentation tests; copy this when adding new providers.
- `src/trace/instrumentation/base-trace.instrumentation.ts` – Shared logic for scanning modules/providers and applying wrappers.
- `src/trace/trace-wrapper.ts` + `.spec.ts` – Manual span creation for non-injectable objects.
- `src/meta-scanner.ts` + `.spec.ts` – Utility for enumerating Nest providers and their metadata; reuse when adding reflection-driven instrumentation.
- `README.md` – Primary user-facing guide showcasing setup, decorators, instrumentation tables, and assets.
- `.github/workflows/ci.yml` – Canonical validation workflow (npm ci → lint → test:cov → build).
- `docs/migration-5-to-6.md` – Long-form documentation template with before/after comparisons and checklist.

## Critical Rules & Tips
- Always keep coverage thresholds satisfied; if you touch instrumentation logic, expand the companion `*.spec.ts` rather than lowering thresholds.
- Stick to lint/format conventions (single quotes, trailing commas) to avoid CI noise.
- Never bypass CI—run `npm ci && npm run lint && npm run test:cov && npm run build` locally before opening a PR.
- Respect release automation: do not manually change versions or publish outside the provided workflows.
- Documentation updates should remain consistent with existing tone (code-forward, NestJS-specific) and cite concrete files or APIs.
- Keep changes focused; new instrumentation should be modular and declared via DI providers to maintain global enablement semantics.
