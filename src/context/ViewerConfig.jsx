import { createContext, useContext, useMemo } from 'react'

// Runtime configuration for the viewer. When embedded as a package, the host
// passes these as props (it has its own backend base, collections, HSDS). When
// run standalone, everything falls back to the app's Vite env vars so nothing
// changes for the /qubounds/ deployment.
const ViewerConfigContext = createContext(null)

const ENV = import.meta.env || {}

const DEFAULTS = {
  apiBase: (ENV.VITE_API_URL ?? '').replace(/\/$/, ''),
  predictionsCore: ENV.VITE_PREDICTIONS_CORE || 'vega',
  chemicalsCore: ENV.VITE_CHEMICALS_CORE || 'chemicals',
  subjectField: ENV.VITE_SUBJECT_FIELD || 'dsstox_id_s',
  hsdsUrl: ENV.VITE_HSDS_URL || 'https://hsds.adma.ai',
  hsdsDomain: ENV.VITE_HSDS_DOMAIN || '/qubounds'
}

export function ViewerConfigProvider({ value, children }) {
  // Strip undefined overrides so they fall back to DEFAULTS.
  const merged = useMemo(() => {
    const clean = Object.fromEntries(
      Object.entries(value || {}).filter(([, v]) => v !== undefined && v !== null)
    )
    return { ...DEFAULTS, ...clean, apiBase: (clean.apiBase ?? DEFAULTS.apiBase).replace(/\/$/, '') }
  }, [value])

  return (
    <ViewerConfigContext.Provider value={merged}>
      {children}
    </ViewerConfigContext.Provider>
  )
}

export const useViewerConfig = () => useContext(ViewerConfigContext) || DEFAULTS
