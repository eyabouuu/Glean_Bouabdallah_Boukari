import { Router } from 'express'
import path from 'node:path'
import pool from '../db.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { UPLOAD_DIR } from '../upload.js'

const router = Router()

// Toutes les routes de ce fichier sont réservées aux admins connectés
router.use(requireAuth, requireAdmin)

// Partie commune des requêtes : un compte avec ses infos bénéficiaire ou restaurant
const ACCOUNT_SELECT = `
  SELECT u.id, u.role, u.email, u.phone, u.city, u.status, u.created_at,
         b.first_name, b.last_name, b.cin, b.proof_type, b.proof_name, b.proof_mime,
         r.name AS restaurant_name, r.manager_name, r.tax_id, r.opening_hours
    FROM users u
    LEFT JOIN beneficiaries b ON b.user_id = u.id
    LEFT JOIN restaurants r ON r.user_id = u.id`

const PROOF_LABELS = { carte_etudiant: 'Carte étudiant', cin: 'CIN', autre: 'Autre document officiel' }

function displayName(row) {
  return row.role === 'beneficiaire' ? `${row.first_name} ${row.last_name}` : row.restaurant_name
}

// Met une ligne SQL au format attendu par le tableau de bord
function toPending(row) {
  const isBenef = row.role === 'beneficiaire'
  return {
    id: row.id,
    role: row.role,
    name: displayName(row),
    email: row.email,
    phone: row.phone,
    city: row.city,
    date: row.created_at,
    details: isBenef
      ? { CIN: row.cin, 'Type de justificatif': PROOF_LABELS[row.proof_type] || row.proof_type }
      : { Responsable: row.manager_name, 'Matricule fiscal': row.tax_id, Horaires: row.opening_hours || '—' },
    proof: isBenef
      ? { name: row.proof_name, type: row.proof_mime === 'application/pdf' ? 'pdf' : 'image' }
      : null,
  }
}

// GET /api/admin/pending : inscriptions à vérifier
router.get('/pending', async (req, res) => {
  const { rows } = await pool.query(
    `${ACCOUNT_SELECT} WHERE u.status = 'en_attente' ORDER BY u.created_at`
  )
  res.json(rows.map(toPending))
})

// GET /api/admin/users : comptes validés (actifs ou suspendus)
router.get('/users', async (req, res) => {
  const { rows } = await pool.query(
    `${ACCOUNT_SELECT} WHERE u.role <> 'admin' AND u.status IN ('actif', 'suspendu')
      ORDER BY u.created_at DESC`
  )
  res.json(rows.map((row) => ({
    id: row.id,
    role: row.role,
    name: displayName(row),
    email: row.email,
    city: row.city,
    joined: row.created_at,
    status: row.status,
  })))
})

// PATCH /api/admin/accounts/:id/status : valider, refuser, suspendre ou réactiver
router.patch('/accounts/:id/status', async (req, res) => {
  const { status } = req.body || {}
  if (!['actif', 'refuse', 'suspendu'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' })
  }
  const { rows } = await pool.query(
    `UPDATE users SET status = $1 WHERE id = $2 AND role <> 'admin' RETURNING id, status`,
    [status, req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Compte introuvable.' })
  res.json(rows[0])
})

// GET /api/admin/accounts/:id/proof : le fichier justificatif (réservé aux admins)
router.get('/accounts/:id/proof', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT proof_path, proof_mime FROM beneficiaries WHERE user_id = $1',
    [req.params.id]
  )
  if (!rows[0]) return res.status(404).json({ error: 'Justificatif introuvable.' })
  res.type(rows[0].proof_mime)
  res.sendFile(path.join(UPLOAD_DIR, path.basename(rows[0].proof_path)))
})

export default router
