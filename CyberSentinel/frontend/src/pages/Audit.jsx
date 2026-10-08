import { useState } from 'react'
import { api } from '../services/api'
import { Card, Loading, ErrorBox, usePoll, StatusBadge, Empty, fmtDT } from '../components/ui.jsx'
export default function Audit() {
  const { data, error, reload } = usePoll(api.audit, 2500); const [q, setQ] = useState('')
  if (error && !data) return <div className="page"><ErrorBox error={error} retry={reload} /></div>
  if (!data) return <div className="page"><Loading /></div>
  const list = data.filter((a) => !q || JSON.stringify(a).toLowerCase().includes(q.toLowerCase()))
  return <div className="page"><h1>Audit Trail</h1><div className="sub">Complete record: detection → incident → AI → risk → approval → RPA → verification</div>
    <div className="row mb"><input placeholder="Search audit log…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="mut">{list.length} records</span></div>
    <Card pad={false}>{list.length ? <table><thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Target</th><th>Status</th><th>Details</th></tr></thead><tbody>
      {list.map((a) => <tr key={a.id}><td className="mono mut">{fmtDT(a.ts)}</td><td>{a.actor}</td><td><b>{a.action}</b></td><td className="mono">{a.target}</td><td><StatusBadge status={a.status} /></td><td className="mut">{a.details}</td></tr>)}</tbody></table> : <Empty text="No audit records yet" />}</Card></div>
}
