import { Sun, Moon, Monitor } from '@phosphor-icons/react'
import { api } from '../services/api'
import { PageHeader, Async, usePoll, useUI, usePageTitle, Segmented, Status, Button } from '../components/ui.jsx'
import { useTheme } from '../components/theme.jsx'

const MODES = [['safe_auto', 'Safe automatic', 'Low-impact actions such as blocking an IP or opening a ticket run on their own. High-impact actions still need approval.'],
  ['manual', 'Manual', 'Nothing runs without a click. Every recommended action waits for an analyst.']]

function Form({ s, reload }) {
  const { toast, confirm } = useUI(); const { theme, setTheme } = useTheme()
  const mode = async (m) => { try { await api.setSettings({ automation_mode: m }); toast('Automation mode updated'); reload() } catch (e) { toast(e.message, 'error') } }
  const reset = async () => {
    if (!(await confirm({ title: 'Reset demo data?', body: 'This permanently clears incidents, alerts, approvals, responses and the audit trail, then reseeds baseline events.', danger: true, confirmText: 'Reset data' }))) return
    try { await api.simReset(); toast('Demo data reset') } catch (e) { toast(e.message, 'error') }
  }
  const gemini = s.ai_provider === 'Gemini'
  return <div className="page">
    <PageHeader title="Settings" />
    <div className="settings">
      <section className="setting"><div><h2>Appearance</h2><p className="desc">Choose a theme, or follow your system.</p></div>
        <div><Segmented label="Theme" value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor }]} /></div></section>

      <section className="setting"><div><h2>Automation</h2><p className="desc">How much CyberSentinel may do without asking.</p></div>
        <div role="radiogroup" aria-label="Automation mode">{MODES.map(([v, l, d]) => <label className="choice" key={v}><input type="radio" name="mode" checked={s.automation_mode === v} onChange={() => mode(v)} /><div><b>{l}</b><span>{d}</span></div></label>)}</div></section>

      <section className="setting"><div><h2>Integrations</h2><p className="desc">Configured with environment variables on the API server.</p></div>
        <ul className="kv-rows">
          <li><span>AI provider</span><span style={{ textAlign: 'right' }}><b>{gemini ? 'Gemini' : 'Built-in demo agent'}</b>{!gemini && <div className="muted" style={{ fontSize: 12.5 }}>Set <span className="mono">GEMINI_API_KEY</span> to use Gemini</div>}</span></li>
          <li><span>Automation engine</span><b>{s.rpa_mode}</b></li>
          <li><span>Threat intelligence</span><b>{s.threat_intel}</b></li>
          <li><span>Simulation mode</span><b>{s.simulation_mode}</b></li></ul></section>

      <section className="setting"><div><h2>System status</h2></div>
        <ul className="kv-rows">
          <li><span>API</span><Status status={s.api_status === 'online' ? 'SUCCESS' : 'FAILED'} label={s.api_status === 'online' ? 'Operational' : 'Offline'} /></li>
          <li><span>Database</span><Status status={s.database_status === 'connected' ? 'SUCCESS' : 'FAILED'} label={s.database_status === 'connected' ? 'Connected' : 'Error'} /></li></ul></section>

      <section className="setting"><div><h2>Demo data</h2><p className="desc">Start again from a clean baseline.</p></div>
        <div><Button danger onClick={reset}>Reset demo data…</Button></div></section>
    </div>
  </div>
}

export default function Settings() {
  usePageTitle('Settings')
  const state = usePoll(api.settings, 4000)
  return <Async state={state}>{(s) => <Form s={s} reload={state.reload} />}</Async>
}
