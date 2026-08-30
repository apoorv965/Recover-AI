import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { Zap, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { loginWithGoogleCredential } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')

  const redirectTo = location.state?.from?.pathname || '/'

  const handleSuccess = async (credentialResponse) => {
    setError('')
    try {
      await loginWithGoogleCredential(credentialResponse.credential)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not sign in with that Google account. Please try again.'
      )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20">
            <Zap size={22} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-xl tracking-tight">RecoverAI</div>
            <div className="text-ink-500 text-sm">Revenue Recovery Agent</div>
          </div>
        </div>

        <div className="card p-6 flex flex-col items-center gap-5">
          <div className="text-center">
            <h1 className="text-white font-semibold text-base">Sign in to continue</h1>
            <p className="text-ink-500 text-sm mt-1">
              Access is restricted to signed-in Google accounts.
            </p>
          </div>

          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
            theme="filled_black"
            shape="pill"
            size="large"
            text="signin_with"
          />

          {error && (
            <p className="text-rose-400 text-xs text-center leading-relaxed">{error}</p>
          )}

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-mint-500/10 text-mint-400 text-xs font-medium">
            <ShieldCheck size={14} />
            Your session never leaves this device unencrypted
          </div>
        </div>
      </div>
    </div>
  )
}
