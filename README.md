# qu-bounds UI

React/Vite viewer for exploring conformal prediction intervals and prediction sets from the [qubounds](https://github.com/ideaconsult/qubounds) package.

The primary target is an embeddable React component. The same component also powers a standalone `/qubounds/` app for development, demos, and direct links.

## Embedding

The intended public package name is `@ideaconsult/qubounds-viewer`. Until publication, local prototypes may still use the older `@adma/qubounds-viewer` name.

```jsx
import PredictionViewer from '@ideaconsult/qubounds-viewer'
import '@ideaconsult/qubounds-viewer/style.css'

<PredictionViewer
  items={['prediction-item-id']}
  type="prediction"
  dataSource="predictions"
  token={token}
  apiBase="https://nambit.adma.ai/api"
/>
```

Hosts own authentication and pass a bearer token with the `token` prop when protected resources are needed. The viewer never starts login or redirect flow.

## Standalone App

The standalone app follows the same deployment pattern as h5web in nambit/spectrasearch:
- Deep-linked from nambit chemical cards: `?compound=DTXSID0020585&back=https://nambit.adma.ai`
- Usable standalone: paste any CAS, DTXSID, SMILES, or InChIKey
- Multi-compound comparison: `?compound=DTXSID001&compound=DTXSID002`
- Passive auth only: standalone mode can receive `?token=`, `sessionStorage`, or `postMessage`

## Setup

```bash
cp .env.example .env
# fill in backend and HSDS endpoints if needed

npm install
npm run dev
```

## Environment variables

See `.env.example`. Key ones:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | ramanchada/nambit backend base |
| `VITE_PREDICTIONS_CORE` | Predictions data source/collection name |
| `VITE_CHEMICALS_CORE` | Chemicals data source/collection name |
| `VITE_SUBJECT_FIELD` | Subject join field; defaults to `dsstox_id_s` |
| `VITE_HSDS_URL` | HSDS server (for h5web deep links) |
| `VITE_HSDS_DOMAIN` | HSDS domain path for model .nxs files |

Backend calls use `/db/query` and `/db/download` routes through `VITE_API_URL`, not raw Solr endpoints.

## Solr field conventions (predictions collection)

The app reads the following fields from prediction documents:

| Field | Type | Description |
|---|---|---|
| `dsstox_id_s` | string | DSSTox compound ID (join key) |
| `reference_s` | string | SSbD endpoint group (e.g. `Acute_aquatic_toxicity`) |
| `endpointcategory_s` | string | Endpoint category code (e.g. `EC_FISHTOX_SECTION`) |
| `type_s` | string | `regression` or `classification` |
| `guidance_s` | string | Units |
| `attr_method` | string[] | List of method names in this document |
| `{method}_pred_d` | double | Point prediction |
| `{method}_lower90_d` | double | Lower conformal bound |
| `{method}_upper90_d` | double | Upper conformal bound |
| `{method}_pred_set_s` | string | Classification prediction set (JSON array) |
| `{method}_set_size_i` | int | Prediction set size |
| `{method}_ad_s` | string | Domain status: `in_domain`, `borderline`, `out_of_domain` |
| `{method}_exp_d` | double | Experimental (true) value if available |
| `{method}_covered_b` | bool | Whether true value is inside the interval |

## Plots

Follows qubounds paper conventions:

**Regression**: compounds sorted by increasing interval width (x-axis), predicted value ± CP interval (y-axis). Orange = prediction, grey bars = interval, blue = true covered, red × = true missed.

**Classification**: compounds sorted by increasing prediction set size (x-axis), class on y-axis. Grey bars span the prediction set, orange = predicted class, blue/red = true class covered/missed. Dashed vertical lines separate set size regions.

## h5web integration

Each model row has an `h5` button linking to the corresponding `.nxs` calibration file in HSDS/h5web, identical to how nambit links spectra to h5web.

## Building for production

```bash
npm run build
# dist/ is served under /qubounds/ (see vite.config.js base)
```

Build the embeddable library:

```bash
npm run build:lib
# dist/qubounds-viewer.js and dist/style.css are the package artifacts
```

Run tests:

```bash
npm test
```
