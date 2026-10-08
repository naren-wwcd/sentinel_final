import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { Card, Loading, ErrorBox, usePoll, useUI, Badge, StatusBadge, Empty, fmtTime, ResultModal } from '../components/ui.jsx'
export default function ResponseCenter() {
  const { data, error, reload } = usePoll(api.responses, 2500); const { toast, confirm } = useUI(); const [res, setRes] = useState(null)
  if (error && !data) return <div className="page"><ErrorBox error={error} retry={reload} /></div>
  if (!data) return <div className="page"><Loading /></div>
  const exec = async (r) => {
    if (!(await confirm({ title: 'Execute response?', body: `${r.label} → ${r.target}`, confirmText: r.category === 'safe' ? 'Execute' : 'Request approval' }))) return
    try { const o = await api.execute(r.id); if (o.status === 'executed') setRes(o); else toast('Sent to Approval Queue'); reload() } catch (e) { toast(e.message, 'error') }
  }
  const T = ({ title, rows }) => <Card title={title} className="mb" pad={false}>{rows.length ? <table><thead><tr><th>ID</th><th>Incident</th><th>Action</th><th>Target</th><th>Status</th><th>Verification</th><th></th></tr></thead><tbody>
    {rows.map((r) => <tr key={r.id}><td className="mono">{r.id}</td><td><Link to={`/incidents/${r.incident_id}`}>{r.incident_id}</Link></td><td>{r.label}</td><td className="mono">{r.target}</td><td><StatusBadge status={r.status} /></td>
      <td>{r.verification ? <StatusBadge status={r.verification.status} /> : <span className="mut">—</span>}</td>
      <td>{r.status === 'recommended' && <button className="btn" onClick={() => exec(r)}>{r.category === 'safe' ? 'Execute' : 'Request approval'}</button>}{r.rpa_steps?.length > 0 && <button className="btn" onClick={() => setRes({ response: r })}>View RPA run</button>}</td></tr>)}</tbody></table> : <Empty />}</Card>
  return <div className="page"><h1>Response Center</h1><div className="sub">Safe actions run automatically · high-impact actions require human approval · every action is simulated and verified</div>
    <T title="Safe automatic actions" rows={data.filter((r) => r.category === 'safe')} /><T title="High-impact actions (human approval required)" rows={data.filter((r) => r.category === 'high_impact')} />
    <ResultModal data={res} onClose={() => setRes(null)} /></div>
}
