import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShieldAlert, Activity, Bot, Zap, CheckSquare, ScrollText, Settings, ShieldCheck } from 'lucide-react'
import { api } from '../services/api'
import { usePoll } from './ui.jsx'

const NAV = [['/', 'Overview', LayoutDashboard], ['/incidents', 'Incidents', ShieldAlert], ['/events', 'Live Events', Activity], ['/investigation', 'AI Investigation', Bot],
  ['/response', 'Response Center', Zap], ['/approvals', 'Approval Queue', CheckSquare], ['/audit', 'Audit Trail', ScrollText], ['/settings', 'Settings', Settings]]

export default function Layout({ children }) {
  const { data: h, error } = usePoll(api.health, 2000)
  return <div className="app"><aside className="side">
    <div className="brand"><ShieldCheck color="#38bdf8" size={26} /><div>CYBERSENTINEL<small>Agentic SOC Analyst</small></div></div>
    <nav className="nav">{NAV.map(([to, label, I]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'active' : ''}><I size={16} />{label}
      {to === '/approvals' && h?.pending_approvals > 0 && <span className="cnt">{h.pending_approvals}</span>}</NavLink>)}</nav></aside>
    <div className="main"><div className="top">
      <span className="chip"><span className={`dot ${error ? 'off' : ''}`} /> API {error ? 'offline' : 'online'}</span>
      <span className="chip">AI Provider: <b style={{ color: '#fff' }}>{h?.ai_provider || '…'}</b></span>
      <span className="chip">RPA: {h?.rpa_mode || '…'}</span><span className="chip">Simulation Mode: Enabled</span>
      {h?.simulation_running && <span className="chip pulse" style={{ color: '#fca5a5' }}>● attack simulation running</span>}
      <span className="sp" /><span className="mut">All security actions are simulated</span></div>
      {children}</div></div>
}
