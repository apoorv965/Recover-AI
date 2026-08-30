import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const STORAGE_KEY = 'recoverai_token'

const client = axios.create({ baseURL: BASE_URL })

// Attach the signed-in user's session token (issued by POST /auth/google) to
// every outgoing request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If the backend ever rejects the token (expired, revoked, tampered), clear
// the session and let AuthContext react by kicking the user back to /login.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/google')) {
      window.dispatchEvent(new Event('recoverai:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export const api = {
  getDashboard: () => client.get('/analytics/dashboard').then(r => r.data),
  listCases: (params = {}) => client.get('/recovery-cases', { params }).then(r => r.data),
  getCase: (id) => client.get(`/recovery-cases/${id}`).then(r => r.data),
  processCase: (id) => client.post(`/recovery-cases/${id}/process`).then(r => r.data),
  simulateSuccess: (id) => client.post(`/recovery-cases/${id}/simulate-success`).then(r => r.data),
  optOut: (id) => client.post(`/recovery-cases/${id}/opt-out`).then(r => r.data),
  listAuditLogs: (params = {}) => client.get('/audit-logs', { params }).then(r => r.data),
  runSimulation: (count = 60) => client.post(`/simulation/generate`, null, { params: { count } }).then(r => r.data),
  submitPaymentEvent: (payload) => client.post('/events/payment', payload).then(r => r.data),
  submitCheckoutEvent: (payload) => client.post('/events/checkout', payload).then(r => r.data),
}

export default client
