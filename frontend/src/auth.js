// Session de l'utilisateur connecté, gardée dans le navigateur (localStorage)
import { useEffect, useState } from 'react'

const TOKEN_KEY = 'glean_token'
const USER_KEY = 'glean_user'
const EVENT = 'glean-auth-change'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY))
  } catch {
    return null
  }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event(EVENT))
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event(EVENT))
}

// Hook : renvoie l'utilisateur connecté et se met à jour à la connexion / déconnexion
export function useAuth() {
  const [user, setUser] = useState(getUser)

  useEffect(() => {
    const update = () => setUser(getUser())
    window.addEventListener(EVENT, update)
    window.addEventListener('storage', update) // connexion dans un autre onglet
    return () => {
      window.removeEventListener(EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return user
}
