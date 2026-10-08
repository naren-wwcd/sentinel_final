import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { Card, Loading, ErrorBox, usePoll, Badge, fmtTime, Empty } from '../components/ui.jsx'
import { EventRows } from '../components/Shared.jsx'
export default function LiveEvents() {
  const ev = usePoll(() => api.events(200), 1500); const al = usePoll(api.alerts, 1500); const [q, setQ] = useState('')
  if (ev.error && !ev.data) return <div className="page"><ErrorBox error={ev.error} retry={ev.reload} /></div>
  if (!ev.data) return <div className="page"><Loading /></div>
  const list = ev.data.filter((e) => !q || JSON.stringify(e).toLowerCase().includes(q.toLowerCase()))
  return <div className="page"><h1>Live Events</h1><div className="sub">Streaming security telemetry and generated alerts (auto-refresh)</div>
    <div className="grid g3"><Card title={`Events (${list.length})`} right={<input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />}><div className="feed" style={{ maxHeight: 640 }}><EventRows events={list} /></div></Card>
      <Card title={`Alerts (${al.data?.length || 0})`}><div className="feed" style={{ maxHeight: 640 }}>{al.data?.length ? al.data.map((a) => <div className="ev" key={a.id} style={{ display: 'block' }}>
        <div className="row"><span className="mono mut">{a.id}</span><Badge level={a.severity} /><span className="mut mono">{fmtTime(a.ts)}</span>{a.incident_id && <Link to={`/incidents/${a.incident_id}`} className="badge info">{a.incident_id}</Link>}</div>
        <div><b>{a.type.replace(/_/g, ' ')}</b> <span className="mut">· {a.event_id}</span></div><div className="mut" style={{ fontSize: 12 }}>{a.description}</div></div>) : <Empty text="No alerts" />}</div></Card></div></div>
}
