import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts'
import { Play, CheckCircle, Circle, CircleNotch, ArrowRight, ChartBar } from '@phosphor-icons/react'
import { api } from '../services/api'
import { Panel, PageHeader, Async, usePoll, useUI, usePageTitle, Empty, Button, plural, humanize } from '../components/ui.jsx'
import { IncidentTable, EventFeed } from '../components/Shared.jsx'

const SEV_ORDER = [['CRITICAL', 'crit'], ['HIGH', 'high'], ['MEDIUM', 'med'], ['LOW', 'ok']]

function posture(c) {
  if (c.critical_incidents) return [`${plural(c.critical_incidents, 'critical incident')} ${c.critical_incidents === 1 ? 'needs' : 'need'} attention`, c.pending_approvals ? `An attack chain was detected and correlated into an incident. ${plural(c.pending_approvals, 'high-impact action')} ${c.pending_approvals === 1 ? 'is' : 'are'} waiting for your approval.` : 'An attack chain was detected and correlated into an incident. Open it to review the evidence and response.']
  if (c.active_incidents) return [`${plural(c.active_incidents, 'active incident')} under investigation`, 'No critical risk right now. Review open incidents to keep the queue moving.']
  return ['No active incidents', 'Telemetry looks like baseline activity. Run the attack simulation to see detection, investigation and response end to end.']
}

const ChartTip = ({ active, payload, label, unit }) => active && payload?.length ? <div className="tip"><span className="muted">{label}</span><b>{payload[0].value} {unit}</b>{payload[0].payload.label && <span className="muted">{humanize(payload[0].payload.label)}</span>}</div> : null

function Simulation({ sim }) {
  const done = sim.steps.filter((s) => s.status === 'done').length
  return <Panel flush title="Attack simulation" hint={sim.state === 'running' ? sim.message : sim.state === 'error' ? `Failed: ${sim.message}` : 'Completed'}
    end={<>{sim.incident_id && <Link className="btn sm" to={`/incidents/${sim.incident_id}`}>Open {sim.incident_id}<ArrowRight /></Link>}<span className="count">{done} of {sim.steps.length}</span></>}>
    <div className="sim-progress" role="progressbar" aria-valuemin={0} aria-valuemax={sim.steps.length} aria-valuenow={done}><i style={{ transform: `scaleX(${done / sim.steps.length})` }} /></div>
    <ol className="sim-steps">{sim.steps.map((s, i) => <li key={i} className={`sim-step ${s.status}`}>
      {s.status === 'done' ? <CheckCircle size={18} weight="fill" /> : s.status === 'active' ? <CircleNotch size={18} className="spin" /> : <Circle size={18} />}
      <div><div className="t">{s.label}</div><div className="d">{s.detail || `Scheduled at ${s.t}s`}</div></div></li>)}</ol>
  </Panel>
}

