import { Link, useNavigate } from 'react-router-dom'
import { CaretRight, ArrowRight, SignIn, XCircle, ArrowFatLinesUp, DownloadSimple, Terminal, File, Circle, ShieldWarning, Detective } from '@phosphor-icons/react'
import { Severity, Status, Cited, Time, Empty, RiskMeter, Badge, EVENT_LABEL, EVENT_TONE, humanize, plural } from './ui.jsx'

const EVENT_ICON = { login_failed: XCircle, login_success: SignIn, file_access: File, privilege_escalation: ArrowFatLinesUp, large_download: DownloadSimple, suspicious_command: Terminal }
export const eventLabel = (t) => EVENT_LABEL[t] || humanize(t)

export function IncidentTable({ incidents, emptyAction }) {
  const nav = useNavigate()
  if (!incidents?.length) return <Empty icon={ShieldWarning} title="No incidents" action={emptyAction}>Correlated alerts appear here as incidents. Run the attack simulation from Overview to generate one.</Empty>
  return <div className="table-wrap"><table>
    <thead><tr><th>Incident</th><th>Severity</th><th>Risk</th><th>Status</th><th>Opened</th></tr></thead>
    <tbody>{incidents.map((i) => <tr key={i.id} className="clickable" onClick={() => nav('/incidents/' + i.id)}>
      <td><Link to={`/incidents/${i.id}`} className="primary-cell" onClick={(e) => e.stopPropagation()}>{i.title}</Link>
        <div className="sub-cell"><span className="mono">{i.id}</span> · {i.username} · <span className="mono">{i.ip}</span></div></td>
      <td><Severity level={i.severity} /></td>
      <td className="nowrap"><b style={{ display: 'inline-block', width: 30 }}>{i.risk_score}</b><RiskMeter small score={i.risk_score} level={i.risk_level} /></td>
      <td><Status status={i.status} /></td>
      <td className="muted nowrap"><Time ts={i.created_at} /></td>
    </tr>)}</tbody></table></div>
}

export function EventFeed({ events }) {
  if (!events?.length) return <Empty compact title="No events">Telemetry will stream in here.</Empty>
  return <ul className="feed">{events.map((e) => <li key={e.id}>
    <time dateTime={e.ts} className="mono">{new Date(e.ts).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</time>
    <span className="what"><span className={`dot ${EVENT_TONE[e.event_type] || ''}`} />{eventLabel(e.event_type)}</span>
    <span className="meta">{e.username} · {e.asset} · {e.country}</span>
  </li>)}</ul>
}

export function EventTimeline({ events }) {
  if (!events?.length) return <Empty compact title="No evidence events" />
  return <ol className="timeline">{events.map((e) => {
    const Icon = EVENT_ICON[e.event_type] || Circle
    const foreign = e.event_type === 'login_success' && e.country !== 'India'
    return <li key={e.id}>
      <span className={`node ${foreign ? 'high' : EVENT_TONE[e.event_type] || ''}`}><Icon size={16} weight="fill" /></span>
      <div><div className="t">{eventLabel(e.event_type)}<span className="cite">{e.id}</span>{foreign && <Badge tone="high">New country: {e.country}</Badge>}{e.details?.size_mb && <Badge>{e.details.size_mb} MB</Badge>}</div>
        <div className="d">{e.username} on {e.asset} · <span className="mono">{e.ip}</span> · {e.country}{e.details?.change ? ` · ${e.details.change}` : ''}</div></div>
      <time dateTime={e.ts} className="mono">{new Date(e.ts).toLocaleTimeString([], { hour12: false })}</time>
    </li>
  })}</ol>
}

export function InvestigationView({ inv, action }) {
  if (!inv?.result) return <Empty icon={Detective} title="Not investigated yet" action={action}>The agent gathers evidence with its tools, cites the events it relies on, and every citation is checked against the event store.</Empty>
  const r = inv.result, v = r.validation || {}, calls = inv.tool_calls || []
  const recs = String(r.recommended_action || '').split(';').map((s) => s.trim()).filter(Boolean)
  return <div>
    <div className="verdict">
      <div><div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>Verdict</div><h3><Cited text={r.verdict} /></h3>
        <div className="row" style={{ marginTop: 12 }}><Badge>{inv.provider}</Badge><Badge tone={v.status === 'PASSED' ? 'ok' : 'med'}>Citations {String(v.status || 'unknown').toLowerCase()}</Badge><span className="muted" style={{ fontSize: 12.5 }}>{plural(calls.length, 'tool call')} · <Time ts={inv.created_at} /></span></div></div>
      <div className="conf"><div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>Confidence</div><b>{r.confidence}%</b>
        <div className="meter" style={{ marginTop: 8 }} role="img" aria-label={`Confidence ${r.confidence}%`}><i style={{ width: `${r.confidence}%` }} /></div></div>
    </div>
    {v.invalid_citations_removed?.length > 0 && <div className="alert note" style={{ marginTop: 16 }}>Removed {plural(v.invalid_citations_removed.length, 'citation')} that didn’t match a stored event: {v.invalid_citations_removed.join(', ')}</div>}
    <div className="section" style={{ marginTop: 20, paddingTop: 0, borderTop: 0 }}><div className="section-title">Attack summary</div><p className="prose"><Cited text={r.attack_summary} /></p></div>
    <div className="section"><div className="section-title">Reasoning</div><p className="prose"><Cited text={r.reasoning} /></p></div>
    {recs.length > 0 && <div className="section"><div className="section-title">Recommended response</div><ul className="checklist">{recs.map((x, i) => <li key={i}><ArrowRight /><span>{x}</span></li>)}</ul></div>}
    {r.evidence?.length > 0 && <div className="section"><div className="section-title">Evidence <span className="muted" style={{ fontWeight: 500 }}>· {r.evidence.length}</span></div>
      <ul>{r.evidence.map((e) => <li key={e.event_id} className="row" style={{ padding: '5px 0', flexWrap: 'nowrap', alignItems: 'baseline' }}><span className="cite">{e.event_id}</span><span className="dim">{e.note}</span></li>)}</ul></div>}
    {calls.length > 0 && <div className="section"><div className="section-title">Tool calls <span className="muted" style={{ fontWeight: 500 }}>· threat intelligence is simulated demo data</span></div>
      {calls.map((c, i) => <details className="tool" key={i}><summary><CaretRight className="caret" size={12} /><span className="mono"><b>{c.tool}</b>({Object.entries(c.args).map(([k, x]) => `${k}=${x}`).join(', ')})</span></summary>
        <pre className="code">{JSON.stringify(c.result, null, 2).slice(0, 1400)}</pre></details>)}</div>}
  </div>
}
