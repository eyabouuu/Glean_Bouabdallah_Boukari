import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import { useAuth } from './auth.js'
import OfferDetail from './pages/OfferDetail/OfferDetail.jsx'
import AdminDashboard from './pages/AdminDashboard/AdminDashboard.jsx'
import Login from './pages/Auth/Login.jsx'
import Register from './pages/Auth/Register.jsx'

// Laisse passer seulement un admin connecté, sinon renvoie vers la connexion
function RequireAdmin({ children }) {
  const user = useAuth()
  if (!user || user.role !== 'admin') return <Navigate to="/connexion" replace />
  return children
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Pas encore de page d'accueil : on envoie vers la connexion */}
        <Route path="/" element={<Navigate to="/connexion" replace />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Register />} />
        <Route path="/offres/:id" element={<OfferDetail />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
      </Routes>
    </>
  )
}
