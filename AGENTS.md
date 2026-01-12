# 🤖 AGENTS Guide: amplication/opentelemetry-nestjs

Welcome! This document gives contributors a quick but thorough rundown of how the NestJS-focused OpenTelemetry integration is organized, built, and validated.

## 🧭 Project Overview
- **Purpose:** Provide a complete OpenTelemetry toolkit tailored to NestJS applications, combining decorators (`@Span`, `@Traceable`), the `TraceService`, instrumentation classes (controllers, guards, interceptors, schedulers, and transports), and SDK helpers for observability across HTTP, microservices, GraphQL, and scheduled jobs.
- **Core Tenets:**
  - Decorators rely on metadata constants to wrap methods and classes safely.
  - Instrumentations extend shared base logic to hook into Nest components without double-wrapping thanks to the `TraceWrapper` guard.
  - CI/CD enforces linting, testing, coverage, builds, and semantic-release automation before publishing packages.

## 🗂 Repository Structure
```text
.
├── src/                     # Core library (OpenTelemetry module, TraceService, helpers)
│   └── trace/
│       ├── decorators/      # @Span, @Traceable
│       ├── instrumentation/ # Controller, guard, gateway, scheduler instrumentation
│       └── trace-wrapper/   # Prevents double instrumentation
├── docs/                    # Guides & assets (e.g., migration-5-to-6.md, images)
├── .github/                 # Workflows (ci.yml, release.yml, releaseBeta.yml), issue templates
├── package.json             # Scripts, semantic-release config
├── tsconfig*.json           # Compiler configs (build & dev)
├── jest.config.js           # Coverage thresholds (80% branches / 90% lines)
├── .eslintrc.js, .prettierrc# Lint & formatting baselines
└── README.md                # Detailed usage docs
```

## 🛠 Development Guidelines
- **Language & Framework:** TypeScript targeting `ESNext`, with NestJS module patterns. `tsconfig.json` enables `emitDecoratorMetadata`, `experimentalDecorators`, and sets `baseUrl` to the repo root for clean imports.
- **Style & Linting:** ESLint integrates Prettier (single quotes, trailing commas). Rules are relaxed for implicit returns and `any` where instrumentation needs flexibility. Use `npm run lint` before committing; it runs on `{src,apps,libs,test}`.
- **Formatting:** `npm run format` applies Prettier to all `*.ts` files. Align with the existing markdown and code-style conventions showcased in `README.md` and `docs/migration-5-to-6.md`.
- **Build Output:** `npm run build` invokes `nest build` (after `rimraf dist` via `prebuild`). Builds are required before publishing (`prepublishOnly` hooks into `npm run build`).
- **Dependencies:** Keep instrumentation-specific dependencies aligned with peer requirements (`@nestjs/*`, `@opentelemetry/*`, propagators, resource detectors). CI installs dependencies with `npm ci` to guarantee lockfile fidelity.

## 🧩 Code Patterns
- **Instrumentation Template:** Extend `BaseTraceInstrumentation` (`src/trace/instrumentation/base-trace.instrumentation.ts`). Override hooks for metadata scanning and ensure each instrumentation registers itself via dependency injection. See `controller.instrumentation.ts` for the standard pattern.
- **Trace Wrapper:** Always funnel manual instrumentation through `TraceWrapper` (`src/trace/trace-wrapper/trace-wrapper.ts`). It verifies whether a method/class has been wrapped already, preventing double spans.
- **Decorators:**
  - `@Span` focuses on individual methods. It uses metadata constants from `src/constants.ts` to tag spans with human-readable names.
  - `@Traceable` wraps entire classes (e.g., controllers, providers) to ensure consistent span naming per method.
- **Trace Service:** `TraceService` exposes helpers for manual span management and should be injected via Nest’s DI container rather than instantiated manually.
- **Configuration:** TypeScript configs and SDK helpers expect `reflect-metadata` to be loaded before Nest bootstraps; ensure imports remain near the application entry point.

## ✅ Quality Standards
- **Testing & Coverage:**
  - Commands: `npm run test`, `npm run test:watch`, `npm run test:cov`.
  - Jest runs from `src/` and enforces global coverage thresholds (`branches: 80`, `lines: 90`). Pull requests that reduce coverage below thresholds will fail CI.
