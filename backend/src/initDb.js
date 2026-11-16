// Crée les tables et le compte administrateur.
// À lancer une fois (et après chaque changement de schema.sql) : npm run db:init
import { readFile } from 'node:fs/promises'
import bcrypt from 'bcryptjs'
import pool from './db.js'

const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
await pool.query(schema)
console.log('Tables prêtes : users, beneficiaries, restaurants')

// Compte admin défini dans le .env (ADMIN_EMAIL / ADMIN_PASSWORD)
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL])
  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10)
    await pool.query(
      `INSERT INTO users (role, email, password_hash, status) VALUES ('admin', $1, $2, 'actif')`,
      [ADMIN_EMAIL, hash]
    )
    console.log(`Compte admin créé : ${ADMIN_EMAIL} (mot de passe dans le .env)`)
  } else {
    console.log(`Compte admin déjà présent : ${ADMIN_EMAIL}`)
  }
} else {
  console.log('ADMIN_EMAIL / ADMIN_PASSWORD absents du .env : aucun admin créé')
}

await pool.end()
