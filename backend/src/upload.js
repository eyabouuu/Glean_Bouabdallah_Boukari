// Réception des justificatifs envoyés à l'inscription (PDF, JPG ou PNG, 5 Mo max)
import multer from 'multer'
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

// backend/uploads/justificatifs, quel que soit le dossier d'où on lance le serveur
export const UPLOAD_DIR = path.join(import.meta.dirname, '..', 'uploads', 'justificatifs')
mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
}

export const uploadProof = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // Nom aléatoire : on ne garde jamais le nom choisi par l'utilisateur sur le disque
    filename: (req, file, cb) => cb(null, randomUUID() + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) cb(null, true)
    else cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'proofFile'))
  },
})
