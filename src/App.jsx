import { useMemo } from 'react'
import PredictionViewer from './PredictionViewer'

const ENV = import.meta.env || {}

// Standalone shell: qu-bounds is a pure viewer. It reads its inputs from the URL
// and hands them to the reusable <PredictionViewer> component (the same component
// spectrasearch embeds). Auth is left to PredictionViewer's AuthProvider, which
// reads the token from the URL/sessionStorage/postMessage when none is passed.
function parseUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    items: params.getAll('item'),
    subjects: params.getAll('compound'),
    subjectField: params.get('subject_field') || undefined,
    ssbd: params.getAll('ssbd'),
    endpoint: params.getAll('endpoint'),
    model: params.getAll('model'),
    dataSource: params.get('data_source') || ENV.VITE_PREDICTIONS_CORE || 'vega',
    type: params.get('type') || 'prediction',
    back: params.get('back') || null
  }
}

function standaloneConfig() {
  return {
    apiBase: ENV.VITE_API_URL,
    predictionsCore: ENV.VITE_PREDICTIONS_CORE,
    chemicalsCore: ENV.VITE_CHEMICALS_CORE,
    subjectField: ENV.VITE_SUBJECT_FIELD,
    hsds: {
      url: ENV.VITE_HSDS_URL,
      domain: ENV.VITE_HSDS_DOMAIN
    }
  }
}

export default function App() {
  const { back, ...rest } = useMemo(() => parseUrlParams(), [])
  const config = useMemo(() => standaloneConfig(), [])
  return <PredictionViewer {...config} {...rest} showHeader backUrl={back} />
}
