# AGENTS Guide

## Overview & Scope
- **Purpose**: `@amplication/opentelemetry-nestjs` is a NestJS-focused OpenTelemetry helper library that enables distributed tracing, metrics, and SDK bootstrap helpers. It exposes decorators such as `@Span` and `@Traceable`, the dependency-injectable `TraceService`, the utility `TraceWrapper`, instrumentation classes, and Node SDK starter helpers (per `README.md`).
- **What agents build**: Enhancements to tracing decorators, new instrumentation classes, SDK helpers, and documentation that keep NestJS applications observable across controllers, guards, interceptors, providers, and schedulers.
- **High-level workflow**: Edit TypeScript sources under `src/`, accompany changes with colocated Jest specs, run the npm scripts (`lint`, `test:cov`, `build`), and keep docs plus workflows aligned with behavior.

## Repository Structure
- `src/`: Library entry points, module wiring, SDK helper exports, constants, and public API surface (re-exported via `src/index.ts`).
- `src/trace/`: Core tracing utilities:
  - `decorators/` (e.g., `span.ts`, `traceable.ts`) implement `@Span`/`@Traceable`.
  - `instrumentation/` houses all auto-instrumentation classes such as `controller.instrumentation.ts`, `guard.instrumentation.ts`, and shared logic in `base-trace.instrumentation.ts`. Each `.ts` file has a sibling `.spec.ts`.
  - `trace.service.ts`, `trace-wrapper.ts`, logger interfaces, and TraceWrapper types.
- `docs/`: Long-form references and assets (e.g., `migration-5-to-6.md`, tracing flow diagrams, log screenshots). Update when behavior changes or migrations are needed.
- `.github/workflows/`: Automation definitions (`ci.yml`, `release.yml`, `releaseBeta.yml`). Use them to mirror CI expectations locally.
- Root configs: `package.json` (npm scripts), `jest.config.js` (coverage thresholds), TypeScript configs, ESLint/Prettier settings.

## Development Workflow & Tooling
- **Install dependencies** (Node.js LTS):
  ```bash
  npm ci
  ```
- **Day-to-day scripts** (`package.json`):
  ```bash
  npm run format         # prettier --write "**/*.ts"
  npm run lint           # eslint "{src,apps,libs,test}/**/*.ts" --fix
  npm run test           # jest --runInBand
  npm run test:watch     # jest --watch
  npm run test:cov       # jest --coverage --coverageReporters=text-summary
  npm run build          # nest build (runs prebuild rimraf dist first)
  npm run semantic-release
  ```
- **Publishing guardrails**: `prepublishOnly` runs `npm run build`. Always ensure `npm run test:cov` passes before proposing changes; CI enforces lint → test → build.
- **Formatting**: Use `npm run format` before committing large refactors. ESLint has `--fix`; prefer letting scripts resolve style issues.

## Coding & Testing Patterns
- **Decorators**: Extend or reference `src/trace/decorators/span.ts` and `traceable.ts` for new decorator behavior. Keep metadata storage consistent with existing helpers.
- **Instrumentation classes**:
  - Base behavior lives in `src/trace/instrumentation/base-trace.instrumentation.ts`; new instrumentations should extend this base and register in the module exports (`src/index.ts` or equivalent aggregator).
  - Follow the naming convention `feature.instrumentation.ts` with a sibling Jest file `feature.instrumentation.spec.ts` (see `controller.instrumentation.ts` + `.spec.ts`).
- **Testing**:
  - Jest (ts-jest preset) is configured in `jest.config.js` with **coverage thresholds of 80% branches / 90% lines**; do not lower them.
  - Run `npm run test:cov` locally; CI requires it. Add targeted unit tests for each new decorator/instrumentation path.
  - Specs typically mock NestJS reflectors/loggers and check span creation (see `src/trace/instrumentation/controller.instrumentation.spec.ts`).
