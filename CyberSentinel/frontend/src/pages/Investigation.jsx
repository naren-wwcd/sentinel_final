import { useState } from 'react'
import { useParams, NavLink, Link } from 'react-router-dom'
import { Detective, ArrowRight } from '@phosphor-icons/react'
import { api } from '../services/api'
import { Panel, PageHeader, Async, usePoll, useUI, usePageTitle, Empty, Button, Severity, Status } from '../components/ui.jsx'
import { InvestigationView } from '../components/Shared.jsx'

function Workbench({ incidents }) {
  const { id } = useParams(); const { toast } = useUI()
  const sel = id || incidents[0]?.id
  const current = incidents.find((i) => i.id === sel)
  const inv = usePoll(() => (current ? api.investigation(sel) : Promise.resolve(null)), 3000, [sel, !!current]); const [busy, setBusy] = useState(false)
  const run = async () => { setBusy(true); try { await api.investigate(sel); toast('Investigation complete'); inv.reload() } catch (e) { toast(e.message, 'error') } setBusy(false) }
  const done = !!inv.data?.result
  const runBtn = <Button variant={done ? 'secondary' : 'primary'} icon={Detective} loading={busy} onClick={run}>{busy ? 'Investigating…' : done ? 'Re-run investigation' : 'Investigate'}</Button>
  return <div className="page">
    <PageHeader title="Investigation" description="A tool-using agent gathers evidence and explains what happened. Every event it cites is validated against the event store before the result is saved." />
    {!incidents.length ? <Panel><Empty icon={Detective} title="Nothing to investigate" action={<Link to="/" className="btn primary">Go to overview<ArrowRight /></Link>}>Incidents appear once alerts are correlated. Run the attack simulation to create one.</Empty></Panel>
      : <div className="split master">
        <Panel flush title="Incidents" hint={`${incidents.length}`}><ul className="master-list">{incidents.map((i) => <li key={i.id}>
          <NavLink to={`/investigation/${i.id}`} className={() => (i.id === sel ? 'active' : '')}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="mono muted" style={{ fontSize: 12 }}>{i.id}</span><Severity level={i.severity} /></div>
            <div className="t">{i.title}</div><Status status={i.status} /></NavLink></li>)}</ul></Panel>
        <Panel title={current ? current.title : sel} end={<>{current && <Link to={`/incidents/${sel}`} className="btn ghost sm">Open incident<ArrowRight /></Link>}{done && runBtn}</>}>
          {!current ? <Empty title="Incident not found">No incident with ID {sel}.</Empty> : <InvestigationView inv={inv.data} action={runBtn} />}
        </Panel>
      </div>}
  </div>
}

export default function Investigation() {
  usePageTitle('Investigation')
  const state = usePoll(api.incidents, 3000)
  return <Async state={state}>{(incidents) => <Workbench incidents={incidents} />}</Async>
}
