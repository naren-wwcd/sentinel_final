import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { Bot, Loader2 } from 'lucide-react'
import { api } from '../services/api'
import { Card, Loading, ErrorBox, usePoll, useUI, Badge, StatusBadge, Gauge, fmtTime, fmtDT, Empty, ResultModal } from '../components/ui.jsx'
import { EventTimeline, InvestigationView } from '../components/Shared.jsx'

export default function IncidentDetail() {
  const { id } = useParams(); const { toast, confirm } = useUI()
  const { data: d, error, reload } = usePoll(() => api.incident(id), 2500, [id])
  const [busy, setBusy] = useState(false); const [res, setRes] = useState(null)
  if (error && !d) return <div className="page"><ErrorBox error={error} retry={reload} /></div>
  if (!d) return <div className="page"><Loading /></div>
  const i = d.incident
  const investigate = async () => { setBusy(true); try { await api.investigate(id); toast('AI investigation complete'); reload() } catch (e) { toast(e.message, 'error') } setBusy(false) }
  const exec = async (r) => {
    const hi = r.category === 'high_impact'
    if (!(await confirm({ title: hi ? 'Request approval?' : 'Execute action?', body: `${r.label} → ${r.target}. ${hi ? 'High-impact: sent to the Approval Queue.' : 'Safe simulated action.'}`, confirmText: hi ? 'Request approval' : 'Execute' }))) return
    try { const o = await api.execute(r.id); if (o.status === 'executed') setRes(o); else toast('Sent to Approval Queue'); reload() } catch (e) { toast(e.message, 'error') }
  }
  return <div className="page">
    <div className="row mb"><Link to="/incidents" className="mut">← Incidents</Link></div>
    <div className="grid g3 mb"><Card><div className="row"><span className="mono mut">{i.id}</span><Badge level={i.severity} /><StatusBadge status={i.status} /></div>
      <h1 style={{ margin: '8px 0 14px' }}>{i.title}</h1>
      <div className="kv"><div><div className="k">User</div>{i.username}</div><div><div className="k">Source IP</div><span className="mono">{i.ip}</span></div><div><div className="k">Assets</div>{i.asset}</div><div><div className="k">Created</div>{fmtDT(i.created_at)}</div><div><div className="k">Alerts</div>{d.alerts.length}</div></div></Card>
      <Card title="Risk score (deterministic)"><Gauge score={i.risk_score} level={i.risk_level} /></Card></div>
    <div className="grid g2 mb">
      <Card title="Attack Timeline">{d.events.length ? <EventTimeline events={d.events} /> : <Empty />}</Card>
      <div className="grid"><Card title="MITRE ATT&CK">{d.mitre.map((t) => <div key={t.id} style={{ marginBottom: 8 }}><a className="badge info" href={t.url} target="_blank" rel="noreferrer">{t.id}</a> <b>{t.name}</b><div className="mut" style={{ fontSize: 12 }}>{t.tactic}</div></div>)}</Card>
        <Card title="Risk Breakdown (why this score)">{d.risk.breakdown.map((b) => <div className="row" key={b.type}><b style={{ color: '#fca5a5', width: 34 }}>+{b.points}</b><span>{b.factor}</span><span className="sp" /><span className="mut mono">{b.event_ids.join(' ')}</span></div>)}
          <hr style={{ borderColor: '#22304a' }} /><b>Risk Score: {d.risk.score} {d.risk.level}</b></Card></div></div>
    <Card title="AI Investigation" className="mb" right={<button className="btn pri" onClick={investigate} disabled={busy}>{busy ? <Loader2 size={14} className="pulse" /> : <Bot size={14} />} {d.investigation ? 'Re-run investigation' : 'Start AI investigation'}</button>}>
      <InvestigationView inv={d.investigation} /></Card>
    <Card title="Response" className="mb" pad={false}>{d.responses.length ? <table><thead><tr><th>ID</th><th>Action</th><th>Target</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>
      {d.responses.map((r) => <tr key={r.id}><td className="mono">{r.id}</td><td>{r.label}</td><td className="mono">{r.target}</td><td><Badge kind={r.category === 'safe' ? 'ok' : 'high'}>{r.category === 'safe' ? 'SAFE AUTO' : 'NEEDS APPROVAL'}</Badge></td><td><StatusBadge status={r.status} /></td>
        <td>{['recommended'].includes(r.status) && <button className="btn" onClick={() => exec(r)}>{r.category === 'safe' ? 'Execute' : 'Request approval'}</button>}{r.status === 'pending_approval' && <Link to="/approvals" className="btn">Go to approvals</Link>}</td></tr>)}</tbody></table>
      : <Empty text="Run the AI investigation to generate recommended responses." />}</Card>
    <Card title="Audit" pad={false}>{d.audit.length ? <table><tbody>{d.audit.map((a) => <tr key={a.id}><td className="mono mut">{fmtTime(a.ts)}</td><td>{a.actor}</td><td><b>{a.action}</b></td><td><StatusBadge status={a.status} /></td><td className="mut">{a.details}</td></tr>)}</tbody></table> : <Empty />}</Card>
    <ResultModal data={res} onClose={() => setRes(null)} /></div>
}
