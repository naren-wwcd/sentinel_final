import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { SquaresFour, ShieldWarning, Pulse, Detective, Lightning, SealCheck, ClockCounterClockwise, GearSix, ShieldCheck, Sun, Moon, List, CaretRight, Flask, CircleNotch } from '@phosphor-icons/react'
import { api } from '../services/api'
import { usePoll, Button } from './ui.jsx'
import { useTheme } from './theme.jsx'

const NAV = [
  ['Monitor', [['/', 'Overview', SquaresFour], ['/incidents', 'Incidents', ShieldWarning], ['/events', 'Events', Pulse]]],
  ['Respond', [['/investigation', 'Investigation', Detective], ['/response', 'Response', Lightning], ['/approvals', 'Approvals', SealCheck]]],
  ['System', [['/audit', 'Audit trail', ClockCounterClockwise], ['/settings', 'Settings', GearSix]]],
]
const TITLES = Object.fromEntries(NAV.flatMap(([, items]) => items.map(([to, label]) => [to, label])))

function Crumbs() {
  const { pathname } = useLocation()
  const [, root, id] = pathname.split('/')
  const base = '/' + (root || '')
  const label = TITLES[base] || 'Not found'
  return <nav className="crumbs" aria-label="Breadcrumb">
    {id ? <><Link to={base}>{label}</Link><CaretRight size={12} /><span aria-current="page" className="mono">{id}</span></> : <span aria-current="page">{label}</span>}
  </nav>
}

export default function Layout({ children }) {
  const { data: h, error } = usePoll(api.health, 2500)
  const { resolved, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])

  return <div className={`shell ${open ? 'nav-open' : ''}`}>
    <a href="#main" className="skip">Skip to content</a>
    <aside className="sidebar">
      <Link to="/" className="brand" translate="no"><span className="brand-mark"><ShieldCheck size={18} weight="fill" /></span><span className="brand-name">CyberSentinel</span></Link>
      <nav className="nav" aria-label="Primary">
        {NAV.map(([group, items]) => <div className="nav-group" key={group}><div className="nav-label">{group}</div>
          {items.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {({ isActive }) => <><Icon size={18} weight={isActive ? 'fill' : 'regular'} />{label}
              {to === '/approvals' && h?.pending_approvals > 0 && <span className="nav-count" aria-label={`${h.pending_approvals} pending`}>{h.pending_approvals}</span>}</>}
          </NavLink>)}</div>)}
      </nav>
      <div className="side-foot"><dl>
        <dt>API</dt><dd><span className="status" style={{ fontSize: 12.5 }}><span className={`dot ${error ? 'crit' : 'ok live'}`} />{error ? 'Offline' : 'Operational'}</span></dd>
        <dt>AI provider</dt><dd title={h?.ai_provider}>{h?.ai_provider || '—'}</dd>
        <dt>Automation</dt><dd>{h?.rpa_mode || '—'}</dd>
      </dl></div>
    </aside>
    <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />
    <div className="main">
      <header className="topbar">
        <Button variant="ghost" icon={List} className="menu-btn" aria-label="Open navigation" onClick={() => setOpen(true)} />
        <Crumbs />
        <div className="topbar-spacer" />
        {h?.simulation_running && <Link to="/" className="badge info"><CircleNotch className="spin" size={12} />Simulation running</Link>}
        <span className="env-note" title="Every security action is simulated. Nothing touches real accounts, networks or hosts."><Flask /><span>Simulated environment</span></span>
        <Button variant="ghost" icon={resolved === 'dark' ? Sun : Moon} aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')} />
      </header>
      <main id="main">{children}</main>
    </div>
  </div>
}
