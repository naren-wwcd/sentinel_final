import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { api } from '../services/api'
import { Card, Loading, ErrorBox, usePoll, useUI, Badge, StatusBadge, Empty, fmtTime, ResultModal } from '../components/ui.jsx'
export default function Approvals() {
  const { data, error, reload } = usePoll(api.approvals, 2000); const { toast, confirm } = useUI(); const [res, setRes] = useState(null)
  if (error && !data) return <div className="page"><ErrorBox error={error} retry={reload} /></div>
  if (!data) return <div className="page"><Loading /></div>
  const pend = data.filter((a) => a.status === 'pending'), hist = data.filter((a) => a.status !== 'pending')
  const approve = async (a) => { if (!(await confirm({ title: 'Approve action?', body: `${a.label} → ${a.target}. The simulated RPA job will run immediately.`, confirmText: 'Approve', danger: true }))) return
    try { const o = await api.approve(a.id); toast('Approved — RPA executed'); setRes(o); reload() } catch (e) { toast(e.message, 'error') } }
  const reject = async (a) => { if (!(await confirm({ title: 'Reject action?', body: `${a.label} → ${a.target} will not be executed.`, confirmText: 'Reject' }))) return
    try { await api.reject(a.id, 'Rejected by analyst'); toast('Rejected and logged'); reload() } catch (e) { toast(e.message, 'error') } }
  return <div className="page"><h1>Approval Queue</h1><div className="sub">Human-in-the-loop control for high-impact actions</div>
    {!pend.length ? <Card className="mb"><Empty text="No pending approvals" /></Card> : <div className="grid mb">{pend.map((a) => <Card key={a.id}>
      <div className="row"><span className="mono mut">{a.id}</span><Link to={`/incidents/${a.incident_id}`} className="mono">{a.incident_id}</Link><Badge level={a.risk_level} /><span className="mut">Requested {fmtTime(a.requested_at)}</span></div>
      <h2 style={{ fontSize: 17, margin: '8px 0' }}>{a.label} → <span className="mono">{a.target}</span></h2><div className="mut" style={{ marginBottom: 12 }}>{a.reason}</div>
      <div className="row"><button className="btn ok" onClick={() => approve(a)}><Check size={14} /> APPROVE</button><button className="btn danger" onClick={() => reject(a)}><X size={14} /> REJECT</button></div></Card>)}</div>}
    <Card title="Decision history" pad={false}>{hist.length ? <table><thead><tr><th>ID</th><th>Action</th><th>Target</th><th>Decision</th><th>By</th><th>Time</th></tr></thead><tbody>{hist.map((a) => <tr key={a.id}><td className="mono">{a.id}</td><td>{a.label}</td><td className="mono">{a.target}</td><td><StatusBadge status={a.status} /></td><td>{a.decided_by}</td><td className="mut">{fmtTime(a.decided_at)}</td></tr>)}</tbody></table> : <Empty />}</Card>
    <ResultModal data={res} onClose={() => setRes(null)} /></div>
}
