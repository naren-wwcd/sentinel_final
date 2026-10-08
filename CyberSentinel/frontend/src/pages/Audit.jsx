import { DownloadSimple, ClockCounterClockwise } from '@phosphor-icons/react'
import { api } from '../services/api'
import { Panel, PageHeader, Async, usePoll, usePageTitle, useParamState, Search, Select, Status, Empty, Time, Button, humanize } from '../components/ui.jsx'

const COLS = ['ts', 'actor', 'action', 'target', 'status', 'details']
function exportCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [COLS.join(','), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(','))].join('\r\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `cybersentinel-audit-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
}

function Trail({ data }) {
  const [q, setQ] = useParamState('q'); const [actor, setActor] = useParamState('actor', 'ALL'); const [status, setStatus] = useParamState('status', 'ALL')
  const needle = q.toLowerCase()
  const list = data.filter((a) => (actor === 'ALL' || a.actor === actor) && (status === 'ALL' || a.status === status) && (!needle || COLS.some((c) => String(a[c] ?? '').toLowerCase().includes(needle))))
  const uniq = (k) => [...new Set(data.map((a) => a[k]))].sort()
  return <div className="page">
    <PageHeader title="Audit trail" description="An append-only record of every detection, tool call, decision, automation run and verification.">
      <Button icon={DownloadSimple} onClick={() => exportCsv(list)} disabled={!list.length}>Export CSV</Button>
    </PageHeader>
    <div className="toolbar">
      <Search value={q} onChange={setQ} placeholder="Search actions, targets, details…" label="Search audit trail" />
      <Select label="Actor" value={actor} onChange={setActor} options={[['ALL', 'All actors'], ...uniq('actor')]} />
      <Select label="Status" value={status} onChange={setStatus} options={[['ALL', 'Any status'], ...uniq('status').map((s) => [s, humanize(s.toLowerCase())])]} />
      <span className="end count">{list.length} of {data.length} records</span>
    </div>
    <Panel flush>{list.length ? <div className="table-wrap"><table>
      <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>{list.map((a) => <tr key={a.id}><td className="mono muted nowrap"><Time ts={a.ts} mode="full" /></td><td className="nowrap">{a.actor}</td><td className="nowrap"><b>{a.action}</b></td><td className="mono nowrap">{a.target || '—'}</td><td><Status status={a.status} /></td><td className="wrap">{a.details}</td></tr>)}</tbody></table></div>
      : data.length ? <Empty title="No records match" action={<Button onClick={() => { setQ(''); setActor('ALL'); setStatus('ALL') }}>Clear filters</Button>} />
        : <Empty icon={ClockCounterClockwise} title="No audit records yet">Activity is logged here as soon as something happens.</Empty>}</Panel>
  </div>
}

export default function Audit() {
  usePageTitle('Audit trail')
  const state = usePoll(api.audit, 2500)
  return <Async state={state}>{(data) => <Trail data={data} />}</Async>
}
