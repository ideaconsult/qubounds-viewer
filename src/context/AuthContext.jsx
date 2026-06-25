import { createContext, useContext, useEffect, useState } from 'react'

// Token is passed in — never acquired here.
// Priority: 1) URL param ?token=  2) sessionStorage  3) postMessage from parent frame
// If no token: app still works for public Solr resources; protected resources degrade gracefully.

const AuthContext = createContext(null)

function readToken() {
  // 1. URL param (nambit deep-link pattern, same as h5web)
  const params = new URLSearchParams(window.location.search)
  const urlToken = params.get('token')
  if (urlToken) {
    sessionStorage.setItem('qubounds_token', urlToken)
    // Clean token from URL without navigation
    params.delete('token')
    const newUrl = [window.location.pathname, params.toString()].filter(Boolean).join('?')
    window.history.replaceState(null, '', newUrl)
    return urlToken
  }
  // 2. Cached in sessionStorage from previous navigation
  return sessionStorage.getItem('qubounds_token') || null
}

// `token` prop: when provided (embedded as a component, the host owns auth) it is
// used directly and URL/sessionStorage/postMessage acquisition is skipped. When
// omitted (standalone app) the token is read from the URL/sessionStorage and kept
// in sync via postMessage — the original behaviour.
export function AuthProvider({ token: tokenProp, children }) {
  const controlled = tokenProp !== undefined
  const [token, setToken] = useState(() => (controlled ? tokenProp : readToken()))

  useEffect(() => {
    if (controlled) {
      setToken(tokenProp)
      return
    }
    // 3. postMessage from parent frame (iframe embedding)
    const handler = (event) => {
      if (event.data?.type === 'keycloak_token' && event.data?.token) {
        sessionStorage.setItem('qubounds_token', event.data.token)
        setToken(event.data.token)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [controlled, tokenProp])

  return (
    <AuthContext.Provider value={{ token, authenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
