import express from 'express'
import cors from 'cors'
import multer from 'multer'
import pool from './db.js'                 // le pool de connexions PostgreSQL
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'

const app = express()
const PORT = process.env.PORT || 3000      // port lu depuis le .env (3000 par défaut)

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Bienvenue sur Glean' })
})

// Vérifie que le backend arrive à parler à PostgreSQL
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json(result.rows)
  } catch (err) {
    console.error('Erreur base de données :', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Inscription et connexion
app.use('/api/auth', authRoutes)
// Tableau de bord admin (protégé par jeton)
app.use('/api/admin', adminRoutes)

// Gestion des erreurs : Express 5 envoie ici les erreurs des routes async
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Le justificatif dépasse 5 Mo.'
      : 'Le justificatif doit être un PDF, JPG ou PNG.'
    return res.status(400).json({ error: message })
  }
  console.error(err)
  res.status(500).json({ error: 'Erreur du serveur. Réessaie dans un instant.' })
})

app.listen(PORT, () => {
  console.log(`API Glean démarrée sur http://localhost:${PORT}`)
})
