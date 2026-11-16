import jwt from 'jsonwebtoken'

// Vérifie le jeton envoyé par le front dans l'en-tête "Authorization: Bearer <jeton>"
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Connecte-toi pour accéder à cette page.' })
  }
  try {
    // req.user = { id, role } : utilisable dans les routes suivantes
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Session expirée. Reconnecte-toi.' })
  }
}

// À placer après requireAuth : bloque tout le monde sauf les admins
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' })
  }
  next()
}
