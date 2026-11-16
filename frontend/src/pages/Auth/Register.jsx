import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiPost } from '../../api/client.js'
import './Auth.css'

// Valeurs de départ du formulaire (les deux rôles partagent le même objet)
const initialForm = {
  // Communs
  email: '',
  phone: '',
  password: '',
  confirm: '',
  address: '',
  city: '',
  latitude: '',
  longitude: '',
  // Bénéficiaire
  firstName: '',
  lastName: '',
  birthDate: '',
  cin: '',
  proofType: 'carte_etudiant',
  proofFile: null,
  // Restaurant
  restaurantName: '',
  managerName: '',
  taxId: '',
  openingHours: '',
}

// Calcule la force du mot de passe : 0 = vide, 1 = faible, 2 = moyenne, 3 = élevée
function passwordStrength(pwd) {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (pwd.length < 8 || score <= 2) return 1
  if (score === 3) return 2
  return 3
}

const strengthLabels = ['', 'Faible', 'Moyenne', 'Élevée']
const strengthClasses = ['', 'weak', 'medium', 'strong']

export default function Register() {
  const [role, setRole] = useState('beneficiaire')
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Met à jour un champ texte
  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Met à jour le fichier justificatif
  function updateFile(e) {
    setForm({ ...form, proofFile: e.target.files[0] || null })
  }

  // Remplit latitude / longitude avec la position du navigateur
  function useMyPosition() {
    setError('')
    if (!navigator.geolocation) {
      setError("Ton navigateur ne permet pas la géolocalisation. Entre les coordonnées à la main.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        setLocating(false)
      },
      () => {
        setError("Impossible d'obtenir ta position. Autorise la localisation ou entre les coordonnées à la main.")
        setLocating(false)
      }
    )
  }

  function validate() {
    const f = form
    if (role === 'beneficiaire') {
      if (!f.firstName || !f.lastName || !f.birthDate) return 'Remplis ton nom, prénom et date de naissance.'
      if (!/^\d{8}$/.test(f.cin)) return 'Le numéro de CIN doit contenir 8 chiffres.'
      if (!f.proofFile) return 'Ajoute ton justificatif (carte étudiant ou document).'
    } else {
      if (!f.restaurantName || !f.managerName) return 'Remplis le nom du restaurant et du responsable.'
      if (!f.taxId) return 'Remplis le matricule fiscal / registre de commerce.'
    }
    if (!f.email.includes('@')) return "L'adresse email n'est pas valide."
    if (!/^\+?\d{8,12}$/.test(f.phone.replace(/\s/g, ''))) return 'Le numéro de téléphone est invalide.'
    if (!f.address || !f.city) return "Remplis l'adresse et la ville."
    const lat = Number(f.latitude)
    const lng = Number(f.longitude)
    if (f.latitude === '' || f.longitude === '' || isNaN(lat) || isNaN(lng)) {
      return 'Ajoute la latitude et la longitude (bouton « Utiliser ma position »).'
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'Latitude ou longitude hors limites.'
    if (f.password.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.'
    if (passwordStrength(f.password) < 2) {
      return 'Mot de passe trop faible : mélange majuscules, minuscules, chiffres et symboles.'
    }
    if (f.password !== f.confirm) return 'Les deux mots de passe ne sont pas identiques.'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSuccess('')
    const message = validate()
    setError(message)
    if (message) return

    // FormData : nécessaire pour envoyer un fichier (le justificatif) avec les champs texte
    const data = new FormData()
    data.append('role', role)
    Object.entries(form).forEach(([key, value]) => {
      if (key === 'confirm' || key === 'proofFile') return
      data.append(key, value)
    })
    if (role === 'beneficiaire') data.append('proofFile', form.proofFile)

    setSubmitting(true)
    try {
      await apiPost('/api/auth/register', data)
      const name = role === 'beneficiaire' ? `${form.firstName} ${form.lastName}` : form.restaurantName
      setSuccess(`Compte créé pour ${name} ! Un administrateur va vérifier tes informations. Tu pourras te connecter dès qu'il aura validé ton compte.`)
      setForm(initialForm)
      e.target.reset() // vide aussi le champ fichier
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function changeRole(newRole) {
    setRole(newRole)
    setError('')
    setSuccess('')
  }

  return (
    <main className="auth-page">
      <div className="auth-card auth-card-wide">
        <Link to="/" className="auth-logo">Glean</Link>
        <h1>Inscription</h1>
        <p className="auth-subtitle">Crée ton compte en quelques minutes.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            Je suis
            <div className="auth-roles">
              <button
                type="button"
                className={role === 'beneficiaire' ? 'chip active' : 'chip'}
                onClick={() => changeRole('beneficiaire')}
              >
                Bénéficiaire
              </button>
              <button
                type="button"
                className={role === 'restaurant' ? 'chip active' : 'chip'}
                onClick={() => changeRole('restaurant')}
              >
                Restaurant
              </button>
            </div>
          </div>

          {/* ---------- Bénéficiaire ---------- */}
          {role === 'beneficiaire' && (
            <fieldset className="auth-section">
              <legend>Identité</legend>
              <div className="auth-row">
                <label className="auth-field">
                  Prénom
                  <input name="firstName" value={form.firstName} onChange={update} autoComplete="given-name" />
                </label>
                <label className="auth-field">
                  Nom
                  <input name="lastName" value={form.lastName} onChange={update} autoComplete="family-name" />
                </label>
              </div>
              <div className="auth-row">
                <label className="auth-field">
                  Date de naissance
                  <input type="date" name="birthDate" value={form.birthDate} onChange={update} />
                </label>
                <label className="auth-field">
                  Numéro CIN
                  <input name="cin" value={form.cin} onChange={update} placeholder="8 chiffres" inputMode="numeric" maxLength={8} />
                </label>
              </div>

              <label className="auth-field">
                Type de justificatif
                <select name="proofType" value={form.proofType} onChange={update}>
                  <option value="carte_etudiant">Carte étudiant</option>
                  <option value="cin">CIN</option>
                  <option value="autre">Autre document officiel</option>
                </select>
              </label>

              <label className="auth-field">
                Justificatif (PDF, JPG ou PNG)
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={updateFile} className="auth-file" />
                {form.proofFile && <span className="auth-hint">Fichier choisi : {form.proofFile.name}</span>}
              </label>
            </fieldset>
          )}

          {/* ---------- Restaurant ---------- */}
          {role === 'restaurant' && (
            <fieldset className="auth-section">
              <legend>Restaurant</legend>
              <label className="auth-field">
                Nom du restaurant
                <input name="restaurantName" value={form.restaurantName} onChange={update} autoComplete="organization" />
              </label>
              <div className="auth-row">
                <label className="auth-field">
                  Nom du responsable
                  <input name="managerName" value={form.managerName} onChange={update} autoComplete="name" />
                </label>
                <label className="auth-field">
                  Matricule fiscal / RC
                  <input name="taxId" value={form.taxId} onChange={update} />
                </label>
              </div>
              <label className="auth-field">
                Horaires d'ouverture
                <input name="openingHours" value={form.openingHours} onChange={update} placeholder="ex : 11h – 23h" />
              </label>
            </fieldset>
          )}

          {/* ---------- Contact (commun) ---------- */}
          <fieldset className="auth-section">
            <legend>Contact</legend>
            <div className="auth-row">
              <label className="auth-field">
                Email
                <input type="email" name="email" value={form.email} onChange={update} placeholder="toi@exemple.com" autoComplete="email" />
              </label>
              <label className="auth-field">
                Téléphone
                <input type="tel" name="phone" value={form.phone} onChange={update} placeholder="+216 12 345 678" autoComplete="tel" />
              </label>
            </div>
          </fieldset>

          {/* ---------- Emplacement (commun) ---------- */}
          <fieldset className="auth-section">
            <legend>Emplacement exact</legend>
            <label className="auth-field">
              Adresse
              <input name="address" value={form.address} onChange={update} placeholder="Rue, numéro…" autoComplete="street-address" />
            </label>
            <label className="auth-field">
              Ville
              <input name="city" value={form.city} onChange={update} autoComplete="address-level2" />
            </label>
            <div className="auth-row">
              <label className="auth-field">
                Latitude
                <input name="latitude" value={form.latitude} onChange={update} placeholder="36.806500" inputMode="decimal" />
              </label>
              <label className="auth-field">
                Longitude
                <input name="longitude" value={form.longitude} onChange={update} placeholder="10.181500" inputMode="decimal" />
              </label>
            </div>
            <button type="button" className="btn btn-dark" onClick={useMyPosition} disabled={locating}>
              {locating ? 'Localisation…' : '📍 Utiliser ma position'}
            </button>
          </fieldset>

          {/* ---------- Sécurité (commun) ---------- */}
          <fieldset className="auth-section">
            <legend>Sécurité</legend>
            <div className="auth-row">
              <label className="auth-field">
                Mot de passe
                <input type="password" name="password" value={form.password} onChange={update} placeholder="8 caractères minimum" autoComplete="new-password" />
              </label>
              <label className="auth-field">
                Confirmer
                <input type="password" name="confirm" value={form.confirm} onChange={update} placeholder="••••••••" autoComplete="new-password" />
              </label>
            </div>

            {form.password && (
              <div className={`pwd-strength ${strengthClasses[passwordStrength(form.password)]}`}>
                <div className="pwd-bars">
                  <span /><span /><span />
                </div>
                <span className="pwd-label">
                  Force : {strengthLabels[passwordStrength(form.password)]}
                </span>
              </div>
            )}
            <span className="auth-hint">
              8 caractères minimum, avec majuscules, minuscules, chiffres et symboles.
            </span>
          </fieldset>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Création du compte…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-switch">
          Déjà un compte ? <Link to="/connexion">Connecte-toi</Link>
        </p>
      </div>
    </main>
  )
}
