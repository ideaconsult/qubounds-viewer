import { useMemo } from 'react'
import PredictionViewer from './PredictionViewer'

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
    dataSource: params.get('data_source') || import.meta.env.VITE_PREDICTIONS_CORE || 'vega',
    type: params.get('type') || 'prediction',
    back: params.get('back') || null
  }
}

export default function App() {
  const { back, ...rest } = useMemo(() => parseUrlParams(), [])
  return <PredictionViewer {...rest} showHeader backUrl={back} />
}
