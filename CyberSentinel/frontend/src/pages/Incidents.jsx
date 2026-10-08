import { api } from '../services/api'
import { Panel, PageHeader, Async, usePoll, usePageTitle, useParamState, Search, Segmented, Select, Empty, Button } from '../components/ui.jsx'
import { IncidentTable } from '../components/Shared.jsx'

const LEVELS = [['CRITICAL', 'Critical'], ['HIGH', 'High'], ['MEDIUM', 'Medium'], ['LOW', 'Low']]

function List({ data }) {
  const [q, setQ] = useParamState('q'); const [sev, setSev] = useParamState('severity', 'ALL'); const [status, setStatus] = useParamState('status', 'ALL')
  const needle = q.toLowerCase()
  const matchQ = (i) => !needle || [i.id, i.title, i.username, i.ip, i.asset].some((x) => String(x).toLowerCase().includes(needle))
  const base = data.filter((i) => matchQ(i) && (status === 'ALL' || i.status === status))
  const list = base.filter((i) => sev === 'ALL' || i.severity === sev)
  const statuses = [...new Set(data.map((i) => i.status))]
  const filtered = q || sev !== 'ALL' || status !== 'ALL'
  return <div className="page">
    <PageHeader title="Incidents" description="Related alerts are correlated into a single incident per attack chain, scored by a deterministic risk engine." />
    <div className="toolbar">
      <Search value={q} onChange={setQ} placeholder="Search by ID, user, IP or asset…" label="Search incidents" />
      <Segmented label="Severity" value={sev} onChange={setSev} options={[{ value: 'ALL', label: 'All', count: base.length }, ...LEVELS.map(([v, l]) => ({ value: v, label: l, count: base.filter((i) => i.severity === v).length }))]} />
      <Select label="Status" value={status} onChange={setStatus} options={[['ALL', 'Any status'], ...statuses]} />
    </div>
    <Panel flush>{data.length && !list.length
      ? <Empty title="No incidents match these filters" action={filtered && <Button onClick={() => { setQ(''); setSev('ALL'); setStatus('ALL') }}>Clear filters</Button>} />
      : <IncidentTable incidents={list} />}</Panel>
  </div>
}

export default function Incidents() {
  usePageTitle('Incidents')
  const state = usePoll(api.incidents, 3000)
  return <Async state={state}>{(data) => <List data={data} />}</Async>
}
