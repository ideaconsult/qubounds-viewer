import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useViewerConfig } from '../context/ViewerConfig'

// Auth header only added when a token is present — never required
function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function orClause(field, values) {
  return `${field}:(${values.map(v => `"${v}"`).join(' OR ')})`
}

// Resolve the related type-B item ids for one or more subjects (chemicals) by
// querying /db/query on the subject link field. This is the "retrieve related
// items of type B for an item of type A" step, done generically (field is configurable).
// Optional ssbd / endpoint narrow the result at the source (fewer items to fetch).
async function listItemIds(subjectIds, { apiBase, dataSource, subjectField, ssbd, endpoint, token }) {
  const parts = [orClause(subjectField, subjectIds)]
  if (ssbd?.length) parts.push(orClause('reference_s', ssbd))
  if (endpoint?.length) parts.push(orClause('endpointcategory_s', endpoint))
  const params = new URLSearchParams({ q: parts.join(' AND '), pagesize: 10000 })
  if (dataSource) params.append('data_source', dataSource)
  const res = await fetch(`${apiBase}/db/query?${params}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data.response || []).map(r => decodeURIComponent(r.id)).filter(Boolean)
}

// Client-side filter applied to fetched docs so ssbd/endpoint/model also work on
// the explicit ?item= path. `model` trims each doc's method list to the selected set.
function filterDocs(docs, { ssbd, endpoint, model }) {
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

// Load full type-B documents. Two entry points (either or both):
//   items    – explicit type-B primary ids (e.g. from the search app deep link)
//   subjects – type-A ids (chemicals); resolved to their type-B items here
// Each item is fetched via the generic /db/download?what=json endpoint (the data
// sibling of the image download), addressed by its own primary id (domain=id:<id>).
export function usePredictionItems() {
  const { token } = useAuth()
  const { apiBase, subjectField } = useViewerConfig()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async ({
    items = [], subjects = [], dataSource, type, subjectField: subjectFieldArg,
    ssbd, endpoint, model
  } = {}) => {
    if (!items.length && !subjects.length) { setDocs([]); return }
    setLoading(true); setError(null)
    try {
      let itemIds = [...items]
      if (subjects.length) {
        const resolved = await listItemIds(subjects, {
          apiBase, dataSource, subjectField: subjectFieldArg || subjectField, ssbd, endpoint, token
        })
        itemIds = [...new Set([...itemIds, ...resolved])]
      }
      const results = await Promise.all(itemIds.map(async (id) => {
        const params = new URLSearchParams({ what: 'json', domain: `id:${id}` })
        if (type) params.append('extra', type)
        if (dataSource) params.append('data_source', dataSource)
        const res = await fetch(`${apiBase}/db/download?${params}`, {
          headers: authHeaders(token)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() // array of docs
      }))
      setDocs(filterDocs(results.flat().filter(Boolean), { ssbd, endpoint, model }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, apiBase, subjectField])

  return { load, docs, loading, error }
}

// Load per-method model metadata (type_s=model) once and index it by method_s.
// The model doc is primary: it carries the endpoint name, units, class int↔string
// mapping, task, platform and calibration dataset. It lives in the same collection
// as the predictions. Entirely optional: if the docs aren't indexed yet (or the
// call fails) the registry stays empty and the viewer falls back to method keys,
// the static label map, guidance_s platform, and no units.
export function useModelRegistry() {
  const { token } = useAuth()
  const { apiBase } = useViewerConfig()
  const [registry, setRegistry] = useState(new Map())

  const loadRegistry = useCallback(async ({ dataSource, type = 'model' } = {}) => {
    try {
      const params = new URLSearchParams({ what: 'json', domain: '*:*', extra: type })
      if (dataSource) params.append('data_source', dataSource)
      const res = await fetch(`${apiBase}/db/download?${params}`, { headers: authHeaders(token) })
      if (!res.ok) return // graceful: leave registry empty
      const docs = await res.json()
      const m = new Map()
      for (const d of (Array.isArray(docs) ? docs : [])) {
        if (d?.method_s) m.set(d.method_s, d)
      }
      setRegistry(m)
    } catch {
      // graceful: ignore — metadata is an enhancement, not a requirement
    }
  }, [token, apiBase])

  return { registry, loadRegistry }
}

// Structure thumbnail for a subject (the chemical the predictions are about),
// built generically against the chemicals collection via the image download.
// Returns a builder bound to the active config + token.
export function useStructureUrl() {
  const { token } = useAuth()
  const { apiBase, chemicalsCore } = useViewerConfig()
  return useCallback((compound) => {
    if (compound?.imageLink) return compound.imageLink
    const subjectId = compound?.subjectId
    if (!subjectId) return null
    const params = new URLSearchParams({
      what: 'thumbnail',
      domain: `id:${subjectId}`,
      extra: 'chemical',
      data_source: chemicalsCore
    })
    if (token) params.append('token', token)
    return `${apiBase}/db/download?${params}`
  }, [token, apiBase, chemicalsCore])
}
