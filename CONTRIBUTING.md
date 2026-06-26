## Introduction

qu-bounds Viewer is a React/Vite frontend for visualizing conformal prediction intervals and prediction sets. The repository serves two outputs from one codebase: a standalone app deployed under `/qubounds/` and an embeddable React component for host applications.

The intended public package name is `@ideaconsult/qubounds-viewer` under the `ideaconsult` npm organization. Older/local prototypes may still refer to `@adma/qubounds-viewer`; do not use that as the long-term package name.

## Development Workflow

- Use feature branches and pull requests for normal changes.
- Rebase feature branches regularly and avoid merge commits when pulling shared branches.
- Keep changes small and focused; this repo is a viewer library as well as an app, so host-specific behavior should stay outside the reusable component when possible.

## Setup

Install dependencies:

```sh
npm install
```

Create local environment configuration when needed:

```sh
cp .env.example .env.local
```

Start the standalone app:

```sh
npm run dev
```

The dev server uses Vite on port `5174` and serves the app with base path `/qubounds/`.

## Build And Verification

Build the standalone app:

```sh
npm run build
```

Build the embeddable library package:

```sh
npm run build:lib
```

Preview a production app build:

```sh
npm run preview
```

There are currently no configured test, lint, formatter, or typecheck scripts. For code changes, run the relevant build command and document any checks that are unavailable or skipped.

## Embedding Contract

Consumers should eventually depend on the npm package and import the component and CSS:

```jsx
import PredictionViewer from "@ideaconsult/qubounds-viewer";
import "@ideaconsult/qubounds-viewer/style.css";
```

The reusable component is `PredictionViewer`. It accepts prediction item ids, subject compound ids, filters, backend configuration, auth token, and display options as props. Standalone URL parsing belongs in `src/App.jsx`; do not add URL parsing requirements to the reusable component.

Keep React and ReactDOM as peer dependencies. The library build currently bundles Recharts and emits `dist/qubounds-viewer.js` plus `dist/style.css`.

## Auth And Backend Expectations

- The viewer must never initiate Keycloak login or redirect flow.
- Embedded hosts pass a token prop when authenticated.
- Standalone mode passively reads `?token=`, `sessionStorage`, or `postMessage`.
- The UI should still render without a token; protected resources should degrade gracefully.
- Data access goes through backend `/db/query` and `/db/download` routes rather than raw Solr endpoints.

## Publishing

Before the first npm release:

1. Rename the package in `package.json` to `@ideaconsult/qubounds-viewer`.
2. Remove `private: true`.
3. Reconcile the lockfile with `package.json`.
4. Run `npm run build` and `npm run build:lib`.
5. Verify the package contents include the library bundle, CSS, and any files needed by consumers.

Local `file:` dependencies are acceptable only for development while iterating across repositories. They are not a release or CI distribution strategy.

## Tooling Direction

This repository currently uses npm and has no lint/format/test toolchain. A future tooling migration should be done deliberately, preferably in its own change, with updated docs and lockfile changes.

pnpm, Biome, and Lefthook would be reasonable choices for consistency with related frontend projects, but do not mix that migration into unrelated feature work.

## Documentation Maintenance

- Update `AGENTS.md` and this file when install commands, scripts, verification steps, packaging, release flow, backend routes, auth behavior, or integration contracts change.
- Update `QUBOUNDS_UI_SPEC.md` when changing UI behavior, data contracts, URL params, environment variables, architecture, or integration assumptions.
- Treat `QUBOUNDS_UI_SPEC.md` as valuable context, not an executable source of truth; reconcile it with source code when they differ.
