import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth, logout } from '../auth.js'
import './Navbar.css'

// Barre de navigation affichée en haut de toutes les pages
export default function Navbar() {
  const user = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/connexion')
  }

  // NavLink ajoute la classe "active" quand on est sur la page du lien
  const linkClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">Glean</Link>

        <nav className="navbar-links" aria-label="Navigation principale">
          {!user && (
            <>
              <NavLink to="/connexion" className={linkClass}>Connexion</NavLink>
              <NavLink to="/inscription" className="nav-cta">Inscription</NavLink>
            </>
          )}

          {user && (
            <>
              {user.role === 'admin' && <NavLink to="/admin" className={linkClass}>Administration</NavLink>}
              <span className="navbar-user" title={user.email}>
                <span className="navbar-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
                <span className="navbar-name">{user.name}</span>
              </span>
              <button type="button" className="nav-link nav-logout" onClick={handleLogout}>
                Déconnexion
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
