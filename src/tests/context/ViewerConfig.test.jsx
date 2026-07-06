import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  DEFAULT_VIEWER_CONFIG,
  ViewerConfigProvider,
  useViewerConfig
} from '../../context/ViewerConfig'

describe('ViewerConfigProvider', () => {
  it('provides package defaults when no overrides are passed', () => {
    const wrapper = ({ children }) => (
      <ViewerConfigProvider>{children}</ViewerConfigProvider>
    )

    const { result } = renderHook(() => useViewerConfig(), { wrapper })

    expect(result.current).toEqual(DEFAULT_VIEWER_CONFIG)
    expect(result.current.chemicalsCore).toBe('dsstox')
    expect(result.current.subjectField).toBe('dsstox_id_s')
    expect(result.current.hsdsUrl).toBe('https://hsds.adma.ai')
  })

  it('applies host overrides and normalizes apiBase', () => {
    const wrapper = ({ children }) => (
      <ViewerConfigProvider value={{
        apiBase: 'https://api.example.test/',
        predictionsCore: 'custom_predictions',
        chemicalsCore: 'custom_chemicals',
        subjectField: 'custom_subject_s',
        hsdsUrl: 'https://hsds.example.test',
        hsdsDomain: '/custom'
      }}>
        {children}
      </ViewerConfigProvider>
    )

    const { result } = renderHook(() => useViewerConfig(), { wrapper })

    expect(result.current.apiBase).toBe('https://api.example.test')
    expect(result.current.predictionsCore).toBe('custom_predictions')
    expect(result.current.chemicalsCore).toBe('custom_chemicals')
    expect(result.current.subjectField).toBe('custom_subject_s')
    expect(result.current.hsdsUrl).toBe('https://hsds.example.test')
    expect(result.current.hsdsDomain).toBe('/custom')
  })

  it('ignores undefined and null overrides', () => {
    const wrapper = ({ children }) => (
      <ViewerConfigProvider value={{ apiBase: undefined, chemicalsCore: null }}>
        {children}
      </ViewerConfigProvider>
    )

    const { result } = renderHook(() => useViewerConfig(), { wrapper })

    expect(result.current.apiBase).toBe(DEFAULT_VIEWER_CONFIG.apiBase)
    expect(result.current.chemicalsCore).toBe(DEFAULT_VIEWER_CONFIG.chemicalsCore)
  })
})
