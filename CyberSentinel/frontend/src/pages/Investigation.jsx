import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bot, Loader2 } from 'lucide-react'
import { api } from '../services/api'
import { Card, Loading, ErrorBox, usePoll, useUI, Empty } from '../components/ui.jsx'
import { InvestigationView } from '../components/Shared.jsx'
export default function Investigation() {
  const { id } = useParams(); const nav = useNavigate(); const { toast } = useUI()
  const inc = usePoll(api.incidents, 3000); const sel = id || inc.data?.[0]?.id
  const inv = usePoll(() => (sel ? api.investigation(sel) : Promise.resolve(null)), 3000, [sel]); const [busy, setBusy] = useState(false)
  if (inc.error && !inc.data) return <div className="page"><ErrorBox error={inc.error} retry={inc.reload} /></div>
  if (!inc.data) return <div className="page"><Loading /></div>
  const run = async () => { setBusy(true); try { await api.investigate(sel); toast('Investigation complete'); inv.reload() } catch (e) { toast(e.message, 'error') } setBusy(false) }
  return <div className="page"><h1>AI Investigation</h1><div className="sub">Tool-using SOC agent · evidence-grounded · event citations validated by the backend</div>
    {!inc.data.length ? <Card><Empty text="No incidents to investigate. Launch the attack simulation first." /></Card> : <>
      <div className="row mb"><select value={sel} onChange={(e) => nav('/investigation/' + e.target.value)}>{inc.data.map((i) => <option key={i.id} value={i.id}>{i.id} — {i.title}</option>)}</select>
        <button className="btn pri" onClick={run} disabled={busy}>{busy ? <Loader2 size={14} className="pulse" /> : <Bot size={14} />} Start AI investigation</button></div>
      <Card title="Investigation result">{inv.data?.result ? <InvestigationView inv={inv.data} /> : <Empty text="Not investigated yet." />}</Card></>}</div>
}
