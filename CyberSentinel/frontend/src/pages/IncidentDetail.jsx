import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { Detective, ArrowSquareOut, Lightning } from '@phosphor-icons/react'
import { api } from '../services/api'
import { Panel, Async, usePoll, useUI, usePageTitle, useParamState, Severity, Status, Badge, RiskMeter, Tabs, Time, Empty, Button, RunDrawer, fmtDT, humanize } from '../components/ui.jsx'
import { EventTimeline, InvestigationView } from '../components/Shared.jsx'

export function ResponseRows({ rows, onExec, onView, showIncident }) {
  return <div className="table-wrap"><table>
    <thead><tr><th>Action</th>{showIncident && <th>Incident</th>}<th>Type</th><th>Status</th><th>Verification</th><th><span className="sr-only">Actions</span></th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.id}>
      <td><div className="primary-cell">{r.label}</div><div className="sub-cell"><span className="mono">{r.id}</span> · target <span className="mono">{r.target}</span></div></td>
      {showIncident && <td><Link className="link mono" to={`/incidents/${r.incident_id}`}>{r.incident_id}</Link></td>}
      <td><Badge tone={r.category === 'safe' ? '' : 'outline'}>{r.category === 'safe' ? 'Automatic' : 'Needs approval'}</Badge></td>
      <td><Status status={r.status} /></td>
      <td>{r.verification ? <Status status={r.verification.status} label={r.verification.actual} /> : <span className="muted">—</span>}</td>
      <td className="actions">
        {r.status === 'recommended' && <Button size="sm" onClick={() => onExec(r)}>{r.category === 'safe' ? 'Execute' : 'Request approval'}</Button>}
        {r.status === 'pending_approval' && <Link to="/approvals" className="btn sm">Review</Link>}
        {r.rpa_steps?.length > 0 && <Button size="sm" variant="ghost" onClick={() => onView(r)}>View run</Button>}
      </td></tr>)}</tbody></table></div>
}

// Shared execute flow: safe actions run immediately, high-impact ones go to the approval queue.
export function useExecute(reload) {
  const { toast, confirm } = useUI(); const [run, setRun] = useState(null)
  const exec = async (r) => {
    const hi = r.category === 'high_impact'
    if (!(await confirm({ title: hi ? `Request approval to ${r.label.toLowerCase()}?` : `${r.label}?`, body: hi ? `This is a high-impact action on ${r.target}. It will wait in the approval queue until someone signs off.` : `Runs the simulated automation against ${r.target} and verifies the result.`, confirmText: hi ? 'Request approval' : 'Execute' }))) return
    try { const o = await api.execute(r.id); if (o.status === 'executed') setRun({ response: o.response, animate: true }); else toast('Sent to the approval queue'); reload() } catch (e) { toast(e.message, 'error') }
  }
  return { exec, run, setRun }
}

function Detail({ d, id, reload }) {
  const { toast } = useUI()
  const [tab, setTab] = useParamState('tab', 'timeline'); const [busy, setBusy] = useState(false)
  const { exec, run, setRun } = useExecute(reload)
  const i = d.incident
  usePageTitle(`${i.id} ${i.title}`)
  const investigate = async () => { setBusy(true); try { await api.investigate(id); toast('Investigation complete'); setTab('investigation'); reload() } catch (e) { toast(e.message, 'error') } setBusy(false) }
  const runBtn = <Button variant={d.investigation ? 'secondary' : 'primary'} icon={Detective} loading={busy} onClick={investigate}>{busy ? 'Investigating…' : d.investigation ? 'Re-run investigation' : 'Investigate'}</Button>
  const open = d.responses.filter((r) => ['recommended', 'pending_approval'].includes(r.status)).length

  return <div className="page">
    <header className="page-head">
      <div><div className="row" style={{ marginBottom: 8 }}><span className="mono muted">{i.id}</span><Severity level={i.severity} /><Status status={i.status} /></div><h1>{i.title}</h1></div>
      <div className="actions">{runBtn}</div>
    </header>

    <div className="split rail">
      <div>
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'timeline', label: 'Timeline' }, { value: 'investigation', label: 'Investigation' }, { value: 'response', label: 'Response', count: open }, { value: 'activity', label: 'Activity' }]} />
        {tab === 'timeline' && <Panel title="Attack timeline" hint={`${d.events.length} evidence events`}><EventTimeline events={d.events} /></Panel>}
        {tab === 'investigation' && <Panel><InvestigationView inv={d.investigation} action={runBtn} /></Panel>}
        {tab === 'response' && <Panel flush>{d.responses.length ? <ResponseRows rows={d.responses} onExec={exec} onView={(r) => setRun({ response: r })} />
          : <Empty icon={Lightning} title="No response plan yet" action={runBtn}>Run the investigation to generate recommended actions.</Empty>}</Panel>}
        {tab === 'activity' && <Panel flush>{d.audit.length ? <div className="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Status</th><th>Details</th></tr></thead>
          <tbody>{d.audit.map((a) => <tr key={a.id}><td className="mono muted nowrap"><Time ts={a.ts} mode="time" /></td><td className="nowrap">{a.actor}</td><td className="nowrap"><b>{a.action}</b></td><td><Status status={a.status} /></td><td className="wrap">{a.details}</td></tr>)}</tbody></table></div>
          : <Empty title="No activity recorded" />}</Panel>}
      </div>

      <aside className="stack sticky-rail">
        <Panel title="Risk score" hint="Deterministic, no LLM">
          <div className="risk-score"><b>{d.risk.score}</b><span>/ 100 · {humanize(String(d.risk.level).toLowerCase())}</span></div>
          <RiskMeter score={d.risk.score} level={d.risk.level} />
          <ul className="factors" style={{ marginTop: 16 }}>{d.risk.breakdown.map((b) => <li key={b.type}><span className="pts">+{b.points}</span><span>{b.factor}</span><span className="ev mono">{b.event_ids.join(' ')}</span></li>)}</ul>
        </Panel>
        <Panel title="Details"><dl className="dl">
          <dt>User</dt><dd>{i.username}</dd><dt>Source IP</dt><dd className="mono">{i.ip}</dd><dt>Assets</dt><dd>{i.asset}</dd>
          <dt>Alerts</dt><dd>{d.alerts.length}</dd><dt>Opened</dt><dd>{fmtDT(i.created_at)}</dd><dt>Updated</dt><dd><Time ts={i.updated_at} /></dd></dl></Panel>
        <Panel title="MITRE ATT&CK"><ul>{d.mitre.map((t) => <li key={t.id} style={{ padding: '6px 0' }}>
          <a href={t.url} target="_blank" rel="noreferrer" className="row tight" style={{ fontWeight: 600 }}><span className="cite">{t.id}</span>{t.name}<ArrowSquareOut size={13} className="muted" /></a>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{t.tactic}</div></li>)}</ul></Panel>
      </aside>
    </div>
    <RunDrawer run={run} onClose={() => setRun(null)} />
  </div>
}

export default function IncidentDetail() {
  const { id } = useParams()
  const state = usePoll(() => api.incident(id), 2500, [id])
  return <Async state={state}>{(d) => <Detail d={d} id={id} reload={state.reload} />}</Async>
}
