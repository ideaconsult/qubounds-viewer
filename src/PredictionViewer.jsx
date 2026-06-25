import { useState, useEffect, useMemo, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ViewerConfigProvider, useViewerConfig } from './context/ViewerConfig'
import { usePredictionItems, useModelRegistry } from './hooks/useSolr'
import { buildPredictionTree } from './utils/buildPredictionTree'
import { exportCSV } from './utils/exportCSV'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MainPanel from './components/MainPanel'
import styles from './App.module.css'
import './styles/viewer.css'

const DEFAULT_CONFIDENCE = 0.90
const AVAILABLE_CONFIDENCE_LEVELS = [0.90]

// The viewer body. Runs inside the auth + config providers so the data hooks work.
// All inputs arrive as props (no URL parsing) — the host (standalone App or
// spectrasearch) decides what to show.
function ViewerBody({
  items = [], subjects = [], dataSource, type = 'prediction', subjectField,
  ssbd = [], endpoint = [], model = [], showHeader = false, backUrl = null
}) {
  const config = useViewerConfig()
  const ds = dataSource || config.predictionsCore

  const { load, docs, loading, error } = usePredictionItems()
  const { registry, loadRegistry } = useModelRegistry()
  const [activeSSbD, setActiveSSbD] = useState(new Set())

  // Stable query identity from props (arrays compared by content)
  const query = useMemo(() => ({
    items, subjects, dataSource: ds, type, subjectField, ssbd, endpoint, model
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    JSON.stringify(items), JSON.stringify(subjects), ds, type, subjectField,
    JSON.stringify(ssbd), JSON.stringify(endpoint), JSON.stringify(model)
  ])

  useEffect(() => { if (ds) loadRegistry({ dataSource: ds }) }, [ds, loadRegistry])

  useEffect(() => {
    if (query.items?.length || query.subjects?.length) load(query)
  }, [query, load])

  const compounds = useMemo(() => {
    const withDocs = new Set()
    for (const d of docs) {
      const subj = d.dsstox_id_s || d.id
      if (subj) withDocs.add(subj)
    }
    const out = new Map()
    // Requested subjects first, so every selected chemical is shown — even those
    // VEGA has no predictions for (flagged, instead of silently disappearing).
    for (const s of subjects) {
      if (s && !out.has(s)) {
        out.set(s, { id: encodeURIComponent(s), subjectId: s, text: s, hasPredictions: withDocs.has(s) })
      }
    }
    for (const d of docs) {
      const subj = d.dsstox_id_s || d.id
      if (subj && !out.has(subj)) {
        out.set(subj, { id: encodeURIComponent(subj), subjectId: subj, text: d.dsstox_id_s || subj, hasPredictions: true })
      }
    }
    return [...out.values()]
  }, [docs, subjects])

  const predictionTree = useMemo(
    () => (docs.length && compounds.length
      ? buildPredictionTree(compounds, docs, registry, { url: config.hsdsUrl, domain: config.hsdsDomain })
      : {}),
    [docs, compounds, registry, config.hsdsUrl, config.hsdsDomain]
  )

  useEffect(() => { setActiveSSbD(new Set(Object.keys(predictionTree))) }, [predictionTree])

  const handleToggleSSbD = useCallback((s) => {
    setActiveSSbD(prev => {
      if (s === '__all__') return new Set(Object.keys(predictionTree))
      if (s === '__none__') return new Set()
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }, [predictionTree])

  const handleExport = useCallback(
    () => exportCSV(compounds, predictionTree, DEFAULT_CONFIDENCE),
    [compounds, predictionTree]
  )

  const hsdsBaseUrl = config.hsdsUrl
    ? `${config.hsdsUrl}/?domain=${config.hsdsDomain || '/qubounds'}`
    : null

  return (
    <div className={styles.layout}>
      {showHeader && (
        <Header compounds={compounds} onExport={handleExport} nambitUrl={backUrl} />
      )}
      <div className={styles.body}>
        <Sidebar
          compounds={compounds}
          predictionTree={predictionTree}
          activeSSbD={activeSSbD}
          onToggleSSbD={handleToggleSSbD}
          confidenceLevel={DEFAULT_CONFIDENCE}
          onConfidenceChange={() => {}}
          availableConfidenceLevels={AVAILABLE_CONFIDENCE_LEVELS}
          hsdsBaseUrl={hsdsBaseUrl}
        />
        <MainPanel
          predictionTree={predictionTree}
          activeSSbD={activeSSbD}
          loading={loading}
          error={error}
          compounds={compounds}
        />
      </div>
    </div>
  )
}

// Public component. Embed it anywhere (like @h5web/app):
//   <PredictionViewer items={[predId]} type="prediction" dataSource="vega"
//                     token={kcToken} apiBase="https://api…" />
// Auth: `token` (when provided) is owned by the host; omitted ⇒ standalone reads
// the URL/sessionStorage. Config: apiBase/chemicalsCore/predictionsCore/subjectField/hsds
// override the build-time env defaults.
export default function PredictionViewer({
  token, apiBase, chemicalsCore, predictionsCore, subjectField, hsds, ...body
}) {
  const configValue = {
    apiBase, chemicalsCore, predictionsCore, subjectField,
    hsdsUrl: hsds?.url, hsdsDomain: hsds?.domain
  }
  return (
    <ViewerConfigProvider value={configValue}>
      <AuthProvider token={token ?? undefined}>
        <div className="qubounds-root">
          <ViewerBody {...body} subjectField={subjectField} />
        </div>
      </AuthProvider>
    </ViewerConfigProvider>
  )
}

// re-export so consumers can read the seeded token if needed
export { useAuth }
