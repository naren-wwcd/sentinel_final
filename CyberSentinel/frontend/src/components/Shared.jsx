import { Link, useNavigate } from 'react-router-dom'
import { Badge, StatusBadge, Cited, fmtTime, Empty, Card } from './ui.jsx'

export function IncidentTable({ incidents }) {
  const nav = useNavigate()
  if (!incidents?.length) return <Empty text="No incidents yet. Launch the attack simulation to generate one." />
  return <table><thead><tr><th>ID</th><th>Title</th><th>User</th><th>Severity</th><th>Risk</th><th>Status</th><th>Time</th></tr></thead><tbody>
    {incidents.map((i) => <tr key={i.id} className="click" onClick={() => nav('/incidents/' + i.id)}>
      <td><Link to={`/incidents/${i.id}`} className="mono">{i.id}</Link></td><td>{i.title}</td><td>{i.username}</td><td><Badge level={i.severity} /></td>
      <td><b>{i.risk_score}</b></td><td><StatusBadge status={i.status} /></td><td className="mut">{fmtTime(i.created_at)}</td></tr>)}</tbody></table>
}

export function EventRows({ events }) {
  if (!events?.length) return <Empty text="No events" />
  const col = (t) => ({ login_failed: 'med', privilege_escalation: 'high', large_download: 'high', suspicious_command: 'high' }[t] || 'neutral')
  return <>{events.map((e) => <div className="ev" key={e.id}><span className="mono mut" style={{ width: 54 }}>{e.id}</span><span className="mut mono">{fmtTime(e.ts)}</span>
    <b style={{ width: 52 }}>{e.username}</b><Badge kind={col(e.event_type)}>{e.event_type}</Badge><span className="mut">{e.country} · {e.ip} · {e.asset}</span>
    {e.details?.size_mb && <span className="badge high">{e.details.size_mb} MB</span>}</div>)}</>
}

export function EventTimeline({ events }) {
  const label = { login_failed: 'Failed login', login_success: 'Successful login', privilege_escalation: 'Privilege escalation', large_download: 'Large download', suspicious_command: 'Suspicious command' }
  const cls = { login_failed: 'med', login_success: 'high', privilege_escalation: 'crit', large_download: 'crit', suspicious_command: 'high' }
  return <div className="tl">{events.map((e) => <div key={e.id} className={`it ${cls[e.event_type] || ''}`}>
    <div className="row"><span className="cite">{e.id}</span><b>{label[e.event_type] || e.event_type}</b>{e.event_type === 'login_success' && e.country !== 'India' && <Badge level="MEDIUM">Country change: {e.country}</Badge>}<span className="mut mono">{fmtTime(e.ts)}</span></div>
    <div className="mut">{e.username} · {e.ip} · {e.country} · {e.asset}{e.details?.size_mb ? ` · ${e.details.size_mb} MB` : ''}</div></div>)}</div>
}

export function InvestigationView({ inv }) {
  if (!inv?.result) return <Empty text="No investigation yet. Start an AI investigation." />
  const r = inv.result, v = r.validation || {}
  return <div className="grid">
    <div className="row"><Badge kind="info">AI Provider: {inv.provider}</Badge><Badge kind={v.status === 'PASSED' ? 'ok' : 'high'}>Citation check: {v.status}</Badge><span className="mut">{(inv.tool_calls || []).length} tool calls</span></div>
    <div className="kv"><div><div className="k">Verdict</div><b style={{ fontSize: 15 }}>{r.verdict}</b></div><div><div className="k">Confidence</div><b>{r.confidence}%</b><div className="bar"><i style={{ width: r.confidence + '%' }} /></div></div></div>
    <div><div className="k mut">ATTACK SUMMARY</div><Cited text={r.attack_summary} /></div>
    <div><div className="k mut">REASONING (EVIDENCE-GROUNDED)</div><Cited text={r.reasoning} /></div>
    <div><div className="k mut">RECOMMENDED RESPONSE</div>{r.recommended_action}</div>
    <div><div className="k mut">EVIDENCE</div>{r.evidence.map((e) => <div key={e.event_id}><span className="cite">{e.event_id}</span> {e.note}</div>)}</div>
    <div><div className="k mut">AI TIMELINE</div><div className="tl">{r.timeline.map((t) => <div className="it" key={t.event_id}><span className="cite">{t.event_id}</span> {t.label} <span className="mut mono">{fmtTime(t.ts)}</span></div>)}</div></div>
    <div><div className="k mut">TOOLS USED BY AGENT</div>{(inv.tool_calls || []).map((c, i) => <details key={i} style={{ marginBottom: 4 }}><summary className="mono">{c.tool}({Object.entries(c.args).map(([k, x]) => `${k}=${x}`).join(', ')})</summary>
      <pre className="mono mut" style={{ whiteSpace: 'pre-wrap', margin: '6px 0' }}>{JSON.stringify(c.result, null, 1).slice(0, 900)}</pre></details>)}
      <div className="mut" style={{ fontSize: 12 }}>Threat intelligence shown is SIMULATED demo data.</div></div>
    {v.invalid_citations_removed?.length > 0 && <div className="err">Removed invalid citations: {v.invalid_citations_removed.join(', ')}</div>}
  </div>
}
