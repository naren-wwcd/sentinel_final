import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CircleNotch, CheckCircle, WarningCircle, MagnifyingGlass, X, Tray } from '@phosphor-icons/react'

/* ---------- Formatting ---------- */
export const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour12: false }) : '—')
export const fmtDT = (ts) => (ts ? new Date(ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium', hour12: false }) : '—')
export function relTime(ts) {
  if (!ts) return '—'
  const s = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
export const Time = ({ ts, mode = 'rel' }) => <time dateTime={ts} title={fmtDT(ts)}>{mode === 'rel' ? relTime(ts) : mode === 'time' ? fmtTime(ts) : fmtDT(ts)}</time>
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`
export const humanize = (s) => { const t = String(s ?? '').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1) }

export const EVENT_LABEL = { login_failed: 'Failed login', login_success: 'Successful login', file_access: 'File access', privilege_escalation: 'Privilege escalation', large_download: 'Large download', suspicious_command: 'Suspicious command' }
export const EVENT_TONE = { login_failed: 'med', privilege_escalation: 'crit', large_download: 'crit', suspicious_command: 'high' }

/* ---------- Hooks ---------- */
export function usePoll(fn, ms = 3000, deps = []) {
  const [s, set] = useState({ data: null, error: null, loading: true })
  const ref = useRef(fn); ref.current = fn
  const load = useCallback(async () => {
    try { set({ data: await ref.current(), error: null, loading: false }) } catch (e) { set((p) => ({ ...p, error: e, loading: false })) }
  }, [])
  useEffect(() => {
    load()
    if (!ms) return
    const t = setInterval(() => { if (!document.hidden) load() }, ms)
    return () => clearInterval(t)
  }, [ms, load, ...deps])
  return { ...s, reload: load }
}

export function usePageTitle(title) {
  useEffect(() => { document.title = title ? `${title} · CyberSentinel` : 'CyberSentinel' }, [title])
}

// Filter / tab state lives in the URL so views are shareable and survive reloads.
export function useParamState(key, fallback = '') {
  const [sp, setSp] = useSearchParams()
  const value = sp.get(key) ?? fallback
  const set = useCallback((v) => setSp((prev) => { const n = new URLSearchParams(prev); if (!v || v === fallback) n.delete(key); else n.set(key, v); return n }, { replace: true }), [key, fallback, setSp])
  return [value, set]
}

/* ---------- Primitives ---------- */
export function Button({ variant = 'secondary', size, icon: Icon, loading, danger, className = '', children, ...p }) {
  const cls = ['btn', variant !== 'secondary' && variant, size, danger && 'danger', !children && 'icon', className].filter(Boolean).join(' ')
  return <button type="button" {...p} className={cls} disabled={loading || p.disabled} aria-busy={loading || undefined}>
    {loading ? <CircleNotch className="spin" /> : Icon && <Icon />}{children}
  </button>
}

const SEV = { CRITICAL: ['crit', 4], HIGH: ['high', 3], MEDIUM: ['med', 2], LOW: ['ok', 1] }
export const sevTone = (l) => SEV[l]?.[0] || ''
export function Severity({ level }) {
  const [tone, n] = SEV[level] || ['', 0]
  return <span className={`badge ${tone}`}><span className="sev-bars" aria-hidden="true">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>{humanize(String(level || 'unknown').toLowerCase())}</span>
}
export const Badge = ({ tone = '', children }) => <span className={`badge ${tone}`}>{children}</span>

const STATUS = {
  Open: ['info', 'Open'], Investigating: ['info', 'Investigating'], 'Awaiting Approval': ['high', 'Awaiting approval'], Contained: ['ok', 'Contained'], Resolved: ['ok', 'Resolved'], Closed: ['', 'Closed'],
  executed: ['ok', 'Executed'], pending_approval: ['high', 'Awaiting approval'], recommended: ['', 'Recommended'], rejected: ['crit', 'Rejected'], failed: ['crit', 'Failed'],
  pending: ['high', 'Pending'], approved: ['ok', 'Approved'],
  SUCCESS: ['ok', 'Success'], FAILED: ['crit', 'Failed'], PENDING: ['high', 'Pending'], REJECTED: ['crit', 'Rejected'], WARNING: ['med', 'Warning'],
  PASSED: ['ok', 'Passed'], CORRECTED: ['med', 'Corrected'],
}
export function Status({ status, label }) {
  const [tone, text] = STATUS[status] || ['', humanize(status)]
  return <span className="status"><span className={`dot ${tone}`} />{label || text}</span>
}

export function Panel({ title, hint, end, children, flush, className = '' }) {
  return <section className={`panel ${className}`}>
    {title && <header className="panel-head"><h2>{title}</h2>{hint && <span className="hint">{hint}</span>}{end && <div className="end">{end}</div>}</header>}
    {flush ? children : <div className="panel-body">{children}</div>}
  </section>
}

export function PageHeader({ title, description, children }) {
  return <header className="page-head"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="actions">{children}</div>}</header>
}

export function Search({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  return <label className="search"><span className="sr-only">{label}</span><MagnifyingGlass /><input className="input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} spellCheck={false} autoComplete="off" /></label>
}

export function Select({ value, onChange, options, label }) {
  return <select className="select" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
    {options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option> })}
  </select>
}

export function Segmented({ value, onChange, options, label }) {
  return <div className="segmented" role="group" aria-label={label}>
    {options.map(({ value: v, label: l, count, icon: Icon }) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{Icon && <Icon />}{l}{count != null && <span className="n">{count}</span>}</button>)}
  </div>
}

export function Tabs({ value, onChange, tabs }) {
  return <div className="tabs" role="tablist">
    {tabs.map(({ value: v, label, count }) => <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)}>{label}{count > 0 && <span className="n">{count}</span>}</button>)}
  </div>
}

/* ---------- States ---------- */
export function Empty({ icon: Icon = Tray, title = 'Nothing here yet', children, action, compact }) {
  return <div className={`empty ${compact ? 'compact' : ''}`}><div className="ico"><Icon size={20} /></div><b>{title}</b>{children && <p>{children}</p>}{action}</div>
}
export function ErrorState({ error, retry }) {
  return <div className="alert" role="alert"><WarningCircle size={18} /><div><b>Couldn’t reach the API.</b> {String(error?.message || error)}. Check that the backend is running on port 8000.</div>{retry && <Button size="sm" onClick={retry}>Retry</Button>}</div>
}
export function PageSkeleton({ rows = 6 }) {
  return <div className="page" aria-busy="true" aria-label="Loading">
    <div className="skeleton" style={{ width: 180, height: 26, marginBottom: 10 }} /><div className="skeleton" style={{ width: 340, height: 16, marginBottom: 28 }} />
    <div className="panel">{Array.from({ length: rows }, (_, i) => <div key={i} style={{ padding: '14px 16px', borderBottom: i < rows - 1 ? '1px solid var(--border)' : 0 }}><div className="skeleton" style={{ height: 14, width: `${88 - ((i * 13) % 40)}%` }} /></div>)}</div>
  </div>
}
// Standard wrapper: skeleton while the first load is pending, error state if it failed with nothing cached.
export function Async({ state, children }) {
  if (state.error && !state.data) return <div className="page"><ErrorState error={state.error} retry={state.reload} /></div>
  if (!state.data) return <PageSkeleton />
  return children(state.data)
}

/* ---------- Overlays ---------- */
function useDialog(open) {
  const ref = useRef(null)
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close() }, [open])
  return ref
}

export function Drawer({ open, onClose, title, subtitle, children }) {
  const ref = useDialog(open)
  return <dialog ref={ref} className="drawer" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-label={typeof title === 'string' ? title : undefined}>
    {open && <><header className="drawer-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><Button variant="ghost" icon={X} aria-label="Close" onClick={onClose} /></header><div className="drawer-body">{children}</div></>}
  </dialog>
}

const Ctx = createContext({})
export const useUI = () => useContext(Ctx)

function ConfirmDialog({ dlg, close }) {
  const ref = useDialog(!!dlg)
  const [note, setNote] = useState('')
  useEffect(() => setNote(''), [dlg])
  return <dialog ref={ref} className="modal" onClose={() => dlg && close(false)} onClick={(e) => e.target === ref.current && close(false)}>
    {dlg && <form method="dialog" onSubmit={(e) => { e.preventDefault(); close(dlg.input ? { note: note.trim() } : true) }}>
      <div className="modal-body"><h2>{dlg.title}</h2><p>{dlg.body}</p>
        {dlg.input && <div className="field"><label htmlFor="dlg-note">{dlg.input.label}</label><textarea id="dlg-note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={dlg.input.placeholder} /></div>}
      </div>
      <div className="modal-foot"><Button onClick={() => close(false)}>Cancel</Button><button type="submit" className={`btn primary ${dlg.danger ? 'danger' : ''}`} autoFocus={!dlg.input}>{dlg.confirmText || 'Confirm'}</button></div>
    </form>}
  </dialog>
}

export function Providers({ children }) {
  const [toasts, setT] = useState([]); const [dlg, setDlg] = useState(null)
  const toast = useCallback((msg, type = 'ok') => { const id = Math.random(); setT((t) => [...t, { id, msg, type }]); setTimeout(() => setT((t) => t.filter((x) => x.id !== id)), 4000) }, [])
  const confirm = useCallback((o) => new Promise((res) => setDlg({ ...o, res })), [])
  const close = (v) => { dlg?.res(v); setDlg(null) }
  return <Ctx.Provider value={{ toast, confirm }}>{children}
    <div className="toasts" role="status" aria-live="polite">{toasts.map((t) => <div key={t.id} className="toast">{t.type === 'error' ? <WarningCircle size={18} weight="fill" /> : <CheckCircle size={18} weight="fill" />}{t.msg}</div>)}</div>
    <ConfirmDialog dlg={dlg} close={close} />
  </Ctx.Provider>
}

/* ---------- Domain pieces ---------- */
export function RiskMeter({ score, level, small }) {
  const tone = sevTone(level)
  if (small) return <span className="meter sm" role="img" aria-label={`Risk ${score} of 100`}><i className={tone} style={{ width: `${score}%` }} /></span>
  return <div><div className="meter" role="img" aria-label={`Risk ${score} of 100`}><i className={tone} style={{ width: `${score}%` }} />{[30, 60, 80].map((t) => <s key={t} style={{ left: `${t}%` }} />)}</div>
    <div className="meter-scale"><span>Low</span><span>Medium</span><span>High</span><span>Critical</span></div></div>
}

export function Cited({ text }) {
  return <>{String(text || '').split(/(E\d{3,}(?:\s*[-–]\s*E\d{3,})?)/).map((p, i) => (/^E\d{3,}/.test(p) ? <span key={i} className="cite">{p}</span> : p))}</>
}

export function RunSteps({ steps = [], animate = false }) {
  const [n, setN] = useState(animate ? 0 : steps.length)
  useEffect(() => {
    if (!animate) { setN(steps.length); return }
    setN(0)
    const t = setInterval(() => setN((x) => { if (x >= steps.length) { clearInterval(t); return x } return x + 1 }), 360)
    return () => clearInterval(t)
  }, [animate, steps])
  return <ol className="steps" aria-live="polite">
    {steps.slice(0, n).map((s, i) => <li key={i}><CheckCircle size={18} weight="fill" className="ok" /><span>{s.text}</span></li>)}
    {n < steps.length && <li className="muted"><CircleNotch size={18} className="spin" /><span>Running step {n + 1} of {steps.length}…</span></li>}
  </ol>
}

// Slide-over showing an automation run: the steps the robot took and the post-action state check.
export function RunDrawer({ run, onClose }) {
  const r = run?.response, v = r?.verification
  return <Drawer open={!!run} onClose={onClose} title={r?.label} subtitle={r && <>Target <span className="mono">{r.target}</span> · {r.rpa_job}</>}>
    {r && <>
      <div className="section-title">Automation steps</div>
      <RunSteps steps={r.rpa_steps} animate={!!run.animate} />
      {v && <div className="verify"><div className="row" style={{ justifyContent: 'space-between' }}><b>Verification</b><Status status={v.status} /></div>
        <dl className="dl" style={{ marginTop: 10 }}><dt>Expected</dt><dd>{v.expected}</dd><dt>Actual</dt><dd>{v.actual}</dd></dl></div>}
      <p className="muted" style={{ marginTop: 16, fontSize: 12.5 }}>Simulated run. No real account, network or host was changed.</p>
    </>}
  </Drawer>
}