- **Linting & Formatting:** `npm run lint` (fixes applied) and `npm run format` must be clean before PR submission.
- **Builds:** `npm run build` ensures Nest compilation succeeds. CI validates that the build output is free of type errors.
- **CI/CD Workflows:**
  - `.github/workflows/ci.yml` executes lint → `test:cov` → build on pushes/PRs against Node LTS.
  - `.github/workflows/release.yml` repeats those gates on `main`, then runs `npm ci` and `npm run semantic-release` to publish packages via stored secrets.
  - `.github/workflows/releaseBeta.yml` mirrors the release pipeline for manual beta publishing (triggered via workflow dispatch) and also relies on `npm ci` plus semantic-release prerelease configuration.

## ⚠️ Critical Rules
- Extend `BaseTraceInstrumentation` for every new instrumentation to inherit resource detection, logger wiring, and Nest scanner access.
- Never bypass `TraceWrapper`; it guarantees spans are only applied once per method and avoids recursion issues.
- Maintain metadata constant usage when adding decorators—custom strings must live in `src/constants.ts` to keep the symbol map unified.
- Respect the coverage floors and lint/build gates. CI merges are blocked until all three stages succeed.
- Publishing is exclusively handled through GitHub Actions + `semantic-release`. Do not publish manually.
- Ensure TypeScript compiler options (`emitDecoratorMetadata`, `experimentalDecorators`) remain enabled; disabling them breaks decorator behavior.

## 📋 Common Tasks
### Run quality gates locally
```bash
# Fix lint issues
npm run lint

# Execute the default Jest suite
npm run test

# Enforce coverage parity with CI
npm run test:cov

# Build the package (prepublish & CI requirement)
npm run build
```

### Add a new instrumentation
1. Create `src/trace/instrumentation/<feature>.instrumentation.ts`.
2. `export class <Feature>Instrumentation extends BaseTraceInstrumentation { ... }`.
3. Use the Nest metadata scanner to locate targets, wrapping handlers with `TraceWrapper`.
4. Register the instrumentation inside the relevant module/provider so the `OpenTelemetryModule` can auto-detect it.
5. Mirror the implementation with a spec file (`*.spec.ts`) to keep coverage high.

### Apply decorators in a module
```ts
import { Controller, Get } from '@nestjs/common';
import { Traceable, Span } from '@amplication/opentelemetry-nestjs';

@Traceable()
@Controller('users')
export class UsersController {
  @Get()
  @Span('UsersController.list')
  list() {
    // business logic automatically wrapped in a span
  }
}
```
- Keep decorator names descriptive. Align them with constants defined in `src/constants.ts` so span names stay consistent in traces.

## 📚 Reference Examples
| Category | File | Why it matters |
| --- | --- | --- |
| Simple shared config | `src/constants.ts` | Centralizes metadata keys and span naming helpers used by decorators and instrumentation. |
| Complex instrumentation | `src/trace/instrumentation/controller.instrumentation.ts` | Demonstrates extending `BaseTraceInstrumentation`, scanning controllers, and delegating to `TraceWrapper`. |
| Testing pattern | `src/trace/instrumentation/controller.instrumentation.spec.ts` | Provides the Jest-based spec that exercises instrumentation wiring, mocks Nest dependencies, and enforces coverage. |
| Decorator implementation | `src/trace/decorators/span.ts` | Shows how the `@Span` decorator manages metadata and span naming for individual methods. |
| Documentation pattern | `docs/migration-5-to-6.md` | Shows the preferred style for step-by-step guides, including before/after snippets and checklists. |
| Workflow reference | `.github/workflows/ci.yml` | Canonical CI pipeline outlining lint/test/build order and Node setup used across workflows. |

## 🔗 Additional Resources
- **README.md:** Comprehensive onboarding covering installation, decorators, metrics, and SDK helpers.
- **Docs directory:** Additional guides plus image assets referenced in the README.
- **GitHub Issues:** https://github.com/amplication/opentelemetry-nestjs/issues for backlog and bug tracking.
- **Semantic Release Docs:** Useful for understanding how `npm run semantic-release` determines versioning and changelog publishing.
