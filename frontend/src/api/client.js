import { getToken, logout } from '../auth.js'

// Adresse du backend, lue depuis frontend/.env (3000 par défaut)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Envoie une requête au backend et renvoie la réponse brute.
// - body : un objet (envoyé en JSON) ou un FormData (envoyé tel quel, pour les fichiers)
// - le jeton de connexion est ajouté automatiquement s'il existe
async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload = body
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers, body: payload })
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifie que le backend est lancé.')
  }

  if (!response.ok) {
    // Jeton expiré ou invalide : on déconnecte proprement
    if (response.status === 401 && token) logout()
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `Erreur ${response.status}`)
  }
  return response
}

export async function apiGet(path) {
  return (await request(path)).json()
}

export async function apiPost(path, body) {
  return (await request(path, { method: 'POST', body })).json()
}

export async function apiPatch(path, body) {
  return (await request(path, { method: 'PATCH', body })).json()
}

// Pour les fichiers protégés (justificatifs) : renvoie une URL locale utilisable dans <img> ou <iframe>
export async function apiGetFileUrl(path) {
  const blob = await (await request(path)).blob()
  return URL.createObjectURL(blob)
}
