# qubounds-viewer: auth cleanup + test suite

## Auth design (correct as-is)

`@adma/qubounds-viewer` is a pure React component library. The host app (spectrasearch-viewers) owns authentication and passes a Bearer token as a prop:

```jsx
<PredictionViewer token={token} apiBase={apiBase} ... />
```

`src/context/AuthContext.jsx` is prop-driven:
- When `token` prop is given: used directly, no URL reading, no postMessage, no login redirect.
- Standalone fallback (no prop): reads `?token=` URL param → `sessionStorage` → `postMessage` from parent frame. **No `keycloak.init()`, no redirect.**
- `useAuth()` exposes `{ token, authenticated }` to all hooks.

## Auth cleanup (done)

Removed dead code that referenced Keycloak without ever using it:

| Removed | Reason |
|---|---|
| `src/keycloak.js` | Created a `Keycloak` instance that was never imported anywhere |
| `VITE_KEYCLOAK_*` in `.env.example` | Only referenced `keycloak.js` |
| `VITE_KEYCLOAK_*` in `.env.local` | Same |

`keycloak-js` was not in `package.json` dependencies and will drop from the lock file on next `npm install`.

## Test suite

Framework: **vitest** + **@testing-library/react** + **jsdom**.

```
src/tests/
  setup.js                          # @testing-library/jest-dom matchers
  utils/
    buildPredictionTree.test.js     # core data-transformation logic (11 tests)
    modelRegistry.test.js           # field extraction + grouping (10 tests)
  hooks/
    useSolr.test.js                 # pure helpers: authHeaders, orClause, filterDocs (13 tests)
  context/
    AuthContext.test.jsx            # controlled + uncontrolled auth paths (9 tests)
vitest.config.js
```

Run:
```bash
npm test          # vitest run (one-shot)
npm run test:watch  # vitest watch
```

### Coverage rationale

**Pure utilities tested directly** (zero mocks, deterministic):
- `buildPredictionTree`: regression shape, classification shape, empty compound, hsds passthrough, registry metadata.
- `parseSet` (internal): tested indirectly via classification docs.
- `parseMethodPredictions`: field extraction, intervalWidth, null filtering, multiple methods.
- `groupPredictions`: ssbd/endpoint nesting, empty input, fallback to "Unknown".
- `authHeaders`, `orClause`, `filterDocs`: all edge cases.

**AuthContext tested with renderHook** (jsdom, minimal mocks):
- Controlled path (token prop): value, updates, isolation from sessionStorage.
- Uncontrolled path: sessionStorage read, postMessage relay, wrong-type ignored.

**Deferred** (hooks `usePredictionItems`, `useModelRegistry`, `useStructureUrl`): require mocking `fetch` + multiple contexts — better suited for integration/E2E tests.

## File layout after changes

```
src/
  context/
    AuthContext.jsx   ← kept unchanged (correct)
    ViewerConfig.jsx
  hooks/
    useSolr.js        ← kept unchanged
  utils/
    buildPredictionTree.js
    exportCSV.js
    modelRegistry.js
  tests/              ← new
    setup.js
    utils/
      buildPredictionTree.test.js
      modelRegistry.test.js
    hooks/
      useSolr.test.js
    context/
      AuthContext.test.jsx
  # keycloak.js       ← deleted
vitest.config.js      ← new
docs/
  PLAN.md             ← this file
```
