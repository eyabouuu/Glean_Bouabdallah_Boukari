import { Router } from 'express'
import { unlink } from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { uploadProof } from '../upload.js'

const router = Router()

// Messages renvoyés au front selon la contrainte UNIQUE violée
const DUPLICATES = {
  users_email_key: 'Un compte existe déjà avec cet email.',
  beneficiaries_cin_key: 'Un compte existe déjà avec ce numéro de CIN.',
}

function validate(b, file) {
  if (!['beneficiaire', 'restaurant'].includes(b.role)) return 'Rôle invalide.'
  if (b.role === 'beneficiaire') {
    if (!b.firstName || !b.lastName || !b.birthDate) return 'Remplis ton nom, prénom et date de naissance.'
    if (!/^\d{8}$/.test(b.cin || '')) return 'Le numéro de CIN doit contenir 8 chiffres.'
    if (!file) return 'Ajoute ton justificatif (PDF, JPG ou PNG).'
  } else {
    if (!b.restaurantName || !b.managerName) return 'Remplis le nom du restaurant et du responsable.'
    if (!b.taxId) return 'Remplis le matricule fiscal / registre de commerce.'
  }
  if (!b.email?.includes('@')) return "L'adresse email n'est pas valide."
  if (!b.address || !b.city) return "Remplis l'adresse et la ville."
  const lat = Number(b.latitude)
  const lng = Number(b.longitude)
  if (b.latitude === '' || b.longitude === '' || isNaN(lat) || isNaN(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'Latitude ou longitude invalide.'
  if (!b.password || b.password.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.'
  return ''
}

// POST /api/auth/register : crée un compte "en_attente" (formulaire multipart avec le justificatif)
router.post('/register', uploadProof.single('proofFile'), async (req, res) => {
  const b = req.body
  const file = req.file
  const error = validate(b, file)
  if (error) {
    if (file) await unlink(file.path).catch(() => {})
    return res.status(400).json({ error })
  }

  const client = await pool.connect()
  try {
    // Transaction : soit tout est enregistré, soit rien
    await client.query('BEGIN')
    const hash = await bcrypt.hash(b.password, 10)
    const { rows } = await client.query(
      `INSERT INTO users (role, email, phone, password_hash, address, city, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [b.role, b.email.trim().toLowerCase(), b.phone, hash, b.address, b.city, b.latitude, b.longitude]
    )
    const userId = rows[0].id

    if (b.role === 'beneficiaire') {
      await client.query(
        `INSERT INTO beneficiaries (user_id, first_name, last_name, birth_date, cin, proof_type, proof_path, proof_name, proof_mime)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, b.firstName, b.lastName, b.birthDate, b.cin, b.proofType, file.filename, file.originalname, file.mimetype]
      )
    } else {
      await client.query(
        `INSERT INTO restaurants (user_id, name, manager_name, tax_id, opening_hours)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, b.restaurantName, b.managerName, b.taxId, b.openingHours]
      )
    }
    await client.query('COMMIT')
    res.status(201).json({ id: userId, status: 'en_attente' })
  } catch (err) {
    await client.query('ROLLBACK')
    if (file) await unlink(file.path).catch(() => {})
    if (err.code === '23505') {
      return res.status(409).json({ error: DUPLICATES[err.constraint] || 'Ce compte existe déjà.' })
    }
    throw err
  } finally {
    client.release()
  }
})

// Messages quand le compte existe mais ne peut pas encore se connecter
const BLOCKED = {
  en_attente: 'Ton compte est en attente de validation par un administrateur.',
  refuse: "Ton inscription a été refusée. Contacte l'équipe Glean.",
  suspendu: "Ton compte est suspendu. Contacte l'équipe Glean.",
}

// POST /api/auth/login : vérifie email + mot de passe et renvoie un jeton
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Remplis ton email et ton mot de passe.' })
  }

  const { rows } = await pool.query(
    `SELECT u.id, u.role, u.email, u.password_hash, u.status,
            COALESCE(b.first_name || ' ' || b.last_name, r.name, 'Administrateur') AS name
       FROM users u
       LEFT JOIN beneficiaries b ON b.user_id = u.id
       LEFT JOIN restaurants r ON r.user_id = u.id
      WHERE u.email = $1`,
    [email.trim().toLowerCase()]
  )
  const user = rows[0]
  // Même message si l'email ou le mot de passe est faux : on ne dit pas lequel
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
  }
  if (BLOCKED[user.status]) {
    return res.status(403).json({ error: BLOCKED[user.status] })
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, role: user.role, email: user.email, name: user.name } })
})

export default router
