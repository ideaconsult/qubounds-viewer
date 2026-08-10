import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { AuthProvider } from '../../context/AuthContext'
import { ViewerConfigProvider } from '../../context/ViewerConfig'
import { useStructureUrl } from '../../hooks/useSolr'

const expectedUrl =
  'https://api.example.test/db/download?what=thumbnail&domain=id%3ADTXSID001&extra=chemical&data_source=chemicals'

function wrapper(token) {
  return function Wrapper({ children }) {
    return (
      <ViewerConfigProvider
        value={{ apiBase: 'https://api.example.test', chemicalsCore: 'chemicals' }}
      >
        <AuthProvider token={token}>{children}</AuthProvider>
      </ViewerConfigProvider>
    )
  }
}

describe('useStructureUrl', () => {
  it('builds an anonymous thumbnail URL without a token', () => {
    const { result } = renderHook(() => useStructureUrl(), {
      wrapper: wrapper(null)
    })

    expect(result.current({ subjectId: 'DTXSID001' })).toBe(expectedUrl)
  })

  it('does not place an access token in the thumbnail URL', () => {
    const { result } = renderHook(() => useStructureUrl(), {
      wrapper: wrapper('secret-token')
    })

    const url = result.current({ subjectId: 'DTXSID001' })
    expect(url).toBe(expectedUrl)
    expect(url).not.toContain('secret-token')
    expect(new URL(url).searchParams.has('token')).toBe(false)
  })
})
