import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader.jsx'
import { useAppState } from '../context/ClientContext.jsx'
import './pages.css'

/* ------------------------------------------------------------------ */
/*  Static config                                                       */
/* ------------------------------------------------------------------ */

const CONTENT_TYPES = [
  { id: 'feed',     label: 'פוסט פיד',    hint: 'תמונה + כיתוב לרשת' },
  { id: 'reel',     label: 'ריל',          hint: 'וידאו קצר 15–60 שנ׳' },
  { id: 'story',    label: 'סטורי',        hint: '24 שעות, פורמט אנכי' },
  { id: 'carousel', label: 'קרוסלה',       hint: '3–10 שקפים לסוויפ' },
]

const STEPS = [
  { n: 1, title: 'לקוח וסוג',    hint: 'בחר מי ומה' },
  { n: 2, title: 'בריף',          hint: 'מה ליצור' },
  { n: 3, title: 'וריאנטים',      hint: 'AI מייצר 3 אפשרויות' },
  { n: 4, title: 'שליחה',         hint: 'שלח לאישור' },
]


function initials(name) {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

/* ------------------------------------------------------------------ */
/*  Step panels                                                         */
/* ------------------------------------------------------------------ */

function Step1({ clients, form, setForm, onNext }) {
  const ready = form.clientId && form.contentType
  return (
    <div className="wizard__panel">
      <div className="wizard__panel-head">
        <div className="wizard__panel-title">בחר לקוח וסוג תוכן</div>
        <div className="wizard__panel-hint">לאיזה לקוח יוצרים? מה הפורמט?</div>
      </div>

      <div>
        <div className="field__label" style={{ marginBottom: 'var(--sp-3)' }}>לקוח</div>
        <div className="choices choices--2">
          {clients.map((c) => (
            <button
              key={c.id}
              className={`choice ${form.clientId === c.id ? 'choice--selected' : ''}`}
              onClick={() => setForm((p) => ({ ...p, clientId: c.id }))}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--r-xs)',
                    background: 'var(--text)', color: 'var(--text-inverse)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 'var(--fs-12)', fontWeight: 'var(--fw-semibold)', flexShrink: 0,
                  }}
                >
                  {initials(c.name)}
                </div>
                <div>
                  <div className="choice__title">{c.name}</div>
                  <div className="choice__hint">{c.industryLabel}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="field__label" style={{ marginBottom: 'var(--sp-3)' }}>סוג תוכן</div>
        <div className="choices choices--4">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.id}
              className={`choice ${form.contentType === ct.id ? 'choice--selected' : ''}`}
              onClick={() => setForm((p) => ({ ...p, contentType: ct.id }))}
            >
              <div className="choice__title">{ct.label}</div>
              <div className="choice__hint">{ct.hint}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="wizard__nav">
        <span />
        <button className="btn btn-primary" disabled={!ready} onClick={onNext}>
          המשך
          <ChevronLeft size={15} style={{ marginInlineStart: 4 }} />
        </button>
      </div>
    </div>
  )
}

function Step2({ client, form, setForm, onNext, onBack, error }) {
  const ready = form.promo.trim().length > 3
  return (
    <div className="wizard__panel">
      <div className="wizard__panel-head">
        <div className="wizard__panel-title">בריף יצירה</div>
        <div className="wizard__panel-hint">מה אתה רוצה לקדם? AI יתאים לטון של {client.name}</div>
      </div>

      {error && (
        <div style={{
          padding: 'var(--sp-3)',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--r-xs)',
          color: '#991b1b',
          fontSize: 'var(--fs-13)',
          marginBottom: 'var(--sp-4)',
        }}>
          ⚠️ {error}
        </div>
      )}

      <div className="field">
        <label className="field__label">מה מקדמים? *</label>
        <textarea
          className="field__textarea"
          placeholder="תאר את המבצע, המוצר או הנושא שרוצים לקדם..."
          value={form.promo}
          onChange={(e) => setForm((p) => ({ ...p, promo: e.target.value }))}
        />
      </div>

      <div className="field__row">
        <div className="field">
          <label className="field__label">מוצר / שירות</label>
          <input
            className="field__input"
            placeholder="שם המוצר..."
            value={form.product}
            onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))}
          />
        </div>
        <div className="field">
          <label className="field__label">קריאה לפעולה</label>
          <input
            className="field__input"
            placeholder="הזמינו עכשיו / קראו עוד..."
            value={form.cta}
            onChange={(e) => setForm((p) => ({ ...p, cta: e.target.value }))}
          />
        </div>
      </div>

      {/* Brand voice preview */}
      <div className="brand-preview">
        <div className="brand-preview__label">Brand Voice של {client.name}</div>
        <div className="brand-preview__tags">
          {client.brandVoice.map((v) => (
            <span key={v} className="pill">{v}</span>
          ))}
        </div>
        {client.notes && (
          <div className="brand-preview__note">{client.notes}</div>
        )}
      </div>

      <div className="wizard__nav">
        <button className="btn btn-secondary" onClick={onBack}>חזור</button>
        <button className="btn btn-primary" disabled={!ready} onClick={onNext}>
          צור וריאנטים
          <ChevronLeft size={15} style={{ marginInlineStart: 4 }} />
        </button>
      </div>
    </div>
  )
}

