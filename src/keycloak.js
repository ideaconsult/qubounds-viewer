import Keycloak from 'keycloak-js'

// Keycloak instance kept for token validation / refresh if needed by future features.
// The app does NOT call init() or redirect — token arrives via URL param or postMessage.
const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://auth.adma.ai',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'adma',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT || 'qubounds'
})

export default keycloak
