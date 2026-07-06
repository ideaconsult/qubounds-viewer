# qu-bounds UI — Development Specification

_This document captures design decisions, architecture, data contracts, and current code state so development can continue without context loss. Verify claims against executable source before relying on them._

---

## Project Overview

**qu-bounds UI** is a standalone React/Vite app for visualising conformal prediction intervals produced by the [qubounds](https://github.com/ideaconsult/qubounds) Python package.

It is part of the **adma.ai** ecosystem alongside:

- **nambit.adma.ai** / **spectra.adma.ai** — chemical/spectra search UI (React/Vite, repo: `h2020charisma/spectrasearch`)
- **h5web** — HDF5 file viewer, used to inspect model calibration `.nxs` files stored in HSDS
- **ramanchada-api** — FastAPI backend (repo: `h2020charisma/ramanchada-api`), configured per deployment; provides structure depiction, search , Solr proxy, and auth integration

The deployment model mirrors h5web exactly: **nambit links out to qu-bounds UI** passing a compound identifier (and optionally a token) via URL parameters. The qu-bounds UI is independently usable without nambit.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Charting | Recharts 2 |
| Auth | Passive bearer-token handling — token received, never initiated |
| Styling | CSS Modules + CSS custom properties |
| Build base path | `/qubounds/` |
| Dev port | 5174 |

Dependencies in `package.json`:
```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "recharts": "^2.12.7",
    "vite": "^5.3.4",
    "vitest": "^4.1.9"
  }
}
```

---

## Authentication — Critical Constraint

**The viewer NEVER initiates a login or redirect.** It is a viewer, not an auth entry point.

Token receipt priority order (`src/context/AuthContext.jsx`):
1. URL param `?token=...` (nambit passes it here, same as h5web) — stripped from URL after reading and cached in `sessionStorage`
2. `sessionStorage` — from a prior navigation in the same tab
3. `window.postMessage` — if embedded as an iframe, parent posts `{ type: 'keycloak_token', token: '...' }`

If no token is present, **the app renders normally**. Public backend resources should work without auth, while protected image/data requests degrade gracefully.

```jsx
const token = readFromUrlOrSession()  // never call keycloak.init()
```

---

## Data Sources

### Two separate Solr collections (federated in the nambit API)

**Chemicals collection** — DSSTox compound records:

| Field | Type | Description |
|---|---|---|
| `dsstox_id_s` | string | Primary identifier (DTXSID) — join key |
| `preferred_name_t` | string | Display name |
| `SMILES_s` | string | Canonical SMILES |
| `inchi_key_s` | string | InChIKey |
| `casrn_s` | string | CAS RN |
| `qsar_ready_smiles_s` | string | QSAR-ready SMILES |
| `attr_synonyms` | string[] | Synonyms |
| `type_s` | string | `"chemical"` |

**Predictions collection** — one document per compound × SSbD group × endpoint category, with dynamic fields per method:

| Field | Type | Description |
|---|---|---|
| `dsstox_id_s` | string | Join key to chemicals |
| `reference_s` | string | SSbD group (e.g. `Acute_aquatic_toxicity`) |
| `endpointcategory_s` | string | Endpoint code (e.g. `EC_FISHTOX_SECTION`) |
| `guidance_s` | string | Platform/software (e.g. `VEGA`) |
| `type_s` | string | `"prediction"` |
| `attr_method` | string[] | List of method names in this document |
| `{method}_pred_d` | double | Point prediction |
| `{method}_lower90_d` | double | Lower conformal bound (90% CI) |
| `{method}_upper90_d` | double | Upper conformal bound (90% CI) |
| `{method}_pred_set_s` | string | Classification prediction set (JSON array, e.g. `"[1,2]"`) |
| `{method}_set_size_i` | int | Prediction set size |
| `{method}_ad_s` | string | Domain status: `in_domain` / `borderline` / `out_of_domain` |
| `{method}_exp_d` | double | Experimental (true) value if available |
| `{method}_covered_b` | bool | Whether true value is inside the interval |

**Key design fact**: one prediction document groups all methods sharing the same `(SSbD, endpoint)` pair. The wide format uses dynamic fields per method, so a document for Fish LC50 might have `FATHEAD_EPA_pred_d`, `FISH_IRFMN_pred_d`, etc.

### API access pattern

The app does **not** talk to raw Solr directly. All requests go through the **nambit/ramanchada-api backend**.

Current route pattern in `src/hooks/useSolr.js`:

- `/db/query` resolves subject compounds to prediction item ids.
- `/db/download?what=json` fetches prediction/model documents.
- `/db/download?what=thumbnail` fetches structure thumbnails.

Use local  FastAPI running at http://127.0.0.1:8000/docs


### Structure depiction

Structure thumbnails use `/db/download?what=thumbnail&extra=chemical&data_source={chemicalsCore}`. Token is appended only when available.

### HSDS / h5web links

Each model links out to its `.nxs` calibration file in HSDS:
`{VITE_HSDS_URL}/?file={VITE_HSDS_DOMAIN}/{method}.nxs`

The h5web viewer opens directly; auth handling is owned by the host/deployment.

---

## Endpoint Taxonomy

From `vega_models_withclasses.xlsx` (105 VEGA models). The `reference_s` field in Solr maps to these SSbD groups:

- `Acute_aquatic_toxicity`
- `Carcinogenicity`
- `Chronic_aquatic_toxicity`
- `Endocrine_disruption`
- `Eye_damage_irritation`
- `Mutagenicity`
- `P-CHEM`
- `PBT`
- `PMT`
- `Reproductive_toxicity`
- `STOT-RE`
- `STOT-SE`
- `Skin_corrosion_irritation`
- `Skin_sensitization`
- `Toxicity`

Human-readable labels and endpoint code → display name mappings live in `src/utils/modelRegistry.js`. This is designed to be platform-agnostic — future OPERA/OCHEM models add new SSbD entries here or load dynamically from an API.

---

## URL Parameters

`src/App.jsx` reads these standalone app parameters on load:

| Param | Example | Meaning |
|---|---|---|
| `item` | `?item=prediction-id` | Single or multiple prediction item ids (repeatable) |
| `compound` | `?compound=DTXSID0020585` | Single or multiple DTXSID (repeatable) |
| `subject_field` | `?subject_field=dsstox_id_s` | Field used to resolve subjects to prediction items |
| `ssbd` | `?ssbd=Acute_aquatic_toxicity` | SSbD group filter (repeatable) |
| `endpoint` | `?endpoint=EC_FISHTOX_SECTION` | Endpoint category filter (repeatable) |
| `model` | `?model=FATHEAD_EPA` | Model/method filter (repeatable) |
| `data_source` | `?data_source=predictions` | Prediction data source/collection |
| `type` | `?type=prediction` | Extra document type to request |
| `back` | `?back=https://nambit.adma.ai` | Return link shown in header |

`token` is handled separately by `AuthContext`: URL `?token=`, then `sessionStorage`, then `postMessage`.

Multi-compound example: `?compound=DTXSID001&compound=DTXSID002&back=https://nambit.adma.ai`

---

## Plots — Visual Specification

Matches the qubounds paper figures exactly.

### Regression: Sorted Interval Plot

- X-axis: molecules ranked by **increasing interval width** (left = tightest, right = widest)
- Y-axis: predicted value (with units)
- **Orange dots**: predicted value `ŷ`
- **Grey error bars**: conformal interval `[lower, upper]`
- **Blue dots**: true experimental value (if available) — covered compounds
- **Red × markers**: true experimental value — missed (outside interval)
- Title: `{METHOD} — Sorted by CP interval width (α={alpha}, coverage={cov}%)`
- Bottom-right annotation: `Mean width = {value}`

### Classification: Prediction Set Plot

- X-axis: molecules ranked by **increasing set size**
- Y-axis: class label (integer)
- **Grey vertical bars**: span of the prediction set (from min class to max class in set)
- **Orange dots**: predicted class `ŷ`
- **Blue dots**: true class — covered
- **Red × markers**: true class — missed
- **Dashed vertical lines**: boundaries between set size regions (`set size=1`, `set size=2`, etc.)
- Bottom-right annotation: singleton/doubleton/size=N counts and percentages

### Same plot type for 1 compound and multiple compounds

When multiple compounds are loaded, each appears as a separate point on the same plot for that model. Sorting is still by interval width (regression) or set size (classification). Tooltip shows compound name/ID.

---

## File Structure (current state)

```
ui/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx                          # Root: URL params, state, layout
    ├── App.module.css
    ├── index.css                        # CSS vars (LIGHT theme), global styles
    ├── context/
    │   └── AuthContext.jsx              # Passive token receipt
    ├── hooks/
    │   └── useSolr.js                   # usePredictionItems, useModelRegistry, useStructureUrl
    ├── utils/
    │   ├── modelRegistry.js             # SSbD/endpoint labels, parseMethodPredictions, groupPredictions
    │   ├── buildPredictionTree.js       # Transforms Solr docs → plot-ready tree
    │   └── exportCSV.js                 # CSV export
    ├── tests/                           # Vitest unit tests
    └── components/
        ├── Header.jsx / .module.css
        ├── CompoundInput.jsx / .module.css   # Search + file upload + chips
        ├── Sidebar.jsx / .module.css         # Confidence selector, compound cards, endpoint filter
        ├── MainPanel.jsx / .module.css       # Empty/loading states, SSbD sections
        ├── EndpointGroup.jsx / .module.css   # Collapsible endpoint → model plots
        ├── IntervalPlot.jsx / .module.css    # Regression sorted interval plot (Recharts)
        └── ClassificationPlot.jsx            # Classification prediction set plot (Recharts)
```

---

## Design — Light Theme

Colour palette (`index.css`):

```css
--c-bg:          #f5f6f8;   /* page background */
--c-surface:     #ffffff;   /* cards, header, sidebar */
--c-surface-2:   #f0f2f5;   /* inputs, plot backgrounds */
--c-border:      #dde1e9;
--c-text:        #1a1d26;
--c-text-muted:  #5a6076;
--c-accent:      #0d9488;   /* teal */

/* Prediction colours (match qubounds paper) */
--c-pred:        #d97706;   /* amber — predicted point */
--c-covered:     #2563eb;   /* blue — true covered */
--c-missed:      #dc2626;   /* red — true missed / OOD */
--c-interval-stroke: #94a3b8;  /* grey error bars */
```

Fonts: Inter (body) + JetBrains Mono (identifiers, badges, numeric values).

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header: qu·bounds logo │ [Export CSV] [← nambit] [GitHub]│
├─────────────────────────────────────────────────────────┤
│ Search bar: [⌕ CAS / DTXSID / SMILES / name…] [↑ List] │
│ Compound chips: [Bisphenol A ×] [Benzene ×]             │
├──────────────┬──────────────────────────────────────────┤
│ Sidebar      │ Main Panel                               │
│              │                                          │
│ Confidence   │ ▼ Acute Aquatic Toxicity                 │
│ [80%][90%]   │   ▼ Fish Acute LC50                      │
│ [95%]        │     VEGA  [in-domain] [h5]               │
│              │     [IntervalPlot: FATHEAD_EPA]          │
│ Compound     │     [IntervalPlot: FISH_IRFMN]           │
│ [structure]  │                                          │
│ name / ID    │   ▼ Daphnia EC50                         │
│              │     ...                                  │
│ Endpoints    │                                          │
│ ▸ Aquatic    │ ▼ Genotoxicity                           │
│ ▸ Geno...    │   ▼ Ames Mutagenicity                    │
│ ▸ P-CHEM     │     [ClassificationPlot: AMES_KNN]       │
│              │                                          │
│ [all][none]  │                                          │
│              │                                          │
│ [h5web link] │                                          │
└──────────────┴──────────────────────────────────────────┘
```

---

## Environment Variables

```bash
VITE_API_URL=https://nambit.adma.ai/api    # backend base
VITE_PREDICTIONS_CORE=predictions
VITE_CHEMICALS_CORE=dsstox
VITE_SUBJECT_FIELD=dsstox_id_s

VITE_HSDS_URL=https://hsds.adma.ai
VITE_HSDS_DOMAIN=/qubounds                 # HSDS domain for .nxs files
```

---

## Known TODOs / Open Questions

1. **Confidence levels**: The UI currently exposes only 90% confidence; add more levels only when backend fields/data exist.

2. **Classification fields**: Current code expects `{method}_set90_ss` and `{method}_set_size90_i` for classification prediction sets. Confirm backend field names when new classification datasets are added.

3. **`guidance_s` vs platform**: Currently `guidance_s` may be used as a fallback software/platform badge when model metadata is absent. Verify this is still appropriate as backend metadata evolves.

4. **Recharts ErrorBar for classification**: The grey bar spanning the prediction set is implemented using `ErrorBar` on a zero-width Scatter point. This may need adjustment — consider using custom SVG shapes in Recharts if the bar thickness looks wrong.

---

## How to Get Running

```bash
cd D:\nina\src\git_idea\qubounds_clean\ui
cp .env.example .env
# edit .env with actual URLs

pnpm install --frozen-lockfile
pnpm dev       # http://localhost:5174/qubounds/
pnpm test      # one-shot Vitest suite

# Test with a known DTXSID:
# http://localhost:5174/qubounds/?compound=DTXSID0020585
```

---

## Data Pipeline Context

Predictions are produced by `D:\nina\src\git_idea\datamolder\dataprep\tasks\load_predictions_parquet.py`:

1. Reads VEGA regression output Excel files (sheet `Prediction Intervals`)
2. Looks up `SSbD` and `ENDPOINT_CATEGORY` from `vega_models_withclasses.xlsx` by method key
3. Writes wide-format JSON files grouped by `(SSbD, ENDPOINT_CATEGORY)`, one doc per compound
4. Field naming: `{METHOD}_pred_d`, `{METHOD}_lower90_d`, `{METHOD}_upper90_d`
5. JSON is indexed into the Solr `predictions` collection

The `qubounds_clean` Python package (in the same repo root) produces the MAPIE-based conformal intervals. HSDS `.nxs` files store the calibration/training sets and are linked from the UI via the `[h5]` button on each model row.
