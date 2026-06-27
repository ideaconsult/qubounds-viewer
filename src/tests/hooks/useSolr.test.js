// Tests for the pure helper functions in useSolr.js.
// The hooks themselves (usePredictionItems, useModelRegistry, useStructureUrl) require
// mocking fetch + React context — deferred to integration tests.
// The helpers are not exported from the module, so we test them by duplicating the
// logic here and keeping the tests as documentation of the expected behaviour.

import { describe, it, expect } from 'vitest'

// --- helpers copied from useSolr.js (pure, no imports needed) ---

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function orClause(field, values) {
  return `${field}:(${values.map(v => `"${v}"`).join(' OR ')})`
}

function filterDocs(docs, { ssbd, endpoint, model } = {}) {
  const ss = ssbd?.length ? new Set(ssbd) : null
  const ep = endpoint?.length ? new Set(endpoint) : null
  const md = model?.length ? new Set(model) : null
  const out = []
  for (const d of docs) {
    if (ss && !ss.has(d.reference_s)) continue
    if (ep && !ep.has(d.endpointcategory_s)) continue
    if (md) {
      const methods = (d.attr_method || []).filter(m => md.has(m))
      if (!methods.length) continue
      out.push({ ...d, attr_method: methods })
    } else {
      out.push(d)
    }
  }
  return out
}

// -----------------------------------------------------------------

describe('authHeaders', () => {
  it('returns Authorization header when token is present', () => {
    expect(authHeaders('my-token')).toEqual({ Authorization: 'Bearer my-token' })
  })

  it('returns empty object when token is null', () => {
    expect(authHeaders(null)).toEqual({})
  })

  it('returns empty object when token is undefined', () => {
    expect(authHeaders(undefined)).toEqual({})
  })

  it('returns empty object when token is empty string', () => {
    expect(authHeaders('')).toEqual({})
  })
})

describe('orClause', () => {
  it('builds a Solr OR clause for one value', () => {
    expect(orClause('reference_s', ['SsbD_A'])).toBe('reference_s:("SsbD_A")')
  })

  it('builds a Solr OR clause for multiple values', () => {
    expect(orClause('reference_s', ['A', 'B'])).toBe('reference_s:("A" OR "B")')
  })
})

describe('filterDocs', () => {
  const docs = [
    { id: '1', reference_s: 'A', endpointcategory_s: 'EP1', attr_method: ['M1', 'M2'] },
    { id: '2', reference_s: 'A', endpointcategory_s: 'EP2', attr_method: ['M1'] },
    { id: '3', reference_s: 'B', endpointcategory_s: 'EP1', attr_method: ['M2'] },
  ]

  it('returns all docs when no filters provided', () => {
    expect(filterDocs(docs, {})).toHaveLength(3)
  })

  it('filters by ssbd', () => {
    const result = filterDocs(docs, { ssbd: ['A'] })
    expect(result).toHaveLength(2)
    expect(result.every(d => d.reference_s === 'A')).toBe(true)
  })

  it('filters by endpoint', () => {
    const result = filterDocs(docs, { endpoint: ['EP1'] })
    expect(result).toHaveLength(2)
    expect(result.every(d => d.endpointcategory_s === 'EP1')).toBe(true)
  })

  it('filters by both ssbd and endpoint', () => {
    const result = filterDocs(docs, { ssbd: ['A'], endpoint: ['EP1'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })

  it('filters by model: trims attr_method to matched methods only', () => {
    const result = filterDocs(docs, { model: ['M1'] })
    // doc '3' only has M2, excluded; docs '1' and '2' kept but only with M1
    expect(result).toHaveLength(2)
    expect(result.find(d => d.id === '1').attr_method).toEqual(['M1'])
    expect(result.find(d => d.id === '2').attr_method).toEqual(['M1'])
  })

  it('excludes doc entirely when model filter matches none of its methods', () => {
    const result = filterDocs(docs, { model: ['NONEXISTENT'] })
    expect(result).toHaveLength(0)
  })
})
