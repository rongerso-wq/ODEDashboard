import { useState } from 'react'
import { TEAM_MEMBERS } from '../lib/seed.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import '../styles/settings.css'

const ROLES = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
}

export default function Settings() {
  // Single agency owner — can always manage team
  const canManageTeam = true
  const currentUser = { id: 'user-owner' }

  const [agencyName, setAgencyName] = useState('Agency Name')
  const [agencyEmail, setAgencyEmail] = useState('admin@agency.example')
  const [agencyPhone, setAgencyPhone] = useState('+1 (555) 123-4567')

  const [connectedAccounts, setConnectedAccounts] = useState([
    { id: 'ig', platform: 'Instagram', handle: '@agency_handle', connected: true },
    { id: 'fb', platform: 'Facebook', handle: '@agency_page', connected: true },
    { id: 'tiktok', platform: 'TikTok', handle: '@agency_tiktok', connected: false },
    { id: 'yt', platform: 'YouTube', handle: 'Agency Channel', connected: false },
  ])

  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: ROLES.EDITOR,
  })
  const [inviteError, setInviteError] = useState('')

  const [brandKit] = useState({
    primaryColor: '#0a0a0a',
    accentColor: '#ffffff',
    fontFamily: 'Assistant, Heebo, system-ui',
    logoUrl: null,
  })

  const toggleAccount = (id) => {
    setConnectedAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, connected: !acc.connected } : acc))
    )
  }

  const handleInviteSubmit = (e) => {
    e.preventDefault()
    setInviteError('')

    if (!inviteForm.email.trim()) {
      setInviteError('דוא״ל נדרש')
      return
    }
    if (!inviteForm.email.includes('@')) {
      setInviteError('דוא״ל לא חוקי')
      return
    }

    // Check if email already exists
    if (TEAM_MEMBERS.some((m) => m.email === inviteForm.email.trim())) {
      setInviteError('המשתמש כבר בצוות')
      return
    }

    // Success
    setInviteForm({ email: '', role: ROLES.EDITOR })
    setShowInviteForm(false)
  }

  const getRoleLabel = (role) => {
    const labels = {
      owner: 'בעלים',
      editor: 'עורך',
      viewer: 'צופה',
    }
    return labels[role] || role
  }

  const getRoleColor = (role) => {
    const colors = {
      owner: '#0a0a0a',
      editor: '#6b7280',
      viewer: '#d1d5db',
    }
    return colors[role]
  }

  return (
    <div className="page-settings">
      <PageHeader title="הגדרות" subtitle="סוכנות, חשבונות וצוות" />

      {/* Agency Profile */}
      <section className="settings-section">
        <h2 className="section-title">פרופיל סוכנות</h2>
        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="agencyName">שם סוכנות</label>
            <input
              id="agencyName"
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="form-input"
              placeholder="שם הסוכנות"
            />
          </div>
          <div className="form-group">
            <label htmlFor="agencyEmail">דוא״ל</label>
            <input
              id="agencyEmail"
              type="email"
              value={agencyEmail}
              onChange={(e) => setAgencyEmail(e.target.value)}
              className="form-input"
              placeholder="דוא״ל"
            />
          </div>
          <div className="form-group">
            <label htmlFor="agencyPhone">טלפון</label>
            <input
              id="agencyPhone"
              type="tel"
              value={agencyPhone}
              onChange={(e) => setAgencyPhone(e.target.value)}
              className="form-input"
              placeholder="מספר טלפון"
            />
          </div>
          <button className="btn-primary">שמור שינויים</button>
        </div>
      </section>

      {/* Connected Accounts */}
      <section className="settings-section">
        <h2 className="section-title">חשבונות מחוברים</h2>
        <div className="accounts-grid">
          {connectedAccounts.map((acc) => (
            <div key={acc.id} className="account-card">
              <div className="account-header">
                <div>
                  <div className="account-platform">{acc.platform}</div>
                  <div className="account-handle">{acc.handle}</div>
                </div>
                <button
                  className={`toggle-btn ${acc.connected ? 'connected' : ''}`}
                  onClick={() => toggleAccount(acc.id)}
                >
                  {acc.connected ? 'מחובר' : 'חבר'}
                </button>
              </div>
              <div className={`connection-status ${acc.connected ? 'connected' : 'disconnected'}`}>
                {acc.connected ? '✓ מחובר' : '○ לא מחובר'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team Members */}
      <section className="settings-section">
        <div className="section-header">
          <h2 className="section-title">חברי צוות</h2>
          <span className="member-count">{TEAM_MEMBERS.length} חברים</span>
        </div>
        <div className="team-list">
          {TEAM_MEMBERS.map((member) => (
            <div key={member.id} className="team-member-card">
              <div
                className="member-avatar"
                style={{ backgroundColor: getRoleColor(member.role) }}
                title={member.role}
              >
                {member.initials}
              </div>
              <div className="member-info">
                <div className="member-name">
                  {member.name}
                  {member.id === currentUser.id && <span className="member-badge">אתה</span>}
                </div>
                <div className="member-email">{member.email}</div>
              </div>
              <div className="member-role-badge">{getRoleLabel(member.role)}</div>
              {canManageTeam && member.role !== ROLES.OWNER && (
                <div className="member-actions">
                  <button
                    className="btn-action-small"
                    title="הסר מהצוות"
                    disabled={member.role === ROLES.OWNER}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {showInviteForm ? (
          <form onSubmit={handleInviteSubmit} className="invite-form">
            <h3 className="form-title">הזמן חבר צוות</h3>

            {inviteError && <div className="form-error">{inviteError}</div>}

            <div className="form-group">
              <label htmlFor="invite-email">דוא״ל</label>
              <input
                id="invite-email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@example.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="invite-role">תפקיד</label>
              <select
                id="invite-role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="form-input"
              >
                <option value={ROLES.EDITOR}>עורך — יוצר ועורך תוכן</option>
                <option value={ROLES.VIEWER}>צופה — צפייה בדוחות בלבד</option>
              </select>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowInviteForm(false)
                  setInviteError('')
                }}
              >
                ביטול
              </button>
              <button type="submit" className="btn-primary">
                שלח הזמנה
              </button>
            </div>
          </form>
        ) : (
          <button
            className="btn-secondary"
            onClick={() => setShowInviteForm(true)}
            disabled={!canManageTeam}
            title={!canManageTeam ? 'רק בעלים יכולים להזמין חברים' : ''}
          >
            + הוסף חבר צוות
          </button>
        )}

        {!canManageTeam && (
          <div className="permission-notice">
            רק בעלי הסוכנות יכולים לנהל את הצוות.
          </div>
        )}
      </section>

      {/* Brand Kit */}
      <section className="settings-section">
        <h2 className="section-title">ברנד קיט</h2>
        <div className="brand-kit">
          <div className="brand-item">
            <label>צבע ראשי</label>
            <div className="color-preview" style={{ backgroundColor: brandKit.primaryColor }}>
              <span style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{brandKit.primaryColor}</span>
            </div>
          </div>
          <div className="brand-item">
            <label>צבע משני</label>
            <div className="color-preview" style={{ backgroundColor: brandKit.accentColor, color: '#000' }}>
              <span style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{brandKit.accentColor}</span>
            </div>
          </div>
          <div className="brand-item">
            <label>משפחת גופנים</label>
            <div className="font-preview" style={{ fontFamily: brandKit.fontFamily }}>
              {brandKit.fontFamily}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
