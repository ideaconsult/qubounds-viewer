import { describe, it, expect } from 'vitest'
import { parseMethodPredictions, groupPredictions } from '../../utils/modelRegistry'

describe('parseMethodPredictions', () => {
  it('returns empty array for doc with no attr_method', () => {
    expect(parseMethodPredictions({})).toEqual([])
    expect(parseMethodPredictions({ attr_method: [] })).toEqual([])
  })

  it('extracts pred/lower/upper for each method', () => {
    const doc = {
      attr_method: ['MODEL_A'],
      MODEL_A_pred_d: 1.5,
      MODEL_A_lower90_d: 1.0,
      MODEL_A_upper90_d: 2.0,
    }
    const result = parseMethodPredictions(doc)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ method: 'MODEL_A', pred: 1.5, lower: 1.0, upper: 2.0 })
  })

  it('computes intervalWidth = upper - lower', () => {
    const doc = {
      attr_method: ['M'],
      M_pred_d: 1.0,
      M_lower90_d: 0.5,
      M_upper90_d: 2.5,
    }
    expect(parseMethodPredictions(doc)[0].intervalWidth).toBeCloseTo(2.0)
  })

  it('filters out methods where pred is null', () => {
    const doc = {
      attr_method: ['WITH_PRED', 'NO_PRED'],
      WITH_PRED_pred_d: 1.0,
      WITH_PRED_lower90_d: 0.5,
      WITH_PRED_upper90_d: 1.5,
      // NO_PRED has no _pred_d field → filtered
    }
    const result = parseMethodPredictions(doc)
    expect(result).toHaveLength(1)
    expect(result[0].method).toBe('WITH_PRED')
  })

  it('handles multiple methods in one doc', () => {
    const doc = {
      attr_method: ['A', 'B'],
      A_pred_d: 1.0, A_lower90_d: 0.8, A_upper90_d: 1.2,
      B_pred_d: 3.0, B_lower90_d: 2.5, B_upper90_d: 3.5,
    }
    const result = parseMethodPredictions(doc)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.method)).toEqual(['A', 'B'])
  })
})

describe('groupPredictions', () => {
  const doc1 = {
    attr_method: ['M1'],
    reference_s: 'SsbD_A',
    endpointcategory_s: 'EP_X',
    M1_pred_d: 1.0, M1_lower90_d: 0.5, M1_upper90_d: 1.5,
  }
  const doc2 = {
    attr_method: ['M2'],
    reference_s: 'SsbD_A',
    endpointcategory_s: 'EP_Y',
    M2_pred_d: 2.0, M2_lower90_d: 1.5, M2_upper90_d: 2.5,
  }
  const doc3 = {
    attr_method: ['M3'],
    reference_s: 'SsbD_B',
    endpointcategory_s: 'EP_X',
    M3_pred_d: 3.0, M3_lower90_d: 2.5, M3_upper90_d: 3.5,
  }

  it('groups by reference_s (ssbd) then endpointcategory_s', () => {
    const tree = groupPredictions([doc1, doc2, doc3])
    expect(Object.keys(tree)).toEqual(expect.arrayContaining(['SsbD_A', 'SsbD_B']))
    expect(Object.keys(tree['SsbD_A'])).toEqual(expect.arrayContaining(['EP_X', 'EP_Y']))
    expect(Object.keys(tree['SsbD_B'])).toEqual(['EP_X'])
  })

  it('each leaf entry contains method and pred', () => {
    const tree = groupPredictions([doc1])
    const entries = tree['SsbD_A']['EP_X']
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ method: 'M1', pred: 1.0 })
  })

  it('returns empty object for empty input', () => {
    expect(groupPredictions([])).toEqual({})
  })

  it('uses "Unknown" for missing ssbd/endpoint', () => {
    const doc = { attr_method: ['M'], M_pred_d: 1.0, M_lower90_d: 0.5, M_upper90_d: 1.5 }
    const tree = groupPredictions([doc])
    expect(tree).toHaveProperty('Unknown.Unknown')
  })
})
