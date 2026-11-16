import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost } from '../../api/client.js'
import { saveSession } from '../../auth.js'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !password) {
      setError('Remplis ton email et ton mot de passe.')
      return
    }

    setLoading(true)
    try {
      // Le backend vérifie le mot de passe et renvoie un jeton + l'utilisateur
      const { token, user } = await apiPost('/api/auth/login', { email, password })
      saveSession(token, user)
      if (user.role === 'admin') {
        navigate('/admin')
      } else {
        setSuccess(`Bienvenue ${user.name} ! Tu es connecté.`)
        setPassword('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">Glean</Link>
        <h1>Connexion</h1>
        <p className="auth-subtitle">Content de te revoir !</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            Email
            <input
              type="email"
              placeholder="toi@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            Mot de passe
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-switch">
          Pas encore de compte ? <Link to="/inscription">Inscris-toi</Link>
        </p>
      </div>
    </main>
  )
}
