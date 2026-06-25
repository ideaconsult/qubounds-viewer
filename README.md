# qu-bounds UI

React/Vite frontend for exploring conformal prediction intervals from the [qubounds](https://github.com/ideaconsult/qubounds) package.

## Integration

Same deployment pattern as h5web in nambit/spectrasearch:
- Deep-linked from nambit chemical cards: `?compound=DTXSID0020585&back=https://nambit.adma.ai`
- Usable standalone: paste any CAS, DTXSID, SMILES, or InChIKey
- Multi-compound comparison: `?compound=DTXSID001&compound=DTXSID002`
- Shares Keycloak realm with nambit — no separate login

## Setup

```bash
cp .env.example .env.local
# fill in Keycloak + API endpoints

npm install
npm run dev
```

## Environment variables

See `.env.example`. Key ones:

| Variable | Purpose |
|---|---|
| `VITE_KEYCLOAK_URL` | Keycloak server URL |
| `VITE_KEYCLOAK_REALM` | Realm (shared with nambit) |
| `VITE_KEYCLOAK_CLIENT` | Client ID for this app |
| `VITE_API_URL` | Backend base (structure depiction, proxy) |
| `VITE_SOLR_URL` | Solr base via proxy |
| `VITE_PREDICTIONS_CORE` | Predictions Solr collection name |
| `VITE_CHEMICALS_CORE` | Chemicals Solr collection name |
| `VITE_HSDS_URL` | HSDS server (for h5web deep links) |
| `VITE_HSDS_DOMAIN` | HSDS domain path for model .nxs files |

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