function Overview({ d, reload }) {
  const { toast, confirm } = useUI()
  const sim = d.simulation, c = d.cards, ch = d.charts
  const [headline, sub] = posture(c)
  const launch = async () => {
    if (!(await confirm({ title: 'Run the attack simulation?', body: 'This resets demo data, then plays a simulated account-compromise attack over about 26 seconds. No real systems are touched.', confirmText: 'Run simulation' }))) return
    try { await api.simStart(1); toast('Simulation started'); reload() } catch (e) { toast(e.message, 'error') }
  }
  const sevTotal = ch.severity.reduce((a, s) => a + s.value, 0)
  const sev = SEV_ORDER.map(([name, tone]) => ({ name, tone, value: ch.severity.find((s) => s.name === name)?.value || 0 }))
  const maxType = Math.max(1, ...ch.attack_types.map((a) => a.value))
  const metrics = [['Active incidents', c.active_incidents], ['Critical', c.critical_incidents, c.critical_incidents && 'crit'], ['Pending approvals', c.pending_approvals, c.pending_approvals && 'high'],
    ['High-risk users', c.high_risk_users], ['Automated responses', c.automated_responses], ['Events today', c.events_today]]

  return <div className="page">
    <PageHeader title="Overview">
      <Button variant="primary" icon={Play} loading={sim?.running} onClick={launch}>{sim?.running ? 'Simulation running…' : 'Run attack simulation'}</Button>
    </PageHeader>

    <div className="posture">
      <div><h2>{headline}</h2><p>{sub}</p></div>
      {c.pending_approvals > 0 && <Link to="/approvals" className="btn">Review {plural(c.pending_approvals, 'approval')}<ArrowRight /></Link>}
    </div>

    <div className="stack">
      <dl className="metrics">{metrics.map(([l, v, tone]) => <div className="metric" key={l}><dt>{l}</dt><dd>{v}{tone ? <span className={`dot ${tone}`} /> : null}</dd></div>)}</dl>

      {sim?.steps?.length > 0 && <Simulation sim={sim} />}

      <div className="split">
        <Panel flush title="Incidents" end={<Link to="/incidents" className="btn ghost sm">View all<ArrowRight /></Link>}><IncidentTable incidents={d.incidents} /></Panel>
        <Panel flush title="Latest events" end={<Link to="/events" className="btn ghost sm">Open stream<ArrowRight /></Link>}><div className="panel-scroll"><EventFeed events={d.live_events} /></div></Panel>
      </div>

      <div className="split">
        <Panel title="Event volume" hint="Per hour, last 12 hours (UTC)">
          <div className="chart"><ResponsiveContainer><BarChart data={ch.events_over_time} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} /><XAxis dataKey="t" tickLine={false} axisLine={false} interval={1} tickMargin={8} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
            <Tooltip cursor={{ fill: 'var(--bg-muted)' }} content={<ChartTip unit="events" />} isAnimationActive={false} />
            <Bar dataKey="count" fill="var(--fg)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Alerts by severity" hint={sevTotal ? `${sevTotal} total` : undefined}>
          {sevTotal ? <><div className="sev-stack" aria-hidden="true">{sev.filter((s) => s.value).map((s) => <i key={s.name} style={{ flex: s.value, background: `var(--${s.tone})` }} />)}</div>
            <ul className="legend">{sev.map((s) => <li key={s.name}><span className={`dot ${s.tone}`} />{humanize(s.name.toLowerCase())}<b>{s.value}</b></li>)}</ul></>
            : <Empty compact icon={ChartBar} title="No alerts">Detection rules haven’t fired.</Empty>}
        </Panel>
      </div>

      <div className="split">
        <Panel title="Risk build-up" hint={d.incidents[0] ? `${d.incidents[0].id} · score after each detection` : 'Latest incident'}>
          {ch.risk_trend.length ? <div className="chart"><ResponsiveContainer><LineChart data={ch.risk_trend} margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} /><XAxis dataKey="t" tickLine={false} axisLine={false} tickMargin={8} /><YAxis domain={[0, 100]} ticks={[0, 30, 60, 80, 100]} tickLine={false} axisLine={false} width={30} />
            <ReferenceLine y={80} stroke="var(--crit)" strokeDasharray="3 3" label={{ value: 'Critical', position: 'right' }} /><ReferenceLine y={60} stroke="var(--high)" strokeDasharray="3 3" label={{ value: 'High', position: 'right' }} />
            <Tooltip cursor={{ stroke: 'var(--border-strong)' }} content={<ChartTip unit="risk" />} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="score" stroke="var(--fg)" strokeWidth={2} dot={{ r: 4, fill: 'var(--fg)', stroke: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
            : <Empty compact icon={ChartBar} title="No risk data">Risk is scored once alerts are correlated into an incident.</Empty>}
        </Panel>
        <Panel title="Detections by rule">
          {ch.attack_types.length ? <ul className="bars">{ch.attack_types.map((a) => <li key={a.name}><div className="lbl"><span>{humanize(a.name)}</span><b>{a.value}</b></div><div className="track"><i style={{ width: `${(a.value / maxType) * 100}%` }} /></div></li>)}</ul>
            : <Empty compact icon={ChartBar} title="No detections" />}
        </Panel>
      </div>
    </div>
  </div>
}

export default function Dashboard() {
  usePageTitle('Overview')
  const state = usePoll(api.dashboard, 1500)
  return <Async state={state}>{(d) => <Overview d={d} reload={state.reload} />}</Async>
}
