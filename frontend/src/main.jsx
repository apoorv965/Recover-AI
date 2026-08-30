import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

const GOOGLE_CLIENT_ID =
  '966155426799-t9vuma4efus5f27gev63ol8kpitj2d2s.apps.googleusercontent.com'

if (!GOOGLE_CLIENT_ID) {
  // eslint-disable-next-line no-console
  console.warn(
    'VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work until you ' +
    'add it to frontend/.env (see frontend/.env.example).'
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
