# 🤖 Project Overview
- **Purpose:** `@amplication/opentelemetry-nestjs` is a NestJS-focused OpenTelemetry helper library that ships automatic instrumentation, tracing decorators, SDK helpers, and observability utilities for HTTP, GraphQL, schedulers, and other framework layers.
- **Scope:** Exposes `OpenTelemetryModule.forRoot(...)`, decorator utilities like `@Span` / `@Traceable`, and helpers such as `TraceService`, `Tracer`, and `TraceWrapper` so NestJS apps gain consistent telemetry with minimal setup.
- **Expectations for agents:** Keep instrumentation exhaustive yet noise-free, preserve documentation-driven onboarding, and ensure every change is linted, tested, and reflected in README/docs/workflows when necessary.

# 🗂️ Repository Structure
```text
opentelemetry-nestjs/
├── src/
│   ├── open-telemetry.module.ts        # Public Nest module & entry exports
│   ├── open-telemetry-nestjs-sdk.ts    # SDK helpers for NodeSDK bootstrap
│   └── trace/
│       ├── decorators/                 # @Span, @Traceable implementations
│       ├── instrumentation/            # <feature>.instrumentation.ts (+ specs)
│       ├── trace-wrapper.ts(.spec.ts)  # TraceWrapper utility for non-DI classes
│       └── *.ts                        # TraceService, logger interfaces, types
├── docs/                               # e.g., migration-5-to-6.md, image assets
├── .github/workflows/                  # ci.yml, release.yml, releaseBeta.yml
├── README.md                           # Primary usage & setup guide
├── jest.config.js                      # ts-jest config with coverage rules
├── package.json / package-lock.json    # npm scripts + tooling definitions
├── tsconfig.json / tsconfig.build.json # Compiler config & build output filters
├── .eslintrc.js / .prettierrc          # Linting and formatting standards
└── NEW: AGENTS.md                      # This guide
```

# 🛠️ Development Guidelines
- **Install dependencies:** `npm install` (Node 18+ recommended—align with Nest CLI/ts-jest support).
- **NPM scripts:**
  - `npm run lint` → ESLint on `{src,apps,libs,test}` with autofix.
  - `npm run format` → Prettier across `**/*.ts`.
  - `npm run test` / `npm run test:cov` → Jest suites (coverage summary from `test:cov`).
  - `npm run build` → `nest build` emits `dist/` after running `rimraf dist` via `prebuild`.
  - `npm run prepublishOnly` → Ensures `build` completes before publishing.
  - `npm run semantic-release` → Automated release pipeline (normally via CI).
- **Configuration touchpoints:**
  - Jest thresholds live in `jest.config.js` (branches ≥80%, lines ≥90%).
  - ESLint/Prettier rules defined in `.eslintrc.js` and `.prettierrc`; adhere before submitting changes.
  - `tsconfig.build.json` excludes `*.spec.ts` to keep published package clean.
- **Workflow awareness:**
  - `ci.yml` enforces install → lint → test:cov → build.
  - `release.yml` / `releaseBeta.yml` drive semantic-release jobs; local releases should mimic their command sequences.

# 🧩 Code Patterns
- **Instrumentation naming:** Every feature-specific tracer follows `<feature>.instrumentation.ts` with a mirrored `<feature>.instrumentation.spec.ts` in `src/trace/instrumentation/` (e.g., `controller.instrumentation.ts`). New instrumentations must follow this pattern for automatic discovery and coverage parity.
- **Decorator usage:** `src/trace/decorators/span.ts` (`@Span`) and `traceable.ts` (`@Traceable`) wrap Nest providers/services. Keep decorators parameter-light and idempotent; document usage in README if behavior changes.
- **TraceWrapper utility:** `src/trace/trace-wrapper.ts` exposes `TraceWrapper.trace(instance)` for non-injectable classes. Extend it rather than duplicating manual span creation logic; ensure its spec (`trace-wrapper.spec.ts`) covers new edge cases.
- **Co-located specs:** Tests sit beside source files within `src/`. When adding features, create/extend the matching `.spec.ts` in the same directory.
- **Documentation linkage:** README references supplemental content such as `docs/migration-5-to-6.md` and assets (e.g., `docs/log.png`). Update both README and docs to keep examples accurate when APIs shift.

