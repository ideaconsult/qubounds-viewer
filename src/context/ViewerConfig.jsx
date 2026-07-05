import { createContext, useContext, useMemo } from 'react'

// Runtime configuration for the viewer. Embedded hosts pass these as props.
// Standalone Vite env handling belongs in App.jsx so published library code
// stays independent from this repository's build-time environment.
const ViewerConfigContext = createContext(null)

export const DEFAULT_VIEWER_CONFIG = {
  apiBase: '',
  predictionsCore: 'vega',
  chemicalsCore: 'dsstox',
  subjectField: 'dsstox_id_s',
  hsdsUrl: 'https://hsds.adma.ai',
  hsdsDomain: '/qubounds'
}

export function ViewerConfigProvider({ value, children }) {
  // Strip undefined overrides so they fall back to DEFAULTS.
  const merged = useMemo(() => {
    const clean = Object.fromEntries(
      Object.entries(value || {}).filter(([, v]) => v !== undefined && v !== null)
    )
    return {
      ...DEFAULT_VIEWER_CONFIG,
      ...clean,
      apiBase: (clean.apiBase ?? DEFAULT_VIEWER_CONFIG.apiBase).replace(/\/$/, '')
    }
  }, [value])

  return (
    <ViewerConfigContext.Provider value={merged}>
      {children}
    </ViewerConfigContext.Provider>
  )
}

export const useViewerConfig = () => useContext(ViewerConfigContext) || DEFAULT_VIEWER_CONFIG