- **Trace utilities**: For non-injectable classes, use `TraceWrapper.trace()` (`src/trace/trace-wrapper.ts`). Update `trace-wrapper.spec.ts` when behavior changes.

## CI/CD Expectations
- **`ci.yml`**: Executes on PRs and non-main pushes. Steps: `npm ci` → `npm run lint` → `npm run test:cov` → `npm run build`. Agents must replicate this order locally before opening PRs.
- **`release.yml`**: Runs on pushes to `main`. After lint/test/build, it invokes `npx semantic-release` with required tokens to publish to npm and create GitHub releases. Any breaking-change commits must follow conventional commit semantics for semantic-release to version correctly.
- **`releaseBeta.yml`**: Manual (`workflow_dispatch`) prerelease flow. Accepts a semver input (`1.0.0-beta.1`), sets that version, and publishes with the `beta` tag. Coordinate with maintainers before triggering.

## Common Agent Tasks
1. **Add or modify instrumentation**
   - Create/update files under `src/trace/instrumentation/` following the existing class pattern (extend `BaseTraceInstrumentation`).
   - Export the new class through the public API (`src/index.ts`) and document usage in `README.md` if user-facing.
   - Write or update the paired `.spec.ts` to keep coverage thresholds satisfied.
2. **Enhance decorators or TraceService**
   - Update `src/trace/decorators/span.ts` or `traceable.ts` for decorator behavior and `src/trace/trace.service.ts` for service-level changes.
   - Cover new logic with unit tests and confirm backward compatibility.
3. **Update SDK helper guidance**
   - Modify helper implementations (e.g., `src/open-telemetry-nestjs-sdk.ts`) and ensure docs referencing setup (README, `docs/migration-5-to-6.md`) are refreshed.
4. **Documentation adjustments**
   - For breaking or migration-impacting changes, extend `docs/migration-5-to-6.md` or add a new doc under `docs/`.
   - Sync README snippets/code samples with actual exported APIs.
5. **Workflow or release tweaks**
   - Edit `.github/workflows/*.yml` as needed, but maintain lint/test/build gates. Validate YAML syntax and describe why automation needs change in the PR body.

## Reference Examples
- `src/trace/decorators/span.ts`: Minimal decorator illustrating how spans are started and named.
- `src/trace/decorators/traceable.ts`: Class-level decorator auto-wrapping all methods.
- `src/trace/instrumentation/controller.instrumentation.ts` + `.spec.ts`: Pattern for instrumenting NestJS components with comprehensive unit tests.
- `src/trace/instrumentation/base-trace.instrumentation.ts` + `.spec.ts`: Shared abstractions and behaviors to extend for new instrumentations.
- `docs/migration-5-to-6.md`: Example of a narrative guide outlining breaking changes—useful template when documenting migrations.

## Additional Resources
- [`README.md`](README.md): Primary user-facing instructions and code samples; keep in sync with feature changes.
- [`docs/migration-5-to-6.md`](docs/migration-5-to-6.md): Deep dive for version upgrades.
- [`jest.config.js`](jest.config.js): Single source of truth for coverage thresholds.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml), [`release.yml`](.github/workflows/release.yml), [`releaseBeta.yml`](.github/workflows/releaseBeta.yml): Automation contracts every PR must satisfy.

## Critical Rules
- Never bypass `npm run lint`, `npm run test:cov`, or `npm run build` when preparing a change; CI assumes they pass.
- Maintain or increase coverage—do not reduce the 80% branch / 90% line thresholds.
- Keep documentation (README + relevant docs/) current with any user-visible changes. New instrumentation must be documented.
- Follow the established file naming and colocated test conventions (`*.instrumentation.ts` + `.spec.ts`).
- Respect semantic-release requirements: use conventional commits (`feat:`, `fix:`, `chore:`) so automated publishing functions correctly.
- When editing workflows or publishing logic, double-check secrets usage and avoid leaking credentials/log output.
