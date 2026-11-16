import { useState, useEffect } from 'react'
import './AdminDashboard.css'
import { apiGet, apiPatch, apiGetFileUrl } from '../../api/client.js'
// Données encore fictives : chiffres de la vue d'ensemble et offres (pas encore de table)
import { stats, weeklyMeals, offers as initialOffers, activity } from './mockData.js'

// Icônes dessinées à la main (SVG) : elles prennent la couleur du texte (currentColor)
function Icon({ children }) {
  return (
    <svg
      className="admin-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// Vue d'ensemble : une maison avec un cœur, l'accueil de la communauté
const HomeHeartIcon = () => (
  <Icon>
    <path d="M3.5 10.5 12 3.8l8.5 6.7" />
    <path d="M5.5 9v10.2c0 .7.5 1.2 1.2 1.2h10.6c.7 0 1.2-.5 1.2-1.2V9" />
    <path d="M12 17.2s-3.2-1.9-3.2-4.1c0-1 .8-1.8 1.7-1.8.7 0 1.2.4 1.5.9.3-.5.8-.9 1.5-.9.9 0 1.7.8 1.7 1.8 0 2.2-3.2 4.1-3.2 4.1Z" />
  </Icon>
)

// Validations : une personne avec une coche, quelqu'un qu'on accueille
const PersonCheckIcon = () => (
  <Icon>
    <circle cx="9.5" cy="7.5" r="3.5" />
    <path d="M3 20c0-3.6 2.9-6.2 6.5-6.2 1.6 0 3 .5 4.1 1.3" />
    <path d="m15.5 18.2 2 2 4-4.4" />
  </Icon>
)

// Utilisateurs : deux personnes côte à côte
const PeopleIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.8 6-5.8s6 2.5 6 5.8" />
    <circle cx="16.8" cy="9" r="2.6" />
    <path d="M17 14.3c2.4.3 4 2.4 4 5" />
  </Icon>
)

// Offres : une cloche de restaurant
const ClocheIcon = () => (
  <Icon>
    <path d="M4 17a8 8 0 0 1 16 0" />
    <path d="M2.8 17.2h18.4" />
    <path d="M12 9V7.2" />
    <circle cx="12" cy="6" r="1.2" />
    <path d="M8 13.2c.8-1 1.9-1.7 3.2-1.9" />
  </Icon>
)

const sections = [
  { id: 'overview', label: "Vue d'ensemble", icon: <HomeHeartIcon /> },
  { id: 'validations', label: 'Validations', icon: <PersonCheckIcon /> },
  { id: 'users', label: 'Utilisateurs', icon: <PeopleIcon /> },
  { id: 'offers', label: 'Offres', icon: <ClocheIcon /> },
]

const roleLabels = { beneficiaire: 'Bénéficiaire', restaurant: 'Restaurant' }

const offerStatus = {
  active: { label: 'Active', className: 'status-ok' },
  epuisee: { label: 'Épuisée', className: 'status-muted' },
  expiree: { label: 'Expirée', className: 'status-muted' },
  signalee: { label: 'Signalée', className: 'status-alert' },
  retiree: { label: 'Retirée', className: 'status-alert' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminDashboard() {
  const [section, setSection] = useState('overview')
  // Inscriptions en attente et comptes validés : lus dans PostgreSQL via le backend
  const [pending, setPending] = useState([])
  const [users, setUsers] = useState([])
  const [accounts, setAccounts] = useState({ loading: true, error: '' })
  const [offers, setOffers] = useState(initialOffers)
  const [notice, setNotice] = useState('')

  // Lit les deux listes sur le backend et les range dans l'état
  function loadAccounts() {
    return Promise.all([apiGet('/api/admin/pending'), apiGet('/api/admin/users')])
      .then(([pendingRows, userRows]) => {
        setPending(pendingRows)
        setUsers(userRows)
        setAccounts({ loading: false, error: '' })
      })
      .catch((err) => setAccounts({ loading: false, error: err.message }))
  }

  // Au premier affichage
  useEffect(() => {
    Promise.all([apiGet('/api/admin/pending'), apiGet('/api/admin/users')])
      .then(([pendingRows, userRows]) => {
        setPending(pendingRows)
        setUsers(userRows)
        setAccounts({ loading: false, error: '' })
      })
      .catch((err) => setAccounts({ loading: false, error: err.message }))
  }, [])

  // État de la connexion au backend : 'loading', 'ok' ou 'error'
  const [api, setApi] = useState({ status: 'loading', time: null })

  // Au premier affichage, on demande l'heure à PostgreSQL en passant par le backend
  useEffect(() => {
    apiGet('/api/db-test')
      .then((rows) => setApi({ status: 'ok', time: rows[0].now }))
      .catch(() => setApi({ status: 'error', time: null }))
  }, [])

  // Affiche un petit message de confirmation pendant 3 secondes
  function notify(text) {
    setNotice(text)
    setTimeout(() => setNotice(''), 3000)
  }

  // Valide ou refuse une inscription en attente (enregistré dans la base)
  async function decide(account, approved) {
    try {
      await apiPatch(`/api/admin/accounts/${account.id}/status`, { status: approved ? 'actif' : 'refuse' })
      notify(approved ? `Compte de ${account.name} validé.` : `Inscription de ${account.name} refusée.`)
      await loadAccounts()
    } catch (err) {
      notify(`Erreur : ${err.message}`)
    }
  }

  // Suspend ou réactive un utilisateur (enregistré dans la base)
  async function toggleUser(user) {
    const status = user.status === 'actif' ? 'suspendu' : 'actif'
    try {
      await apiPatch(`/api/admin/accounts/${user.id}/status`, { status })
      notify(`${user.name} est maintenant ${status}.`)
      await loadAccounts()
    } catch (err) {
      notify(`Erreur : ${err.message}`)
    }
  }

  // Retire une offre de la plateforme
  function removeOffer(offer) {
    setOffers(offers.map((o) => (o.id === offer.id ? { ...o, status: 'retiree' } : o)))
    notify(`Offre « ${offer.title} » retirée.`)
  }

  const reportedCount = offers.filter((o) => o.status === 'signalee').length
  const badges = { validations: pending.length, offers: reportedCount }

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <p className="admin-logo"><span>Espace admin</span></p>
        <nav className="admin-nav">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              className={section === s.id ? 'admin-nav-item active' : 'admin-nav-item'}
              onClick={() => setSection(s.id)}
            >
              <span className="admin-icon-wrap">{s.icon}</span>
              {s.label}
              {badges[s.id] > 0 && <span className="admin-count">{badges[s.id]}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>{sections.find((s) => s.id === section).label}</h1>
            <p className="admin-subtitle">Tableau de bord administrateur</p>
          </div>
          <div className="admin-header-right">
            <span className={`admin-api ${api.status}`} role="status">
              {api.status === 'loading' && 'Connexion…'}
              {api.status === 'ok' && `Base connectée · ${new Date(api.time).toLocaleTimeString('fr-FR')}`}
              {api.status === 'error' && 'Backend injoignable'}
            </span>
            <div className="admin-avatar" title="Administrateur">AD</div>
          </div>
        </header>

        {notice && <p className="admin-notice" role="status">{notice}</p>}

        {section === 'overview' && (
          <Overview pending={pending} reportedCount={reportedCount} goTo={setSection} />
        )}
        {(section === 'validations' || section === 'users') && accounts.loading && (
          <p className="admin-empty">Chargement des comptes…</p>
        )}
        {(section === 'validations' || section === 'users') && accounts.error && (
          <p className="admin-proof-missing">{accounts.error}</p>
        )}
        {section === 'validations' && !accounts.loading && !accounts.error && (
          <Validations pending={pending} onDecide={decide} />
        )}
        {section === 'users' && !accounts.loading && !accounts.error && (
          <Users users={users} onToggle={toggleUser} />
        )}
        {section === 'offers' && <Offers offers={offers} onRemove={removeOffer} />}
      </main>
    </div>
  )
}

/* ---------- Vue d'ensemble ---------- */
function Overview({ pending, reportedCount, goTo }) {
  const max = Math.max(...weeklyMeals.map((d) => d.value))
  const weekTotal = weeklyMeals.reduce((sum, d) => sum + d.value, 0)

  const tiles = [
    {
      label: 'Visiteurs du site',
      value: stats.visitors,
      note: `dont ${stats.users.toLocaleString('fr-FR')} comptes inscrits`,
    },
    { label: 'Restaurants partenaires', value: stats.restaurants },
    { label: 'Offres actives', value: stats.activeOffers },
    { label: 'Repas sauvés', value: stats.mealsSaved, highlight: true },
  ]

  return (
    <>
      <div className="admin-tiles">
        {tiles.map((t) => (
          <div key={t.label} className={t.highlight ? 'admin-tile highlight' : 'admin-tile'}>
            <span className="admin-tile-label">{t.label}</span>
            <strong>{t.value.toLocaleString('fr-FR')}</strong>
            {t.note && <span className="admin-tile-note">{t.note}</span>}
          </div>
        ))}
      </div>

      <div className="admin-grid">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Repas sauvés cette semaine</h2>
            <span className="admin-muted">{weekTotal} au total</span>
          </div>
          <div className="admin-chart">
            {weeklyMeals.map((d) => (
              <div key={d.day} className="admin-bar-col">
                <span className="admin-bar-value">{d.value}</span>
                <div className="admin-bar" style={{ height: `${(d.value / max) * 100}%` }} />
                <span className="admin-bar-label">{d.day}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <h2>À traiter</h2>
          <button type="button" className="admin-todo" onClick={() => goTo('validations')}>
            <strong>{pending.length}</strong> inscription{pending.length > 1 ? 's' : ''} en attente
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="admin-todo alert" onClick={() => goTo('offers')}>
            <strong>{reportedCount}</strong> offre{reportedCount > 1 ? 's' : ''} signalée{reportedCount > 1 ? 's' : ''}
            <span aria-hidden="true">→</span>
          </button>

          <h2 className="admin-spaced">Activité récente</h2>
          <ul className="admin-activity">
            {activity.map((a) => (
              <li key={a.id}>
                <span>{a.text}</span>
                <span className="admin-muted">{a.time}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

/* ---------- Justificatif protégé ---------- */
// Le fichier n'est accessible qu'avec le jeton admin : on le télécharge,
// puis on crée une URL locale (blob:) utilisable dans <img> ou <iframe>.
function useProofUrl(accountId) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl = null
    let cancelled = false
    apiGetFileUrl(`/api/admin/accounts/${accountId}/proof`)
      .then((u) => {
        objectUrl = u
        if (cancelled) URL.revokeObjectURL(u)
        else setUrl(u)
      })
      .catch(() => !cancelled && setFailed(true))
    // Nettoyage : libère la mémoire quand la carte ou la fenêtre disparaît
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accountId])

  return { url, failed }
}

function ProofThumb({ account, onOpen }) {
  const { url, failed } = useProofUrl(account.id)
  if (failed) return <p className="admin-proof-missing">Justificatif introuvable sur le serveur</p>

  return (
    <button type="button" className="admin-proof" onClick={onOpen}>
      {account.proof.type === 'image' && url
        ? <img src={url} alt={`Justificatif de ${account.name}`} />
        : <span className="admin-proof-pdf">{account.proof.type === 'pdf' ? 'PDF' : '…'}</span>}
      <span className="admin-proof-label">
        <strong>Voir le justificatif</strong>
        <span className="admin-muted">{account.proof.name}</span>
      </span>
    </button>
  )
}

/* ---------- Validations des inscriptions ---------- */
function Validations({ pending, onDecide }) {
  // Inscription dont on regarde le justificatif en grand (null = fenêtre fermée)
  const [viewing, setViewing] = useState(null)

  if (pending.length === 0) {
    return <p className="admin-empty">Aucune inscription en attente. Tout est à jour 🎉</p>
  }

  return (
    <div className="admin-requests">
      {pending.map((a) => (
        <article key={a.id} className="admin-panel admin-request">
          <div className="admin-request-head">
            <span className={`admin-role ${a.role}`}>{roleLabels[a.role]}</span>
            <span className="admin-muted">Reçue le {formatDate(a.date)}</span>
          </div>
          <h2>{a.name}</h2>
          <dl className="admin-details">
            {Object.entries({ Email: a.email, Téléphone: a.phone, Ville: a.city, ...a.details }).map(([key, value]) => (
              <div key={key} className="admin-details-row">
                <dt>{key}</dt><dd>{value}</dd>
              </div>
            ))}
          </dl>

          {a.role === 'beneficiaire' && (
            a.proof ? (
              <ProofThumb account={a} onOpen={() => setViewing(a)} />
            ) : (
              <p className="admin-proof-missing">Aucun justificatif fourni</p>
            )
          )}

          <div className="admin-actions">
            <button type="button" className="btn btn-primary" onClick={() => onDecide(a, true)}>Valider</button>
            <button type="button" className="btn admin-btn-outline" onClick={() => onDecide(a, false)}>Refuser</button>
          </div>
        </article>
      ))}

      {viewing && (
        <ProofModal
          account={viewing}
          onClose={() => setViewing(null)}
          onDecide={(approved) => {
            onDecide(viewing, approved)
            setViewing(null)
          }}
        />
      )}
    </div>
  )
}

/* ---------- Fenêtre d'aperçu du justificatif ---------- */
function ProofModal({ account, onClose, onDecide }) {
  const { proof } = account
  const { url, failed } = useProofUrl(account.id)

  // Ferme la fenêtre avec la touche Échap
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proof-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-head">
          <div>
            <h2 id="proof-title">Justificatif de {account.name}</h2>
            <span className="admin-muted">
              {account.details['Type de justificatif']} · CIN déclaré : {account.details.CIN}
            </span>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="admin-modal-body">
          {failed && <p className="admin-empty">Impossible de charger le justificatif.</p>}
          {!failed && !url && <p className="admin-empty">Chargement du justificatif…</p>}
          {url && (proof.type === 'image'
            ? <img src={url} alt={`Justificatif de ${account.name}`} />
            : <iframe src={url} title={`Justificatif de ${account.name}`} />)}
        </div>

        <p className="admin-muted admin-modal-hint">
          Vérifie que le nom et le numéro de CIN correspondent aux informations déclarées.
        </p>

        <div className="admin-modal-foot">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="admin-link">
              Ouvrir dans un nouvel onglet ↗
            </a>
          ) : <span />}
          <div className="admin-actions">
            <button type="button" className="btn btn-primary" onClick={() => onDecide(true)}>Valider</button>
            <button type="button" className="btn admin-btn-outline" onClick={() => onDecide(false)}>Refuser</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Utilisateurs ---------- */
function Users({ users, onToggle }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('tous')

  const q = query.trim().toLowerCase()
  const visible = users.filter(
    (u) =>
      (role === 'tous' || u.role === role) &&
      (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.city.toLowerCase().includes(q))
  )

  return (
    <section className="admin-panel">
      <div className="admin-toolbar">
        <input
          type="search"
          className="admin-search"
          placeholder="Rechercher un nom, email, ville…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="admin-chips">
          {['tous', 'beneficiaire', 'restaurant'].map((r) => (
            <button
              key={r}
              type="button"
              className={role === r ? 'chip active' : 'chip'}
              onClick={() => setRole(r)}
            >
              {r === 'tous' ? 'Tous' : roleLabels[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nom</th><th>Rôle</th><th>Ville</th><th>Inscrit le</th><th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  <span className="admin-muted admin-block">{u.email}</span>
                </td>
                <td><span className={`admin-role ${u.role}`}>{roleLabels[u.role]}</span></td>
                <td>{u.city}</td>
                <td>{formatDate(u.joined)}</td>
                <td>
                  <span className={u.status === 'actif' ? 'admin-status status-ok' : 'admin-status status-alert'}>
                    {u.status === 'actif' ? 'Actif' : 'Suspendu'}
                  </span>
                </td>
                <td className="admin-right">
                  <button type="button" className="admin-link" onClick={() => onToggle(u)}>
                    {u.status === 'actif' ? 'Suspendre' : 'Réactiver'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="admin-empty">Aucun utilisateur ne correspond.</p>}
      </div>
    </section>
  )
}

/* ---------- Offres ---------- */
function Offers({ offers, onRemove }) {
  const [filter, setFilter] = useState('toutes')
  const filters = [
    { id: 'toutes', label: 'Toutes' },
    { id: 'active', label: 'Actives' },
    { id: 'signalee', label: 'Signalées' },
    { id: 'expiree', label: 'Expirées' },
  ]
  const visible = offers.filter((o) => filter === 'toutes' || o.status === filter)

  return (
    <section className="admin-panel">
      <div className="admin-toolbar">
        <div className="admin-chips">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filter === f.id ? 'chip active' : 'chip'}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Offre</th><th>Quantité</th><th>Prix</th><th>Expire</th><th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.title}</strong>
                  <span className="admin-muted admin-block">{o.restaurant}</span>
                </td>
                <td>{o.quantity}</td>
                <td>{o.price.toFixed(3)} DT</td>
                <td>{o.expires}</td>
                <td>
                  <span className={`admin-status ${offerStatus[o.status].className}`}>
                    {offerStatus[o.status].label}
                  </span>
                </td>
                <td className="admin-right">
                  {o.status !== 'retiree' && (
                    <button type="button" className="admin-link danger" onClick={() => onRemove(o)}>
                      Retirer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="admin-empty">Aucune offre dans cette catégorie.</p>}
      </div>
    </section>
  )
}