function Step3({ variants, loading, form, setForm, onNext, onBack }) {
  return (
    <div className="wizard__panel">
      <div className="wizard__panel-head">
        <div className="wizard__panel-title">בחר וריאנט</div>
        <div className="wizard__panel-hint">
          {loading ? 'AI מייצר — רגע...' : `3 וריאנטים נוצרו — בחר אחד להמשיך`}
        </div>
      </div>

      {loading ? (
        <div className="variants">
          {[0, 1, 2].map((i) => (
            <div key={i} className="variant">
              <div className="skeleton skeleton--media" />
              <div className="variant__body" style={{ gap: 'var(--sp-3)' }}>
                <div className="skeleton skeleton--title" />
                <div className="skeleton skeleton--line" />
                <div className="skeleton skeleton--line" style={{ width: '85%' }} />
                <div className="skeleton skeleton--line" style={{ width: '60%', marginTop: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="variants">
          {variants.map((v) => (
            <button
              key={v.id}
              className={`variant ${form.selectedVariant?.id === v.id ? 'variant--selected' : ''}`}
              onClick={() => setForm((p) => ({ ...p, selectedVariant: v }))}
            >
              <div className="variant__media">
                {form.selectedVariant?.id === v.id && (
                  <div
                    style={{
                      position: 'absolute', top: 10, insetInlineEnd: 10,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'var(--text)', color: 'var(--text-inverse)',
                      display: 'grid', placeItems: 'center',
                    }}
                  >
                    <Check size={13} />
                  </div>
                )}
                <span style={{ fontSize: 'var(--fs-12)', opacity: 0.5 }}>תמונה</span>
              </div>
              <div className="variant__body">
                <div className="variant__title">{v.title}</div>
                <div className="variant__copy">{v.copy}</div>
                <div className="variant__cta">{v.cta} ←</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="wizard__nav">
        <button className="btn btn-secondary" onClick={onBack} disabled={loading}>חזור</button>
        <button
          className="btn btn-primary"
          disabled={loading || !form.selectedVariant}
          onClick={onNext}
        >
          שלח לאישור
          <ChevronLeft size={15} style={{ marginInlineStart: 4 }} />
        </button>
      </div>
    </div>
  )
}

function Step4({ client, form, contentTypes, onSend, onBack, sent }) {
  const typeLabel = contentTypes.find((t) => t.id === form.contentType)?.label ?? form.contentType
  const v = form.selectedVariant

  if (sent) {
    return (
      <div className="wizard__panel" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--text)', color: 'var(--text-inverse)',
            display: 'grid', placeItems: 'center', margin: '0 auto var(--sp-4)',
          }}
        >
          <Check size={24} />
        </div>
        <div style={{ fontSize: 'var(--fs-20)', fontWeight: 'var(--fw-semibold)', letterSpacing: '-0.02em' }}>
          נשלח לתור האישורים!
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-15)', marginTop: 'var(--sp-2)' }}>
          הפוסט עבור {client.name} ממתין לאישורך.
        </p>
      </div>
    )
  }

  return (
    <div className="wizard__panel">
      <div className="wizard__panel-head">
        <div className="wizard__panel-title">סקירה ושליחה לאישור</div>
        <div className="wizard__panel-hint">הכל נראה טוב? שלח לתור האישורים</div>
      </div>

      <div className="card" style={{ gap: 'var(--sp-4)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>לקוח</span>
          <span style={{ fontWeight: 'var(--fw-medium)' }}>{client.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>פורמט</span>
          <span className="pill">{typeLabel}</span>
        </div>
        <div style={{ borderTop: 'var(--hairline)', paddingTop: 'var(--sp-4)' }}>
          <div style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
            {v?.title}
          </div>
          <p style={{ fontSize: 'var(--fs-15)', lineHeight: 1.6 }}>{v?.copy}</p>
          <div
            style={{
              marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)',
              borderTop: 'var(--hairline)', fontSize: 'var(--fs-13)',
              color: 'var(--text)', fontWeight: 'var(--fw-medium)',
            }}
          >
            {v?.cta} ←
          </div>
        </div>
      </div>

      <div className="wizard__nav">
        <button className="btn btn-secondary" onClick={onBack}>חזור</button>
        <button className="btn btn-primary" onClick={onSend}>
          <Check size={15} />
          שלח לאישור
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ContentFactory page                                                 */
/* ------------------------------------------------------------------ */

export default function ContentFactory() {
  const navigate = useNavigate()
  const { clients, setState } = useAppState()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    clientId: '',
    contentType: '',
    promo: '',
    product: '',
    cta: '',
    selectedVariant: null,
  })
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const selectedClient = clients.find((c) => c.id === form.clientId)

  function goTo(n) { setStep(n) }

  function handleStep1Next() { goTo(2) }
  function handleStep2Back() { goTo(1) }

  async function handleStep2Next() {
    setLoading(true)
    setError('')
    goTo(3)

    try {
      // Generate text variants with Claude
      const res = await fetch('/api/generatePost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId,
          type: form.contentType,
          promo: form.promo,
          product: form.product,
          cta: form.cta,
          clients,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate variants')
      }

      const data = await res.json()
      setVariants(data.variants)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err.message || 'שגיאה ביצירה. נסה שוב.')
      goTo(2) // Go back to step 2 on error
    } finally {
      setLoading(false)
    }
  }

  function handleStep3Back() { goTo(2) }
  function handleStep3Next() { goTo(4) }
  function handleStep4Back() { goTo(3) }

  const handleSend = useCallback(() => {
    const v = form.selectedVariant
    const typeLabel = CONTENT_TYPES.find((t) => t.id === form.contentType)?.label ?? form.contentType
    const newPost = {
      id: `p_${Date.now()}`,
      clientId: form.clientId,
      type: form.contentType,
      status: 'pending',
      title: `${typeLabel} — ${selectedClient.name}`,
      copy: v.copy,
      cta: v.cta,
      scheduledAt: Date.now() + 3 * 24 * 60 * 60 * 1000, // default: 3 days out
      createdAt: Date.now(),
    }
    setState((prev) => ({
      ...prev,
      posts: [newPost, ...prev.posts],
      activity: [
        { id: `a_${Date.now()}`, at: Date.now(), text: `נוצר וריאנט חדש עבור ${selectedClient.name}` },
        ...prev.activity.slice(0, 9),
      ],
    }))
    setSent(true)
  }, [form, selectedClient, setState])

  const stepDone = (n) => n < step

  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="יצירת תוכן"
        description="בחר לקוח, תאר את הבריף וקבל 3 וריאנטים מותאמים ל-brand voice."
        actions={
          sent && (
            <button className="btn btn-secondary" onClick={() => navigate('/approvals')}>
              לתור האישורים
            </button>
          )
        }
      />

      <div className="wizard">
        {/* Steps sidebar */}
        <nav className="wizard__steps" aria-label="שלבי אשף">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className={[
                'wizard__step',
                step === s.n ? 'wizard__step--active' : '',
                stepDone(s.n) ? 'wizard__step--done' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="wizard__step-n">
                {stepDone(s.n) ? <Check size={12} /> : s.n}
              </div>
              <div className="wizard__step-label">
                <span className="wizard__step-title">{s.title}</span>
                <span className="wizard__step-hint">{s.hint}</span>
              </div>
            </div>
          ))}
        </nav>

        {/* Active panel */}
        {step === 1 && (
          <Step1
            clients={clients}
            form={form}
            setForm={setForm}
            onNext={handleStep1Next}
          />
        )}
        {step === 2 && selectedClient && (
          <Step2
            client={selectedClient}
            form={form}
            setForm={setForm}
            onNext={handleStep2Next}
            onBack={handleStep2Back}
            error={error}
          />
        )}
        {step === 3 && (
          <Step3
            variants={variants}
            loading={loading}
            form={form}
            setForm={setForm}
            onNext={handleStep3Next}
            onBack={handleStep3Back}
          />
        )}
        {step === 4 && selectedClient && (
          <Step4
            client={selectedClient}
            form={form}
            contentTypes={CONTENT_TYPES}
            onSend={handleSend}
            onBack={handleStep4Back}
            sent={sent}
          />
        )}
      </div>
    </>
  )
}
