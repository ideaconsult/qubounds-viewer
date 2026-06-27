import { describe, it, expect } from 'vitest'
import { buildPredictionTree } from '../../utils/buildPredictionTree'

// parseSet is not exported; test it indirectly via buildPredictionTree classification docs
// and via the exported function if it becomes exported. For now, keep internal tests minimal.

// ---- fixtures ---------------------------------------------------------------

const compounds = [
  { id: 'CID1', text: 'Compound One' },
  { id: 'CID2', text: 'Compound Two' },
]

function makeRegressionDoc(cid, method = 'MODEL_A', opts = {}) {
  return {
    id: cid,
    dsstox_id_s: cid,
    type_s: 'prediction',
    reference_s: opts.ssbd ?? 'Acute_aquatic_toxicity',
    endpointcategory_s: opts.endpoint ?? 'EC_FISHTOX',
    attr_method: [method],
    [`${method}_pred_d`]: opts.pred ?? 1.5,
    [`${method}_lower90_d`]: opts.lower ?? 1.0,
    [`${method}_upper90_d`]: opts.upper ?? 2.0,
    [`${method}_ad_s`]: opts.ad ?? 'inside',
    [`${method}_covered90_b`]: opts.covered ?? true,
    guidance_s: opts.platform ?? 'VEGA',
  }
}

function makeClassificationDoc(cid, method = 'CLF_B', opts = {}) {
  return {
    id: cid,
    dsstox_id_s: cid,
    type_s: 'prediction',
    reference_s: opts.ssbd ?? 'Carcinogenicity',
    endpointcategory_s: opts.endpoint ?? 'TO_CARCINOGENICITY',
    attr_method: [method],
    [`${method}_pred_d`]: opts.predClass ?? 1,
    [`${method}_set90_ss`]: opts.set ?? [1],
    [`${method}_set_size90_i`]: opts.setSize ?? 1,
    [`${method}_covered90_b`]: opts.covered ?? true,
    guidance_s: opts.platform ?? 'VEGA',
  }
}

// ---- tests ------------------------------------------------------------------

describe('buildPredictionTree', () => {
  it('returns empty object when docs is empty', () => {
    expect(buildPredictionTree(compounds, [])).toEqual({})
  })

  it('returns empty object when compounds is empty', () => {
    const docs = [makeRegressionDoc('CID1')]
    expect(buildPredictionTree([], docs)).toEqual({})
  })

  it('regression: tree has correct ssbd → endpoint → method entry', () => {
    const docs = [makeRegressionDoc('CID1'), makeRegressionDoc('CID2')]
    const tree = buildPredictionTree(compounds, docs)
    expect(tree).toHaveProperty('Acute_aquatic_toxicity.EC_FISHTOX')
    const [entry] = tree['Acute_aquatic_toxicity']['EC_FISHTOX']
    expect(entry.method).toBe('MODEL_A')
    expect(entry.taskType).toBe('regression')
  })

  it('regression: computes meanWidth from intervals', () => {
    const docs = [
      makeRegressionDoc('CID1', 'MODEL_A', { lower: 1.0, upper: 2.0 }),  // width 1.0
      makeRegressionDoc('CID2', 'MODEL_A', { lower: 0.5, upper: 1.5 }),  // width 1.0
    ]
    const tree = buildPredictionTree(compounds, docs)
    const [entry] = tree['Acute_aquatic_toxicity']['EC_FISHTOX']
    expect(entry.meanWidth).toBeCloseTo(1.0)
  })

  it('regression: points include compoundName and intervalWidth', () => {
    const docs = [makeRegressionDoc('CID1', 'MODEL_A', { lower: 1.0, upper: 3.0 })]
    const tree = buildPredictionTree(compounds, docs)
    const [entry] = tree['Acute_aquatic_toxicity']['EC_FISHTOX']
    expect(entry.points).toHaveLength(1)
    expect(entry.points[0].compoundName).toBe('Compound One')
    expect(entry.points[0].intervalWidth).toBeCloseTo(2.0)
  })

  it('classification: tree has correct ssbd → endpoint entry', () => {
    const docs = [makeClassificationDoc('CID1'), makeClassificationDoc('CID2')]
    const tree = buildPredictionTree(compounds, docs)
    expect(tree).toHaveProperty('Carcinogenicity.TO_CARCINOGENICITY')
    const [entry] = tree['Carcinogenicity']['TO_CARCINOGENICITY']
    expect(entry.taskType).toBe('classification')
  })

  it('classification: summary stats contains setSize breakdown', () => {
    const docs = [
      makeClassificationDoc('CID1', 'CLF_B', { setSize: 1 }),
      makeClassificationDoc('CID2', 'CLF_B', { setSize: 2 }),
    ]
    const tree = buildPredictionTree(compounds, docs)
    const [entry] = tree['Carcinogenicity']['TO_CARCINOGENICITY']
    expect(entry.stats).toBeDefined()
    expect(entry.stats).toHaveProperty('singleton')
    expect(entry.stats).toHaveProperty('doubleton')
  })

  it('compound with no matching doc is excluded from points', () => {
    // Only CID1 has a doc; CID2 is absent
    const docs = [makeRegressionDoc('CID1')]
    const tree = buildPredictionTree(compounds, docs)
    const [entry] = tree['Acute_aquatic_toxicity']['EC_FISHTOX']
    expect(entry.points).toHaveLength(1)
    expect(entry.points[0].compoundId).toBe('CID1')
  })

  it('hsds param overrides default HSDS URL in entry', () => {
    const docs = [makeRegressionDoc('CID1')]
    const tree = buildPredictionTree(compounds, docs, null, {
      url: 'https://my-hsds.example.com',
      domain: '/mydata',
    })
    const [entry] = tree['Acute_aquatic_toxicity']['EC_FISHTOX']
    expect(entry.hsdsUrl).toMatch(/^https:\/\/my-hsds\.example\.com/)
    expect(entry.hsdsUrl).toContain('/mydata/MODEL_A.nxs')
  })

  it('registry metadata is applied to matching method', () => {
    const docs = [makeRegressionDoc('CID1')]
    const registry = new Map([
      ['MODEL_A', { method_s: 'MODEL_A', unit_s: 'mg/L', task_s: 'regression',
                    model_name_s: 'Model A', endpoint_label_s: 'Fish LC50' }]
    ])
    const tree = buildPredictionTree(compounds, docs, registry)
    const [entry] = tree['Acute_aquatic_toxicity']['EC_FISHTOX']
    expect(entry.units).toBe('mg/L')
    expect(entry.modelName).toBe('Model A')
    expect(entry.endpointLabel).toBe('Fish LC50')
  })
})
