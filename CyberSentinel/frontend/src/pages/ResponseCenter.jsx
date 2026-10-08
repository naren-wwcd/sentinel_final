import { Lightning } from '@phosphor-icons/react'
import { api } from '../services/api'
import { Panel, PageHeader, Async, usePoll, usePageTitle, useParamState, Segmented, Empty, RunDrawer } from '../components/ui.jsx'
import { ResponseRows, useExecute } from './IncidentDetail.jsx'

function Center({ data, reload }) {
  const [cat, setCat] = useParamState('type', 'all')
  const { exec, run, setRun } = useExecute(reload)
  const n = (f) => data.filter(f).length
  const list = data.filter((r) => cat === 'all' || r.category === cat)
  const summary = [['Executed', n((r) => r.status === 'executed')], ['Awaiting approval', n((r) => r.status === 'pending_approval')], ['Recommended', n((r) => r.status === 'recommended')], ['Rejected or failed', n((r) => ['rejected', 'failed'].includes(r.status))]]
  return <div className="page">
    <PageHeader title="Response" description="Low-impact containment runs automatically. Anything that could disrupt a person or a host waits for human approval. Every run is verified afterwards." />
    <div className="stack">
      <dl className="metrics four">{summary.map(([l, v]) => <div className="metric" key={l}><dt>{l}</dt><dd>{v}</dd></div>)}</dl>
      <div>
        <div className="toolbar"><Segmented label="Action type" value={cat} onChange={setCat} options={[{ value: 'all', label: 'All', count: data.length }, { value: 'safe', label: 'Automatic', count: n((r) => r.category === 'safe') }, { value: 'high_impact', label: 'Needs approval', count: n((r) => r.category === 'high_impact') }]} /></div>
        <Panel flush>{list.length ? <ResponseRows rows={list} showIncident onExec={exec} onView={(r) => setRun({ response: r })} />
          : <Empty icon={Lightning} title="No response actions">Actions are recommended after an incident has been investigated.</Empty>}</Panel>
      </div>
    </div>
    <RunDrawer run={run} onClose={() => setRun(null)} />
  </div>
}

export default function ResponseCenter() {
  usePageTitle('Response')
  const state = usePoll(api.responses, 2500)
  return <Async state={state}>{(data) => <Center data={data} reload={state.reload} />}</Async>
}
