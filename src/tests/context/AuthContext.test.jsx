import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext'

function wrapper(token) {
  return ({ children }) => <AuthProvider token={token}>{children}</AuthProvider>
}

describe('AuthProvider — controlled mode (token prop)', () => {
  it('provides the token from prop', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper('test-token') })
    expect(result.current.token).toBe('test-token')
    expect(result.current.authenticated).toBe(true)
  })

  it('authenticated is false when token prop is null', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(null) })
    expect(result.current.authenticated).toBe(false)
  })

  it('updates when token prop changes', () => {
    let token = 'first'
    const W = ({ children }) => <AuthProvider token={token}>{children}</AuthProvider>
    const { result, rerender } = renderHook(() => useAuth(), { wrapper: W })
    expect(result.current.token).toBe('first')
    act(() => { token = 'second' })
    rerender()
    expect(result.current.token).toBe('second')
  })

  it('does NOT read sessionStorage when token prop is provided', () => {
    sessionStorage.setItem('qubounds_token', 'session-tok')
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper('prop-tok') })
    expect(result.current.token).toBe('prop-tok')
    sessionStorage.removeItem('qubounds_token')
  })
})

describe('AuthProvider — uncontrolled mode (no prop)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    // Reset search to empty (jsdom default)
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: '' },
    })
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  function noTokenWrapper({ children }) {
    return <AuthProvider>{children}</AuthProvider>
  }

  it('token is null when no URL param and no sessionStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: noTokenWrapper })
    expect(result.current.token).toBeNull()
    expect(result.current.authenticated).toBe(false)
  })

  it('reads token from sessionStorage', () => {
    sessionStorage.setItem('qubounds_token', 'cached-tok')
    const { result } = renderHook(() => useAuth(), { wrapper: noTokenWrapper })
    expect(result.current.token).toBe('cached-tok')
  })

  it('updates token on postMessage from parent frame', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: noTokenWrapper })
    expect(result.current.token).toBeNull()

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'keycloak_token', token: 'relayed-tok' },
      }))
    })

    expect(result.current.token).toBe('relayed-tok')
  })

  it('ignores postMessage with wrong type', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: noTokenWrapper })

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'other_event', token: 'should-be-ignored' },
      }))
    })

    expect(result.current.token).toBeNull()
  })
})
