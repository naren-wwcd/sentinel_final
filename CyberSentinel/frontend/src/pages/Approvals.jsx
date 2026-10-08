import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, SealCheck } from '@phosphor-icons/react'
import { api } from '../services/api'
import { Panel, PageHeader, Async, usePoll, useUI, usePageTitle, useParamState, Severity, Status, Tabs, Empty, Time, Button, RunDrawer } from '../components/ui.jsx'

// The API reason restates the action; keep only the risk factors that justify it.
const why = (a) => { const f = String(a.reason || '').split(': ').slice(1).join(': ').replace(/\.$/, ''); return f ? `Recommended because of: ${f.toLowerCase()}.` : a.reason }

function Queue({ data, reload }) {
  const { toast, confirm } = useUI(); const [run, setRun] = useState(null); const [busy, setBusy] = useState(null)
  const [tab, setTab] = useParamState('tab', 'pending')
  const pend = data.filter((a) => a.status === 'pending'), hist = data.filter((a) => a.status !== 'pending')
  const approve = async (a) => {
    if (!(await confirm({ title: `Approve: ${a.label.toLowerCase()}?`, body: `The simulated automation will run against ${a.target} immediately and the result will be verified.`, confirmText: 'Approve and run' }))) return
    setBusy(a.id)
    try { const o = await api.approve(a.id); setRun({ response: o.response, animate: true }); reload() } catch (e) { toast(e.message, 'error') }
    setBusy(null)
  }
  const reject = async (a) => {
    const r = await confirm({ title: `Reject: ${a.label.toLowerCase()}?`, body: `Nothing will be done to ${a.target}. The decision is recorded in the audit trail.`, confirmText: 'Reject', danger: true, input: { label: 'Reason (optional)', placeholder: 'e.g. User confirmed the activity was legitimate…' } })
    if (!r) return
    try { await api.reject(a.id, r.note || 'Rejected by analyst'); toast('Rejected and logged'); reload() } catch (e) { toast(e.message, 'error') }
  }
  return <div className="page">
    <PageHeader title="Approvals" description="High-impact actions never run on their own. Each one waits here for a person to approve or reject it." />
    <Tabs value={tab} onChange={setTab} tabs={[{ value: 'pending', label: 'Pending', count: pend.length }, { value: 'history', label: 'History' }]} />
    {tab === 'pending' && <Panel flush>{pend.length ? <ul className="item-list">{pend.map((a) => <li key={a.id} className="approval">
      <div><h3>{a.label} <span className="muted" style={{ fontWeight: 500 }}>on</span> <span className="mono">{a.target}</span></h3>
        <p className="why">{why(a)}</p>
        <div className="meta row"><Severity level={a.risk_level} /><span>Risk {a.risk_score}</span><span>·</span><Link className="link mono" to={`/incidents/${a.incident_id}`}>{a.incident_id}</Link><span>·</span><span className="mono">{a.id}</span><span>·</span><span>Requested <Time ts={a.requested_at} /></span></div></div>
      <div className="row"><Button onClick={() => reject(a)} disabled={busy === a.id}>Reject</Button><Button variant="primary" icon={Check} loading={busy === a.id} onClick={() => approve(a)}>Approve</Button></div>
    </li>)}</ul> : <Empty icon={SealCheck} title="You’re all caught up">No actions are waiting for approval.</Empty>}</Panel>}
    {tab === 'history' && <Panel flush>{hist.length ? <div className="table-wrap"><table>
      <thead><tr><th>Action</th><th>Incident</th><th>Decision</th><th>Decided by</th><th>Note</th><th>When</th></tr></thead>
      <tbody>{hist.map((a) => <tr key={a.id}><td><div className="primary-cell">{a.label}</div><div className="sub-cell"><span className="mono">{a.id}</span> · target <span className="mono">{a.target}</span></div></td>
        <td><Link className="link mono" to={`/incidents/${a.incident_id}`}>{a.incident_id}</Link></td><td><Status status={a.status} /></td><td>{a.decided_by}</td><td className="dim">{a.note || <span className="muted">—</span>}</td><td className="muted nowrap"><Time ts={a.decided_at} /></td></tr>)}</tbody></table></div>
      : <Empty title="No decisions yet">Approved and rejected actions are listed here.</Empty>}</Panel>}
    <RunDrawer run={run} onClose={() => setRun(null)} />
  </div>
}

export default function Approvals() {
  usePageTitle('Approvals')
  const state = usePoll(api.approvals, 2000)
  return <Async state={state}>{(data) => <Queue data={data} reload={state.reload} />}</Async>
}
