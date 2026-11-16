// Charge les variables du fichier .env dans process.env
import 'dotenv/config'
// Le paquet qui permet à Node de parler à PostgreSQL
import pg from 'pg'

// Un "pool" = un groupe de connexions réutilisables vers la base
const pool = new pg.Pool({
  host: process.env.DB_HOST,           // localhost
  port: Number(process.env.DB_PORT),   // 5432 (le .env donne du texte, on le convertit en nombre)
  database: process.env.DB_NAME,       // glean
  user: process.env.DB_USER,           // postgres
  password: process.env.DB_PASSWORD,   // ton mot de passe, lu depuis le .env
})

// On rend le pool utilisable dans les autres fichiers (server.js, etc.)
export default pool