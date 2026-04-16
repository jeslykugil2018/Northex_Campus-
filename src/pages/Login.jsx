import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, GraduationCap, ArrowLeft, ShieldCheck, Mail, Lock } from 'lucide-react'

const Login = () => {
  const { user, adminRecord } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Redirect if already logged in and verified
  useEffect(() => {
    if (user && adminRecord) {
      navigate('/')
    }
  }, [user, adminRecord, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log('Attempting login for:', email)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      console.error('Auth Error:', authError.message)
      setError(authError.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please check your credentials.'
        : authError.message)
      setLoading(false)
    } else if (data?.user) {
      console.log('User authenticated:', data.user.id)
    }
  }

  const handleSignUp = async () => {
    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) setError(signUpError.message)
    else alert('Signup successful! Now please run the SQL script to grant yourself Admin access.')
  }

  return (
    <div className="login-page">
      {/* Background Blobs */}
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <button onClick={() => navigate('/')} className="back-home">
        <ArrowLeft size={18} /> Back to Home
      </button>

      <div className="login-card-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-icon-main">L</div>
            <h1>Welcome Back</h1>
            <p>Admin Portal Access</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div className="error-alert">
                <ShieldCheck size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="admin@northex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn-new" disabled={loading}>
              {loading ? (
                <div className="loader"></div>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <LogIn size={20} />
                </>
              )}
            </button>

            <div className="login-footer-links">
              <p>First time? <button type="button" onClick={handleSignUp} className="text-btn">Create Account</button></p>
            </div>
          </form>
        </div>

        <div className="login-info-text">
          <ShieldCheck size={16} /> Secure Administrative Environment
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        }

        /* Ambient Background */
        .blob {
          position: absolute;
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, rgba(0, 109, 255, 0.1), rgba(0, 210, 255, 0.1));
          filter: blur(80px);
          border-radius: 50%;
          z-index: 0;
        }
        .blob-1 { top: -100px; right: -100px; }
        .blob-2 { bottom: -100px; left: -100px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0, 109, 255, 0.1)); }

        .back-home {
          position: absolute;
          top: 2rem;
          left: 2rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 0.6rem 1.2rem;
          border-radius: 12px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          z-index: 10;
        }
        .back-home:hover {
          color: #006aff;
          border-color: #006aff;
          transform: translateX(-5px);
        }

        .login-card-wrapper {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 3.5rem 3rem;
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
        }

        .login-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .logo-icon-main {
          background: #006aff;
          color: white;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 auto 1.5rem;
          box-shadow: 0 10px 20px rgba(0, 106, 255, 0.2);
        }

        .login-header h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .login-header p {
          color: #64748b;
          font-weight: 500;
          font-size: 0.9rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 0.6rem;
          padding-left: 0.2rem;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1.25rem;
          color: #94a3b8;
        }

        .input-with-icon input {
          width: 100%;
          padding: 1rem 1.25rem 1rem 3.5rem;
          border: 1.5px solid #e2e8f0;
          background: white;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 500;
          transition: all 0.2s;
          outline: none;
        }

        .input-with-icon input:focus {
          border-color: #006aff;
          box-shadow: 0 0 0 4px rgba(0, 106, 255, 0.08);
          background: white;
        }

        .login-btn-new {
          width: 100%;
          background: #006aff;
          color: white;
          border: none;
          padding: 1.125rem;
          border-radius: 14px;
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 1rem;
        }

        .login-btn-new:hover:not(:disabled) {
          background: #0056cc;
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -6px rgba(0, 106, 255, 0.3);
        }

        .login-btn-new:active {
          transform: translateY(0);
        }

        .login-btn-new:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #fff1f2;
          border: 1px solid #ffe4e6;
          color: #e11d48;
          padding: 1rem;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .login-footer-links {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.9rem;
          color: #64748b;
        }

        .text-btn {
          background: none;
          border: none;
          color: #006aff;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-left: 0.25rem;
        }
        .text-btn:hover {
          text-decoration: underline;
        }

        .login-info-text {
          margin-top: 2rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 500;
        }

        .loader {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 2.5rem 1.5rem;
          }
          .login-header h1 {
            font-size: 1.75rem;
          }
          .back-home {
            top: 1rem;
            left: 1rem;
          }
        }
      `}</style>
    </div>
  )
}

export default Login
