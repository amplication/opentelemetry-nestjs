# 🤖 AGENTS Guide for `@amplication/opentelemetry-nestjs`

## 🧭 Project Overview
- **Purpose:** A TypeScript NestJS library delivering OpenTelemetry helpers, instrumentation, and SDK bootstrapping utilities so Nest applications gain tracing/metrics with minimal setup.
- **Key Exports:** `OpenTelemetryModule` (Nest module), instrumentation classes for framework primitives, decorators (`@Span`, `@Traceable`), SDK helpers (e.g., `startNestJsOpenTelemetrySDK`).
- **Design Focus:** Keep instrumentation noise low, follow OpenTelemetry semantic conventions, and ensure features scale across NestJS ecosystems (HTTP, GraphQL, EventEmitter, Schedule, etc.).

## 🗂️ Repository Structure & Key Directories
Use this structure when locating or adding files:

```text
.
├── src/
│   ├── open-telemetry.module.ts        # Module wiring & DI tokens
│   ├── open-telemetry-nestjs-sdk.ts    # SDK helpers + noise-reduction utilities
│   └── trace/
│       ├── instrumentation/            # Controller/Guard/etc. instrumentation classes + specs
│       ├── decorators/                 # @Span, @Traceable
│       └── *.spec.ts                   # Co-located Jest tests
├── docs/
│   └── migration-5-to-6.md             # Canonical long-form doc example + assets (e.g., log.png)
├── .github/workflows/                  # ci.yml, release.yml, releaseBeta.yml
├── package.json                        # Scripts, lint/test/build definitions
├── jest.config.js                      # Coverage gates (80% branches / 90% lines)
├── tsconfig*.json                      # Build + IDE settings
└── README.md                           # Public setup & usage guidance
```

## 🛠️ Development & Coding Guidelines
- **Language & Style:** TypeScript targeting modern NestJS versions; maintain strict typings and leverage decorators/DI tokens for extensibility.
- **File Naming:** Implementation files use kebab-case (e.g., `controller.instrumentation.ts`), exported symbols stay PascalCase for Nest compatibility.
- **Instrumentation Pattern:** Classes under `src/trace/instrumentation/` typically extend shared base helpers (e.g., `BaseTraceInstrumentation`) and use the metadata scanner + `TraceWrapper` to wrap Nest constructs safely.
- **Decorators:** `src/trace/decorators/` holds reusable decorators. Keep decorators pure, metadata-driven, and covered by targeted tests.
- **Exports:** Update `src/index.ts` (and any barrels) whenever adding public APIs so the package surface remains explicit.
- **Docs:** Align tone/structure with README & `docs/migration-5-to-6.md` (sectioned headings, rich snippets, callouts).

## 🧪 Code & Testing Patterns
- **Unit Tests:** Co-locate specs as `*.spec.ts` next to sources (e.g., `controller.instrumentation.spec.ts`). Tests rely on Jest (`ts-jest` preset) and should mock Nest providers where needed.
- **Coverage Expectations:** Global gates are 80% branches and 90% lines (see `jest.config.js`). New code must not regress below these thresholds.
- **Typical Flow:**
  1. `npm run lint`
  2. `npm run test` (or `npm run test:cov` for reports)
  3. `npm run build` (Nest CLI) before publishing or verifying dist output.
- **SDK Utilities:** When touching `open-telemetry-nestjs-sdk.ts`, add regression tests that validate helper composition (merging configs, propagators, etc.).

## ✅ Quality & CI Standards
- **Linting & Formatting:** `npm run lint` (ESLint + `@typescript-eslint`), `npm run format` (Prettier on `**/*.ts`). Keep lint clean; no unchecked warnings should reach CI.
- **CI Workflow:** `.github/workflows/ci.yml` runs lint → test (coverage) → build. Contributions must keep these stages green.
- **Semantic Release:** `semantic-release` governs versioning from `main`. Follow conventional commits or ensure release automation can infer the correct bump.
- **Prepublish Guard:** `npm run prepublishOnly` ensures a fresh `npm run build` before publication.

## ⚠️ Critical Rules & Constraints
- Preserve default instrumentation coverage (controllers, guards, pipes, interceptors, emitter, schedule, logger). Changes must remain backward compatible unless explicitly coordinated.
- Defer SDK bootstrapping side effects until helpers run; never import tracing setup within Nest modules directly.
- Maintain documentation accuracy with observed behavior—avoid speculative statements.
- Do not disable coverage thresholds, CI checks, or semantic-release steps without prior agreement.
- Keep assets (images, diagrams) under `docs/` and reference them with relative paths.

## 📚 Common Tasks / Playbooks
- **Adding a New Instrumentation:**
  1. Create `src/trace/instrumentation/<feature>.instrumentation.ts` following existing base class patterns.
  2. Register it in `OpenTelemetryModule.forRoot` defaults if applicable and export via `src/index.ts`.
  3. Write a matching `*.spec.ts` validating metadata scanning and span creation.
  4. Document usage in README or relevant docs section.
- **Extending SDK Helpers:**
  1. Update `open-telemetry-nestjs-sdk.ts` with new helper or configuration hook.
  2. Add Jest tests (e.g., verifying merged instrumentation configs or propagator composition).
  3. Mention the helper in README with sample code if public.
- **Updating Documentation / Migration Guides:**
  1. Mirror the structure of `docs/migration-5-to-6.md` (headings, checklists, tables).
  2. Include Before/After snippets using ```ts fences and highlight semantic convention impacts.
  3. Embed images by storing them under `docs/` and referencing via relative paths.
- **Formatting & Hygiene:** always run `npm run format` + `npm run lint` before pushing. Fix lint rather than suppress unless absolutely necessary (and document why).

## 🔍 Reference Examples
- `src/trace/decorators/span.ts` & `src/trace/decorators/traceable.ts` — canonical decorator implementations illustrating metadata use.
- `src/trace/instrumentation/controller.instrumentation.ts` & `controller.instrumentation.spec.ts` — pattern for instrumentation classes + their tests.
- `src/open-telemetry-nestjs-sdk.ts` — SDK bootstrap helpers and noise-reduction utilities.
- `src/meta-scanner.spec.ts` — focused Jest test ensuring shared utilities behave consistently.
- `docs/migration-5-to-6.md` — template for comprehensive documentation/migration narratives.

## 🔗 Additional Resources / Useful Links
- [README.md](./README.md) — installation, usage, and decorator guidance.
- [Migration Guide (v5 → v6)](./docs/migration-5-to-6.md) — detailed upgrade path and code samples.
- [GitHub Issues](https://github.com/amplication/opentelemetry-nestjs/issues) — backlog of feature/bug requests.
- [OpenTelemetry JavaScript Docs](https://opentelemetry.io/docs/instrumentation/js/) — upstream reference when adding instrumentation or SDK helpers.
