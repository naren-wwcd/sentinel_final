import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'

const SEV = { CRITICAL: 'crit', HIGH: 'high', MEDIUM: 'med', LOW: 'low' }
export const sevClass = (l) => SEV[l] || 'neutral'
export const Badge = ({ level, children, kind }) => <span className={`badge ${kind || sevClass(level)}`}>{children || level}</span>
const ST = { Open: 'info', Investigating: 'info', 'Awaiting Approval': 'high', Contained: 'ok', executed: 'ok', pending_approval: 'high', recommended: 'neutral', rejected: 'crit', failed: 'crit', pending: 'high', approved: 'ok', SUCCESS: 'ok', FAILED: 'crit', PENDING: 'high', REJECTED: 'crit', WARNING: 'med' }
export const StatusBadge = ({ status }) => <Badge kind={ST[status] || 'neutral'}>{String(status).replace('_', ' ')}</Badge>
export const Card = ({ title, right, children, className = '', pad = true }) => (
  <div className={`card ${className}`}>{title && <div className="hd"><h2>{title}</h2><div className="row">{right}</div></div>}<div className={pad ? 'bd' : ''}>{children}</div></div>)
export const Loading = () => <div className="loading"><Loader2 size={18} className="pulse" /> Loading…</div>
export const Empty = ({ text = 'Nothing here yet' }) => <div className="empty">{text}</div>
export const ErrorBox = ({ error, retry }) => <div className="err"><AlertTriangle size={14} /> {String(error?.message || error)} {retry && <button className="btn" onClick={retry}>Retry</button>}</div>
export const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour12: false }) : '—'
export const fmtDT = (ts) => ts ? new Date(ts).toLocaleString([], { hour12: false }) : '—'

export function usePoll(fn, ms = 3000, deps = []) {
  const [s, set] = useState({ data: null, error: null, loading: true })
  const ref = useRef(fn); ref.current = fn
  const load = useCallback(async () => { try { set({ data: await ref.current(), error: null, loading: false }) } catch (e) { set((p) => ({ ...p, error: e, loading: false })) } }, [])
  useEffect(() => { load(); if (!ms) return; const t = setInterval(load, ms); return () => clearInterval(t) }, [ms, load, ...deps])
  return { ...s, reload: load }
}

const Ctx = createContext({})
export const useUI = () => useContext(Ctx)
export function Providers({ children }) {
  const [toasts, setT] = useState([]); const [dlg, setDlg] = useState(null)
  const toast = useCallback((msg, type = 'ok') => { const id = Math.random(); setT((t) => [...t, { id, msg, type }]); setTimeout(() => setT((t) => t.filter((x) => x.id !== id)), 4000) }, [])
  const confirm = useCallback((o) => new Promise((res) => setDlg({ ...o, res })), [])
  const close = (v) => { dlg.res(v); setDlg(null) }
  return <Ctx.Provider value={{ toast, confirm }}>{children}
    <div className="toasts">{toasts.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>)}</div>
    {dlg && <div className="modal"><div className="box"><h2>{dlg.title}</h2><p className="mut">{dlg.body}</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn" onClick={() => close(false)}>Cancel</button><button className={`btn ${dlg.danger ? 'danger' : 'pri'}`} onClick={() => close(true)}>{dlg.confirmText || 'Confirm'}</button></div></div></div>}
  </Ctx.Provider>
}

export function Gauge({ score, level }) {
  const col = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' }[level] || '#8cff2e'
  return <div style={{ textAlign: 'center' }}><svg width="170" height="100" viewBox="0 0 170 100">
    <path d="M20 85 A65 65 0 0 1 150 85" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="12" strokeLinecap="round" pathLength="100" />
    <path d="M20 85 A65 65 0 0 1 150 85" fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" pathLength="100" strokeDasharray={`${score} 100`} />
    <text x="85" y="72" textAnchor="middle" fill="#fff" fontSize="30" fontWeight="700">{score}</text><text x="85" y="92" textAnchor="middle" fill={col} fontSize="12" fontWeight="700">{level}</text></svg></div>
}

export function Cited({ text }) {
  return <>{String(text || '').split(/(E\d{3,}(?:\s*[-–]\s*E\d{3,})?)/).map((p, i) => /^E\d{3,}/.test(p) ? <span key={i} className="cite">{p}</span> : p)}</>
}

export function RpaSteps({ steps = [], animate = false, job }) {
  const [n, setN] = useState(animate ? 0 : steps.length)
  useEffect(() => { if (!animate) return; setN(0); const t = setInterval(() => setN((x) => { if (x >= steps.length) { clearInterval(t); return x } return x + 1 }), 380); return () => clearInterval(t) }, [animate, steps.length])
  return <div>{job && <div className="mut" style={{ marginBottom: 6 }}>RPA job: <b style={{ color: '#fff' }}>{job}</b></div>}
    {steps.slice(0, n).map((s, i) => <div className="step" key={i}><CheckCircle2 size={15} className="ck" /> <span>{s.text}</span></div>)}
    {n < steps.length && <div className="step mut"><Loader2 size={14} className="pulse" /> running…</div>}</div>
}

export function Verification({ v }) {
  if (!v) return null
  return <div className="card" style={{ padding: 12, marginTop: 10 }}><div className="row"><b>Verification</b><StatusBadge status={v.status} /></div>
    <div className="mut">Expected: <span style={{ color: '#fff' }}>{v.expected}</span> &nbsp;|&nbsp; Actual: <span style={{ color: '#fff' }}>{v.actual}</span></div></div>
}

export function ResultModal({ data, onClose }) {
  if (!data) return null
  const r = data.response
  return <div className="modal" onClick={onClose}><div className="box" onClick={(e) => e.stopPropagation()}>
    <h2>{r.label} → <span className="mono">{r.target}</span></h2>
    <RpaSteps steps={r.rpa_steps} job={r.rpa_job} animate /><Verification v={r.verification} />
    <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}><button className="btn pri" onClick={onClose}>Close</button></div></div></div>
}
