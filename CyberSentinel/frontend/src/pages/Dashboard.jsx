import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, CartesianGrid } from 'recharts'
import { Siren, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { api } from '../services/api'
import { Card, Loading, ErrorBox, usePoll, useUI, Empty } from '../components/ui.jsx'
import { IncidentTable, EventRows } from '../components/Shared.jsx'

const SEVC = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e' }
const Stat = ({ l, v, k }) => <div className={`card stat ${k || ''}`}><div className="l">{l}</div><div className="v">{v}</div></div>
const tip = { contentStyle: { background: 'rgba(11, 20, 55, 0.95)', border: '1px solid rgba(140, 255, 46, 0.35)', borderRadius: 10, color: '#f8fafc', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' } }

export default function Dashboard() {
  const { toast, confirm } = useUI()
  const { data: d, error, reload } = usePoll(api.dashboard, 1500)
  const sim = d?.simulation
  const launch = async () => {
    if (!(await confirm({ title: 'Launch attack simulation?', body: 'Resets demo data and plays a ~26s simulated account-compromise attack. No real systems are touched.', confirmText: 'Launch' }))) return
    try { await api.simStart(1); toast('Attack simulation started'); reload() } catch (e) { toast(e.message, 'error') }
  }
  if (error && !d) return <div className="page"><ErrorBox error={error} retry={reload} /></div>
  if (!d) return <div className="page"><Loading /></div>
  const c = d.cards, ch = d.charts
  return <div className="page">
    <div className="row mb"><div><h1>Security Overview</h1><div className="sub" style={{ margin: 0 }}>Detect → Understand → Decide → Automate → Verify → Audit</div></div><span className="sp" />
      <button className="btn launch" onClick={launch} disabled={sim?.running}>{sim?.running ? <Loader2 size={16} className="pulse" /> : <Siren size={16} />} {sim?.running ? 'SIMULATION RUNNING…' : '🚨 LAUNCH ATTACK SIMULATION'}</button></div>
    <div className="grid g6 mb"><Stat l="Active Incidents" v={c.active_incidents} k={c.active_incidents ? 'warn' : ''} /><Stat l="Critical Incidents" v={c.critical_incidents} k={c.critical_incidents ? 'crit' : ''} />
      <Stat l="Events Today" v={c.events_today} /><Stat l="High Risk Users" v={c.high_risk_users} k={c.high_risk_users ? 'crit' : ''} /><Stat l="Automated Responses" v={c.automated_responses} k="good" /><Stat l="Pending Approvals" v={c.pending_approvals} k={c.pending_approvals ? 'warn' : ''} /></div>
    {sim?.steps?.length > 0 && <Card title="Live Attack Simulation" right={<span className="mut">{sim.message}</span>} className="mb"><div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
      {sim.steps.map((s, i) => <div key={i} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        {s.status === 'done' ? <CheckCircle2 size={16} color="#22c55e" /> : s.status === 'active' ? <Loader2 size={16} className="pulse" color="#8cff2e" /> : <Circle size={16} color="#475569" />}
        <div><b>{s.t}s</b> {s.label}<div className="mut" style={{ fontSize: 12 }}>{s.detail}</div></div></div>)}</div></Card>}
    <div className="grid g2 mb"><Card title="Events over time (UTC hour)"><ResponsiveContainer height={200}><AreaChart data={ch.events_over_time}><CartesianGrid stroke="rgba(255,255,255,0.07)" /><XAxis dataKey="t" stroke="#7e8ca5" fontSize={11} /><YAxis stroke="#7e8ca5" fontSize={11} allowDecimals={false} /><Tooltip {...tip} /><Area dataKey="count" stroke="#8cff2e" fill="rgba(140,255,46,0.18)" strokeWidth={2} /></AreaChart></ResponsiveContainer></Card>
      <Card title="Risk trend (latest incident)">{ch.risk_trend.length ? <ResponsiveContainer height={200}><LineChart data={ch.risk_trend}><CartesianGrid stroke="rgba(255,255,255,0.07)" /><XAxis dataKey="t" stroke="#7e8ca5" fontSize={11} /><YAxis domain={[0, 100]} stroke="#7e8ca5" fontSize={11} /><Tooltip {...tip} /><Line dataKey="score" stroke="#ef4444" strokeWidth={2} dot /></LineChart></ResponsiveContainer> : <Empty text="No risk data yet" />}</Card>
      <Card title="Alert severity distribution">{ch.severity.length ? <ResponsiveContainer height={200}><PieChart><Pie data={ch.severity} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} label>{ch.severity.map((s) => <Cell key={s.name} fill={SEVC[s.name]} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer> : <Empty text="No alerts yet" />}</Card>
      <Card title="Attack types">{ch.attack_types.length ? <ResponsiveContainer height={200}><BarChart data={ch.attack_types} layout="vertical"><CartesianGrid stroke="rgba(255,255,255,0.07)" /><XAxis type="number" stroke="#7e8ca5" fontSize={11} allowDecimals={false} /><YAxis type="category" dataKey="name" width={130} stroke="#7e8ca5" fontSize={11} /><Tooltip {...tip} /><Bar dataKey="value" fill="#f97316" /></BarChart></ResponsiveContainer> : <Empty text="No alerts yet" />}</Card></div>
    <div className="grid g3"><Card title="Incidents" pad={false}><IncidentTable incidents={d.incidents} /></Card><Card title="Live Event Feed"><div className="feed"><EventRows events={d.live_events} /></div></Card></div></div>
}
