import { api } from '../services/api'
import { Card, Loading, ErrorBox, usePoll, useUI, Badge } from '../components/ui.jsx'
export default function Settings() {
  const { data: s, error, reload } = usePoll(api.settings, 4000); const { toast, confirm } = useUI()
  if (error && !s) return <div className="page"><ErrorBox error={error} retry={reload} /></div>
  if (!s) return <div className="page"><Loading /></div>
  const mode = async (m) => { try { await api.setSettings({ automation_mode: m }); toast('Automation mode updated'); reload() } catch (e) { toast(e.message, 'error') } }
  const reset = async () => { if (!(await confirm({ title: 'Reset demo data?', body: 'Clears incidents, alerts, approvals and audit log.', danger: true, confirmText: 'Reset' }))) return
    try { await api.simReset(); toast('Demo data reset') } catch (e) { toast(e.message, 'error') } }
  const R = ({ k, v }) => <tr><td className="mut" style={{ width: 220 }}>{k}</td><td>{v}</td></tr>
  return <div className="page"><h1>Settings</h1><div className="sub">System configuration and status</div>
    <Card pad={false}><table><tbody>
      <R k="AI Provider" v={<Badge kind="info">{s.ai_provider === 'Gemini' ? 'Gemini' : 'Demo/Mock (set GEMINI_API_KEY for Gemini)'}</Badge>} />
      <R k="Automation Mode" v={<div className="row"><select value={s.automation_mode} onChange={(e) => mode(e.target.value)}><option value="safe_auto">Safe automatic</option><option value="manual">Manual</option></select><span className="mut">Safe automatic: low-impact actions run by themselves; high-impact always needs approval.</span></div>} />
      <R k="Simulation Mode" v={<Badge kind="ok">{s.simulation_mode}</Badge>} /><R k="RPA Mode" v={<Badge kind="info">{s.rpa_mode}</Badge>} />
      <R k="Threat Intelligence" v={s.threat_intel} /><R k="API status" v={<Badge kind="ok">{s.api_status}</Badge>} />
      <R k="Database status" v={<Badge kind={s.database_status === 'connected' ? 'ok' : 'crit'}>{s.database_status}</Badge>} /></tbody></table></Card>
    <div className="row" style={{ marginTop: 16 }}><button className="btn danger" onClick={reset}>Reset demo data</button></div></div>
}
