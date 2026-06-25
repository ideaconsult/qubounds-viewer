import { groupPredictions, parseMethodPredictions } from './modelRegistry'

const ENV = import.meta.env || {}

// Build the nested prediction tree ready for rendering
// compounds: array of { id, text, ... } (API response shape)
// docs: prediction documents
// registry: optional Map<method_s, modelDoc> of per-method metadata (units,
//           endpoint label, task, classes, calibration nxs). Absent ⇒ fall back
//           to method keys, guidance_s platform, no units.
// hsds: optional { url, domain } for the h5web calibration link (else env defaults)
// Returns: { [ssbd]: { [endpoint]: [ modelEntry ] } }
export function buildPredictionTree(compounds, docs, registry, hsds) {
  const hsdsBase = hsds?.url || ENV.VITE_HSDS_URL || 'https://hsds.adma.ai'
  const hsdsDomain = hsds?.domain || ENV.VITE_HSDS_DOMAIN || '/qubounds'
  const buildHsdsUrl = (method) => `${hsdsBase}/?file=${hsdsDomain}/${method}.nxs`
  const buildHsdsUrlFromNxs = (nxs) => `${hsdsBase}/?file=${nxs}`
  if (!docs?.length || !compounds?.length) return {}

  // Index docs by compound id (decoded Solr id = dsstox_id_s)
  const docsByCompound = {}
  for (const doc of docs) {
    const cid = doc.dsstox_id_s || decodeURIComponent(doc.id || '')
    if (!docsByCompound[cid]) docsByCompound[cid] = []
    docsByCompound[cid].push(doc)
  }

  // Collect all unique (ssbd, endpoint, method, taskType, units) combos
  const methodIndex = {} // key: `${ssbd}||${endpoint}||${method}` -> { ssbd, endpoint, method, taskType, units, hsdsUrl }

  for (const doc of docs) {
    const ssbd = doc.reference_s || 'Unknown'
    const endpoint = doc.endpointcategory_s || 'Unknown'
    const methods = doc.attr_method || []

    for (const method of methods) {
      const key = `${ssbd}||${endpoint}||${method}`
      if (!methodIndex[key]) {
        const model = registry?.get?.(method) || null
        // Task: model metadata wins; otherwise infer classification from the
        // presence of per-method set fields, else default to regression.
        const hasClsFields = doc[`${method}_set90_ss`] != null ||
          doc[`${method}_set_size90_i`] != null
        const taskType = model?.task_s ||
          (hasClsFields || doc.type_s === 'classification' ? 'classification' : 'regression')
        methodIndex[key] = {
          ssbd, endpoint, method, taskType,
          units: model?.unit_s ?? '',
          modelName: model?.model_name_s || method,
          endpointLabel: model?.endpoint_label_s || null,
          software: model?.software_s || doc.guidance_s || null,
          classLabels: model?.class_labels_ss || null,
          classValues: model?.class_values_ss || null,
          hsdsUrl: model?.nxs_s ? buildHsdsUrlFromNxs(model.nxs_s) : buildHsdsUrl(method)
        }
      }
    }
  }

  // For each method, gather one point per compound
  const tree = {}

  for (const [key, meta] of Object.entries(methodIndex)) {
    const { ssbd, endpoint, method, taskType, units, hsdsUrl,
            modelName, endpointLabel, software, classLabels, classValues } = meta

    const points = []
    for (const compound of compounds) {
      const cid = decodeURIComponent(compound.id || '')
      const compDocs = docsByCompound[cid] || []

      // Find the doc for this ssbd/endpoint
      const doc = compDocs.find(d =>
        d.reference_s === ssbd &&
        d.endpointcategory_s === endpoint &&
        (d.attr_method || []).includes(method)
      )

      if (!doc) continue

      if (taskType === 'regression') {
        const pred     = doc[`${method}_pred_d`] ?? null
        const lower    = doc[`${method}_lower90_d`] ?? null
        const upper    = doc[`${method}_upper90_d`] ?? null
        if (pred == null) continue

        points.push({
          compoundId:   cid,
          compoundName: compound.text || null,
          pred,
          lower,
          upper,
          intervalWidth: upper != null && lower != null ? upper - lower : null,
          domainStatus: doc[`${method}_ad_s`] || null,
          trueValue: doc[`${method}_exp_d`] ?? null,
          covered: doc[`${method}_covered90_b`] ?? null
        })
      } else {
        // Classification (level baked into field name, mirroring regression's _lower90_d/_upper90_d)
        const predClass    = doc[`${method}_pred_d`] ?? null
        const predSet      = doc[`${method}_set90_ss`] // multi-valued array of code strings
        const setSize      = doc[`${method}_set_size90_i`] ?? null
        if (predClass == null) continue

        const parsedSet = parseSet(predSet)
        const setMin = parsedSet.length ? Math.min(...parsedSet) : predClass
        const setMax = parsedSet.length ? Math.max(...parsedSet) : predClass

        points.push({
          compoundId:   cid,
          compoundName: compound.text || null,
          predClass,
          predictionSet: parsedSet,
          setMin,
          setMax,
          setSize: setSize ?? parsedSet.length,
          trueClass: doc[`${method}_exp_d`] ?? null,
          covered: doc[`${method}_covered90_b`] ?? null,
          domainStatus: doc[`${method}_ad_s`] || null
        })
      }
    }

    if (!points.length) continue

    // Compute summary stats
    let meanWidth = null, coverage = null, stats = null

    if (taskType === 'regression') {
      const widths = points.map(p => p.intervalWidth).filter(w => w != null)
      meanWidth = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : null
      const covPts = points.filter(p => p.covered != null)
      if (covPts.length) coverage = covPts.filter(p => p.covered).length / covPts.length
    } else {
      const sizes = points.map(p => p.setSize).filter(s => s != null)
      const counts = {}
      for (const s of sizes) counts[s] = (counts[s] || 0) + 1
      stats = Object.fromEntries(
        Object.entries(counts).map(([s, n]) => [
          s === '1' ? 'singleton' : s === '2' ? 'doubleton' : `size=${s}`,
          `${n} (${Math.round(n / sizes.length * 100)}%)`
        ])
      )
      const covPts = points.filter(p => p.covered != null)
      if (covPts.length) coverage = covPts.filter(p => p.covered).length / covPts.length
    }

    // Build tree
    if (!tree[ssbd]) tree[ssbd] = {}
    if (!tree[ssbd][endpoint]) tree[ssbd][endpoint] = []
    tree[ssbd][endpoint].push({
      method, modelName, taskType, units, endpointLabel, software,
      classLabels, classValues, points, meanWidth, coverage, stats, hsdsUrl
    })
  }

  return tree
}

function parseSet(raw) {
  if (raw == null) return []
  // multi-valued Solr field arrives as an array of code strings
  if (Array.isArray(raw)) return raw.map(Number).filter(n => !isNaN(n))
  // tolerate legacy string encodings ("[1,2]" or "1,2")
  try {
    return JSON.parse(String(raw).replace(/'/g, '"'))
  } catch {
    return String(raw).replace(/[\[\]]/g, '').split(',').map(Number).filter(n => !isNaN(n))
  }
}
