import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import client from '../api/client'

const STORAGE_KEY = 'recoverai_token'

const AuthContext = createContext(null)

function isExpired(token) {
  try {
    const { exp } = jwtDecode(token)
    return !exp || Date.now() >= exp * 1000
  } catch {
    return true
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && !isExpired(stored) ? stored : null
  })
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const applySession = useCallback((accessToken, userData) => {
    localStorage.setItem(STORAGE_KEY, accessToken)
    setToken(accessToken)
    setUser(userData)
  }, [])

  // Exchange a Google ID token (the `credential` from Google Identity Services)
  // for our own session JWT + user profile.
  const loginWithGoogleCredential = useCallback(async (credential) => {
    const { data } = await client.post('/auth/google', { credential })
    applySession(data.access_token, data.user)
    return data.user
  }, [applySession])

  // On mount (or whenever the token changes), confirm the stored session is
  // still valid by asking the backend who it belongs to.
  useEffect(() => {
    let cancelled = false
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    client.get('/auth/me')
      .then(({ data }) => { if (!cancelled) setUser(data) })
      .catch(() => { if (!cancelled) logout() })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, logout])

  // Listen for 401s surfaced by the axios interceptor (expired/invalid token
  // discovered mid-session on any API call).
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('recoverai:unauthorized', handler)
    return () => window.removeEventListener('recoverai:unauthorized', handler)
  }, [logout])

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: !!token && !!user,
    loading,
    loginWithGoogleCredential,
    logout,
  }), [token, user, loading, loginWithGoogleCredential, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export { STORAGE_KEY }
