import { useState } from 'react'
import { api } from '../services/api'
import { Card, Loading, ErrorBox, usePoll } from '../components/ui.jsx'
import { IncidentTable } from '../components/Shared.jsx'
export default function Incidents() {
  const { data, error, reload } = usePoll(api.incidents, 3000); const [f, setF] = useState('ALL')
  if (error && !data) return <div className="page"><ErrorBox error={error} retry={reload} /></div>
  if (!data) return <div className="page"><Loading /></div>
  return <div className="page"><h1>Incidents</h1><div className="sub">Correlated alerts grouped into incidents</div>
    <div className="row mb"><select value={f} onChange={(e) => setF(e.target.value)}>{['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((x) => <option key={x}>{x}</option>)}</select></div>
    <Card pad={false}><IncidentTable incidents={data.filter((i) => f === 'ALL' || i.severity === f)} /></Card></div>
}