# ✅ Quality Standards
- **Linting & formatting:** Run `npm run lint` and `npm run format` before submitting. Committers should not rely on CI to surface style failures.
- **Testing:** `npm run test` for quick feedback; `npm run test:cov` must stay above global thresholds (branches 80%, lines 90%). Add or update specs for every instrumentation/decorator/utility change.
- **Build integrity:** `npm run build` must succeed locally; it’s also invoked automatically by `prepublishOnly` and CI release jobs.
- **Semantic release alignment:** Versioning comes from commit messages + `semantic-release`. Follow conventional commits so `release.yml` / `releaseBeta.yml` remain deterministic.

# 🚨 Critical Rules
- Do **not** bypass existing instrumentations—extend the relevant class under `src/trace/instrumentation/` instead of creating ad-hoc tracing logic elsewhere.
- Keep naming conventions and directory placement intact; automated scanners assume them.
- When altering tracing behavior, update README and any affected doc (e.g., `docs/migration-5-to-6.md`) plus add/adjust specs.
- Never disable lint/test/build steps in workflows; if CI needs changes, modify `.github/workflows/*.yml` with justification and update this guide if expectations shift.
- Ensure new public APIs ship with documentation and example updates.

# 🧾 Common Tasks
### Run lint, tests, and build
```bash
npm install
npm run lint
npm run test
npm run test:cov
npm run build
```

### Add a new instrumentation class
1. Create `src/trace/instrumentation/<feature>.instrumentation.ts` extending the shared instrumentation base in the folder.
2. Register or export it through `src/index.ts` / relevant module so `OpenTelemetryModule.forRoot({ instrumentation: [...] })` can consume it.
3. Mirror the file with `src/trace/instrumentation/<feature>.instrumentation.spec.ts`, covering Nest lifecycle hooks and TraceService interactions.
4. Update README (Instrumentation table) if it’s user-facing.

### Update documentation or guides
1. Edit README usage or setup snippets to reflect API changes.
2. For breaking updates, append details to `docs/migration-5-to-6.md` or create a new doc under `docs/`.
3. Run `npm run format` for Markdown/TS files if Prettier is configured to cover them (default pattern targets `*.ts`; format Markdown manually if needed).
4. Verify links/assets (e.g., `docs/log.png`) remain valid.

# 📁 Reference Examples
- `src/open-telemetry.module.ts` → Shows how instrumentation arrays are injected into the Nest module.
- `src/trace/instrumentation/controller.instrumentation.ts` + `.spec.ts` → Canonical pattern for wrapping controller handlers.
- `src/trace/decorators/span.ts` and `traceable.ts` → Decorator implementations for provider-level spans.
- `src/trace/trace-wrapper.ts` → Example of tracing non-DI classes; spec demonstrates expected behavior.
- `docs/migration-5-to-6.md` → Template for future migration guides referencing renamed instrumentations.
- `.github/workflows/ci.yml` / `release.yml` / `releaseBeta.yml` → Show required validation and release sequences that local changes must respect.

# 🔗 Additional Resources
- [README.md](./README.md) – Installation, setup, decorators, SDK helpers, metrics, migration overview.
- [docs/migration-5-to-6.md](./docs/migration-5-to-6.md) – Detailed upgrade path and terminology changes.
- [docs/log.png](./docs/log.png) – Visual reference for trace-aware logging.
- [ci workflow](./.github/workflows/ci.yml) – Lint/test/build automation blueprint.
- [release workflow](./.github/workflows/release.yml) & [beta workflow](./.github/workflows/releaseBeta.yml) – Semantic-release pipelines and publishing safeguards.
