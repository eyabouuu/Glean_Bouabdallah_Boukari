// Données fictives pour le tableau de bord admin.
// Pas encore de backend : plus tard, ces données viendront de l'API (dossier src/api).

export const stats = {
  // Tous les visiteurs du site (connectés ou non), pas seulement les inscrits.
  // Plus tard : fourni par l'outil de statistiques / l'API.
  visitors: 18420,
  // Comptes inscrits (bénéficiaires + restaurants)
  users: 1284,
  restaurants: 76,
  activeOffers: 42,
  mealsSaved: 9310,
}

// Repas sauvés sur les 7 derniers jours
export const weeklyMeals = [
  { day: 'Lun', value: 112 },
  { day: 'Mar', value: 98 },
  { day: 'Mer', value: 140 },
  { day: 'Jeu', value: 126 },
  { day: 'Ven', value: 175 },
  { day: 'Sam', value: 204 },
  { day: 'Dim', value: 160 },
]

export const offers = [
  { id: 501, title: 'Panier viennoiseries', restaurant: 'Boulangerie Essalem', quantity: 12, price: 4.5, expires: '2026-11-11 20:00', status: 'active' },
  { id: 502, title: 'Plat du jour – couscous', restaurant: 'Chez Hédi', quantity: 6, price: 6, expires: '2026-11-11 22:00', status: 'active' },
  { id: 503, title: 'Pizzas invendues', restaurant: 'Pizzeria Carthage', quantity: 0, price: 5, expires: '2026-11-11 23:00', status: 'epuisee' },
  { id: 504, title: 'Assortiment pâtisseries', restaurant: 'Café des Délices', quantity: 8, price: 7.5, expires: '2026-11-10 19:00', status: 'expiree' },
  { id: 505, title: 'Sandwichs du midi', restaurant: 'Café des Délices', quantity: 10, price: 3, expires: '2026-11-11 18:00', status: 'signalee' },
]

// Dernières actions sur la plateforme
export const activity = [
  { id: 1, text: 'Chez Hédi a publié « Plat du jour – couscous »', time: 'il y a 12 min' },
  { id: 2, text: 'Yasmine Haddad a réservé « Panier viennoiseries »', time: 'il y a 25 min' },
  { id: 3, text: 'L’offre « Sandwichs du midi » a été signalée', time: 'il y a 1 h' },
  { id: 4, text: 'Nouvelle inscription : Amira Ben Salah', time: 'il y a 3 h' },
]
