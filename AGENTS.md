# AGENTS.md

## Sources

- Prefer `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vite.config.js`, `vite.lib.config.js`, `vitest.config.js`, `.env.example`, `README.md`, and `docs/QUBOUNDS_UI_SPEC.md` for current behavior.
- `docs/QUBOUNDS_UI_SPEC.md` captures important architecture, UI, and data-contract context, but parts may lag source; verify claims against executable code before relying on them.
- Keep this file, `CONTRIBUTING.md`, and `docs/QUBOUNDS_UI_SPEC.md` updated when commands, entrypoints, API routes, URL params, data fields, auth behavior, packaging, or integration assumptions change.

## Project Shape

- This is a single-package React/Vite project that is both a standalone `/qubounds/` app and an embeddable viewer library.
- Standalone app entrypoint: `src/main.jsx` -> `src/App.jsx` -> `PredictionViewer`.
- Library entrypoint: `src/index.js`, exporting `PredictionViewer` and expecting consumers to import the bundled CSS.
- The public npm package name is `@ideaconsult/qubounds-viewer`; older/local prototypes may still mention `@adma/qubounds-viewer`.
- `src/PredictionViewer.jsx` owns the reusable component API; avoid putting host-specific URL parsing there.

## Commands

- Current package manager is pnpm, pinned by `packageManager` in `package.json`; install with `pnpm install --frozen-lockfile`.
- Dev server: `pnpm dev`; Vite serves on port `5174` with `base: '/qubounds/'`.
- Production app build: `pnpm build`.
- Library build for package consumers: `pnpm build:lib`; it emits `dist/qubounds-viewer.js` and `dist/style.css`.
- Preview production app build: `pnpm preview`.
- Test suite: `pnpm test`; watch mode: `pnpm test:watch`.
- There are currently no lint, formatter, or typecheck scripts; use `pnpm test` plus the relevant build command as the available verification step for code changes.

## Vite And Packaging

- `vite.config.js` sets `base: '/qubounds/'` and proxies `/db` to `http://127.0.0.1:8000` plus `/api` to `http://localhost:8080` for development.
- `vite.lib.config.js` externalizes `react`, `react-dom`, and `react/jsx-runtime`; keep React as a peer dependency for embedded consumers.
- Recharts is bundled into the library build, so consumers only need React/ReactDOM plus the viewer package.
- Keep `package.json`, lockfile metadata, npm package name, and publish settings in sync before releases.
- Do not commit generated `dist/` unless a release workflow explicitly requires checked-in artifacts.

## Auth And Backend Contract

- Do not add Keycloak login, redirect, or `keycloak.init()` behavior. Auth is passive.
- Embedded hosts pass `token`; standalone mode reads `?token=`, then `sessionStorage`, then `postMessage` with `{ type: 'keycloak_token', token }`.
- The viewer must render without a token; public data should still work and protected image/data requests should degrade gracefully.
- Data calls go through the ramanchada/nambit backend routes, not raw Solr: `/db/query` resolves subjects to item ids, `/db/download?what=json` fetches prediction/model docs, and `/db/download?what=thumbnail` fetches structures.

## URL And Data Contracts

- Standalone URL params are read in `src/App.jsx`: repeatable `item`, repeatable `compound`, `subject_field`, repeatable `ssbd`, repeatable `endpoint`, repeatable `model`, `data_source`, `type`, and `back`.
- `VITE_API_URL`, `VITE_PREDICTIONS_CORE`, `VITE_CHEMICALS_CORE`, `VITE_SUBJECT_FIELD`, `VITE_HSDS_URL`, and `VITE_HSDS_DOMAIN` are read only by the standalone app shell in `src/App.jsx`; reusable library code must receive config through props/context, not `import.meta.env`.
- Prediction docs are wide records: `attr_method` lists methods, and method fields use names like `{METHOD}_pred_d`, `{METHOD}_lower90_d`, `{METHOD}_upper90_d`, `{METHOD}_covered90_b`, `{METHOD}_set90_ss`, and `{METHOD}_set_size90_i`.
- Model metadata is optional and loaded with `extra=model`; when absent, the UI falls back to static labels, method keys, and `guidance_s`/software fields.

## Styling And Integration

- Library consumers should import the package CSS once; viewer-specific styles are scoped under `.qubounds-root`.
- Preserve the props-driven component contract: `items`, `subjects`, filters, `type`, `dataSource`, `token`, `apiBase`, collection overrides, `subjectField`, `hsds`, `showHeader`, and `backUrl`.
- Keep standalone URL handling, passive auth, runtime config, data loading, and presentation concerns separated; this makes the same component usable inside other React apps.
